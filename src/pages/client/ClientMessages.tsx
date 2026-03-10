import { Inbox } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useI18n } from "@/lib/i18n";

const ClientMessages = () => {
  const { t } = useI18n();

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.messages") || "Messages"}</h1>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("client.messages_empty") || "No messages yet"}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("client.messages_empty_desc") || "Your conversations with providers will appear here."}</p>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientMessages;
