import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activateSalesSequence,
  addSalesSequenceStep,
  createSalesSequence,
} from "@/lib/growth/sales-sequences";

export default function SalesSequencePage() {
  const [status, setStatus] = useState<string>("idle");

  const demo = async () => {
    setStatus("running...");
    try {
      const sequence = await createSalesSequence({
        sequenceName: "Merchant activation Dubai",
        audienceType: "merchant",
        channel: "whatsapp",
        isPersonalized: true,
      });

      await addSalesSequenceStep({
        sequenceId: sequence.id,
        stepOrder: 1,
        delayHours: 24,
        stepType: "intro",
        template: "Intro message",
      });

      await addSalesSequenceStep({
        sequenceId: sequence.id,
        stepOrder: 2,
        delayHours: 48,
        stepType: "offer",
        template: "Offer message",
      });

      await activateSalesSequence(sequence.id);
      setStatus("done ✓");
    } catch (err: any) {
      setStatus(`error: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Sales Sequences</CardTitle>
          <p className="text-sm text-muted-foreground">Auto outbound sequences · WhatsApp / SMS / Email</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={demo} className="w-full">Run sequence demo</Button>
          <p className="text-xs text-muted-foreground">Status: {status}</p>
        </CardContent>
      </Card>
    </div>
  );
}
