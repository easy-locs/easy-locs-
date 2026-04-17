import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Slash } from "lucide-react";
import { matchSlashCommands, type SlashCommand } from "./slash-commands";

export interface SlashCommandInputHandle {
  focus: () => void;
  setValue: (v: string) => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (skipPreview?: boolean) => void;
  onPickCommand?: (cmd: SlashCommand) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const SlashCommandInput = forwardRef<SlashCommandInputHandle, Props>(function SlashCommandInput(
  { value, onChange, onSubmit, onPickCommand, disabled, placeholder },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(0);
  const matches = useMemo(() => matchSlashCommands(value), [value]);
  const showSuggestions = value.startsWith("/") && matches.length > 0;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setValue: (v: string) => {
      onChange(v);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }));

  useEffect(() => {
    if (highlight >= matches.length) setHighlight(0);
  }, [matches.length, highlight]);

  const choose = (cmd: SlashCommand) => {
    if (cmd.kind === "local") {
      onChange(cmd.cmd);
      onPickCommand?.(cmd);
      return;
    }
    const next = `${cmd.cmd} `;
    onChange(next);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(next.length, next.length);
      }
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const cmd = matches[highlight];
        if (cmd) choose(cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onChange("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e.metaKey || e.ctrlKey);
    }
  };

  return (
    <div className="relative flex-1">
      {showSuggestions && (
        <div
          role="listbox"
          aria-label="Slash commands"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border/40 bg-popover shadow-lg overflow-hidden z-30 max-h-72 overflow-y-auto"
        >
          {matches.map((cmd, i) => (
            <button
              key={cmd.cmd}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(cmd);
              }}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 text-sm transition-colors ${
                i === highlight ? "bg-primary/10" : "hover:bg-muted/40"
              }`}
            >
              <Slash className="h-3.5 w-3.5 mt-0.5 text-primary/70 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold">{cmd.cmd}</span>
                  <span className="text-xs text-muted-foreground truncate">{cmd.desc}</span>
                </div>
                {cmd.hint && (
                  <div className="text-[11px] text-muted-foreground/70 truncate">{cmd.hint}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? "Type a command, or / for shortcuts…"}
        className="h-11 rounded-xl text-sm"
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
      />
    </div>
  );
});
