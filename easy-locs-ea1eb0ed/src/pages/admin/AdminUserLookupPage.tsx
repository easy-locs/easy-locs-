import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLookupData } from "@/repositories/admin-ops.repository";

export default function AdminUserLookupPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-lookup", submitted],
    queryFn: () => fetchUserLookupData(submitted),
    enabled: !!submitted.trim(),
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">User Lookup</h1>
          <p className="text-xs text-muted-foreground">Inspect user activity quickly</p>
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter user id" className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={() => setSubmitted(query)} className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">Find</button>
      </div>
      {isLoading && submitted ? [1, 2].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />) : null}
      {!isLoading && submitted && data ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          <Metric title="Favorites" value={String(data.favorites.length)} />
          <Metric title="Tickets" value={String(data.tickets.length)} />
          <Metric title="Orders" value={String(data.orders.length)} />
          <Metric title="Wallets" value={String(data.wallets.length)} />
        </div>
      ) : null}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
