import { getNpmDownloads } from "@/lib/video-tools/sources/npm";
import { toolRoute } from "@/lib/video-tools/sources/route";

export const GET = toolRoute(getNpmDownloads);
