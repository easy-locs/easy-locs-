/**
 * AddContactPage — Handles /add-contact?data=... deep links from QR contact cards.
 * Decodes the base64 contact payload, adds to contacts, redirects to Orbit.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { upsertOrbitContact } from "@/lib/orbit/orbit-contacts-service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";

function fromBase64Utf8(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function AddContactPage() {
  const { user, orgId } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [contactName, setContactName] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const data = searchParams.get("data");
    if (!data) { setStatus("error"); return; }

    (async () => {
      try {
        const decoded = fromBase64Utf8(data);
        const parsed = JSON.parse(decoded);
        if (parsed.t !== "el-contact" || !parsed.userId) throw new Error("Invalid");
        if (parsed.userId === user.id) {
          toast.info("That's your own contact code!");
          navigate("/orbit?section=contacts", { replace: true });
          return;
        }

        setContactName(parsed.name || "Contact");

        await upsertOrbitContact({
          ownerUserId: user.id,
          peerUserId: parsed.userId || null,
          peerOrbitId: parsed.orbitId || null,
          displayName: parsed.name || "Contact",
          email: parsed.email || null,
          source: "qr_link",
          metadata: { qr: true },
        });

        toast.success(`${parsed.name || "Contact"} added!`);
        setStatus("success");
        setTimeout(() => navigate("/orbit?section=contacts", { replace: true }), 1500);
      } catch {
        setStatus("error");
        toast.error("Invalid contact link");
        setTimeout(() => navigate("/orbit?section=contacts", { replace: true }), 2000);
      }
    })();
  }, [user?.id, searchParams, navigate, orgId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      {status === "loading" && (
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Adding contact…</p>
        </div>
      )}
      {status === "success" && (
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
          <p className="text-sm font-semibold text-foreground">{contactName} added!</p>
          <p className="text-xs text-muted-foreground">Redirecting to Orbit…</p>
        </div>
      )}
      {status === "error" && (
        <div className="text-center space-y-3">
          <UserPlus className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Invalid link — redirecting…</p>
        </div>
      )}
    </div>
  );
}
