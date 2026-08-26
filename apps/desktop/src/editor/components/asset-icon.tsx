import type { AssetData } from "@genmotion/shared";

type Props = { className?: string };

function ImageGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-4-9 7" />
    </svg>
  );
}
function VideoGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  );
}
function AudioGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17V5l10-2v12" />
      <circle cx="6.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </svg>
  );
}
function FileGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </svg>
  );
}

/** Kind glyph for an asset (image/video/audio/file) — shared by the assets
 *  viewer and the chat context pill so they always match. */
export function AssetIcon({
  kind,
  className,
}: {
  kind: AssetData["kind"];
  className?: string;
}) {
  if (kind === "image") return <ImageGlyph className={className} />;
  if (kind === "video" || kind === "export") return <VideoGlyph className={className} />;
  if (kind === "audio") return <AudioGlyph className={className} />;
  return <FileGlyph className={className} />;
}
