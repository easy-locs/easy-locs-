import { useState } from "react";
import { BrainCircuit, Loader2, Check, Copy, X } from "lucide-react";
import { invokeAIAssistant } from "@/repositories/ai.repository";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface AIGenerateButtonProps {
  task: "listing_description" | "listing_title" | "translate" | "guest_reply" | "seo_improve" | "summarize";
  taskContext: string;
  onApply: (text: string) => void;
  label?: string;
  targetLocale?: string;
  className?: string;
  variant?: "button" | "icon";
}

const AIGenerateButton = ({
  task,
  taskContext,
  onApply,
  label,
  targetLocale,
  className = "",
  variant = "button",
}: AIGenerateButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const { locale, t } = useI18n();

  const generate = async () => {
    setLoading(true);
    setResult("");
    setOpen(true);

    try {
      const message =
        task === "translate"
          ? `Translate the following to ${targetLocale || "en"}:\n\n${taskContext}`
          : taskContext;

      const data = await invokeAIAssistant({ message, locale, task, taskContext });
      const error = null;

      if (error) throw error;
      setResult(data.reply || "");
    } catch (e) {
      toast.error(t("page.ai.error") || "AI generation failed");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply(result);
    setOpen(false);
    setResult("");
    toast.success(t("page.ai.applied") || "Applied successfully");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success(t("page.ai.copied") || "Copied to clipboard");
  };

  const defaultLabel = label || (t("page.ai.generate") || "Generate with AI");

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={generate}
          disabled={loading}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-accent hover:bg-accent/10 transition-colors disabled:opacity-50 ${className}`}
          title={defaultLabel}
          type="button"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
        </button>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors disabled:opacity-50 ${className}`}
          type="button"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
          {defaultLabel}
        </button>
      )}

      {/* Result dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => { setOpen(false); setResult(""); }} />
          <div className="relative w-full max-w-lg bg-card rounded-xl border border-border shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BrainCircuit className="h-4 w-4 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">
                  {t("page.ai.copilot") || "AI Copilot"}
                </h3>
              </div>
              <button onClick={() => { setOpen(false); setResult(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">{t("page.ai.generating") || "Generating..."}</p>
                </div>
              ) : (
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full min-h-[200px] bg-background border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  placeholder={t("page.ai.edit_hint") || "Edit the generated content before applying..."}
                />
              )}
            </div>

            {/* Actions */}
            {!loading && result && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                  {t("page.ai.copy") || "Copy"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => generate()}
                    className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                  >
                    {t("page.ai.regenerate") || "Regenerate"}
                  </button>
                  <button
                    onClick={handleApply}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t("page.ai.apply") || "Apply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AIGenerateButton;
