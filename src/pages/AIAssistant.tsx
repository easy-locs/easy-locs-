import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BrainCircuit, Send } from "lucide-react";
import { useState } from "react";

const AIAssistant = () => {
  const [input, setInput] = useState("");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Assistant personnel</h1>
          <p className="text-muted-foreground">
            Posez une question sur vos obligations administratives ou demandez-moi quoi faire.
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 mb-6 min-h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm text-center">
            Cliquez sur « Que dois-je faire ? » ou posez votre question ci-dessous.<br />
            <span className="text-xs">L'assistant analysera votre profil et vos documents pour vous guider.</span>
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question…"
            className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="bg-gradient-gold text-accent-foreground px-5 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-gold">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
