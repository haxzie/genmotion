import { toolRoute } from "@/lib/video-tools/sources/route";
import { getYouTubeSubscribers } from "@/lib/video-tools/sources/youtube";

export const GET = toolRoute(getYouTubeSubscribers);
