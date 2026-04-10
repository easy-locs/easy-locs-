import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as docRepo from "@/repositories/documents.repository";
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
      const blob = await (await fetch(signature)).blob();
      const path = `signatures/${documentId}_${signerRole}_${Date.now()}.png`;
      await docRepo.uploadSignature(path, blob);

      const updateData = signerRole === "owner"
        ? { signed_by_owner_at: new Date().toISOString(), owner_signature_url: path }
        : { signed_by_tenant_at: new Date().toISOString(), tenant_signature_url: path };
      await docRepo.updateDocument(documentId, updateData);

      await docRepo.insertAuditLog({
        user_id: user.id, org_id: orgId, action: "document_signed",
        metadata_json: { document_id: documentId, signer_role: signerRole, title: documentTitle },
      });

      if (orgId && signerRole === "tenant") {
        const ownerUserId = await docRepo.fetchOrgOwnerUserId(orgId);
        if (ownerUserId) {
          await docRepo.insertNotification({
            user_id: ownerUserId, org_id: orgId, type: "document",
            title: "✍️ Document signé par le locataire", message: `${documentTitle} a été signé.`, link: "/dashboard/documents",
          });
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
            <div className="p-2 rounded-xl bg-accent/10">
              <PenTool className="h-5 w-5 text-accent" />
            </div>
            Signer le document
          </DialogTitle>
          <DialogDescription className="text-sm">{documentTitle}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Signing role badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              signerRole === "owner" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
            }`}>
              {signerRole === "owner" ? "🏠 Bailleur" : "👤 Locataire"}
            </span>
          </div>

          <SignaturePad
            label="Votre signature"
            value={signature}
            onChange={setSignature}
            width={450}
            height={180}
          />

          <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
            <PenTool className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              En signant, vous acceptez les termes de ce document. Cette action est horodatée et enregistrée dans le journal d'audit.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSign} disabled={!signature || saving} className="bg-gradient-gold text-accent-foreground hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
            Signer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureDialog;
