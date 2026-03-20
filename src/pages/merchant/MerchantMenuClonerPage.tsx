import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantMenuClonerPage() {
  const navigate = useNavigate();
  const [sourceStore, setSourceStore] = useState("Pizza Times Marina");
  const [targetStore, setTargetStore] = useState("Pizza Times Downtown");

  const cloneMenu = () => {
    toast.success("Menu clone prepared");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Menu Cloner" subtitle="Clone categories and items between stores" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={sourceStore} onChange={(e) => setSourceStore(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Source store" />
        <input value={targetStore} onChange={(e) => setTargetStore(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Target store" />
        <button onClick={cloneMenu} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Clone Menu</button>
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
