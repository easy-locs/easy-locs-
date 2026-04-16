import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualCards } from "@/hooks/useVirtualCards";
import { useI18n } from "@/lib/i18n";
import SubPageShell from "@/components/layout/SubPageShell";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Snowflake,
  Sun,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function VirtualCardsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { cards, loading, create, freeze, unfreeze, cancel, updateLimit, fund, reveal } = useVirtualCards();
  const [showCreate, setShowCreate] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createLimit, setCreateLimit] = useState("5000");
  const [creating, setCreating] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Record<string, { cardNumber: string; cvv: string }>>({});
  const [revealLoading, setRevealLoading] = useState<Set<string>>(new Set());
  const [fundAmount, setFundAmount] = useState<Record<string, string>>({});
  const [limitAmount, setLimitAmount] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    setCreating(true);
    const result = await create({
      label: createLabel || "My Virtual Card",
      spendingLimit: Number(createLimit) || 5000,
      network: "visa",
    });
    setCreating(false);
    if (result.ok) {
      toast.success("Virtual card created");
      setShowCreate(false);
      setCreateLabel("");
      setCreateLimit("5000");
    } else {
      toast.error(result.error || "Failed to create card");
    }
  };

  const toggleReveal = async (cardId: string) => {
    if (revealedCards[cardId]) {
      setRevealedCards((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      return;
    }
    setRevealLoading((prev) => new Set(prev).add(cardId));
    try {
      const details = await reveal(cardId);
      if (details) {
        setRevealedCards((prev) => ({
          ...prev,
          [cardId]: { cardNumber: details.cardNumber, cvv: details.cvv },
        }));
      }
    } finally {
      setRevealLoading((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  const handleFund = async (cardId: string) => {
    const amount = Number(fundAmount[cardId]);
    if (!amount || amount <= 0) return;
    const result = await fund(cardId, amount);
    if (result.ok) {
      toast.success(`Added $${amount} to card`);
      setFundAmount((p) => ({ ...p, [cardId]: "" }));
    } else {
      toast.error(result.error || "Failed to fund card");
    }
  };

  const handleUpdateLimit = async (cardId: string) => {
    const limit = Number(limitAmount[cardId]);
    if (limit < 0) return;
    const result = await updateLimit(cardId, limit);
    if (result.ok) {
      toast.success("Spending limit updated");
      setLimitAmount((p) => ({ ...p, [cardId]: "" }));
    } else {
      toast.error(result.error || "Failed to update limit");
    }
  };

  return (
    <SubPageShell className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{t("virtual_card.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("virtual_card.subtitle")}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" /> {t("virtual_card.new_card")}
        </Button>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <AppCard>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">{t("virtual_card.create")}</h3>
                <Input
                  placeholder="Card label (e.g., Shopping)"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  className="text-xs"
                />
                <Input
                  type="number"
                  placeholder="Spending limit"
                  value={createLimit}
                  onChange={(e) => setCreateLimit(e.target.value)}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-3 w-3 mr-1" /> Create
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </AppCard>
          </motion.div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <AppCard>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">{t("virtual_card.no_cards")}</p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("virtual_card.no_cards_desc")}
              </p>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-3 w-3 mr-1" /> Create Card
              </Button>
            </CardContent>
          </AppCard>
        ) : (
          cards.map((card, idx) => {
            const revealed = !!revealedCards[card.id];
            const revealData = revealedCards[card.id];
            const isRevealing = revealLoading.has(card.id);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <AppCard
                  className={
                    card.status === "frozen"
                      ? "border-blue-300/30 bg-blue-50/5"
                      : ""
                  }
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">
                          {card.label}
                        </span>
                      </div>
                      <Badge
                        variant={
                          card.status === "active" ? "default" : "secondary"
                        }
                        className="text-[0.625rem]"
                      >
                        {card.status === "frozen" && (
                          <Snowflake className="h-2.5 w-2.5 mr-0.5" />
                        )}
                        {card.status}
                      </Badge>
                    </div>

                    <div
                      className="rounded-xl p-4 text-white relative overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                      }}
                    >
                      <p className="text-[0.625rem] uppercase tracking-wider opacity-60 mb-3">
                        {card.network.toUpperCase()}
                      </p>
                      <p className="text-sm font-mono tracking-widest mb-3">
                        {revealed && revealData ? revealData.cardNumber.replace(/(.{4})/g, "$1 ").trim() : card.maskedNumber}
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[0.625rem] opacity-60">EXPIRES</p>
                          <p className="text-xs font-mono">
                            {String(card.expiryMonth).padStart(2, "0")}/
                            {card.expiryYear}
                          </p>
                        </div>
                        <div>
                          <p className="text-[0.625rem] opacity-60">CVV</p>
                          <p className="text-xs font-mono">
                            {revealed && revealData ? revealData.cvv : "•••"}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleReveal(card.id)}
                          disabled={isRevealing}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          {isRevealing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : revealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[0.625rem] text-muted-foreground">
                          Balance
                        </p>
                        <p className="text-xs font-bold">
                          ${card.balance.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.625rem] text-muted-foreground">
                          Limit
                        </p>
                        <p className="text-xs font-bold">
                          ${card.spendingLimit.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.625rem] text-muted-foreground">
                          Spent
                        </p>
                        <p className="text-xs font-bold">
                          ${card.totalSpent.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 flex gap-1">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={fundAmount[card.id] || ""}
                          onChange={(e) =>
                            setFundAmount((p) => ({
                              ...p,
                              [card.id]: e.target.value,
                            }))
                          }
                          className="text-xs h-7 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[0.625rem] px-2"
                          onClick={() => handleFund(card.id)}
                        >
                          <DollarSign className="h-3 w-3" /> Fund
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {card.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[0.625rem]"
                          onClick={() => freeze(card.id)}
                        >
                          <Snowflake className="h-3 w-3 mr-0.5" /> Freeze
                        </Button>
                      ) : card.status === "frozen" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[0.625rem]"
                          onClick={() => unfreeze(card.id)}
                        >
                          <Sun className="h-3 w-3 mr-0.5" /> Unfreeze
                        </Button>
                      ) : null}

                      <div className="flex gap-1 flex-1">
                        <Input
                          type="number"
                          placeholder="New limit"
                          value={limitAmount[card.id] || ""}
                          onChange={(e) =>
                            setLimitAmount((p) => ({
                              ...p,
                              [card.id]: e.target.value,
                            }))
                          }
                          className="text-xs h-7 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[0.625rem] px-2"
                          onClick={() => handleUpdateLimit(card.id)}
                        >
                          Set Limit
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[0.625rem]"
                      >
                        <Smartphone className="h-3 w-3 mr-0.5" /> Apple Pay
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[0.625rem]"
                        onClick={() => {
                          cancel(card.id);
                          toast.success("Card cancelled");
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-0.5" /> Cancel
                      </Button>
                    </div>
                  </CardContent>
                </AppCard>
              </motion.div>
            );
          })
        )}
      </div>
    </SubPageShell>
  );
}
