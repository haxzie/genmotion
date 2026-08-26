import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * What Gatekeeper will decide, checked before a user finds out for you.
 *
 * `codesign --verify` passing is not the same as the app opening on someone
 * else's Mac: an app can be perfectly signed and still be refused for want of a
 * notarization ticket. So this asks the three separate questions in order —
 * is it signed, is the runtime hardened, would Gatekeeper let it run — and
 * reports all of them rather than stopping at the first.
 *
 * The nested executables get their own pass. They are the likely failure:
 * esbuild and ffmpeg arrive unsigned from npm, live outside the asar, and are
 * spawned as child processes, so an unsigned one is invisible until runtime.
 */

const APP = path.join(root, "release/mac-arm64/GenMotion.app");

const checks = [];
function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`verifying ${path.relative(root, APP)}\n`);

  // 1. Signature integrity, including every nested bundle and helper.
  try {
    await run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", APP]);
    record("signature valid (deep, strict)", true);
  } catch (err) {
    record("signature valid (deep, strict)", false, String(err.stderr || err).trim().split("\n")[0]);
  }

  // 2. Who signed it, and whether the hardened runtime is actually on. The
  //    flags are what notarization checks; `runtime` missing means rejection.
  try {
    const { stderr } = await run("codesign", ["--display", "--verbose=4", APP]);
    const authority = /Authority=(.+)/.exec(stderr)?.[1] ?? "unknown";
    const flags = /CodeDirectory .*flags=([^ ]+)/.exec(stderr)?.[1] ?? "";
    record("signed by Developer ID", authority.startsWith("Developer ID Application"), authority);
    record("hardened runtime enabled", flags.includes("runtime"), `flags=${flags || "none"}`);
    record("secure timestamp present", /Timestamp=/.test(stderr), undefined);
  } catch (err) {
    record("signature readable", false, String(err.stderr || err).trim().split("\n")[0]);
  }

  // 3. The two third-party binaries we spawn.
  for (const bin of ["esbuild", "ffmpeg"]) {
    const p = path.join(APP, "Contents/Resources/app.asar.unpacked/dist/bin", bin);
    try {
      await run("codesign", ["--verify", "--strict", p]);
      record(`nested binary signed: ${bin}`, true);
    } catch (err) {
      record(`nested binary signed: ${bin}`, false, String(err.stderr || err).trim().split("\n")[0]);
    }
  }

  // 4. The notarization ticket, and Gatekeeper's actual verdict. Both fail on a
  //    signed-but-not-yet-notarized build, which is a real state worth naming
  //    rather than a broken one.
  let stapled = false;
  try {
    await run("xcrun", ["stapler", "validate", APP]);
    stapled = true;
    record("notarization ticket stapled", true);
  } catch {
    record("notarization ticket stapled", false, "not notarized yet");
  }

  try {
    const { stderr } = await run("spctl", ["--assess", "--type", "execute", "--verbose=4", APP]);
    record("Gatekeeper accepts", /accepted/.test(stderr), stderr.trim().split("\n").pop());
  } catch (err) {
    record("Gatekeeper accepts", false, String(err.stderr || err).trim().split("\n").pop());
  }

  const failed = checks.filter((c) => !c.ok);
  console.log();
  if (failed.length === 0) {
    console.log("all checks passed — this build is ready to distribute");
    return;
  }
  if (!stapled && failed.every((c) => /stapled|Gatekeeper/.test(c.name))) {
    console.log(
      "signing is correct; only notarization is missing.\n" +
        "Set APPLE_API_KEY / APPLE_API_KEY_ID / APPLE_API_ISSUER and re-run `pnpm release:mac`.",
    );
    return;
  }
  process.exitCode = 1;
}

await main();
