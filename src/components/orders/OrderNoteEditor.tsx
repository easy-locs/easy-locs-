import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function OrderNoteEditor({
  orderId,
  initialValue,
  onSaved,
}: {
  orderId: string;
  initialValue?: string | null;
  onSaved?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("orders")
        .update({
          notes: value.trim() || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Order note saved");
      onSaved?.(value);
    } catch (err: any) {
      toast.error(err.message || "Could not save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Order Note</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Add internal or delivery note..."
        className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Note"}
      </button>
    </div>
  );
}
