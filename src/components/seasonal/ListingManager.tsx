import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Link2, Copy, Check, ExternalLink, Eye, EyeOff, Mail, Loader2, Send, Phone, MessageCircle } from "lucide-react";
import { buildAppUrl } from "@/lib/app-domain";
import AIGenerateButton from "@/components/ai/AIGenerateButton";

interface ListingManagerProps {
  propertyId: string;
  propertyLabel: string;
}

const AMENITY_KEYS = [
  "amenity.wifi", "amenity.ac", "amenity.pool", "amenity.parking", "amenity.washer", "amenity.dryer",
  "amenity.kitchen", "amenity.balcony", "amenity.garden", "amenity.tv", "amenity.iron",
  "amenity.linens", "amenity.towels", "amenity.pets", "amenity.accessibility",
];

const ListingManager = ({ propertyId, propertyLabel }: ListingManagerProps) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price_per_night: 0,
    min_nights: 1,
    max_guests: 4,
    cleaning_fee: 0,
    options: [] as string[],
    contact_email: "",
    contact_phone: "",
    whatsapp_number: "",
    telegram_username: "",
  });
  const [shareEmail, setShareEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("public_listings")
      .select("*")
      .eq("property_id", propertyId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) {
      setListing(data);
      const amenities = Array.isArray(data.amenities) ? data.amenities as string[] : [];
      const cleaningFee = amenities.find((a: any) => typeof a === 'object' && a?.type === 'cleaning_fee');
      setForm({
        title: data.title || "",
        description: data.description || "",
        price_per_night: data.price_per_night || 0,
        min_nights: data.min_nights || 1,
        max_guests: data.max_guests || 4,
        cleaning_fee: typeof cleaningFee === 'object' && cleaningFee ? (cleaningFee as any).amount || 0 : 0,
        options: amenities.filter((a: any) => typeof a === 'string') as string[],
        contact_email: (data as any).contact_email || "",
        contact_phone: (data as any).contact_phone || "",
        whatsapp_number: (data as any).whatsapp_number || "",
        telegram_username: (data as any).telegram_username || "",
      });
    }
    setLoading(false);
  }, [propertyId, orgId]);

  useEffect(() => { load(); }, [load]);

  const generateSlug = () => {
    const base = propertyLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const createListing = async () => {
    if (!orgId || !user) return;
    const slug = generateSlug();
    const amenities = [
      ...form.options,
      ...(form.cleaning_fee > 0 ? [{ type: "cleaning_fee", amount: form.cleaning_fee }] : []),
    ];
    const { data, error } = await supabase.from("public_listings").insert({
      property_id: propertyId, org_id: orgId, user_id: user.id, slug,
      title: form.title || propertyLabel, description: form.description,
      price_per_night: form.price_per_night, min_nights: form.min_nights,
      max_guests: form.max_guests, amenities: amenities as any,
      listing_type: "short_term_stay",
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      whatsapp_number: form.whatsapp_number || null,
      telegram_username: form.telegram_username || null,
    } as any).select().single();
    if (error) {
      toast({ title: t("common.error") || "Error", description: error.message, variant: "destructive" });
      return;
    }
    setListing(data);
    toast({ title: t("page.listing_mgr.created") });
  };

  const updateListing = async () => {
    if (!listing) return;
    const amenities = [
      ...form.options,
      ...(form.cleaning_fee > 0 ? [{ type: "cleaning_fee", amount: form.cleaning_fee }] : []),
    ];
    const { error } = await supabase.from("public_listings").update({
      title: form.title, description: form.description,
      price_per_night: form.price_per_night, min_nights: form.min_nights,
      max_guests: form.max_guests, amenities: amenities as any,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      whatsapp_number: form.whatsapp_number || null,
      telegram_username: form.telegram_username || null,
    } as any).eq("id", listing.id);
    if (error) {
      toast({ title: t("common.error") || "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("page.listing_mgr.updated") });
    load();
  };

  const toggleActive = async () => {
    if (!listing) return;
    await supabase.from("public_listings").update({ active: !listing.active } as any).eq("id", listing.id);
    toast({ title: listing.active ? t("page.listing_mgr.deactivated") : t("page.listing_mgr.activated") });
    load();
  };

  const getPublicUrl = () => buildAppUrl(`/listing/${listing?.slug}`);

  const copyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: t("page.listing_mgr.link_copied") });
  };

  const sendLinkByEmail = async () => {
    if (!shareEmail || !listing) return;
    setSendingEmail(true);
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: shareEmail,
          subject: `🏖️ ${t("page.listing_mgr.email_subject")} — ${form.title || propertyLabel}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a1a1a;text-align:center;">🏖️ ${form.title || propertyLabel}</h2>
            <p style="color:#555;text-align:center;">${t("page.listing_mgr.email_body")} :</p>
            <p style="text-align:center;margin:24px 0;">
              <a href="${getPublicUrl()}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">${t("page.listing_mgr.email_cta")}</a>
            </p>
            <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
          </div>`,
        },
      });
      toast({ title: t("page.listing_mgr.email_sent") });
      setShareEmail("");
    } catch {
      toast({ title: t("page.listing_mgr.email_error"), variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const toggleOption = (opt: string) => {
    setForm(p => ({
      ...p,
      options: p.options.includes(opt)
        ? p.options.filter(o => o !== opt)
        : [...p.options, opt],
    }));
  };

  if (loading) return <div className="text-sm text-muted-foreground">{t("page.listing_mgr.loading")}</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Link2 className="h-4 w-4 text-accent" /> {t("page.listing_mgr.title")}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing_mgr.listing_title")}</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={propertyLabel}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing_mgr.price_night")}</label>
          <input type="number" value={form.price_per_night || ""} onFocus={e => { if (e.target.value === "0") e.target.value = ""; }}
            onChange={e => setForm(p => ({ ...p, price_per_night: e.target.value === "" ? 0 : +e.target.value }))} placeholder="0"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing_mgr.cleaning_fee")}</label>
          <input type="number" value={form.cleaning_fee || ""} onFocus={e => { if (e.target.value === "0") e.target.value = ""; }}
            onChange={e => setForm(p => ({ ...p, cleaning_fee: e.target.value === "" ? 0 : +e.target.value }))} placeholder="0"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing_mgr.min_nights")}</label>
          <input type="number" value={form.min_nights || ""} onFocus={e => { if (e.target.value === "0" || e.target.value === "1") e.target.value = ""; }}
            onChange={e => setForm(p => ({ ...p, min_nights: e.target.value === "" ? 1 : +e.target.value }))} placeholder="1"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing_mgr.max_guests")}</label>
          <input type="number" value={form.max_guests || ""} onFocus={e => { if (e.target.value === "0" || e.target.value === "4") e.target.value = ""; }}
            onChange={e => setForm(p => ({ ...p, max_guests: e.target.value === "" ? 4 : +e.target.value }))} placeholder="4"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div className="sm:col-span-2 border-t border-border pt-3 mt-1">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> {t("page.listing_mgr.contact_section") || "Direct contact (public)"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                placeholder="owner@example.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("page.listing_mgr.phone") || "Phone"}</label>
              <input type="tel" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                placeholder="+33 6 12 34 56 78"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</label>
              <input type="tel" value={form.whatsapp_number} onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                placeholder="+33612345678"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Telegram</label>
              <input value={form.telegram_username} onChange={e => setForm(p => ({ ...p, telegram_username: e.target.value }))}
                placeholder="@username"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">{t("page.listing_mgr.description")}</label>
            <AIGenerateButton
              task="listing_description"
              taskContext={`Property: ${form.title || propertyLabel}. Location: ${propertyId}. Max guests: ${form.max_guests}. Price per night: ${form.price_per_night}.`}
              onApply={(text) => setForm(p => ({ ...p, description: text }))}
              label={t("page.ai.generate_desc") || "✨ Generate with AI"}
            />
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
            placeholder={t("page.listing_mgr.description_placeholder")}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("page.listing_mgr.amenities_title")}</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_KEYS.map(key => {
              const label = t(key);
              return (
                <button key={key} type="button" onClick={() => toggleOption(label)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.options.includes(label)
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!listing ? (
        <button onClick={createListing}
          className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
          {t("page.listing_mgr.create_btn")}
        </button>
      ) : (
        <div className="space-y-3">
          <button onClick={updateListing}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
            {t("page.listing_mgr.update_btn")}
          </button>

          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <Link2 className="h-4 w-4 text-accent shrink-0" />
            <span className="text-xs text-foreground truncate flex-1 font-mono">{getPublicUrl()}</span>
            <button onClick={copyLink} className="p-1.5 rounded hover:bg-muted">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
            <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>

          <button onClick={toggleActive}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {listing.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {listing.active ? t("page.listing_mgr.deactivate") : t("page.listing_mgr.reactivate")}
          </button>

          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {t("page.listing_mgr.share_email")}
            </label>
            <div className="flex gap-2">
              <input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="email@example.com"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              <button onClick={sendLinkByEmail} disabled={!shareEmail || sendingEmail}
                className="flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t("page.listing_mgr.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingManager;