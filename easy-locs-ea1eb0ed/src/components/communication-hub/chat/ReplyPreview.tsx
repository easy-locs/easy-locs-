import { useI18n } from "@/lib/i18n";

type Props = {
  replyTo: { msgId: string; content: string; senderName?: string } | null;
  onClear: () => void;
};

export function ReplyPreview({ replyTo, onClear }: Props) {
  const { t } = useI18n();
  if (!replyTo) return null;

  return (
    <div className="flex items-center gap-2 border-l-2 border-accent bg-muted/50 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-accent truncate">
          {t("orbit.chat.replying_to", { name: replyTo.senderName || "message" })}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {replyTo.content}
        </p>
      </div>
      <button
        onClick={onClear}
        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
      >
        {t("orbit.chat.cancel")}
      </button>
    </div>
  );
}
