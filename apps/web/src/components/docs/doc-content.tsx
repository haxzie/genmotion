import Link from "next/link";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import type { Element, ElementContent, Root, RootContent } from "hast";
import { createSlugger, parseDocBody, type CalloutKind, type DocBlock } from "@/lib/docs/content";
import { highlight } from "@/lib/docs/highlight";
import { CodeCopyButton } from "@/components/docs/code-copy-button";

/**
 * A docs page body, rendered entirely on the server: Markdown through
 * remark/rehype, code through Shiki, directives into the components below.
 * Crawlers and agents get the finished HTML; the only client code is the copy
 * buttons.
 */

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

type Slug = (text: string) => string;

function textOf(node: ElementContent | RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

/** Heading ids, and `pre > code` swapped for a node the highlighter renders. */
function transform(nodes: (ElementContent | RootContent)[], slug: Slug): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || node.type !== "element") continue;
    if (node.tagName === "h2" || node.tagName === "h3") {
      node.properties.id = slug(textOf(node));
    }
    const code = node.tagName === "pre" ? node.children.find((c): c is Element => c.type === "element" && c.tagName === "code") : undefined;
    if (code) {
      const className = (code.properties.className as string[] | undefined) ?? [];
      const lang = className.find((c) => c.startsWith("language-"))?.slice("language-".length);
      const meta = (code.data as { meta?: string } | undefined)?.meta ?? "";
      nodes[i] = {
        type: "element",
        tagName: "doc-code",
        properties: { code: textOf(code).replace(/\n$/, ""), lang: lang ?? "", title: /title="([^"]+)"/.exec(meta)?.[1] ?? "" },
        children: [],
      };
      continue;
    }
    transform(node.children, slug);
  }
}

const LANG_LABEL: Record<string, string> = {
  sh: "Terminal",
  bash: "Terminal",
  json: "JSON",
  jsonc: "JSON",
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  yaml: "YAML",
  md: "Markdown",
  text: "Text",
};

