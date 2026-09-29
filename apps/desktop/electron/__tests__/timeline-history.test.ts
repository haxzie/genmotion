import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TimelineHistory } from "../timeline-history";

/**
 * Undo for the timeline's manual edits. What matters is that a step back is
 * the files as they were — whatever the edit did to them — and that it gives
 * up rather than overwrite a file something else has written since.
 */
let dir: string;
let history: TimelineHistory;

const read = (file: string) =>
  fs.readFile(path.join(dir, file), "utf8").catch(() => null);
const write = (file: string, content: string) =>
  fs.writeFile(path.join(dir, file), content, "utf8");

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-history-"));
  await write("project.json", `{"scenes":["a"]}\n`);
  history = new TimelineHistory(dir);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("TimelineHistory", () => {
  it("has nothing to undo until an edit is recorded", async () => {
    expect(history.label).toBeNull();
    expect(await history.undo()).toBeNull();
  });

  it("puts a rewritten file back", async () => {
    await history.record("Reorder scenes", ["project.json"], () =>
      write("project.json", `{"scenes":["b","a"]}\n`),
    );
    expect(history.label).toBe("Reorder scenes");

    expect(await history.undo()).toBe("Reorder scenes");
    expect(await read("project.json")).toBe(`{"scenes":["a"]}\n`);
    expect(history.label).toBeNull();
  });

  it("takes away a file the edit created", async () => {
    await history.record("Slice scene", ["project.json", "scenes/01-2.tsx"], async () => {
      await fs.mkdir(path.join(dir, "scenes"), { recursive: true });
      await write("scenes/01-2.tsx", "export default 1;\n");
      await write("project.json", `{"scenes":["a","a2"]}\n`);
    });

    await history.undo();
    expect(await read("scenes/01-2.tsx")).toBeNull();
    expect(await read("project.json")).toBe(`{"scenes":["a"]}\n`);
  });

  it("brings back a file the edit took away", async () => {
    await write("scenes.tsx", "export default 1;\n");
    await history.record("Delete scene", ["project.json", "scenes.tsx"], async () => {
      await fs.rm(path.join(dir, "scenes.tsx"));
      await write("project.json", "{}\n");
    });

    await history.undo();
    expect(await read("scenes.tsx")).toBe("export default 1;\n");
  });

  it("steps back one edit at a time, newest first", async () => {
    await history.record("first", ["project.json"], () => write("project.json", "1\n"));
    await history.record("second", ["project.json"], () => write("project.json", "2\n"));

    expect(await history.undo()).toBe("second");
    expect(await read("project.json")).toBe("1\n");
    expect(await history.undo()).toBe("first");
    expect(await read("project.json")).toBe(`{"scenes":["a"]}\n`);
  });

  it("drops the whole stack rather than overwrite someone else's write", async () => {
    await history.record("first", ["project.json"], () => write("project.json", "1\n"));
    await history.record("second", ["project.json"], () => write("project.json", "2\n"));
    // The agent, an open editor, a branch switch — anything but the timeline.
    await write("project.json", "written elsewhere\n");

    expect(await history.undo()).toBeNull();
    expect(await read("project.json")).toBe("written elsewhere\n");
    expect(history.label).toBeNull();
  });
});
