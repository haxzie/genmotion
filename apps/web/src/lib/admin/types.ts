/** Shapes returned by the admin API (`apps/api/src/routes/admin.ts`). */

export interface Person {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface OrgRef {
  id: string;
  name: string;
  plan: string;
  planName: string;
}

export type ExportStatus =
  | "queued"
  | "rendering"
  | "encoding"
  | "uploading"
  | "done"
  | "failed"
  | "cancelled";

/* -------------------------------------------------------------- list rows -- */

export interface UserRow extends Person {
  createdAt: string;
  projectCount: number;
  org: OrgRef | null;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: string;
  planName: string;
  createdBy: Person | null;
  memberCount: number;
  projectCount: number;
}

export interface ProjectRow {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  fps: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  sceneCount: number;
  messageCount: number;
  exportCount: number;
  createdBy: Person;
  organization: OrgRef | null;
}

/* ----------------------------------------------------------------- detail -- */

export interface UserDetail extends Person {
  emailVerified: boolean;
  onboardingCompleted: boolean;
  jobRole: string | null;
  createdAt: string;
  projectCount: number;
  exportCount: number;
  messageCount: number;
  organizations: Array<{
    organizationId: string;
    name: string;
    slug: string;
    role: string;
    joinedAt: string;
    plan: string;
    planName: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    thumbnailUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  plan: string;
  planName: string;
  projectCount: number;
  exportCount: number;
  messageCount: number;
  subscription: {
    status: string;
    seats: number;
    paid: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  createdBy: Person | null;
  members: Array<Person & { role: string; joinedAt: string }>;
  projects: Array<{
    id: string;
    name: string;
    thumbnailUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ExportRow {
  id: string;
  status: ExportStatus;
  progress: number;
  format: string;
  quality: number;
  watermark: boolean;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Null until the render finishes and its asset row exists. */
  url: string | null;
  filename: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  fps: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  createdBy: Person;
  organization: OrgRef | null;
  durationSeconds: number;
  sceneCount: number;
  messageCount: number;
  exportCount: number;
  scenes: Array<{
    id: string;
    name: string;
    order: number;
    durationInFrames: number;
  }>;
  exports: ExportRow[];
}
