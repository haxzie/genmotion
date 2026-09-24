"use client";

import { useEffect, useState } from "react";
import { useProjectFiles } from "@/hooks/use-project-files";
import { Spinner, cx } from "@/components/ui";
import type { ProjectFileNode } from "../../../electron/shared";

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={cx(className, "transition-transform duration-150", open && "rotate-90")}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5L10.5 8 6 12.5" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </svg>
  );
}

/** Every folder in the tree, so "collapse all" and the initial state can name them. */
function topLevelFolders(nodes: ProjectFileNode[]): string[] {
  return nodes.filter((n) => n.kind === "directory").map((n) => n.path);
}

function Row({
  node,
  depth,
  expanded,
  activePath,
  onToggle,
  onOpen,
}: {
  node: ProjectFileNode;
  depth: number;
  expanded: ReadonlySet<string>;
  activePath: string | null;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
}) {
  const isDir = node.kind === "directory";
  const open = isDir && expanded.has(node.path);
  const active = !isDir && node.path === activePath;

  return (
    <>
      <button
        type="button"
        title={node.path}
        onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
        // Indent by depth the way an explorer does; the chevron column is
        // kept even on files so names line up under their siblings.
        style={{ paddingLeft: 6 + depth * 12 }}
        className={cx(
          "flex w-full items-center gap-1 rounded py-1 pr-2 text-left text-[0.857rem] transition-colors",
          active
            ? "bg-surface-raised text-text-primary"
            : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary",
        )}
      >
        {isDir ? (
          <ChevronIcon open={open} className="size-3.5 shrink-0 text-text-tertiary" />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        {isDir ? (
          <FolderIcon className="size-4 shrink-0 text-text-tertiary" />
        ) : (
          <FileIcon className="size-4 shrink-0 text-text-tertiary" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {open &&
        node.children?.map((child) => (
          <Row
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            activePath={activePath}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
    </>
  );
}

/**
 * The Code panel: the project folder, browsable.
 *
 * The whole tree, not the manifest's scene list — by the time a video is
 * finished most of it lives in shared components and helpers the old Code tab
 * couldn't see. Clicking a file opens it as a document in the preview area.
 */
export function FileExplorer({
  projectId,
  activePath,
  onOpen,
}: {
  projectId: string;
  /** The file document currently in front, highlighted in the tree. */
  activePath: string | null;
  onOpen: (path: string) => void;
}) {
  const { data: tree, isLoading } = useProjectFiles(projectId);
  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  // Top-level folders start open — `scenes/`, `components/`, `assets/` is the
  // shape of a project and hiding it behind three clicks helps nobody. Only
  // seeded once, so a folder you collapsed stays collapsed as the agent works.
  useEffect(() => {
    if (tree && expanded === null) setExpanded(new Set(topLevelFolders(tree)));
  }, [tree, expanded]);

  const open = expanded ?? new Set<string>();

  function toggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current ?? []);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
        <span className="text-[0.857rem] font-medium">Files</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : !tree || tree.length === 0 ? (
          <p className="px-2 py-8 text-center text-[0.786rem] text-text-tertiary">
            This folder is empty.
          </p>
        ) : (
          tree.map((node) => (
            <Row
              key={node.path}
              node={node}
              depth={0}
              expanded={open}
              activePath={activePath}
              onToggle={toggle}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}
