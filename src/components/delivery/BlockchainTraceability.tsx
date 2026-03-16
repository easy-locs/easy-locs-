/**
 * BlockchainTraceability — DDD2. Blockchain Traceability.
 * Smart contracts, immutable proof, package tokenization, decentralized audit.
 * PASS104-DDD2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Link2, Shield, FileText, CheckCircle2, Lock,
  Hash, Clock, Eye, Layers, Database,
} from "lucide-react";
import { haptic } from "@/lib/haptics";

interface BlockRecord {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  type: "shipment_created" | "pickup_confirmed" | "delivery_confirmed" | "dispute_filed" | "payment_released";
  jobId: string;
  data: Record<string, string>;
  verified: boolean;
  gasUsed: number;
}

interface SmartContract {
  id: string;
  name: string;
  address: string;
  network: string;
  status: "active" | "paused" | "deprecated";
  totalExecutions: number;
  lastExecution: Date;
  version: string;
}

interface TokenizedPackage {
  id: string;
  tokenId: string;
  jobId: string;
  origin: string;
  destination: string;
  status: "minted" | "in_transit" | "delivered" | "burned";
  checkpoints: number;
  owner: string;
  value: number;
  currency: string;
}

const RECORDS: BlockRecord[] = [
  { id: "b1", txHash: "0x7a3f...e842", blockNumber: 18294731, timestamp: new Date(Date.now() - 3600000), type: "delivery_confirmed", jobId: "JOB-847", data: { driver: "Ousmane B.", proof: "QR+Photo" }, verified: true, gasUsed: 21400 },
  { id: "b2", txHash: "0x91c2...d5f1", blockNumber: 18294698, timestamp: new Date(Date.now() - 7200000), type: "pickup_confirmed", jobId: "JOB-843", data: { location: "14.6937,-17.4441", weight: "3.2kg" }, verified: true, gasUsed: 18900 },
  { id: "b3", txHash: "0x4e8d...a3b7", blockNumber: 18294655, timestamp: new Date(Date.now() - 14400000), type: "payment_released", jobId: "JOB-839", data: { amount: "25000 XOF", method: "escrow_auto" }, verified: true, gasUsed: 32100 },
  { id: "b4", txHash: "0xf2a1...c9e3", blockNumber: 18294612, timestamp: new Date(Date.now() - 28800000), type: "shipment_created", jobId: "JOB-851", data: { sender: "Shop Médina", items: "3 colis" }, verified: true, gasUsed: 24500 },
  { id: "b5", txHash: "0xd6b8...7f24", blockNumber: 18294580, timestamp: new Date(Date.now() - 43200000), type: "dispute_filed", jobId: "JOB-835", data: { reason: "Colis endommagé", claimant: "Client" }, verified: true, gasUsed: 28700 },
];

const CONTRACTS: SmartContract[] = [
  { id: "sc1", name: "DeliveryEscrow", address: "0x1a2b...3c4d", network: "Polygon", status: "active", totalExecutions: 4521, lastExecution: new Date(Date.now() - 3600000), version: "2.1.0" },
  { id: "sc2", name: "ProofOfDelivery", address: "0x5e6f...7g8h", network: "Polygon", status: "active", totalExecutions: 3890, lastExecution: new Date(Date.now() - 7200000), version: "1.4.2" },
  { id: "sc3", name: "DisputeResolver", address: "0x9i0j...1k2l", network: "Polygon", status: "active", totalExecutions: 287, lastExecution: new Date(Date.now() - 86400000), version: "1.2.0" },
  { id: "sc4", name: "PackageToken (ERC-721)", address: "0x3m4n...5o6p", network: "Polygon", status: "active", totalExecutions: 2145, lastExecution: new Date(Date.now() - 14400000), version: "1.0.3" },
];

const TOKENS: TokenizedPackage[] = [
  { id: "t1", tokenId: "#8471", jobId: "JOB-847", origin: "Médina Hub", destination: "Plateau Client", status: "delivered", checkpoints: 5, owner: "Client Final", value: 45000, currency: "XOF" },
  { id: "t2", tokenId: "#8432", jobId: "JOB-843", origin: "Parcelles Hub", destination: "Guédiawaye", status: "in_transit", checkpoints: 3, owner: "Transporteur", value: 28000, currency: "XOF" },
  { id: "t3", tokenId: "#8513", jobId: "JOB-851", origin: "Shop Médina", destination: "Almadies", status: "minted", checkpoints: 1, owner: "Expéditeur", value: 62000, currency: "XOF" },
  { id: "t4", tokenId: "#8392", jobId: "JOB-839", origin: "Dakar Centre", destination: "Rufisque", status: "burned", checkpoints: 6, owner: "Archivé", value: 35000, currency: "XOF" },
];

export default function BlockchainTraceability({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"ledger" | "contracts" | "tokens">("ledger");

  const totalTx = RECORDS.length;
  const verifiedPct = Math.round((RECORDS.filter(r => r.verified).length / RECORDS.length) * 100);
  const activeContracts = CONTRACTS.filter(c => c.status === "active").length;
  const activeTokens = TOKENS.filter(t => !["burned"].includes(t.status)).length;

  const typeCfg = (t: string) => ({
    shipment_created: { label: "Création", color: "--primary", icon: "📦" },
    pickup_confirmed: { label: "Collecte", color: "--info", icon: "📍" },
    delivery_confirmed: { label: "Livraison", color: "--success", icon: "✅" },
    dispute_filed: { label: "Litige", color: "--destructive", icon: "⚠️" },
    payment_released: { label: "Paiement", color: "--success", icon: "💰" },
    minted: { label: "Créé", color: "--primary", icon: "🪙" },
    in_transit: { label: "En transit", color: "--info", icon: "🚚" },
    delivered: { label: "Livré", color: "--success", icon: "✅" },
    burned: { label: "Archivé", color: "--muted-foreground", icon: "🔥" },
  }[t] || { label: t, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Link2 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Traçabilité Blockchain
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Transactions", value: totalTx, color: "--primary" },
          { label: "Vérifiées", value: `${verifiedPct}%`, color: "--success" },
          { label: "Contrats", value: activeContracts, color: "--info" },
          { label: "Tokens actifs", value: activeTokens, color: "--warning" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["ledger", "contracts", "tokens"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "ledger" ? "📜 Registre" : v === "contracts" ? "📋 Contrats" : "🪙 Tokens"}
          </button>
        ))}
      </div>

      {view === "ledger" && (
        <div className="space-y-2">
          {RECORDS.map(r => {
            const cfg = typeCfg(r.type);
            return (
              <div key={r.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{cfg.label}</p>
                      <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ background: "hsl(var(--muted) / 0.5)", color: "hsl(var(--muted-foreground))" }}>
                        {r.txHash}
                      </span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🔖 {r.jobId} • ⛽ {r.gasUsed} gas • #{r.blockNumber}
                    </p>
                    <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {Object.entries(r.data).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {r.verified && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "contracts" && (
        <div className="space-y-2">
          {CONTRACTS.map(c => (
            <div key={c.id} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} />
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.name}</p>
                </div>
                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>v{c.version}</span>
              </div>
              <p className="text-[8px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                {c.address} • 🌐 {c.network}
              </p>
              <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                ⚡ {c.totalExecutions.toLocaleString()} exécutions
              </p>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((c.totalExecutions / 5000) * 100, 100)}%` }}
                  className="h-full rounded-full" style={{ background: "hsl(var(--primary))" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "tokens" && (
        <div className="space-y-2">
          {TOKENS.map(t => {
            const cfg = typeCfg(t.status);
            return (
              <div key={t.id} className="rounded-xl p-3"
                style={{ background: t.status === "burned" ? "hsl(var(--muted) / 0.1)" : "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold font-mono" style={{ color: "hsl(var(--foreground))" }}>{t.tokenId}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {t.origin} → {t.destination} • 📍 {t.checkpoints} checkpoints
                    </p>
                    <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      👤 {t.owner} • 🔖 {t.jobId}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>{t.value.toLocaleString()} F</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
