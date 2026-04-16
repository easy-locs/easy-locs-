import { useState, useRef, useCallback, useEffect } from "react";
import { FileSignature, Check, X, Loader2, Download, PenTool, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  createSigningEnvelope,
  signDocument,
  getEnvelopesForLease,
  type SigningEnvelope,
  type CreateEnvelopeOptions,
} from "@/services/e-signature.service";

interface ESignatureFlowProps {
  leaseId: string;
  documentUrl: string;
  leaseTitle: string;
  landlord: { name: string; email: string };
  tenant: { name: string; email: string };
  currentUserRole: "landlord" | "tenant";
  onSigned?: (envelope: SigningEnvelope) => void;
}

export default function ESignatureFlow({
  leaseId,
  documentUrl,
  leaseTitle,
  landlord,
  tenant,
  currentUserRole,
  onSigned,
}: ESignatureFlowProps) {
  const { t } = useI18n();
  const [envelope, setEnvelope] = useState<SigningEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    loadExisting();
  }, [leaseId]);

  const loadExisting = async () => {
    setLoading(true);
    try {
      const envelopes = await getEnvelopesForLease(leaseId);
      if (envelopes.length > 0) {
        setEnvelope(envelopes[envelopes.length - 1]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createSigningEnvelope({
        leaseId,
        title: leaseTitle,
        documentUrl,
        landlord,
        tenant,
      });
      if (result.ok && result.envelope) {
        setEnvelope(result.envelope);
        toast.success(t("esign.created") || "Signing envelope created");
      } else {
        toast.error(result.error || "Failed to create envelope");
      }
    } finally {
      setCreating(false);
    }
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (showSignPad) {
      setTimeout(initCanvas, 100);
    }
  }, [showSignPad, initCanvas]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleEnd = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!envelope || !canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    const party = envelope.parties.find((p) => p.role === currentUserRole);
    if (!party) {
      toast.error("You are not a signing party");
      return;
    }

    setSigning(true);
    try {
      const result = await signDocument(envelope.id, party.id, dataUrl);
      if (result.ok) {
        toast.success(t("esign.signed") || "Document signed");
        await loadExisting();
        setShowSignPad(false);
        if (envelope.status === "signed") {
          onSigned?.(envelope);
        }
      } else {
        toast.error(result.error || "Signing failed");
      }
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!envelope) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/60 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileSignature className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("esign.title") || "E-Signature"}</h3>
            <p className="text-xs text-muted-foreground">{t("esign.desc") || "Sign this lease digitally"}</p>
          </div>
        </div>
        {currentUserRole === "landlord" && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
            {t("esign.create_envelope") || "Create Signing Envelope"}
          </button>
        )}
      </div>
    );
  }

  const currentParty = envelope.parties.find((p) => p.role === currentUserRole);
  const hasCurrentSigned = currentParty?.status === "signed";

  return (
    <div className="rounded-xl border border-border/20 bg-card/60 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          envelope.status === "signed" ? "bg-green-500/10" : "bg-primary/10"
        }`}>
          {envelope.status === "signed" ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <FileSignature className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{envelope.title}</h3>
          <p className="text-xs text-muted-foreground capitalize">{envelope.status}</p>
        </div>
      </div>

      <div className="space-y-2">
        {envelope.parties.map((party) => (
          <div
            key={party.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20"
          >
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">{party.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{party.role}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
              party.status === "signed"
                ? "bg-green-500/10 text-green-500"
                : party.status === "declined"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-yellow-500/10 text-yellow-600"
            }`}>
              {party.status === "signed" ? <Check className="h-2.5 w-2.5" /> :
               party.status === "declined" ? <X className="h-2.5 w-2.5" /> :
               <AlertCircle className="h-2.5 w-2.5" />}
              {party.status}
            </div>
          </div>
        ))}
      </div>

      {!hasCurrentSigned && envelope.status === "pending" && !showSignPad && (
        <button
          onClick={() => setShowSignPad(true)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <PenTool className="h-4 w-4" />
          {t("esign.sign_now") || "Sign Now"}
        </button>
      )}

      {showSignPad && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {t("esign.draw_signature") || "Draw your signature below"}
          </p>
          <div className="relative rounded-lg border border-border/30 bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full touch-none"
              style={{ height: 120 }}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCanvas}
              className="flex-1 py-2 rounded-lg text-xs font-medium border border-border/30 text-foreground active:scale-[0.98] transition-all"
            >
              {t("common.clear") || "Clear"}
            </button>
            <button
              onClick={() => setShowSignPad(false)}
              className="flex-1 py-2 rounded-lg text-xs font-medium border border-border/30 text-foreground active:scale-[0.98] transition-all"
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              onClick={handleSign}
              disabled={signing}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {signing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {t("esign.confirm_sign") || "Sign"}
            </button>
          </div>
        </div>
      )}

      {envelope.status === "signed" && envelope.signedDocumentUrl && (
        <a
          href={envelope.signedDocumentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border/30 text-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t("esign.download_signed") || "Download Signed Document"}
        </a>
      )}
    </div>
  );
}
