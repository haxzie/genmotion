import { getStarHistory } from "@/lib/video-tools/sources/github";
import { toolRoute } from "@/lib/video-tools/sources/route";

export const GET = toolRoute(getStarHistory);
