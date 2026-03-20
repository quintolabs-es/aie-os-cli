import {
  clearScreenDown,
  cursorTo,
  emitKeypressEvents,
  moveCursor,
  type Key,
} from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { terminalStyle } from "./terminalStyle";
import type { CommandName } from "./types";

export class CommandCanceledError extends Error {
  readonly command: CommandName;

  constructor(command: CommandName) {
    super(`${command} canceled.`);
    this.command = command;
    this.name = "CommandCanceledError";
  }
}

export function canPromptInteractively(): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

type TextPromptInput = {
  command: CommandName;
  defaultValue: string;
  description?: string;
  errorMessage?: string;
  optionName: string;
  promptLabel: string;
  submitHint: string;
};

type SingleSelectPromptInput = {
  command: CommandName;
  defaultValue: string | null;
  explanation: string;
  label: string;
  options: string[];
};

type MultiSelectPromptInput = {
  allowEmpty: boolean;
  command: CommandName;
  defaultValue: string[];
  explanation: string;
  label: string;
  options: string[];
};

type PromptCursor = {
  column: number;
  lineIndex: number;
};

type RenderedPrompt = {
  cursor: PromptCursor;
  hideCursor?: boolean;
  lines: string[];
};

export async function promptTextInput(inputOptions: TextPromptInput): Promise<string> {
  let value = inputOptions.defaultValue;
  let showingDefault = true;

  return runInteractivePrompt(inputOptions.command, {
    handleKey(str, key) {
      if (isEnterKey(key)) {
        return {
          done: value,
        };
      }

      if (key.name === "backspace") {
        value = Array.from(value).slice(0, -1).join("");
        showingDefault = false;
        return {};
      }

      if (isPrintableCharacter(str, key)) {
        value = showingDefault ? str : `${value}${str}`;
        showingDefault = false;
      }

      return {};
    },
    render() {
      const headerLines = terminalStyle.promptHeaderBox(
        `Set ${inputOptions.promptLabel} (${inputOptions.optionName})`,
      );
      const lines = [
        "",
        ...headerLines,
        "",
        `> ${value}`,
      ];

      if (inputOptions.errorMessage) {
        lines.push("", terminalStyle.error(inputOptions.errorMessage));
      }

      lines.push("", terminalStyle.hint(inputOptions.submitHint));

      return {
        cursor: {
          column: 2 + value.length,
          lineIndex: headerLines.length + 2,
        },
        lines,
      };
    },
  });
}

export async function promptSingleSelect(inputOptions: SingleSelectPromptInput): Promise<string> {
  if (inputOptions.options.length === 0) {
    throw new Error(`No options available for ${inputOptions.label}`);
  }

  let activeIndex = inputOptions.defaultValue
    ? Math.max(inputOptions.options.indexOf(inputOptions.defaultValue), 0)
    : 0;

  return runInteractivePrompt(inputOptions.command, {
    handleKey(_str, key) {
      if (key.name === "up") {
        activeIndex = activeIndex === 0 ? inputOptions.options.length - 1 : activeIndex - 1;
        return {};
      }

      if (key.name === "down") {
        activeIndex = activeIndex === inputOptions.options.length - 1 ? 0 : activeIndex + 1;
        return {};
      }

      if (isEnterKey(key)) {
        return {
          done: inputOptions.options[activeIndex],
        };
      }

      return {};
    },
    render() {
      const headerLines = terminalStyle.promptHeaderBox(inputOptions.label);
      return {
        hideCursor: true,
        cursor: {
          column: 0,
          lineIndex: 0,
        },
        lines: [
          "",
          ...headerLines,
          "",
          ...inputOptions.options.map((option, index) =>
            formatOptionLine({
              active: index === activeIndex,
              label: `${index + 1}) ${option}`,
            })),
          "",
          terminalStyle.hint("Use ↑/↓ to move, Enter to confirm, Esc to cancel."),
        ],
      };
    },
  });
}

export async function promptMultiSelect(inputOptions: MultiSelectPromptInput): Promise<string[]> {
  if (inputOptions.options.length === 0) {
    return [];
  }

  let activeIndex = 0;
  let errorMessage = "";
  const selected = new Set(inputOptions.defaultValue);

  return runInteractivePrompt(inputOptions.command, {
    handleKey(str, key) {
      if (key.name === "up") {
        activeIndex = activeIndex === 0 ? inputOptions.options.length - 1 : activeIndex - 1;
        return {};
      }

      if (key.name === "down") {
        activeIndex = activeIndex === inputOptions.options.length - 1 ? 0 : activeIndex + 1;
        return {};
      }

      if (key.name === "space" || str === " ") {
        const option = inputOptions.options[activeIndex];
        if (selected.has(option)) {
          selected.delete(option);
        } else {
          selected.add(option);
        }
        errorMessage = "";
        return {};
      }

      if (isEnterKey(key)) {
        if (!inputOptions.allowEmpty && selected.size === 0) {
          errorMessage = "Select at least one option.";
          return {};
        }

        return {
          done: inputOptions.options.filter((option) => selected.has(option)),
        };
      }

      return {};
    },
    render() {
      const headerLines = terminalStyle.promptHeaderBox(inputOptions.label);
      const lines = [
        "",
        ...headerLines,
        "",
        ...inputOptions.options.map((option, index) =>
          formatOptionLine({
            active: index === activeIndex,
            label: `${index + 1}) [${selected.has(option) ? "x" : " "}] ${option}`,
          })),
      ];

      if (errorMessage) {
        lines.push("", terminalStyle.error(errorMessage));
      }

      lines.push("", terminalStyle.hint("Use ↑/↓ to move, Space to toggle, Enter to confirm, Esc to cancel."));

      return {
        hideCursor: true,
        cursor: {
          column: 0,
          lineIndex: 0,
        },
        lines,
      };
    },
  });
}

