/**
 * Copy the template objects into the world-readable bucket.
 *
 * A one-time migration, and safe to re-run: template objects are the only
 * thing that belongs in `TEMPLATES_BUCKET`, so this copies `templates/` out
 * of the main bucket and nothing else. It never deletes from the source —
 * the old objects stay where they are until somebody is satisfied the new
 * bucket is serving, and the API reads whichever bucket it is pointed at.
 *
 *   node packages/templates/scripts/sync-public-bucket.mjs            # dry run
 *   node packages/templates/scripts/sync-public-bucket.mjs --apply
 *
 * `--apply` is required to write anything. The dry run prints exactly what
 * would be copied and what it would cost, because the point of a separate
 * bucket is that nobody ever moves the wrong prefix into it by accident.
 */
import {
  copyObject,
  headObject,
  listObjects,
  PRIVATE_BUCKET,
  PUBLIC_BUCKET,
} from "@genmotion/storage";

/** The only prefix that may be made public. Not configurable on purpose. */
const PREFIX = "templates/";

const apply = process.argv.includes("--apply");

if (PUBLIC_BUCKET === PRIVATE_BUCKET) {
  console.error(
    `TEMPLATES_BUCKET is unset or equal to S3_BUCKET (${PRIVATE_BUCKET}).\n` +
      "That is the dev arrangement, where there is nothing to copy — and in\n" +
      "production it would mean the public hostname is pointed at the bucket\n" +
      "holding projects/ and shares/, which is the thing this split exists to\n" +
      "prevent.",
  );
  process.exit(1);
}

/** Already there, same size? Then this is a re-run, and it can be skipped. */
async function alreadyCopied(key, size) {
  const head = await headObject(key, PUBLIC_BUCKET);
  return head?.sizeBytes === size;
}

const objects = (await listObjects(PREFIX, PRIVATE_BUCKET)).map((o) => ({
  key: o.key,
  size: o.size,
}));
if (objects.length === 0) {
  console.log(`Nothing under ${PREFIX} in ${PRIVATE_BUCKET}.`);
  process.exit(0);
}

const total = objects.reduce((n, o) => n + o.size, 0);
console.log(
  `${objects.length} object(s), ${(total / 1048576).toFixed(1)}MB\n` +
    `  ${PRIVATE_BUCKET}/${PREFIX}  ->  ${PUBLIC_BUCKET}/${PREFIX}\n`,
);

let copied = 0;
let skipped = 0;
for (const { key, size } of objects) {
  if (await alreadyCopied(key, size)) {
    skipped++;
    continue;
  }
  if (!apply) {
    console.log(`  would copy  ${key}  (${(size / 1048576).toFixed(2)}MB)`);
    copied++;
    continue;
  }
  await copyObject(key, PRIVATE_BUCKET, PUBLIC_BUCKET);
  copied++;
  process.stdout.write(`\r  copied ${copied}/${objects.length - skipped}…`);
}

console.log(
  `\n${apply ? "Copied" : "Would copy"} ${copied}, already present ${skipped}.` +
    (apply ? "" : "\nRe-run with --apply to do it."),
);
