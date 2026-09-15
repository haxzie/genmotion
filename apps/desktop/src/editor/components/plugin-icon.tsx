import { isMcpChipId, type ChatPlugin } from "@genmotion/shared";
import { cx } from "@/components/ui";

type Props = { className?: string };

function MicGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
function ImageGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 4 4 2-2 5 5" />
    </svg>
  );
}
function PaperclipGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8.5 12.3 17.2a4 4 0 0 1-5.6-5.6l8.1-8.1a2.5 2.5 0 0 1 3.5 3.5l-8.1 8.1a1 1 0 0 1-1.4-1.4l7.4-7.4" />
    </svg>
  );
}

function PlugGlyph({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />
    </svg>
  );
}

/**
 * Glyph for a chat plugin — shared by the `+` menu, the composer chip, and the
 * pill on a sent message, so one plugin always looks like itself.
 *
 * An MCP server brings its own mark from the marketplace; a custom one, or a
 * message saved before the icon was known, gets a plug.
 */
export function PluginIcon({
  id,
  iconUrl,
  className,
}: {
  id: ChatPlugin["id"];
  iconUrl?: string;
  className?: string;
}) {
  if (id === "voiceover") return <MicGlyph className={className} />;
  if (id === "image") return <ImageGlyph className={className} />;
  if (isMcpChipId(id)) {
    return iconUrl ? (
      <img src={iconUrl} alt="" className={cx("rounded-[3px] object-contain", className)} />
    ) : (
      <PlugGlyph className={className} />
    );
  }
  return <PaperclipGlyph className={className} />;
}
