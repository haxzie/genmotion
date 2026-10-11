"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProjectActions } from "../../components/project-actions";

export function Topbar({
  projectName,
  onRename,
  onDuplicate,
  onDelete,
  duplicating = false,
}: {
  projectName: string;
  onRename: (name: string) => void;
  /**
   * The actions menu beside the title. Both or neither: it is one menu, and
   * the hosted editor had no business offering either — a project there was a
   * row in a database, not a folder you own.
   */
  onDuplicate?: () => void;
  onDelete?: () => void;
  duplicating?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(projectName);
  }, [projectName, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== projectName) onRename(name);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 bg-background px-5">
      <Link href="/dashboard" className="group flex items-center" aria-label="Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="GenMotion"
          className="size-5 rounded-[5px] group-hover:animate-[spin-once_0.6s_ease-in-out]"
        />
      </Link>
      <div className="h-4 w-px bg-border" />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(projectName);
              setEditing(false);
            }
          }}
          className="h-7 min-w-0 flex-1 rounded-md border border-accent/50 bg-background px-2 font-medium outline-none ring-2 ring-accent/20"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="h-7 min-w-0 flex-1 cursor-text truncate rounded-md px-2 text-left font-medium text-text-primary transition-colors hover:bg-surface-raised"
          title="Rename project"
        >
          {projectName}
        </button>
      )}
      {onDuplicate && onDelete && (
        // Rename is the title itself — clicking it has always edited it in
        // place — so the menu's own row just puts the caret there, rather
        // than opening a second way to type the same string.
        <ProjectActions
          name={projectName}
          duplicating={duplicating}
          onRename={() => setEditing(true)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          className="shrink-0"
        />
      )}
    </header>
  );
}
