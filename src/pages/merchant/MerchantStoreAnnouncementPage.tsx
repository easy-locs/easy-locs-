import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantStoreAnnouncementPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Free drink after 10 PM");
  const [enabled, setEnabled] = useState(true);

  const save = () => {
    toast.success("Store announcement saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Store Announcement" subtitle="Show a banner to customers" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <button onClick={() => setEnabled((v) => !v)} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground w-full">
          {enabled ? "Announcement On" : "Announcement Off"}
        </button>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none" placeholder="Announcement text" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Announcement</button>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
