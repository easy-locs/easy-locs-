import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function CustomerReferFriendPage() {
  const navigate = useNavigate();
  const [code] = useState("EASYDXB25");

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    toast.success("Referral code copied");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Refer a Friend</h1>
          <p className="text-xs text-muted-foreground">Share your invite code</p>
        </div>
      </div>

      <div className="px-4 py-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Your referral code</p>
        <p className="text-3xl font-black text-foreground tracking-widest">{code}</p>
        <button
          onClick={copy}
          className="rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-bold"
        >
          Copy Code
        </button>
      </div>
    </div>
  );
}
