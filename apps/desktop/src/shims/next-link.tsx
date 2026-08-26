import type { AnchorHTMLAttributes, ReactNode } from "react";

type Navigate = (href: string) => void;

let navigate: Navigate | null = null;

/**
 * Handle in-app links from the reused web components.
 *
 * There is no router here, but the components still contain real links — the
 * editor's logo is `<Link href="/dashboard">`, i.e. "go home". Swallowing the
 * click makes the logo look broken, so the host registers what those hrefs
 * should do instead.
 */
export function registerNavigate(handler: Navigate | null): void {
  navigate = handler;
}

export default function Link({
  href,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  return (
    <a
      {...rest}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        navigate?.(href);
      }}
    >
      {children}
    </a>
  );
}
