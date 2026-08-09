import type { MetricVideoData } from "../types";
import { SourceError, fetchJson, inlineImage } from "./fetch";

/**
 * YouTube subscriber counts via the Data API v3.
 *
 * Requires `YOUTUBE_API_KEY`. Note that the API returns `subscriberCount`
 * rounded to three significant figures — 20,100,000 rather than 20,143,882.
 * That is a platform limitation, not something we can improve on, and the tool
 * FAQ says so.
 */

const API = "https://www.googleapis.com/youtube/v3/channels";

interface ChannelResponse {
  items?: {
    id: string;
    snippet: { title: string; customUrl?: string; thumbnails?: Record<string, { url: string }> };
    statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string };
  }[];
}

type Lookup = { key: "id" | "forHandle" | "forUsername"; value: string };

/**
 * Work out how to look a channel up. YouTube has three identifier styles and a
 * different query parameter for each, so this decides which one the input is.
 */
function parseChannel(input: string): Lookup {
  let value = input.trim();

  // Pull the meaningful part out of any youtube.com URL form.
  const url = /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/(.+)$/i.exec(value);
  if (url) {
    const path = url[1]!.replace(/\/+$/, "");
    const channelId = /^channel\/(UC[\w-]{22})/.exec(path);
    if (channelId) return { key: "id", value: channelId[1]! };
    const handle = /^@([\w.-]+)/.exec(path);
    if (handle) return { key: "forHandle", value: `@${handle[1]!}` };
    const user = /^(?:c|user)\/([\w.-]+)/.exec(path);
    if (user) return { key: "forUsername", value: user[1]! };
    throw new SourceError(400, "That YouTube link doesn't point at a channel.");
  }

  if (/^UC[\w-]{22}$/.test(value)) return { key: "id", value };

  if (!value.startsWith("@")) value = `@${value}`;
  if (!/^@[\w.-]{3,}$/.test(value)) {
    throw new SourceError(400, "Enter a channel handle — for example @mkbhd.");
  }
  return { key: "forHandle", value };
}

export async function getYouTubeSubscribers(input: string): Promise<MetricVideoData> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new SourceError(503, "The YouTube tool isn't configured right now.");
  }

  const lookup = parseChannel(input);
  const query = new URLSearchParams({
    part: "snippet,statistics",
    key: apiKey,
    [lookup.key]: lookup.value,
  });

  const response = await fetchJson<ChannelResponse>(`${API}?${query}`, {
    revalidate: 3600,
    notFound: "Couldn't find that YouTube channel.",
  });

  const channel = response.items?.[0];
  if (!channel) {
    throw new SourceError(404, `Couldn't find the YouTube channel "${input.trim()}".`);
  }
  if (channel.statistics.hiddenSubscriberCount) {
    throw new SourceError(422, `${channel.snippet.title} hides its subscriber count.`);
  }

  const subscribers = Number(channel.statistics.subscriberCount ?? NaN);
  if (!Number.isFinite(subscribers)) {
    throw new SourceError(422, "That channel doesn't publish a subscriber count.");
  }

  const thumbnails = channel.snippet.thumbnails ?? {};
  const thumbnail = thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url;

  return {
    source: "youtube-subscribers",
    title: channel.snippet.customUrl ?? channel.snippet.title,
    subtitle: "YouTube subscribers",
    value: subscribers,
    unit: subscribers === 1 ? "subscriber" : "subscribers",
    // The API exposes no historical subscriber figures at all.
    delta: null,
    series: null,
    avatar: await inlineImage(thumbnail),
    url: `https://www.youtube.com/channel/${channel.id}`,
    accent: "#ff0033",
  };
}
