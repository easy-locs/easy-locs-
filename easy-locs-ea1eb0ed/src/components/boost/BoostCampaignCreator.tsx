/**
 * BoostCampaignCreator — Modal to create a new boost campaign.
 */
import { useState } from "react";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { validateCampaign } from "@/lib/boost/canonical-boost-engine";
import { Loader2, Sparkles } from "lucide-react";
import { checkKycLevelForAction } from "@/lib/kyc/kyc-gate-service";
import { useKycGate } from "@/hooks/useKycGate";
import KycRequiredSheet from "@/components/kyc/KycRequiredSheet";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const VERTICALS = ["food", "grocery", "shops", "services", "property", "healthcare", "mobility", "experiences", "travel"];
const OBJECTIVES = ["visibility", "traffic", "leads", "contact", "booking"];

export function BoostCampaignCreator({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showKycSheet, setShowKycSheet] = useState(false);
  const kycGate = useKycGate("standard");

  const [form, setForm] = useState({
    entity_id: "",
    vertical: "food",
    subcategory: "",
    objective: "visibility",
    country: "AE",
    city: "Dubai",
    total_budget: "50",
    daily_budget: "10",
    start_at: new Date().toISOString().split("T")[0],
    end_at: "",
    creative_title: "",
    creative_subtitle: "",
    creative_image: "",
    creative_cta: "View",
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!user?.id) return;

    const kycCheck = await checkKycLevelForAction("boost_advertising");
    if (!kycCheck.allowed) {
      setShowKycSheet(true);
      return;
    }

    const campaign = {
      entity_id: form.entity_id,
      canonical_vertical: form.vertical,
      canonical_subcategory: form.subcategory || null,
      total_budget: parseFloat(form.total_budget),
      daily_budget: parseFloat(form.daily_budget),
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
    };

    const errors = validateCampaign(campaign as any);
    if (errors.length) {
      toast({ title: "Validation error", description: errors.join(", "), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: created, error } = await db
        .from("boost_campaigns")
        .insert({
          owner_user_id: user.id,
          entity_id: form.entity_id,
          entity_type: "shop",
          campaign_type: "boost",
          objective: form.objective,
          status: "active",
          start_at: campaign.start_at,
          end_at: campaign.end_at,
          daily_budget: campaign.daily_budget,
          total_budget: campaign.total_budget,
          currency: "AED",
          canonical_vertical: form.vertical,
          canonical_subcategory: form.subcategory || null,
          country: form.country,
          city: form.city,
          targeting_json: {},
        })
        .select("id")
        .single();

      if (error) throw error;

      // Create creative
      if (created?.id && form.creative_title) {
        await db("boost_creatives").insert({
          campaign_id: created.id,
          creative_type: "banner",
          title: form.creative_title,
          subtitle: form.creative_subtitle || null,
          image_url: form.creative_image || null,
          cta_label: form.creative_cta || "View",
          cta_target: `/s/${form.entity_id}`,
          canonical_vertical: form.vertical,
          canonical_subcategory: form.subcategory || null,
          locale: "en",
          status: "active",
        });
      }

      toast({ title: "Campaign created!" });
      onCreated();
    } catch (err: any) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Entity ID / Shop slug</Label>
            <Input placeholder="pizza-times" value={form.entity_id} onChange={(e) => update("entity_id", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vertical</Label>
              <Select value={form.vertical} onValueChange={(v) => update("vertical", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objective</Label>
              <Select value={form.objective} onValueChange={(v) => update("objective", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subcategory (optional)</Label>
            <Input placeholder="pizza, salon, hotel..." value={form.subcategory} onChange={(e) => update("subcategory", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total Budget</Label>
              <Input type="number" value={form.total_budget} onChange={(e) => update("total_budget", e.target.value)} />
            </div>
            <div>
              <Label>Daily Budget</Label>
              <Input type="number" value={form.daily_budget} onChange={(e) => update("daily_budget", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="date" value={form.start_at} onChange={(e) => update("start_at", e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="date" value={form.end_at} onChange={(e) => update("end_at", e.target.value)} />
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-xs font-semibold text-muted-foreground">Creative</p>

          <div>
            <Label>Title</Label>
            <Input placeholder="Best Pizza in Dubai Marina" value={form.creative_title} onChange={(e) => update("creative_title", e.target.value)} />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input placeholder="Order now — 20% off" value={form.creative_subtitle} onChange={(e) => update("creative_subtitle", e.target.value)} />
          </div>
          <div>
            <Label>Image URL</Label>
            <Input placeholder="https://..." value={form.creative_image} onChange={(e) => update("creative_image", e.target.value)} />
          </div>
          <div>
            <Label>CTA Label</Label>
            <Input value={form.creative_cta} onChange={(e) => update("creative_cta", e.target.value)} />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Launch Campaign
          </Button>
        </div>
      </DialogContent>
      <KycRequiredSheet
        open={showKycSheet}
        onClose={() => setShowKycSheet(false)}
        currentLevel={kycGate.currentLevel}
        requiredLevel={kycGate.requiredLevel}
        missingDocuments={kycGate.missingDocuments}
      />
    </Dialog>
  );
}
