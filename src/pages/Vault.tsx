import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FolderLock, Upload, Search, FileText } from "lucide-react";

const Vault = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Coffre-fort</h1>
            <p className="text-muted-foreground text-sm mt-1">Stockez et classez vos documents en toute sécurité.</p>
          </div>
          <button className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Upload className="h-4 w-4" />
            Importer
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un document…"
            className="w-full bg-card border border-border rounded-lg pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Empty state */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-16 text-center">
          <FolderLock className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Votre coffre-fort est vide</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Importez vos premiers documents. L'IA les classera et les nommera automatiquement.
          </p>
          <button className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-6 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Upload className="h-4 w-4" />
            Importer un document
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Vault;