async function runInteractivePrompt<T>(
  command: CommandName,
  inputOptions: {
    handleKey: (str: string | undefined, key: Key) => { done?: T };
    render: () => RenderedPrompt;
  },
): Promise<T> {
  if (!canPromptInteractively()) {
    throw new Error("Interactive prompting requires a TTY.");
  }

  return new Promise<T>((resolve, reject) => {
    let hasRendered = false;
    let lastCursorRowOffset = 0;
    let rawModeEnabled = false;

    const cleanup = () => {
      input.off("keypress", onKeypress);
      clearRenderedBlock(lastCursorRowOffset, hasRendered);
      terminalStyle.showCursor();
      if (rawModeEnabled && input.isTTY) {
        input.setRawMode(false);
      }
      input.pause();
    };

    const render = () => {
      const renderedPrompt = inputOptions.render();
      clearRenderedBlock(lastCursorRowOffset, hasRendered);
      output.write(renderedPrompt.lines.join("\n"));
      lastCursorRowOffset = positionCursor(renderedPrompt);
      hasRendered = true;
    };

    const finish = (callback: () => void) => {
      cleanup();
      callback();
    };

    const onKeypress = (str: string | undefined, key: Key) => {
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        finish(() => reject(new CommandCanceledError(command)));
        return;
      }

      const result = inputOptions.handleKey(str, key);
      if (Object.prototype.hasOwnProperty.call(result, "done")) {
        finish(() => resolve(result.done as T));
        return;
      }

      render();
    };

    emitKeypressEvents(input);
    if (input.isTTY) {
      input.setRawMode(true);
      rawModeEnabled = true;
    }

    input.resume();
    input.on("keypress", onKeypress);
    render();
  });
}

function positionCursor(renderedPrompt: RenderedPrompt): number {
  const terminalWidth = Math.max(output.columns ?? 80, 1);
  const totalRows = countBlockRows(renderedPrompt.lines, terminalWidth);

  if (renderedPrompt.hideCursor) {
    terminalStyle.hideCursor();
    return totalRows - 1;
  }

  terminalStyle.showCursor();
  const rowsBeforeCursor = renderedPrompt.lines
    .slice(0, renderedPrompt.cursor.lineIndex)
    .reduce((total, line) => total + countDisplayRows(line, terminalWidth), 0);
  const cursorLineRowOffset = Math.floor(renderedPrompt.cursor.column / terminalWidth);
  const cursorColumn = renderedPrompt.cursor.column % terminalWidth;
  const targetRowOffset = rowsBeforeCursor + cursorLineRowOffset;
  const currentRowOffset = totalRows - 1;

  moveCursor(output, 0, targetRowOffset - currentRowOffset);
  cursorTo(output, cursorColumn);
  return targetRowOffset;
}

function clearRenderedBlock(lastCursorRowOffset: number, hasRendered: boolean): void {
  if (!hasRendered) {
    return;
  }

  moveCursor(output, 0, -lastCursorRowOffset);
  cursorTo(output, 0);
  clearScreenDown(output);
}

function countBlockRows(lines: string[], width: number): number {
  return lines.reduce((total, line) => total + countDisplayRows(line, width), 0);
}

function countDisplayRows(line: string, width: number): number {
  const visibleLength = stripAnsi(line).length;
  return Math.max(1, Math.ceil(Math.max(visibleLength, 1) / width));
}

function formatOptionLine(inputOptions: { active: boolean; label: string }): string {
  const prefix = inputOptions.active ? ">" : " ";
  const line = `${prefix} ${inputOptions.label}`;

  return inputOptions.active ? terminalStyle.selected(line) : line;
}

function isEnterKey(key: Key): boolean {
  return key.name === "return" || key.name === "enter";
}

function isPrintableCharacter(str: string | undefined, key: Key): str is string {
  return typeof str === "string" && str.length > 0 && !key.ctrl && !key.meta && key.name !== "escape";
}

function stripAnsi(value: string): string {
  return value.replace(/\u001B\[[0-9;]*m/gu, "");
}
