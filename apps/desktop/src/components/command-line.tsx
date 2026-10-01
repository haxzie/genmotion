import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { api } from "../api";
import type { CliStatus } from "../../electron/shared";

/**
 * The `genmotion` command: whether it is there, and putting it there.
 *
 * It is the `genmotion` command from npm's `@genmotion/cli`, installed with
 * `npm install -g`, so it needs Node;
 * without it the control says so instead of failing. Installed state is shown
 * rather than hidden: a command that is already there is the answer to "did
 * that work?", and a script from an older build is worth replacing, since it
 * can shadow npm's command on PATH.
 *
 * Shared by the account menu and the Settings screen, which want the same
 * behaviour in different chrome: `render` supplies the row.
 */
export function useCommandLine() {
  const [cli, setCli] = useState<CliStatus | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    void api.cli.status().then(setCli);
  }, []);

  const ready = Boolean(cli?.installed && cli.current);

  function install() {
    if (ready || installing) return;
    setInstalling(true);
    void api.cli
      .install()
      .then(setCli)
      .finally(() => setInstalling(false));
  }

  const label = installing
    ? "Installing…"
    : ready
      ? `Command line tool installed${cli?.version ? ` · v${cli.version}` : ""}`
      : cli?.installed
        ? "Update the ‘genmotion’ command"
        : "Install the ‘genmotion’ command";

  return { cli, installing, ready, install, label };
}

/** The hint under the control, in whichever tone the surrounding chrome wants. */
export function CommandLineHint({
  cli,
  ready,
  className,
}: {
  cli: CliStatus | null;
  ready: boolean;
  className?: string;
}) {
  if (cli?.error) {
    return (
      <p className={cx("text-[0.786rem] leading-snug text-warning", className)}>{cli.error}</p>
    );
  }
  if (!ready && cli?.needsNode) {
    return (
      <p className={cx("text-[0.786rem] leading-snug text-text-tertiary", className)}>
        Installs with npm, so it needs <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="underline">Node 22 or newer</a>.
      </p>
    );
  }
  if (!ready) return null;
  return (
    <p className={cx("text-[0.786rem] leading-snug text-text-tertiary", className)}>
      Run <code>genmotion .</code> in a folder to open the app with it shared, or{" "}
      <code>genmotion init</code> to work from the terminal.
    </p>
  );
}
