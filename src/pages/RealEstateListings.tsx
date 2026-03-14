import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FeatureGate from "@/components/subscription/FeatureGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Building2, MapPin, Ruler, BedDouble, Bath, Euro,
  Eye, Edit, Trash2, Link2, Copy, Check, Users, Clock,
  Home, Tag, ArrowUpRight, Mail, Phone, MessageCircle,
  ExternalLink, PhoneCall, Send, Upload, X as XIcon, Camera,
} from "lucide-react";
import { format } from "date-fns";
import { buildAppUrl } from "@/lib/app-domain";
import { getShareLinks, getCleanShareUrl } from "@/lib/social-share";
import RealEstatePhotoUploader from "@/components/public/RealEstatePhotoUploader";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";
import MapPreview from "@/components/ui/MapPreview";
import { getCountryConfig } from "@/lib/country-config";
import { PermissionGate } from "@/components/auth/PermissionGate";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "villa", label: "Villa" },
  { value: "office", label: "Office" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const LISTING_TYPES = [
  { value: "sale", label: "For Sale", emoji: "🏷️" },
  { value: "long_term_rent", label: "Long-term Rent", emoji: "🏠" },
];

const STATUS_MAP: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  under_offer: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  sold: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  rented: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  archived: "bg-muted text-muted-foreground",
};

interface Listing {
  id: string;
  title: string;
  description: string;
  listing_type: string;
  price: number;
  currency: string;
  property_type: string;
  country: string;
  city: string;
  address: string;
  surface_sqm: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  photo_urls: string[];
  status: string;
  slug: string;
  contact_email: string;
  contact_phone: string;
  features: string[];
  parking: boolean;
  garden: boolean;
  terrace: boolean;
  elevator: boolean;
  furnished: boolean;
  energy_class: string;
  views_count: number;
  created_at: string;
  updated_at?: string;
}

interface Lead {
  id: string;
  listing_id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "🌍 Public", desc: "Visible in global catalogue & search engines" },
  { value: "unlisted", label: "🔗 Private Link", desc: "Only accessible via direct link" },
  { value: "private", label: "🔒 Private", desc: "Only visible in your dashboard" },
];

const emptyForm = {
  title: "", description: "", listing_type: "sale", price: 0, currency: "EUR",
  property_type: "apartment", country: "", city: "", address: "", surface_sqm: 0,
  rooms: 1, bedrooms: 0, bathrooms: 1, contact_email: "", contact_phone: "",
  parking: false, garden: false, terrace: false, elevator: false, furnished: false,
  energy_class: "", visibility: "public", latitude: 0, longitude: 0,
  agency_name: "", agent_name: "", agency_logo_url: "", license_number: "",
  company_registration: "", agency_phone: "", agency_email: "",
};

