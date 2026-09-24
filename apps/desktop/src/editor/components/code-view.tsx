"use client";

import { useState } from "react";
import { FileExplorer } from "./file-explorer";
import { FileDocument } from "./file-document";

/**
 * The Code tab: the project folder on the left, the file you picked on the
 * right.
 *
 * The tree is the whole folder rather than the manifest's scene list. By the
 * time a video is finished most of it lives in shared components, helpers and
 * config, and a view that could only show the scenes was hiding the parts the
 * agent had spent the most time in.
 */
export function CodeView({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        <FileExplorer projectId={projectId} activePath={selected} onOpen={setSelected} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <FileDocument key={selected} projectId={projectId} path={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-tertiary">
            Select a file to view its code
          </div>
        )}
      </div>
    </div>
  );
}