async function CodeBlock({ code, lang, title }: { code: string; lang: string; title: string }) {
  const html = await highlight(code, lang || undefined);
  const label = title || LANG_LABEL[lang] || lang || "Text";
  // Prose (a prompt, a tree) wraps; code keeps its lines and scrolls.
  const wrap = !lang || lang === "text";
  return (
    <div className="group/code not-prose my-6 overflow-hidden rounded-xl border border-border bg-[#0b0b0e]">
      <div className="flex items-center justify-between border-b border-border bg-surface/60 py-1.5 pl-4 pr-1.5">
        <span className="text-[0.8rem] font-medium text-text-tertiary">{label}</span>
        <CodeCopyButton text={code} />
      </div>
      <div
        className={`overflow-x-auto px-4 py-3.5 font-mono text-[0.85rem] leading-[1.7] [&_pre]:!bg-transparent [&_code]:font-mono ${wrap ? "[&_pre]:whitespace-pre-wrap [&_pre]:break-words" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function HeadingAnchor({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="ml-2 inline-block text-text-tertiary opacity-0 transition-opacity hover:text-green group-hover/h:opacity-100 focus:opacity-100"
    >
      #
    </a>
  );
}

const components = {
  "doc-code": CodeBlock,
  h2: ({ id, children }: { id?: string; children?: React.ReactNode }) => (
    <h2 id={id} className="group/h mt-12 scroll-mt-24 font-display text-[1.6rem] font-semibold tracking-tight text-text-primary first:mt-0">
      {children}
      {id && <HeadingAnchor id={id} />}
    </h2>
  ),
  h3: ({ id, children }: { id?: string; children?: React.ReactNode }) => (
    <h3 id={id} className="group/h mt-9 scroll-mt-24 text-[1.2rem] font-semibold tracking-tight text-text-primary">
      {children}
      {id && <HeadingAnchor id={id} />}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <p className="mt-4 leading-[1.75]">{children}</p>,
  a: ({ href = "", children }: { href?: string; children?: React.ReactNode }) => {
    const className = "font-medium text-text-primary underline decoration-green/50 decoration-1 underline-offset-[3px] transition-colors hover:decoration-green";
    if (href.startsWith("/") || href.startsWith("#")) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 marker:text-text-tertiary">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 marker:text-text-tertiary">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="pl-1 leading-[1.7] [&>p]:mt-0">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[0.85em] text-text-primary">
      {children}
    </code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mt-4 border-l-2 border-border-strong pl-4 text-text-tertiary">{children}</blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left text-[0.92rem]">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-surface/70">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody className="divide-y divide-border">{children}</tbody>,
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-border px-4 py-2.5 font-semibold text-text-primary">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-2.5 align-top [&_code]:whitespace-nowrap">{children}</td>
  ),
  hr: () => <hr className="my-10 border-border" />,
} as unknown as Partial<Components>;

/** Parsed and slugged up front, in document order, before React renders anything. */
function toTree(source: string, slug: Slug): Root {
  const tree = processor.runSync(processor.parse(source)) as Root;
  transform(tree.children, slug);
  return tree;
}

function Markdown({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, { Fragment, jsx, jsxs, components });
}

type Prepared =
  | { type: "markdown"; tree: Root }
  | { type: "callout"; kind: CalloutKind; tree: Root }
  | { type: "steps"; steps: { id: string; title: string; tree: Root }[] }
  | Extract<DocBlock, { type: "cards" }>;

function prepare(block: DocBlock, slug: Slug): Prepared {
  switch (block.type) {
    case "markdown":
      return { type: "markdown", tree: toTree(block.content, slug) };
    case "callout":
      return { type: "callout", kind: block.kind, tree: toTree(block.content, slug) };
    case "steps":
      return {
        type: "steps",
        steps: block.steps.map((s) => {
          const id = slug(s.title);
          return { id, title: s.title, tree: toTree(s.body, slug) };
        }),
      };
    case "cards":
      return block;
  }
}

const CALLOUT: Record<CalloutKind, { label: string; box: string; icon: React.ReactNode }> = {
  note: {
    label: "Note",
    box: "border-accent/30 bg-accent-muted text-[#c7d5fd]",
    icon: <path d="M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />,
  },
  tip: {
    label: "Tip",
    box: "border-green/30 bg-green-muted text-[#bdf0d4]",
    icon: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />,
  },
  warning: {
    label: "Warning",
    box: "border-orange/30 bg-orange-muted text-[#fdd9bd]",
    icon: <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  },
};

function Callout({ kind, children }: { kind: CalloutKind; children: React.ReactNode }) {
  const c = CALLOUT[kind];
  return (
    <aside aria-label={c.label} className={`my-6 flex gap-3 rounded-xl border px-4 py-3.5 text-[0.95rem] ${c.box}`}>
      <svg viewBox="0 0 24 24" className="mt-[0.2rem] size-[1.1rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {c.icon}
      </svg>
      <div className="min-w-0 [&>p:first-child]:mt-0 [&_p]:leading-relaxed [&_strong]:text-inherit [&_a]:text-inherit">{children}</div>
    </aside>
  );
}

function Block({ block }: { block: Prepared }) {
  switch (block.type) {
    case "markdown":
      return <Markdown tree={block.tree} />;
    case "callout":
      return (
        <Callout kind={block.kind}>
          <Markdown tree={block.tree} />
        </Callout>
      );
    case "steps":
      return (
        <ol className="my-8 flex flex-col">
          {block.steps.map((step, i) => {
            const id = step.id;
            return (
              <li key={id} className="relative flex gap-5 pb-8 last:pb-0">
                {/* The rail joins one number to the next; the last step has none. */}
                {i < block.steps.length - 1 && (
                  <span aria-hidden className="absolute bottom-0 left-[0.9rem] top-9 w-px bg-border" />
                )}
                <span className="flex size-[1.8rem] shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-raised font-mono text-[0.8rem] font-medium text-text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 id={id} className="group/h scroll-mt-24 text-[1.05rem] font-semibold text-text-primary">
                    {step.title}
                    <HeadingAnchor id={id} />
                  </h3>
                  <div className="[&>*:first-child]:mt-2 [&>div:first-child]:mt-3">
                    <Markdown tree={step.tree} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      );
    case "cards":
      return (
        <div className="my-8 grid gap-4 sm:grid-cols-2">
          {block.cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-border bg-surface p-5 transition-colors duration-150 hover:border-green/40 hover:bg-surface-hover"
            >
              <span className="flex items-center justify-between font-medium text-text-primary">
                {card.title}
                <svg viewBox="0 0 24 24" className="size-4 text-text-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </span>
              {card.body && (
                <span className="mt-1.5 block text-[0.92rem] leading-relaxed text-text-secondary">
                  {card.body.split(/(`[^`]+`)/).map((part, i) =>
                    part.startsWith("`") ? (
                      <code key={i} className="rounded border border-border bg-surface-raised px-1 font-mono text-[0.85em] text-text-primary">
                        {part.slice(1, -1)}
                      </code>
                    ) : (
                      part
                    ),
                  )}
                </span>
              )}
            </Link>
          ))}
        </div>
      );
  }
}

export function DocContent({ body }: { body: string }) {
  // One slugger for the whole page, in document order, which is the order
  // `getSearchIndex` assigns ids in: the TOC and search link to these.
  const slug = createSlugger();
  return (
    <div className="text-[1rem] text-text-secondary">
      {parseDocBody(body).map((block) => prepare(block, slug)).map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
