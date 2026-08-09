import type { ComponentType } from "react";
import type { MetricVideoData } from "../types";

export const TEMPLATE_IDS = ["count-up", "chart-rise", "stat-card"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface VideoTemplate {
  id: TemplateId;
  name: string;
  /**
   * Whether this template can render the given data. `chart-rise` needs a
   * series; the generator UI hides templates that return false.
   */
  supports: (data: MetricVideoData) => boolean;
  /**
   * One frame of the video as a pure function of the current frame. Reads
   * dimensions from `useVideoConfig()`, so a single template serves all three
   * aspect ratios. See README.md for the authoring rules.
   */
  Scene: ComponentType<{ data: MetricVideoData }>;
}
