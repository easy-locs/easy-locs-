/**
 * AddContactPage — Handles /add-contact deep links from QR contact cards.
 * Supports two input formats:
 * 1. Canonical QR engine: /add-contact?userId=...&name=...
 * 2. Legacy el-contact: /add-contact?data=<base64>
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

function getHashSearchParams(): URLSearchParams {
  const hash = window.location.hash || "";
  const qIdx = hash.indexOf("?");
  return qIdx >= 0 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
}

function resolveContactPayload(searchParams: URLSearchParams): { userId: string; name: string; orbitId?: string; email?: string } | null {
  const hashParams = getHashSearchParams();

  const directUserId = searchParams.get("userId") || hashParams.get("userId");
  if (directUserId) {
    return {
      userId: directUserId,
      name: searchParams.get("name") || hashParams.get("name") || "Contact",
      orbitId: searchParams.get("orbitId") || hashParams.get("orbitId") || undefined,
      email: searchParams.get("email") || hashParams.get("email") || undefined,
    };
  }

  let data = searchParams.get("data") || hashParams.get("data");
  if (!data) {
    const fallback = new URLSearchParams(window.location.search);
    data = fallback.get("data");
  }
  if (!data) return null;

  try {
    const decoded = fromBase64Utf8(data);
    const parsed = JSON.parse(decoded);
    if ((!parsed.t || parsed.t === "el-contact") && parsed.userId) {
      return {
        userId: parsed.userId,
        name: parsed.name || "Contact",
        orbitId: parsed.orbitId,
        email: parsed.email,
      };
    }
  } catch {}
  return null;
}

export default function AddContactPage() {
  const { user, orgId } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [contactName, setContactName] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const payload = resolveContactPayload(searchParams);
    if (!payload) { setStatus("error"); return; }

    if (payload.userId === user.id) {
      toast.info("That's your own contact code!");
      navigate("/orbit?section=contacts", { replace: true });
      return;
    }

    setContactName(payload.name);

    (async () => {
      try {
        await upsertOrbitContact({
          ownerUserId: user.id,
          peerUserId: payload.userId,
          peerOrbitId: payload.orbitId || null,
          displayName: payload.name,
          email: payload.email || null,
          source: "qr_link",
          metadata: { qr: true },
        });

        toast.success(`${payload.name} added!`);
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
