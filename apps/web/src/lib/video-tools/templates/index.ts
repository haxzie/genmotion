import type { MetricVideoData } from "../types";
import { countUp } from "./count-up";
import { chartRise } from "./chart-rise";
import { statCard } from "./stat-card";
import type { TemplateId, VideoTemplate } from "./types";

export const TEMPLATES: Record<TemplateId, VideoTemplate> = {
  "count-up": countUp,
  "chart-rise": chartRise,
  "stat-card": statCard,
};

/**
 * The templates a generator offers, minus any that can't render this particular
 * response — a package with no download history loses the chart, for instance.
 */
export function usableTemplates(
  ids: readonly TemplateId[],
  data: MetricVideoData,
): VideoTemplate[] {
  return ids.map((id) => TEMPLATES[id]).filter((t) => t.supports(data));
}

export type { TemplateId, VideoTemplate };