export default function RealEstateListings() {
  const { orgId, user, subscription } = useAuth();
  const { ensureOrg } = useEnsureOrg();
  const activeCountry = useCountryFilter();
  const { toast } = useToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("listings");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      setLoading(true);
      let q = supabase.from("real_estate_listings").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
      if (activeCountry) q = q.eq("country", activeCountry);
      const { data } = await q;
      setListings((data || []) as any);

      const { data: leadsData } = await supabase.from("real_estate_leads").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
      setLeads((leadsData || []) as any);
      setLoading(false);
    };
    fetch();
  }, [orgId, activeCountry]);

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const resolvedOrgId = orgId || await ensureOrg();
    if (!resolvedOrgId) { toast({ title: "Impossible de créer votre espace", variant: "destructive" }); return; }
    const payload: any = {
      ...form, org_id: resolvedOrgId, user_id: user!.id,
      country: form.country || activeCountry || "",
      latitude: form.latitude || null,
      longitude: form.longitude || null,
    };

    if (editId) {
      const { error } = await supabase.from("real_estate_listings").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Listing updated" });
    } else {
      const { error } = await supabase.from("real_estate_listings").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Listing created" });
    }
    setCreateOpen(false);
    setEditId(null);
    setForm(emptyForm);
    // Refresh
    const { data } = await supabase.from("real_estate_listings").select("*").eq("org_id", orgId!).order("created_at", { ascending: false });
    setListings((data || []) as any);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("real_estate_listings").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setListings(prev => prev.filter(l => l.id !== id));
    toast({ title: "Listing deleted" });
  };

  const handleEdit = (listing: Listing) => {
    setForm({
      title: listing.title, description: listing.description, listing_type: listing.listing_type,
      price: listing.price, currency: listing.currency, property_type: listing.property_type,
      country: listing.country, city: listing.city, address: listing.address,
      surface_sqm: listing.surface_sqm, rooms: listing.rooms, bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms, contact_email: listing.contact_email, contact_phone: listing.contact_phone,
      parking: listing.parking, garden: listing.garden, terrace: listing.terrace,
      elevator: listing.elevator, furnished: listing.furnished, energy_class: listing.energy_class,
      visibility: (listing as any).visibility || "public",
      latitude: (listing as any).latitude || 0,
      longitude: (listing as any).longitude || 0,
      agency_name: (listing as any).agency_name || "",
      agent_name: (listing as any).agent_name || "",
      agency_logo_url: (listing as any).agency_logo_url || "",
      license_number: (listing as any).license_number || "",
      company_registration: (listing as any).company_registration || "",
      agency_phone: (listing as any).agency_phone || "",
      agency_email: (listing as any).agency_email || "",
    });
    setEditId(listing.id);
    setCreateOpen(true);
  };

  const handleUpdateLeadStatus = async (id: string, status: string) => {
    await supabase.from("real_estate_leads").update({ status }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    toast({ title: `Lead marked as ${status}` });
  };

  const navigate = useNavigate();

  const handleReplyEmail = (lead: Lead) => {
    const listing = listings.find(l => l.id === lead.listing_id);
    const subject = encodeURIComponent(`Re: ${listing?.title || "Property inquiry"}`);
    const body = encodeURIComponent(`Hello ${lead.name},\n\nThank you for your interest in "${listing?.title || "our property"}".\n\n`);
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, "_blank");
    if (lead.status === "new") handleUpdateLeadStatus(lead.id, "contacted");
  };

  const handleCallLead = (lead: Lead) => {
    if (lead.phone) window.open(`tel:${lead.phone}`, "_self");
  };

  const handleOpenConversation = (lead: Lead) => {
    const listing = listings.find(l => l.id === lead.listing_id);
    navigate(`/dashboard/messages?contact=${encodeURIComponent(lead.email)}&name=${encodeURIComponent(lead.name)}&context=${encodeURIComponent(listing?.title || "Property inquiry")}`);
  };

  const copyLink = (slug: string) => {
    const url = buildAppUrl(`/properties/${slug}`);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const newLeadsCount = leads.filter(l => l.status === "new").length;

  return (
    <DashboardLayout>
      <FeatureGate feature="real_estate" featureLabel="Real Estate">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-6 w-6 text-accent" /> Real Estate
              </h1>
              <p className="text-sm text-muted-foreground">Manage property listings for sale and rent</p>
            </div>
            <PermissionGate permission="properties:write">
              <Button onClick={() => { setForm(emptyForm); setEditId(null); setCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> New Listing
              </Button>
            </PermissionGate>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
              <TabsTrigger value="leads" className="relative">
                Leads ({leads.length})
                {newLeadsCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{newLeadsCount}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="space-y-3 mt-4">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading…</div>
              ) : listings.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  No listings yet. Create your first property listing.
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map(listing => (
                    <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      {/* Photo */}
                      <div className="h-40 bg-muted/50 relative">
                        {listing.photo_urls?.[0] ? (
                          <img src={listing.photo_urls[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Home className="h-12 w-12 text-muted-foreground/30" /></div>
                        )}
                        <Badge className={`absolute top-2 left-2 ${STATUS_MAP[listing.status] || ""}`}>{listing.status}</Badge>
                        <Badge variant="outline" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-xs">
                          {LISTING_TYPES.find(t => t.value === listing.listing_type)?.emoji} {LISTING_TYPES.find(t => t.value === listing.listing_type)?.label}
                        </Badge>
                        {(listing as any).visibility && (listing as any).visibility !== "public" && (
                          <Badge variant="outline" className={`absolute bottom-2 left-2 text-[10px] backdrop-blur-sm ${(listing as any).visibility === "unlisted" ? "bg-amber-500/20 text-amber-700 border-amber-500/30" : "bg-muted text-muted-foreground"}`}>
                            {(listing as any).visibility === "unlisted" ? "🔗 Private Link" : "🔒 Private"}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-foreground truncate">{listing.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {listing.city}{listing.country ? `, ${listing.country}` : ""}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-bold text-accent text-lg">{Number(listing.price).toLocaleString()} {listing.currency}</span>
                          {listing.listing_type !== "sale" && <span className="text-xs text-muted-foreground">/month</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {listing.surface_sqm > 0 && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{listing.surface_sqm}m²</span>}
                          {listing.rooms > 0 && <span>{listing.rooms} rooms</span>}
                          {listing.bedrooms > 0 && <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{listing.bedrooms}</span>}
                          {listing.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{listing.bathrooms}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" /> {listing.views_count || 0} views
                        </div>
                        <Separator />
                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" className="h-8 text-xs flex-1" onClick={() => handleEdit(listing)}>
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => copyLink(listing.slug)}>
                            {copiedSlug === listing.slug ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                          </Button>
                          <PermissionGate permission="properties:delete">
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => handleDelete(listing.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </PermissionGate>
                        </div>
                        {/* Share buttons */}
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-8 text-xs flex-1 gap-1"
                            onClick={() => { const links = getShareLinks("real-estate", listing.slug, listing.title, listing.updated_at); window.open(links.whatsapp, "_blank"); }}>
                            <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs flex-1 gap-1"
                            onClick={() => { const links = getShareLinks("real-estate", listing.slug, listing.title, listing.updated_at); window.open(links.telegram, "_blank"); }}>
                            <Send className="h-3 w-3 shrink-0" /> Telegram
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs flex-1 gap-1"
                            onClick={() => { const links = getShareLinks("real-estate", listing.slug, listing.title, listing.updated_at); window.location.href = links.email; }}>
                            <Mail className="h-3 w-3 shrink-0" /> Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="leads" className="space-y-3 mt-4">
              {leads.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No leads yet. Leads from your public property pages will appear here.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {leads.map(lead => {
                    const listing = listings.find(l => l.id === lead.listing_id);
                    const listingType = listing ? LISTING_TYPES.find(t => t.value === listing.listing_type) : null;
                    return (
                      <Card key={lead.id} className={`hover:shadow-sm transition-shadow ${lead.status === "new" ? "border-l-4 border-l-red-500" : ""}`}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${lead.status === "new" ? "bg-red-500 animate-pulse" : lead.status === "contacted" ? "bg-amber-500" : lead.status === "qualified" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{lead.name}</span>
                                <Badge variant="outline" className={`text-[10px] ${lead.status === "new" ? "border-red-500/30 text-red-600 dark:text-red-400" : ""}`}>{lead.status}</Badge>
                                {listingType && <Badge variant="outline" className="text-[10px]">{listingType.emoji} {listingType.label}</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                                {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                              </div>
                              {listing && <div className="text-xs text-muted-foreground mt-1">🏠 {listing.title}</div>}
                              {lead.message && <p className="text-sm text-muted-foreground mt-1.5 italic border-l-2 border-border pl-2">"{lead.message}"</p>}
                              <div className="text-[10px] text-muted-foreground mt-1.5">{format(new Date(lead.created_at), "PPp")}</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0 self-end sm:self-start">
                            {/* CRM Quick Actions */}
                            <TooltipProvider delayDuration={200}>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleReplyEmail(lead)}>
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reply by email</TooltipContent>
                                </Tooltip>
                                {lead.phone && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleCallLead(lead)}>
                                        <PhoneCall className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Call {lead.phone}</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleOpenConversation(lead)}>
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open conversation</TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                            {/* Status Actions */}
                            <div className="flex gap-1">
                              {lead.status === "new" && (
                                <Button size="sm" variant="default" className="text-xs h-7 flex-1" onClick={() => handleUpdateLeadStatus(lead.id, "contacted")}>
                                  Mark Contacted
                                </Button>
                              )}
                              {lead.status === "contacted" && (
                                <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => handleUpdateLeadStatus(lead.id, "qualified")}>
                                  Qualify
                                </Button>
                              )}
                              {lead.status !== "closed" && (
                                <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => handleUpdateLeadStatus(lead.id, "closed")}>
                                  Close
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── Create/Edit Dialog ─── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Listing" : "Create New Listing"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Beautiful apartment in Paris" />
                </div>
                <div>
                  <Label>Listing Type</Label>
                  <Select value={form.listing_type} onValueChange={v => setForm(f => ({ ...f, listing_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Property Type</Label>
                  <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price *</Label>
                  <Input type="number" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
                </div>
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground">Location</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Country</Label>
                  <CountrySelect
                    value={form.country}
                    onChange={(code) => {
                      const cc = getCountryConfig(code);
                      setForm(f => ({ ...f, country: code, currency: cc.currency }));
                    }}
                  />
                </div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <AddressAutocomplete
                    value={form.address}
                    onChange={(val) => setForm(f => ({ ...f, address: val }))}
                    onSelect={(result: AddressResult) => {
                      setForm(f => ({
                        ...f,
                        address: result.label || "",
                        city: result.city || f.city,
                        country: result.countryCode || f.country,
                        latitude: result.lat || 0,
                        longitude: result.lng || 0,
                        currency: result.countryCode ? getCountryConfig(result.countryCode).currency : f.currency,
                      }));
                    }}
                    countryCode={form.country}
                    placeholder="Search address…"
                  />
                </div>
                {form.latitude !== 0 && form.longitude !== 0 && (
                  <div className="col-span-2">
                    <MapPreview lat={form.latitude} lng={form.longitude} className="h-[200px]" />
                  </div>
                )}
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground">Property Details</h4>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>Surface (m²)</Label><Input type="number" value={form.surface_sqm || ""} onChange={e => setForm(f => ({ ...f, surface_sqm: Number(e.target.value) }))} /></div>
                <div><Label>Rooms</Label><Input type="number" value={form.rooms || ""} onChange={e => setForm(f => ({ ...f, rooms: Number(e.target.value) }))} /></div>
                <div><Label>Bedrooms</Label><Input type="number" value={form.bedrooms || ""} onChange={e => setForm(f => ({ ...f, bedrooms: Number(e.target.value) }))} /></div>
                <div><Label>Bathrooms</Label><Input type="number" value={form.bathrooms || ""} onChange={e => setForm(f => ({ ...f, bathrooms: Number(e.target.value) }))} /></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  ["parking", "Parking"], ["garden", "Garden"], ["terrace", "Terrace"],
                  ["elevator", "Elevator"], ["furnished", "Furnished"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch checked={(form as any)[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                    <Label className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>

              <div>
                <Label>Energy Class</Label>
                <Input value={form.energy_class} onChange={e => setForm(f => ({ ...f, energy_class: e.target.value }))} placeholder="A, B, C…" />
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground">Visibility</h4>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map(v => (
                  <label key={v.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      form.visibility === v.value ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
                    }`}>
                    <input type="radio" name="visibility" value={v.value} checked={form.visibility === v.value}
                      onChange={() => setForm(f => ({ ...f, visibility: v.value }))}
                      className="mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">{v.label}</div>
                      <div className="text-xs text-muted-foreground">{v.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> Agency / Agent (optional)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Agency Name</Label><Input value={form.agency_name} onChange={e => setForm(f => ({ ...f, agency_name: e.target.value }))} placeholder="ABC Real Estate" /></div>
                <div><Label>Agent Name</Label><Input value={form.agent_name} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))} placeholder="John Smith" /></div>
                <div><Label>License Number</Label><Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} placeholder="CPI 1234" /></div>
                <div><Label>Company Reg.</Label><Input value={form.company_registration} onChange={e => setForm(f => ({ ...f, company_registration: e.target.value }))} placeholder="SIRET / RCS" /></div>
                <div><Label>Agency Phone</Label><Input value={form.agency_phone} onChange={e => setForm(f => ({ ...f, agency_phone: e.target.value }))} /></div>
                <div><Label>Agency Email</Label><Input value={form.agency_email} onChange={e => setForm(f => ({ ...f, agency_email: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Agency Logo URL</Label><Input value={form.agency_logo_url} onChange={e => setForm(f => ({ ...f, agency_logo_url: e.target.value }))} placeholder="https://..." /></div>
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground">Contact</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Camera className="h-4 w-4" /> Photos</h4>
              <RealEstatePhotoUploader
                listingId={editId}
                orgId={orgId!}
                photos={(editId ? listings.find(l => l.id === editId)?.photo_urls : null) || []}
                onPhotosChange={(urls) => {
                  if (editId) {
                    setListings(prev => prev.map(l => l.id === editId ? { ...l, photo_urls: urls } : l));
                  }
                }}
                allowVideo={subscription.subscribed}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </FeatureGate>
    </DashboardLayout>
  );
}
