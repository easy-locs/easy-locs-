import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MessageCircle, Plus } from "lucide-react";

const Messages = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground mt-1">Échanges avec vos locataires</p>
          </div>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            Nouveau message
          </button>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun message. Les échanges avec vos locataires apparaîtront ici.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
