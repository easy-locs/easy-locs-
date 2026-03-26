/**
 * RideCompletedCard — Post-ride completion card with receipt/rating/rebook.
 */
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/i18n-canonical";
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  jobId: string;
  fare?: number | null;
  currency?: string;
}

export function RideCompletedCard({ jobId, fare, currency = "AED" }: Props) {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
      <div className="text-center py-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
        <p className="text-xl font-bold text-foreground">{tc("ride.trip_completed")}</p>
        <p className="text-sm text-muted-foreground mt-1">{tc("ride.thank_you")}</p>
        {fare != null && (
          <p className="text-lg font-bold text-primary mt-2">{fare} {currency}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => navigate(`/mobility/receipt/${jobId}`)}>
          {tc("ride.receipt")}
        </Button>
        <Button className="flex-1 rounded-xl h-11" onClick={() => navigate("/mobility/taxi")}>
          {tc("ride.book_again")}
        </Button>
      </div>
    </motion.div>
  );
}
