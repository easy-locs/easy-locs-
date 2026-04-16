import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Star, MapPin, Clock, Loader2, Briefcase, CheckCircle2, Filter,
} from "lucide-react";

const CATEGORIES = [
  "All", "Cleaning", "Plumbing", "Electrical", "Beauty", "Tutoring",
  "Fitness", "Photography", "IT Support", "Legal", "Accounting",
  "Handyman", "Moving", "Gardening", "Catering", "Other",
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [priceType, setPriceType] = useState("all");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services-browse", category, searchQuery],
    queryFn: async () => {
      let query = db
        .from("service_catalog")
        .select("*, providers:provider_id(id, display_name, avatar_url, city, is_verified)")
        .eq("is_active", true)
        .order("rating_avg", { ascending: false });

      if (category !== "All") query = query.eq("category", category);
      if (searchQuery.trim()) query = query.ilike("title", `%${searchQuery}%`);

      const { data } = await query.limit(50);
      return data ?? [];
    },
  });

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Services" icon={<Briefcase className="h-5 w-5 text-primary" />} backTo="/radar" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              className="pl-9 h-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[0.6875rem] font-semibold whitespace-nowrap shrink-0 transition-all ${
                category === cat ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No services found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((svc: any) => (
              <AppCard
                key={svc.id}
                className="cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/services/${svc.provider_id}`)}
              >
                <CardContent className="p-3 flex gap-3">
                  {svc.photos?.[0] ? (
                    <img src={svc.photos[0]} alt={svc.title || "Service"} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Briefcase className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold line-clamp-1">{svc.title}</h3>
                      {svc.providers?.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    {svc.providers?.display_name && (
                      <p className="text-[0.6875rem] text-muted-foreground">{svc.providers.display_name}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-0.5 text-xs font-bold text-primary">
                        {svc.price} AED{svc.price_type === "hourly" ? "/hr" : ""}
                      </span>
                      <span className="flex items-center gap-0.5 text-[0.625rem] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {svc.duration_minutes}min
                      </span>
                      <span className="flex items-center gap-0.5 text-[0.625rem] text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" /> {svc.rating_avg?.toFixed(1) || "5.0"}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-0.5">
                      {svc.at_home && <Badge variant="outline" className="text-[0.5625rem] h-4 px-1">Home</Badge>}
                      {svc.in_office && <Badge variant="outline" className="text-[0.5625rem] h-4 px-1">Office</Badge>}
                      {svc.remote && <Badge variant="outline" className="text-[0.5625rem] h-4 px-1">Remote</Badge>}
                    </div>
                  </div>
                </CardContent>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
