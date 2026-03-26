import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
};

const INITIAL_CARDS: SavedCard[] = [
  { id: "1", brand: "Visa", last4: "4242", expiry: "12/27", isDefault: true },
  { id: "2", brand: "Mastercard", last4: "8844", expiry: "08/28", isDefault: false },
];

export default function CustomerSavedCardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState(INITIAL_CARDS);

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    toast.success("Card removed");
  };

  const setDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    toast.success("Default card updated");
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/settings/payment-methods")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Saved Cards</h1>
          <p className="text-xs text-muted-foreground">Manage your payment cards</p>
        </div>
      </div>

      <button
        onClick={() => toast.info("Card form can be connected next")}
        className="mx-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Add New Card
      </button>

      <div className="px-4 py-4 space-y-3">
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No saved cards</p>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {card.brand} •••• {card.last4}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Expires {card.expiry}</p>
                  {card.isDefault && (
                    <span className="inline-block mt-2 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setDefault(card.id)}
                  className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground"
                >
                  Set Default
                </button>
                <button
                  onClick={() => removeCard(card.id)}
                  className="rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
