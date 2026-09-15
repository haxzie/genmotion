import { useState } from "react";
import type { McpServerStatus } from "@genmotion/shared";
import { Spinner, cx } from "@/components/ui";

/**
 * A server's mark: its icon from the marketplace, or the first letter of its
 * name for a custom one — and, when asked, a status dot in the corner the
 * way Cursor's list draws it, so the row reads at a glance.
 */
export function ServerIcon({
  name,
  iconUrl,
  status,
  size = "md",
  className,
}: {
  name: string;
  iconUrl?: string;
  status?: McpServerStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = size === "lg" ? "size-12 rounded-xl" : size === "md" ? "size-10 rounded-lg" : "size-7 rounded-md";
  const glyph = size === "lg" ? "size-7" : size === "md" ? "size-5" : "size-3.5";
  const letter = size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-[0.786rem]";

  return (
    <span className={cx("relative inline-flex shrink-0", className)}>
      <span
        className={cx(
          "flex items-center justify-center overflow-hidden border border-border bg-surface",
          box,
        )}
      >
        {iconUrl && !failed ? (
          <img
            src={iconUrl}
            alt=""
            className={cx("object-contain", glyph)}
            onError={() => setFailed(true)}
          />
        ) : (
          <span className={cx("font-medium uppercase text-text-secondary", letter)}>
            {name.trim().charAt(0) || "?"}
          </span>
        )}
      </span>
      {status && <StatusDot status={status} />}
    </span>
  );
}

function StatusDot({ status }: { status: McpServerStatus }) {
  if (status === "connecting") {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-surface-raised">
        <Spinner className="size-2.5 text-text-tertiary" />
      </span>
    );
  }
  const color =
    status === "connected"
      ? "bg-success"
      : status === "needs-auth"
        ? "bg-warning"
        : status === "error"
          ? "bg-danger"
          : "bg-text-tertiary";
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-surface-raised">
      <span className={cx("size-2.5 rounded-full", color)} />
    </span>
  );
}

/** The second line under a server's name. */
export function statusLine(server: {
  status: McpServerStatus;
  error?: string;
  tools: { name: string }[];
}): { text: string; tone: "default" | "warning" | "danger" } {
  switch (server.status) {
    case "connected": {
      const n = server.tools.length;
      return { text: `${n} tool${n === 1 ? "" : "s"} enabled`, tone: "default" };
    }
    case "connecting":
      return { text: "Connecting…", tone: "default" };
    case "needs-auth":
      return { text: "Needs authentication", tone: "warning" };
    case "error":
      return { text: server.error || "Couldn’t connect", tone: "danger" };
    default:
      return { text: "Disabled", tone: "default" };
  }
}
