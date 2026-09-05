import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { api } from "../api";
import { CommandLineHint, useCommandLine } from "./command-line";
import type { AuthUser, AuthOrganization } from "../../electron/shared";

/**
 * The signed-in account, at the foot of the sidebar.
 *
 * Billing and account settings deliberately leave the app: there is no
 * checkout in here, and those pages need the browser's session anyway.
 */

function initials(user: AuthUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0] ?? "");
  return (letters.join("") || source[0] || "?").toUpperCase();
}

function Item({
  children,
  onClick,
  tone = "default",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.857rem] transition-colors duration-150",
        disabled
          ? "cursor-default text-text-tertiary"
          : tone === "danger"
            ? "text-danger hover:bg-danger/10"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

/** The `genmotion` command as a menu row. See `command-line.tsx`. */
function CommandLineItem() {
  const { cli, installing, ready, install, label } = useCommandLine();
  if (!cli?.supported) return null;
  return (
    <>
      <Item disabled={ready || installing} onClick={install}>
        {label}
      </Item>
      <CommandLineHint cli={cli} ready={ready} className="px-2 pb-1" />
    </>
  );
}

export function AccountMenu({
  user,
  organization,
  placement = "down",
}: {
  user: AuthUser;
  organization: AuthOrganization | null;
  /** "up" for the sidebar footer, where there is no room below the avatar. */
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Click-away and Escape. Bound only while open so the app isn't listening to
  // every click on the start screen for nothing.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function go(path: string) {
    setOpen(false);
    void api.openWeb(path);
  }

  return (
    // `no-drag` because the start screen floats this over the titlebar's drag
    // strip: without it the OS swallows clicks on the button's top half.
    <div ref={root} className="no-drag relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className={cx(
          "flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised",
          "text-[0.786rem] font-medium text-text-secondary transition-colors duration-150",
          "outline-none hover:border-border-strong hover:text-text-primary",
          "focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        {user.image && !failedImage ? (
          <img
            src={user.image}
            alt=""
            className="size-full object-cover"
            onError={() => setFailedImage(true)}
          />
        ) : (
          initials(user)
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            "absolute left-0 z-50 w-64 rounded-lg border border-border bg-surface-raised p-1.5",
            "shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
            placement === "up" ? "bottom-10" : "top-10",
          )}
        >
          <div className="border-b border-border px-2 pb-2.5 pt-1.5">
            <p className="truncate text-text-primary">{user.name || user.email}</p>
            <p className="truncate text-[0.786rem] text-text-tertiary">{user.email}</p>
            {organization && (
              <p className="mt-1.5 truncate text-[0.786rem] text-text-tertiary">
                {organization.name}
              </p>
            )}
          </div>

          <div className="pt-1.5">
            <CommandLineItem />
            <Item onClick={() => go("/settings")}>Account settings</Item>
            <Item onClick={() => go("/settings/billing")}>Billing</Item>
            <Item onClick={() => go("/dashboard")}>Open on the web</Item>
          </div>

          <div className="mt-1.5 border-t border-border pt-1.5">
            <Item
              tone="danger"
              onClick={() => {
                setOpen(false);
                void api.auth.signOut();
              }}
            >
              Sign out
            </Item>
          </div>
        </div>
      )}
    </div>
  );
}
