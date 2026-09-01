import { lazy, Suspense, useState, type ReactNode } from "react";
import {
  registerToolPresentation,
  type ToolPartLike,
} from "@/components/editor/tool-card";
import { API_URL } from "@/lib/api";

const CodeBlock = lazy(() => import("@/components/editor/code-block"));

/**
 * How the coding harness's tools read in the chat.
 *
 * The hosted agent has scene-shaped tools (`createScene`, `addAudio`); a Claude
 * Code turn has `Write`, `Edit`, `Grep` and our MCP tools instead. The card
 * chrome is the web app's — only the vocabulary is registered here, so every
 * call shows what it actually did rather than a raw tool name.
 */

function input(part: ToolPartLike): Record<string, unknown> {
  return (part.input ?? {}) as Record<string, unknown>;
}

function str(part: ToolPartLike, ...keys: string[]): string | undefined {
  const values = input(part);
  for (const key of keys) {
    const value = values[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

/** First `max` characters, with an ellipsis when there was more. */
function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Project-relative where possible, basename otherwise — full paths are noise. */
function shortPath(file: string | undefined): string | undefined {
  if (!file) return undefined;
  const parts = file.split("/");
  const at = parts.lastIndexOf("scenes") >= 0 ? parts.lastIndexOf("scenes") : parts.lastIndexOf("components");
  return at >= 0 ? parts.slice(at).join("/") : parts[parts.length - 1];
}

/** Tool results arrive as a string, or as MCP content blocks. */
function outputText(part: ToolPartLike): string {
  const output = (part as { output?: unknown }).output;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output
      .map((block) =>
        block && typeof block === "object" && "text" in block
          ? String((block as { text: unknown }).text)
          : typeof block === "string"
            ? block
            : "",
      )
      .filter(Boolean)
      .join("\n");
  }
  if (output && typeof output === "object" && "text" in output) {
    return String((output as { text: unknown }).text);
  }
  return output === undefined ? "" : JSON.stringify(output, null, 2);
}

function Body({ children }: { children: ReactNode }) {
  return <div className="max-h-[420px] overflow-auto">{children}</div>;
}

function Text({ value, tone }: { value: string; tone?: "warning" }) {
  if (!value.trim()) {
    return <Body><p className="px-3 py-2 text-[0.786rem] text-text-tertiary">No output.</p></Body>;
  }
  return (
    <Body>
      <pre
        className={`whitespace-pre-wrap px-3 py-2 font-mono text-[0.786rem] leading-relaxed ${
          tone === "warning" ? "text-warning" : "text-text-secondary"
        }`}
      >
        {value}
      </pre>
    </Body>
  );
}

function Code({ code }: { code: string }) {
  return (
    <Body>
      <Suspense fallback={<p className="px-3 py-2 text-[0.786rem] text-text-tertiary">Loading…</p>}>
        <CodeBlock code={code} />
      </Suspense>
    </Body>
  );
}

const FileGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.5L9 1.5Z" />
    <path d="M9 1.5V5.5H13" />
  </svg>
);
const PencilGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5Z" strokeLinejoin="round" />
  </svg>
);
const EyeGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const SearchGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" strokeLinecap="round" />
  </svg>
);
const CheckGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="8" cy="8" r="6" />
    <path d="M5.5 8.2l1.8 1.8L10.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const GlobeGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="8" cy="8" r="6.2" />
    <path d="M1.9 8h12.2M8 1.8c1.7 1.9 2.6 4 2.6 6.2S9.7 12.3 8 14.2C6.3 12.3 5.4 10.2 5.4 8S6.3 3.7 8 1.8Z" />
  </svg>
);
const DownloadGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M8 2.5v7m0 0L5.2 6.7M8 9.5l2.8-2.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 11v1.5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V11" strokeLinecap="round" />
  </svg>
);
const TerminalGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
    <path d="M4.5 6l2 2-2 2M8.5 10.5h3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const QuestionGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="8" cy="8" r="6.2" />
    <path d="M6.2 6.1a1.85 1.85 0 1 1 2.3 1.85c-.4.12-.5.4-.5.75v.4" strokeLinecap="round" />
    <path d="M8 11.6h.01" strokeLinecap="round" />
  </svg>
);
const MicGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="1.5" width="4" height="8" rx="2" />
    <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5" />
  </svg>
);
const ImageGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
    <circle cx="5.5" cy="6.5" r="1" />
    <path d="m2 11.5 3.5-3.5 2.5 2.5 2-2 4 4" />
  </svg>
);
const ListGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeLinecap="round" />
  </svg>
);


