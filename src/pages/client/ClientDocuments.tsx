import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Inbox, Eye, Filter } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface DocItem {
  id: string;
  title: string;
  doc_type: string;
  created_at: string;
  pdf_url: string | null;
  status: string;
  source: "tenant" | "booking" | "concierge";
}

const docTypeLabel: Record<string, string> = {
  "rent-receipt": "Rent receipt",
  "payment-notice": "Payment notice",
  "lease": "Lease",
  "inventory": "Inventory",
  "dunning": "Dunning letter",
  "invoice": "Invoice",
  "confirmation": "Confirmation",
};

const ClientDocuments = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      const email = user.email || "";
      const items: DocItem[] = [];

      // 1. Documents linked to tenant (if user is a linked tenant)
      const { data: tenantLinks } = await supabase
        .from("tenants")
        .select("id, org_id")
        .eq("tenant_user_id", user.id);

      if (tenantLinks && tenantLinks.length > 0) {
        const tenantIds = tenantLinks.map(t => t.id);
        const { data: tenantDocs } = await supabase
          .from("documents")
          .select("id, title, doc_type, created_at, pdf_url, status")
          .in("tenant_id", tenantIds)
          .order("created_at", { ascending: false })
          .limit(100);

        if (tenantDocs) {
          items.push(...tenantDocs.map(d => ({
            ...d, source: "tenant" as const,
          })));
        }
      }

      // 2. Booking confirmations (concierge orders with documents)
      const { data: conciergeOrders } = await supabase
        .from("concierge_orders")
        .select("id, service_date, currency, total_price, document_urls, created_at, status")
        .eq("guest_email", email)
        .not("document_urls", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (conciergeOrders) {
        for (const order of conciergeOrders) {
          const urls = order.document_urls as any[];
          if (Array.isArray(urls)) {
            urls.forEach((doc: any, idx: number) => {
              items.push({
                id: `${order.id}-doc-${idx}`,
                title: doc.name || `Concierge document ${idx + 1}`,
                doc_type: "confirmation",
                created_at: order.created_at,
                pdf_url: doc.url || null,
                status: order.status,
                source: "concierge",
              });
            });
          }
        }
      }

      // 3. Booking request documents
      const { data: bookingReqs } = await supabase
        .from("booking_requests")
        .select("id, document_urls, created_at, status")
        .eq("guest_email", email)
        .not("document_urls", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (bookingReqs) {
        for (const req of bookingReqs) {
          const urls = req.document_urls as any[];
          if (Array.isArray(urls)) {
            urls.forEach((doc: any, idx: number) => {
              items.push({
                id: `${req.id}-bdoc-${idx}`,
                title: doc.name || `Booking document ${idx + 1}`,
                doc_type: "confirmation",
                created_at: req.created_at || new Date().toISOString(),
                pdf_url: doc.url || null,
                status: req.status,
                source: "booking",
              });
            });
          }
        }
      }

      // Deduplicate and sort
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDocs(items);
      setLoading(false);
    };
    fetchDocs();
  }, [user]);

  const filterBySource = (source?: string) =>
    source ? docs.filter(d => d.source === source) : docs;

  const renderList = (items: DocItem[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">{t("client.documents_empty") || "No documents"}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-lg p-4 border border-border/50 hover:shadow-card-hover hover:border-accent/30 transition-all group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {docTypeLabel[doc.doc_type] || doc.doc_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {doc.pdf_url && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(doc.pdf_url!, "_blank")}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      asChild
                    >
                      <a href={doc.pdf_url} download title="Download">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.documents") || "Documents"}</h1>
        </motion.div>

        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">{t("client.tab_all") || "All"} ({docs.length})</TabsTrigger>
            <TabsTrigger value="tenant">{t("client.type_rental") || "Rental"}</TabsTrigger>
            <TabsTrigger value="booking">{t("client.type_booking") || "Bookings"}</TabsTrigger>
            <TabsTrigger value="concierge">{t("client.type_concierge") || "Concierge"}</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />)}
              </div>
            ) : renderList(docs)}
          </TabsContent>
          <TabsContent value="tenant">{renderList(filterBySource("tenant"))}</TabsContent>
          <TabsContent value="booking">{renderList(filterBySource("booking"))}</TabsContent>
          <TabsContent value="concierge">{renderList(filterBySource("concierge"))}</TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
};

export default ClientDocuments;
