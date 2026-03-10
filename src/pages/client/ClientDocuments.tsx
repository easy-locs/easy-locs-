import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useI18n } from "@/lib/i18n";

const ClientDocuments = () => {
  const { t } = useI18n();

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.documents") || "Documents"}</h1>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("client.documents_empty") || "No documents yet"}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("client.documents_empty_desc") || "Invoices and booking confirmations will appear here."}</p>
        </motion.div>
      </div>
    </ClientLayout>
  );
};

export default ClientDocuments;
