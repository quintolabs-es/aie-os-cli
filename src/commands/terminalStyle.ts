import { stdout as output } from "node:process";

const ANSI_RESET = "\u001B[0m";
const ANSI_DIM = "\u001B[2m";
const ANSI_ERROR = "\u001B[31m";
const ANSI_HEADER = "\u001B[38;2;209;146;22m";
const ANSI_SELECTED = "\u001B[38;2;22;146;209m";
const ANSI_HIDE_CURSOR = "\u001B[?25l";
const ANSI_SHOW_CURSOR = "\u001B[?25h";

export const terminalStyle = {
  hideCursor(): void {
    output.write(ANSI_HIDE_CURSOR);
  },
  hint(value: string): string {
    return colorize(value, ANSI_DIM);
  },
  promptHeader(value: string): string {
    return colorize(value, ANSI_HEADER);
  },
  promptHeaderBox(title: string): string[] {
    const horizontal = "─".repeat(title.length + 2);
    return [
      colorize(`┌${horizontal}┐`, ANSI_HEADER),
      colorize(`│ ${title} │`, ANSI_HEADER),
      colorize(`└${horizontal}┘`, ANSI_HEADER),
    ];
  },
  selected(value: string): string {
    return colorize(value, ANSI_SELECTED);
  },
  showCursor(): void {
    output.write(ANSI_SHOW_CURSOR);
  },
  error(value: string): string {
    return colorize(value, ANSI_ERROR);
  },
} as const;

function colorize(value: string, ansiCode: string): string {
  if (!canUseColor()) {
    return value;
  }

  return `${ansiCode}${value}${ANSI_RESET}`;
}

function canUseColor(): boolean {
  return Boolean(output.isTTY && !("NO_COLOR" in process.env));
}
