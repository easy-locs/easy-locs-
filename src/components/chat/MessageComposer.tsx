import { useState, useRef } from "react";
import { Send, Plus } from "lucide-react";

export function MessageComposer(props: {
  onSend: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    await props.onSend(value);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2">
        <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 active:scale-[0.95] transition-transform">
          <Plus className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Message"
          className="flex-1 rounded-full border border-border bg-muted/30 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
        />

        <button
          onClick={() => void submit()}
          disabled={!text.trim()}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-[0.95] transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
