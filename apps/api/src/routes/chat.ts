import { Hono } from "hono";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { and, asc, eq, db, schema } from "@genmotion/db";
import {
  EDITOR_SYSTEM_PROMPT,
  buildProjectContext,
  createEditorTools,
  chatModel,
  NAMING_PROMPT,
} from "@genmotion/ai";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { enqueueThumbnail } from "../queue";

/**
 * Drop tool parts that never reached a terminal state (a tool call with no
 * result/error). `convertToModelMessages` throws "Tool result is missing for
 * tool call …" on those — they happen when a tool turn was interrupted or the
 * tool threw. Stripping them lets an otherwise-corrupted history recover.
 */
function repairToolMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .map((message) => {
      const parts = message.parts.filter((part) => {
        const type = (part as { type?: string }).type ?? "";
        if (type.startsWith("tool-") || type === "dynamic-tool") {
          const state = (part as { state?: string }).state;
          return state === "output-available" || state === "output-error";
        }
        return true;
      });
      return { ...message, parts };
    })
    .filter((message) => message.parts.length > 0);
}

export const chatRoutes = new Hono<AuthEnv>();

chatRoutes.use(requireAuth);

async function loadOwnedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)),
    );
  return project ?? null;
}

/** GET /:projectId — persisted chat history as UIMessage[]. */
chatRoutes.get("/:projectId", async (c) => {
  const user = c.get("user");
  const project = await loadOwnedProject(c.req.param("projectId"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.projectId, project.id))
    .orderBy(asc(schema.chatMessages.createdAt));

  return c.json(
    rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: row.parts,
    })),
  );
});

async function persistMessage(projectId: string, message: UIMessage) {
  await db
    .insert(schema.chatMessages)
    .values({
      id: message.id,
      projectId,
      role: message.role as "user" | "assistant" | "system",
      parts: message.parts,
    })
    .onConflictDoUpdate({
      target: schema.chatMessages.id,
      set: { parts: message.parts },
    });
}

function extractText(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

/** POST /:projectId — streaming editor agent. */
chatRoutes.post("/:projectId", async (c) => {
  const user = c.get("user");
  const project = await loadOwnedProject(c.req.param("projectId"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    messages: UIMessage[];
    selectedSceneIds?: string[];
    selectedAssetIds?: string[];
  }>();
  const messages = body.messages ?? [];
  const selectedSceneIds = body.selectedSceneIds ?? [];
  const selectedAssetIds = body.selectedAssetIds ?? [];
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role === "user") {
    await persistMessage(project.id, lastMessage);
  }

  const scenes = await db
    .select({
      id: schema.scenes.id,
      name: schema.scenes.name,
      code: schema.scenes.code,
      durationInFrames: schema.scenes.durationInFrames,
      order: schema.scenes.order,
    })
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order));

  const assets = await db
    .select({
      id: schema.assets.id,
      url: schema.assets.url,
      kind: schema.assets.kind,
      filename: schema.assets.filename,
    })
    .from(schema.assets)
    .where(
      and(eq(schema.assets.projectId, project.id), eq(schema.assets.status, "ready")),
    );

  const projectContext = buildProjectContext({
    project,
    scenes: scenes.map(({ code: _code, ...rest }) => rest),
    selectedScenes: scenes.filter((s) => selectedSceneIds.includes(s.id)),
    assets: assets.filter((a) => a.kind !== "export"),
    selectedAssets: assets.filter((a) => selectedAssetIds.includes(a.id)),
  });

  const modelMessages = await convertToModelMessages(repairToolMessages(messages));

  // Set when the editor tools build their sandbox; torn down on stream finish.
  let disposeSandbox: (() => Promise<void>) | undefined;

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      // Auto-name the project off the first user message (non-blocking for the
      // main stream; the rename lands as a data part whenever Haiku finishes).
      const namingPromise =
        project.name === "Untitled" && lastMessage?.role === "user"
          ? (async () => {
              try {
                const { text } = await generateText({
                  model: chatModel(),
                  system: NAMING_PROMPT,
                  prompt: extractText(lastMessage).slice(0, 2000),
                });
                const name = text.trim().slice(0, 80);
                if (!name) return;
                await db
                  .update(schema.projects)
                  .set({ name, updatedAt: new Date() })
                  .where(eq(schema.projects.id, project.id));
                writer.write({
                  type: "data-project-renamed",
                  data: { name },
                });
              } catch {
                // Naming is best-effort; the user can rename manually.
              }
            })()
          : Promise.resolve();

      const editor = createEditorTools({
        projectId: project.id,
        userId: user.id,
        project: {
          fps: project.fps,
          width: project.width,
          height: project.height,
        },
        onMutation: () => {
          // Nudge the client to refetch scenes as each parallel write lands.
          writer.write({ type: "data-scenes-updated", data: {}, transient: true });
        },
      });
      disposeSandbox = editor.dispose;

      const result = streamText({
        model: chatModel(),
        messages: [
          {
            role: "system",
            content: EDITOR_SYSTEM_PROMPT,
          },
          { role: "system", content: projectContext },
          ...modelMessages,
        ],
        tools: editor.tools,
        stopWhen: stepCountIs(12),
      });

      writer.merge(result.toUIMessageStream());
      await namingPromise;
    },
    onFinish: async ({ responseMessage }) => {
      // Tear down the workbench sandbox now that the turn is done.
      await disposeSandbox?.();
      if (responseMessage) {
        await persistMessage(project.id, responseMessage);
      }
      // Scenes likely changed this turn — refresh the project thumbnail.
      await enqueueThumbnail(project.id);
    },
  });

  return createUIMessageStreamResponse({ stream });
});
