"use client";

import { Streamdown } from "streamdown";

/**
 * Renders a Markdown string with typography tuned for the dark marketing theme.
 * Wraps Streamdown (already used by the editor chat) so blog posts and glossary
 * definitions share one renderer. Safe in server pages — it's a client leaf.
 */
export function Prose({ children }: { children: string }) {
  return (
    <Streamdown
      className={[
        "max-w-none text-[1.05rem] leading-relaxed text-text-secondary",
        "[&>*+*]:mt-5",
        "[&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text-primary",
        "[&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-text-primary",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-hover",
        "[&_strong]:font-semibold [&_strong]:text-text-primary",
        "[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_li]:marker:text-text-tertiary",
        "[&_code]:rounded [&_code]:bg-surface-raised [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface [&_pre]:p-4",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_blockquote]:text-text-tertiary",
        "[&_img]:rounded-lg [&_img]:border [&_img]:border-border",
      ].join(" ")}
    >
      {children}
    </Streamdown>
  );
}