interface Choice {
  label: string;
  description?: string;
}

interface Question {
  question: string;
  header?: string;
  options: Choice[];
  multiSelect?: boolean;
}

function questionsOf(part: ToolPartLike): Question[] {
  const raw = input(part).questions;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const q = (entry ?? {}) as Record<string, unknown>;
    if (typeof q.question !== "string") return [];
    const options = Array.isArray(q.options)
      ? q.options.flatMap((option) => {
          const o = (option ?? {}) as Record<string, unknown>;
          return typeof o.label === "string"
            ? [{ label: o.label, description: typeof o.description === "string" ? o.description : undefined }]
            : [];
        })
      : [];
    return [{
      question: q.question,
      header: typeof q.header === "string" ? q.header : undefined,
      options,
      multiSelect: q.multiSelect === true,
    }];
  });
}

const FREEFORM = "\u0000other";

/**
 * The agent's question, answerable in place.
 *
 * The harness is parked inside `canUseTool` while this is on screen: it asked
 * permission to run `AskUserQuestion`, and the selection below is what gets
 * handed back as the tool's input. Nothing else in the turn moves until the
 * POST lands (or the ten-minute deadline passes), so the card has to be able
 * to fail visibly rather than leave the chat spinning.
 */
function QuestionCard({ part }: { part: ToolPartLike }) {
  const questions = questionsOf(part);
  // An output means the tool already ran — reloaded transcript, a turn that was
  // stopped, or an answer this window sent a moment ago.
  const answered = (part as { output?: unknown }).output !== undefined;
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  if (questions.length === 0) return <Text value={outputText(part)} />;
  if (answered) return <Text value={outputText(part)} />;

  const answerFor = (q: Question): string => {
    const labels = (picked[q.question] ?? []).map((label) =>
      label === FREEFORM ? (typed[q.question] ?? "").trim() : label,
    );
    return labels.filter(Boolean).join(", ");
  };
  const complete = questions.every((q) => answerFor(q));

  const toggle = (q: Question, label: string) => {
    setFailed(null);
    setPicked((current) => {
      const chosen = current[q.question] ?? [];
      if (!q.multiSelect) return { ...current, [q.question]: [label] };
      return {
        ...current,
        [q.question]: chosen.includes(label)
          ? chosen.filter((l) => l !== label)
          : [...chosen, label],
      };
    });
  };

  const send = async (answers: Record<string, string>) => {
    setSending(true);
    setFailed(null);
    try {
      const res = await fetch(`${API_URL}/api/chat/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolCallId: part.toolCallId, answers }),
      });
      if (res.ok) setSent(true);
      else {
        // 410 is the honest common case: the turn was stopped, or it timed out.
        setFailed(
          res.status === 410
            ? "This question is no longer waiting for an answer."
            : `Could not send the answer (${res.status}).`,
        );
      }
    } catch (err) {
      setFailed(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const submit = () => {
    const answers: Record<string, string> = {};
    for (const q of questions) answers[q.question] = answerFor(q);
    void send(answers);
  };

  // One single-select question is the overwhelmingly common shape, and making
  // someone click an option and then a button to confirm it is pure friction.
  const single = questions.length === 1 && !questions[0]!.multiSelect;

  return (
    <Body>
      <div className="divide-y divide-border">
        {questions.map((q) => {
          const chosen = picked[q.question] ?? [];
          return (
            <div key={q.question} className="px-3 py-2.5">
              {q.header && (
                <span className="mb-1.5 inline-block rounded bg-surface-raised px-1.5 py-0.5 text-[0.7rem] font-medium text-text-tertiary">
                  {q.header}
                </span>
              )}
              <p className="mb-2 text-[0.857rem] leading-relaxed text-text-secondary">
                {q.question}
              </p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((option) => {
                  const on = chosen.includes(option.label);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      disabled={sending || sent}
                      onClick={() => {
                        if (single) {
                          void send({ [q.question]: option.label });
                          setPicked({ [q.question]: [option.label] });
                          return;
                        }
                        toggle(q, option.label);
                      }}
                      className={`rounded-md border px-2.5 py-1.5 text-left transition-colors disabled:opacity-50 ${
                        on
                          ? "border-accent bg-accent-muted"
                          : "border-border hover:border-text-tertiary"
                      }`}
                    >
                      <span className="block text-[0.821rem] text-text-primary">{option.label}</span>
                      {option.description && (
                        <span className="mt-0.5 block text-[0.75rem] leading-snug text-text-tertiary">
                          {option.description}
                        </span>
                      )}
                    </button>
                  );
                })}

                <input
                  type="text"
                  disabled={sending || sent}
                  placeholder="Something else…"
                  value={typed[q.question] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFailed(null);
                    setTyped((current) => ({ ...current, [q.question]: value }));
                    setPicked((current) => {
                      const kept = (current[q.question] ?? []).filter((l) => l !== FREEFORM);
                      const next = value.trim()
                        ? q.multiSelect
                          ? [...kept, FREEFORM]
                          : [FREEFORM]
                        : kept;
                      return { ...current, [q.question]: next };
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (single) {
                      const value = (typed[q.question] ?? "").trim();
                      if (value) void send({ [q.question]: value });
                      return;
                    }
                    if (complete) submit();
                  }}
                  className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[0.821rem] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          );
        })}

        {!single && (
          <div className="px-3 py-2">
            <button
              type="button"
              disabled={!complete || sending || sent}
              onClick={submit}
              className="rounded-md bg-accent px-3 py-1.5 text-[0.821rem] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {sending ? "Sending…" : sent ? "Sent" : "Send answer"}
            </button>
          </div>
        )}

        {failed && (
          <p className="px-3 py-2 text-[0.786rem] text-warning">{failed}</p>
        )}
      </div>
    </Body>
  );
}

registerToolPresentation({
  AskUserQuestion: {
    labels: { active: "Waiting for your answer", done: "Asked a question" },
    icon: QuestionGlyph,
    expandWhileRunning: true,
    subject: (part) => questionsOf(part)[0]?.header,
    body: (part) => <QuestionCard part={part} />,
  },

  Write: {
    labels: { active: "Writing file", done: "Wrote file" },
    icon: FileGlyph,
    subject: (part) => shortPath(str(part, "file_path")),
    body: (part) => {
      const content = str(part, "content");
      return content ? <Code code={content} /> : <Text value={outputText(part)} />;
    },
  },

  Edit: {
    labels: { active: "Editing file", done: "Edited file" },
    icon: PencilGlyph,
    subject: (part) => shortPath(str(part, "file_path")),
    body: (part) => {
      const before = str(part, "old_string");
      const after = str(part, "new_string");
      if (!before && !after) return <Text value={outputText(part)} />;
      return (
        <Body>
          <div className="divide-y divide-border">
            <pre className="whitespace-pre-wrap bg-danger/5 px-3 py-2 font-mono text-[0.786rem] text-danger/90">
              {before}
            </pre>
            <pre className="whitespace-pre-wrap bg-success/5 px-3 py-2 font-mono text-[0.786rem] text-success/90">
              {after}
            </pre>
          </div>
        </Body>
      );
    },
  },

  Read: {
    labels: { active: "Reading file", done: "Read file" },
    icon: EyeGlyph,
    subject: (part) => shortPath(str(part, "file_path")),
    body: (part) => <Text value={outputText(part)} />,
  },

  Glob: {
    labels: { active: "Finding files", done: "Found files" },
    icon: SearchGlyph,
    subject: (part) => str(part, "pattern"),
    body: (part) => <Text value={outputText(part)} />,
  },

  Grep: {
    labels: { active: "Searching the project", done: "Searched the project" },
    icon: SearchGlyph,
    subject: (part) => str(part, "pattern"),
    body: (part) => <Text value={outputText(part)} />,
  },

  TodoWrite: {
    labels: { active: "Planning", done: "Updated the plan" },
    icon: ListGlyph,
    subject: () => undefined,
    body: (part) => {
      const todos = input(part).todos;
      if (!Array.isArray(todos)) return <Text value={outputText(part)} />;
      return (
        <Body>
          <ul className="px-3 py-2 text-[0.786rem]">
            {todos.map((todo, i) => {
              const item = todo as { content?: string; status?: string };
              const done = item.status === "completed";
              return (
                <li
                  key={i}
                  className={done ? "text-text-tertiary line-through" : "text-text-secondary"}
                >
                  {done ? "✓" : "○"} {item.content ?? ""}
                </li>
              );
            })}
          </ul>
        </Body>
      );
    },
  },

  ToolSearch: {
    labels: { active: "Loading tools", done: "Loaded tools" },
    icon: SearchGlyph,
    subject: (part) => str(part, "query"),
    body: (part) => <Text value={outputText(part)} />,
  },

  WebSearch: {
    labels: { active: "Searching the web", done: "Searched the web" },
    icon: GlobeGlyph,
    subject: (part) => str(part, "query"),
    body: (part) => <Text value={outputText(part)} />,
  },

  WebFetch: {
    labels: { active: "Reading a page", done: "Read a page" },
    icon: GlobeGlyph,
    subject: (part) => {
      const url = str(part, "url");
      try {
        return url ? new URL(url).hostname.replace(/^www\./, "") : undefined;
      } catch {
        return url;
      }
    },
    body: (part) => <Text value={outputText(part)} />,
  },

  /**
   * Codex edits through a sandboxed shell rather than Read/Write/Edit tools, so
   * a turn shows commands and patches where a Claude turn shows file calls.
   */
  Shell: {
    labels: { active: "Running a command", done: "Ran a command" },
    icon: TerminalGlyph,
    subject: (part) => {
      const command = str(part, "command");
      // Codex wraps everything in `/bin/zsh -lc '…'`; the shell isn't the news.
      const inner = command?.match(/^\S*sh\s+-l?c\s+(['"])([\s\S]*)\1$/)?.[2] ?? command;
      return inner?.split("\n")[0]?.slice(0, 80);
    },
    body: (part) => <Text value={outputText(part)} />,
  },

  FileChange: {
    labels: { active: "Editing files", done: "Edited files" },
    icon: PencilGlyph,
    subject: (part) => {
      const changes = input(part).changes;
      if (!Array.isArray(changes) || changes.length === 0) return undefined;
      const first = shortPath(String((changes[0] as { path?: string })?.path ?? ""));
      return changes.length > 1 ? `${first} +${changes.length - 1}` : first;
    },
    body: (part) => {
      const changes = input(part).changes;
      if (!Array.isArray(changes)) return <Text value={outputText(part)} />;
      return (
        <Body>
          <ul className="px-3 py-2 font-mono text-[0.786rem] text-text-secondary">
            {changes.map((change, i) => {
              const item = change as { path?: string; kind?: string };
              return (
                <li key={i}>
                  <span className="text-text-tertiary">{item.kind ?? "update"}</span>{" "}
                  {item.path ?? ""}
                </li>
              );
            })}
          </ul>
        </Body>
      );
    },
  },

  mcp__genmotion__save_asset: {
    labels: { active: "Saving asset", done: "Saved asset" },
    icon: DownloadGlyph,
    subject: (part) => {
      const url = str(part, "url");
      return str(part, "filename") ?? (url ? url.split("/").pop() : undefined);
    },
    body: (part) => {
      const text = outputText(part);
      return <Text value={text} tone={text.startsWith("FAILED") ? "warning" : undefined} />;
    },
  },

  mcp__genmotion__validate_scene: {
    labels: { active: "Checking scene", done: "Checked scene" },
    icon: CheckGlyph,
    subject: (part) => shortPath(str(part, "file")),
    body: (part) => {
      const text = outputText(part);
      return <Text value={text} tone={text.startsWith("INVALID") ? "warning" : undefined} />;
    },
  },

  mcp__genmotion__project_overview: {
    labels: { active: "Reading the timeline", done: "Read the timeline" },
    icon: ListGlyph,
    subject: () => undefined,
    body: (part) => <Text value={outputText(part)} />,
  },

  mcp__genmotion__generate_voiceover: {
    labels: { active: "Recording voiceover", done: "Recorded voiceover" },
    icon: MicGlyph,
    // The script itself, trimmed — it is what the user actually wants to check,
    // and a filename they did not choose tells them nothing.
    subject: (part) => truncate(str(part, "text"), 60),
    body: (part) => {
      const text = outputText(part);
      return <Text value={text} tone={text.startsWith("FAILED") ? "warning" : undefined} />;
    },
  },

  mcp__genmotion__generate_image: {
    labels: { active: "Generating image", done: "Generated image" },
    icon: ImageGlyph,
    subject: (part) => truncate(str(part, "prompt"), 60),
    body: (part) => {
      const text = outputText(part);
      return <Text value={text} tone={text.startsWith("FAILED") ? "warning" : undefined} />;
    },
  },
});
