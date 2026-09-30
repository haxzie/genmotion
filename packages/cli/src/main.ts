import { main } from "./run";

const code = await main(process.argv.slice(2));
// Long-lived commands (dev, mcp) resolve only when they are finished, so exit
// explicitly: a lingering handle (a watcher, a keep-alive socket) must not
// keep a finished command alive.
process.exit(code);
