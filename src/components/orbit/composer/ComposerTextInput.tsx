/**
 * ComposerTextInput — Single-purpose: auto-resizing textarea with emoji + attach triggers.
 */
import { memo, useRef, useCallback } from "react";
import { Smile, Paperclip } from "lucide-react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onTyping?: () => void;
  onEmoji?: () => void;
  onAttach?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

function ComposerTextInput({
  value, onChange, onKeyDown, onTyping, onEmoji, onAttach, placeholder, disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    onTyping?.();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [onChange, onTyping]);

  return (
    <div className="flex-1 min-w-0 flex items-end rounded-2xl px-1.5 py-1 bg-background border border-border">
      {onEmoji && (
        <button
          onClick={onEmoji}
          className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-transform"
        >
          <Smile className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {onAttach && (
        <button
          onClick={onAttach}
          className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-transform"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm px-2 py-2 text-foreground placeholder:text-muted-foreground resize-none overflow-hidden leading-5"
        style={{ maxHeight: 120 }}
      />
    </div>
  );
}

export default memo(ComposerTextInput);
