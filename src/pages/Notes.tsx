import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StickyNote, Plus } from "lucide-react";

const Notes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-1">Vos notes et mémos personnels</p>
          </div>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            Nouvelle note
          </button>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
          <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune note. Ajoutez des notes pour ne rien oublier.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notes;
