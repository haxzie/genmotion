import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled"),
  thumbnailUrl: text("thumbnail_url"),
  fps: integer("fps").notNull().default(30),
  width: integer("width").notNull().default(1920),
  height: integer("height").notNull().default(1080),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    durationInFrames: integer("duration_in_frames").notNull(),
    order: integer("order").notNull(),
    audioUrl: text("audio_url"),
    audioVolume: real("audio_volume").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("scenes_project_order_idx").on(t.projectId, t.order)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    parts: jsonb("parts").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("chat_messages_project_created_idx").on(t.projectId, t.createdAt)],
);

/**
 * Rolling conversation summaries. The agent calls the compactConversation tool
 * when the user starts a new, unrelated task; the backend writes one row here.
 * The latest row (max createdAt) is the active summary — chat context and the
 * UI load only it plus messages created after it.
 */
export const chatCompactions = pgTable(
  "chat_compactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("chat_compactions_project_created_idx").on(t.projectId, t.createdAt)],
);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  kind: text("kind", {
    enum: ["image", "video", "audio", "export"],
  }).notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: real("duration_seconds"),
  status: text("status", { enum: ["pending", "ready"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Project-level audio placed on the timeline, independent of scenes (background
 * music, ambience, sound effects that span multiple scenes). Up to
 * MAX_AUDIO_TRACKS lanes (`track` 0-3). A clip plays `url` starting at global
 * `startFrame` for `durationInFrames`, seeking `startFrom` seconds into the
 * source (move = change startFrame; resize/trim = change duration + startFrom).
 * Scene voiceover stays on the scenes table; this is separate.
 */
export const audioClips = pgTable(
  "audio_clips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    track: integer("track").notNull().default(0),
    name: text("name").notNull(),
    url: text("url").notNull(),
    startFrame: integer("start_frame").notNull().default(0),
    durationInFrames: integer("duration_in_frames").notNull(),
    startFrom: real("start_from").notNull().default(0),
    volume: real("volume").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("audio_clips_project_idx").on(t.projectId)],
);

export const exportJobs = pgTable("export_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["queued", "rendering", "encoding", "uploading", "done", "failed"],
  })
    .notNull()
    .default("queued"),
  progress: integer("progress").notNull().default(0),
  totalFrames: integer("total_frames").notNull().default(0),
  /** Export quality 0-100 (drives the encoder CRF + capture quality). */
  quality: integer("quality").notNull().default(80),
  outputAssetId: uuid("output_asset_id").references(() => assets.id),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});
