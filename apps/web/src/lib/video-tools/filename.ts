/** Make a title or a dropped file's name safe for a download filename. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      // Drop a file extension before the rest: "badge.front.png" should not
      // come back as "badge-front-png".
      .replace(/\.(png|jpe?g|webp|gif|avif|svg)$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "video"
  );
}
