import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/ui/SignaturePad";
import { PenTool, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  signerRole: "owner" | "tenant";
  onSigned: () => void;
}

const SignatureDialog = ({ open, onOpenChange, documentId, documentTitle, signerRole, onSigned }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSign = async () => {
    if (!signature || !user) return;
    setSaving(true);
    try {
      // Upload signature image
      const blob = await (await fetch(signature)).blob();
      const path = `signatures/${documentId}_${signerRole}_${Date.now()}.png`;
      await supabase.storage.from("rental-docs").upload(path, blob, { contentType: "image/png" });

      // Update document
      const updateData = signerRole === "owner"
        ? { signed_by_owner_at: new Date().toISOString(), owner_signature_url: path }
        : { signed_by_tenant_at: new Date().toISOString(), tenant_signature_url: path };

      await supabase.from("documents").update(updateData).eq("id", documentId);

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        org_id: orgId,
        action: "document_signed",
        metadata_json: { document_id: documentId, signer_role: signerRole, title: documentTitle },
      });

      // Notification
      if (orgId) {
        const notifTitle = signerRole === "owner" ? "✍️ Document signé par le bailleur" : "✍️ Document signé par le locataire";
        // Notify the other party
        if (signerRole === "tenant") {
          const { data: org } = await supabase.from("orgs").select("owner_user_id").eq("id", orgId).single();
          if (org?.owner_user_id) {
            await supabase.from("notifications").insert({
              user_id: org.owner_user_id, org_id: orgId, type: "document",
              title: notifTitle, message: `${documentTitle} a été signé.`, link: "/dashboard/documents",
            });
          }
        }
      }

      toast({ title: "✅ Signé", description: `${documentTitle} signé avec succès.` });
      onSigned();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signer le document
          </DialogTitle>
          <DialogDescription>{documentTitle}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <SignaturePad
            label="Votre signature"
            value={signature}
            onChange={setSignature}
            width={450}
            height={180}
          />
          <p className="text-xs text-muted-foreground mt-2">
            By signing, you accept the terms of this document. This action is logged and timestamped.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSign} disabled={!signature || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
            Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureDialog;
