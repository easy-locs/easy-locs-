import { AlertTriangle } from "lucide-react";

const LegalDisclaimer = () => (
  <section className="py-12 bg-muted/50">
    <div className="container">
      <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto shadow-card">
        <AlertTriangle className="h-6 w-6 text-gold shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-foreground mb-1">Information légale</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette application fournit une assistance administrative uniquement.
            Les documents générés sont à titre informatif et ne remplacent pas un avocat, un notaire ou un expert-comptable.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default LegalDisclaimer;
