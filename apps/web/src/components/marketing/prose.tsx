"use client";

import { Streamdown } from "streamdown";

/**
 * Renders a Markdown string with typography tuned for the dark marketing theme.
 * Wraps Streamdown (already used by the editor chat) so blog posts and glossary
 * definitions share one renderer. Safe in server pages — it's a client leaf.
 *
 * Streamdown is built for chat, so its defaults ship affordances that don't
 * belong in an article: per-table copy/download/fullscreen buttons and a heavy
 * bordered card around every table. `controls={false}` drops the buttons and the
 * `table` override replaces the card with a plain scroll container — wide tables
 * still scroll on narrow screens, they just don't render as a boxed widget.
 *
 * `linkSafety` is the other chat default worth undoing. Streamdown renders every
 * link as a <button> that opens a "are you sure" modal, which is right for
 * untrusted model output and wrong for an article: markdown links rendered as
 * plain buttons that navigate nowhere, so no post could link anywhere and none
 * ever tried. This content is ours, written in the repo and reviewed in a PR, so
 * links render as real anchors — which also matters for crawlers, since a button
 * carries no href to follow.
 */
export function Prose({ children }: { children: string }) {
  return (
    <Streamdown
      controls={false}
      linkSafety={{ enabled: false }}
      components={{
        table: ({ node: _node, className: _className, ...props }) => (
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-[0.95rem]"
              {...props}
            />
          </div>
        ),
        thead: ({ node: _node, className: _className, ...props }) => (
          <thead className="border-b border-border-strong" {...props} />
        ),
        tbody: ({ node: _node, className: _className, ...props }) => (
          <tbody className="divide-y divide-border" {...props} />
        ),
        tr: ({ node: _node, className: _className, ...props }) => (
          <tr {...props} />
        ),
        th: ({ node: _node, className: _className, ...props }) => (
          <th
            className="px-3 py-2.5 font-semibold text-text-primary first:pl-0 last:pr-0"
            {...props}
          />
        ),
        td: ({ node: _node, className: _className, ...props }) => (
          <td
            className="px-3 py-2.5 align-top first:pl-0 last:pr-0"
            {...props}
          />
        ),
      }}
      className={[
        "max-w-none text-[1.05rem] leading-relaxed text-text-secondary",
        "[&>*+*]:mt-5",
        "[&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text-primary",
        "[&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-text-primary",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-green",
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
