/** Turning an absolute path into something that fits, and reads, in the UI. */

/** The last segment — what a user recognises a folder by. */
export function folderName(dir: string): string {
  return dir.split(/[\\/]/).filter(Boolean).at(-1) ?? dir;
}

/** `/Users/me/work/brand` reads better as `~/work/brand` in a narrow menu. */
export function prettyPath(dir: string): string {
  const home = /^\/(Users|home)\/[^/]+/.exec(dir);
  return home ? `~${dir.slice(home[0].length)}` : dir;
}
