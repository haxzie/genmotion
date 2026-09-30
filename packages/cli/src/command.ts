import type { ParseArgsConfig } from "node:util";
import type { Output } from "./output";

export type OptionSpec = NonNullable<ParseArgsConfig["options"]>;

export interface CommandContext {
  values: Record<string, string | boolean | (string | boolean)[] | undefined>;
  positionals: string[];
  out: Output;
}

export interface Command {
  name: string;
  /** One line for `genmotion --help`. */
  summary: string;
  /** Full help text, shown by `genmotion <command> --help`. */
  help: string;
  options: OptionSpec;
  /** Returns an exit code, or nothing for 0. Long-running commands resolve when done. */
  run(ctx: CommandContext): Promise<number | void>;
}

/** Options every command accepts. */
export const GLOBAL_OPTIONS: OptionSpec = {
  json: { type: "boolean" },
  dir: { type: "string", short: "C" },
  help: { type: "boolean", short: "h" },
};

export function str(value: CommandContext["values"][string]): string | undefined {
  if (Array.isArray(value)) return str(value[value.length - 1]);
  return typeof value === "string" ? value : undefined;
}

export function strs(value: CommandContext["values"][string]): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return typeof value === "string" ? [value] : [];
}

export function num(value: CommandContext["values"][string], flag: string): number | undefined {
  const text = str(value);
  if (text === undefined) return undefined;
  const n = Number(text);
  if (!Number.isFinite(n)) throw new Error(`--${flag} expects a number, got "${text}"`);
  return n;
}
