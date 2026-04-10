import { type SecurityFlag } from "@/lib/trust/trust-levels";

export type FraudRiskType =
  | "circular_transfer"
  | "mule_account"
  | "rapid_account_usage"
  | "geo_inconsistency"
  | "multi_account"
  | "abnormal_amount"
  | "chain_transfer"
  | "abnormal_topup"
  | "device_anomaly"
  | "brute_force"
  | "spam_orbit";

export interface FraudSignal {
  type: FraudRiskType;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  details: string;
  timestamp: number;
  userId: string;
  relatedUserIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface FraudAnalysisResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  recommendedFlag: SecurityFlag;
  recommendedActions: string[];
}

interface TransactionRecord {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  timestamp: number;
  type: string;
}

interface AccountActivity {
  userId: string;
  createdAt: number;
  firstTxAt: number | null;
  txCount24h: number;
  uniqueRecipients24h: number;
  totalSent24h: number;
  totalReceived24h: number;
  deviceChanges7d: number;
  countries7d: string[];
  lastKnownCountry: string;
}

const recentTransactions = new Map<string, TransactionRecord[]>();
const accountActivities = new Map<string, AccountActivity>();

const MAX_TRANSACTION_HISTORY = 500;
const CIRCULAR_WINDOW_MS = 24 * 3600_000;
const CHAIN_MIN_HOPS = 3;

export function recordTransaction(tx: TransactionRecord): void {
  for (const userId of [tx.senderId, tx.recipientId]) {
    const list = recentTransactions.get(userId) || [];
    list.push(tx);
    if (list.length > MAX_TRANSACTION_HISTORY) list.shift();
    recentTransactions.set(userId, list);
  }
}

export function updateAccountActivity(activity: AccountActivity): void {
  accountActivities.set(activity.userId, activity);
}

export function analyzeUserFraudRisk(userId: string): FraudAnalysisResult {
  const signals: FraudSignal[] = [];
  const now = Date.now();

  const txs = recentTransactions.get(userId) || [];
  const activity = accountActivities.get(userId);

  const circularSignal = detectCircularTransfers(userId, txs, now);
  if (circularSignal) signals.push(circularSignal);

  const chainSignal = detectChainTransfers(userId, txs, now);
  if (chainSignal) signals.push(chainSignal);

  const muleSignal = detectMulePattern(userId, txs, now);
  if (muleSignal) signals.push(muleSignal);

  if (activity) {
    const rapidSignal = detectRapidAccountUsage(userId, activity, now);
    if (rapidSignal) signals.push(rapidSignal);

    const geoSignal = detectGeoInconsistency(userId, activity, now);
    if (geoSignal) signals.push(geoSignal);

    const deviceSignal = detectDeviceAnomaly(userId, activity, now);
    if (deviceSignal) signals.push(deviceSignal);
  }

  const abnormalSignal = detectAbnormalAmounts(userId, txs, now);
  if (abnormalSignal) signals.push(abnormalSignal);

  const topupSignal = detectAbnormalTopup(userId, txs, now);
  if (topupSignal) signals.push(topupSignal);

  const riskScore = computeAggregateRisk(signals);
  const riskLevel = riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 35 ? "medium" : "low";
  const recommendedFlag = recommendFlag(riskScore, signals);
  const recommendedActions = recommendActions(riskLevel, signals);

  return { riskScore, riskLevel, signals, recommendedFlag, recommendedActions };
}

function detectCircularTransfers(userId: string, txs: TransactionRecord[], now: number): FraudSignal | null {
  const recentTxs = txs.filter(t => now - t.timestamp < CIRCULAR_WINDOW_MS);
  const sent = recentTxs.filter(t => t.senderId === userId);
  const received = recentTxs.filter(t => t.recipientId === userId);

  const sentTo = new Set(sent.map(t => t.recipientId));
  const receivedFrom = new Set(received.map(t => t.senderId));

  const circular = [...sentTo].filter(id => receivedFrom.has(id));
  if (circular.length === 0) return null;

  let circularVolume = 0;
  for (const partnerId of circular) {
    const sentAmount = sent.filter(t => t.recipientId === partnerId).reduce((s, t) => s + t.amount, 0);
    const recvAmount = received.filter(t => t.senderId === partnerId).reduce((s, t) => s + t.amount, 0);
    circularVolume += Math.min(sentAmount, recvAmount);
  }

  if (circularVolume < 100) return null;

  const severity = circularVolume > 5000 ? "critical" : circularVolume > 1000 ? "high" : "medium";

  return {
    type: "circular_transfer",
    severity,
    score: severity === "critical" ? 40 : severity === "high" ? 25 : 15,
    details: `Circular transfers detected with ${circular.length} partner(s), volume: ${circularVolume}`,
    timestamp: now,
    userId,
    relatedUserIds: circular,
  };
}

function detectChainTransfers(userId: string, txs: TransactionRecord[], now: number): FraudSignal | null {
  const recentSent = txs.filter(t => t.senderId === userId && now - t.timestamp < CIRCULAR_WINDOW_MS);

  const recipients = recentSent.map(t => t.recipientId);
  const uniqueRecipients = new Set(recipients);
  if (uniqueRecipients.size < CHAIN_MIN_HOPS) return null;

  const timeSorted = [...recentSent].sort((a, b) => a.timestamp - b.timestamp);
  let chainCount = 0;
  for (let i = 1; i < timeSorted.length; i++) {
    if (timeSorted[i].timestamp - timeSorted[i - 1].timestamp < 300_000) {
      chainCount++;
    }
  }

  if (chainCount < CHAIN_MIN_HOPS) return null;

  return {
    type: "chain_transfer",
    severity: chainCount >= 8 ? "high" : "medium",
    score: chainCount >= 8 ? 30 : 15,
    details: `Chain transfers: ${chainCount} rapid sequential sends to ${uniqueRecipients.size} recipients`,
    timestamp: now,
    userId,
    relatedUserIds: [...uniqueRecipients],
  };
}

function detectMulePattern(userId: string, txs: TransactionRecord[], now: number): FraudSignal | null {
  const recentTxs = txs.filter(t => now - t.timestamp < CIRCULAR_WINDOW_MS);
  const received = recentTxs.filter(t => t.recipientId === userId);
  const sent = recentTxs.filter(t => t.senderId === userId);

  if (received.length < 3 || sent.length < 3) return null;

  const totalReceived = received.reduce((s, t) => s + t.amount, 0);
  const totalSent = sent.reduce((s, t) => s + t.amount, 0);

  const passthrough = Math.min(totalReceived, totalSent);
  const ratio = passthrough / Math.max(totalReceived, 1);

  if (ratio < 0.7) return null;

  const uniqueSenders = new Set(received.map(t => t.senderId));
  const uniqueRecipients = new Set(sent.map(t => t.recipientId));

  if (uniqueSenders.size < 2 || uniqueRecipients.size < 2) return null;

  return {
    type: "mule_account",
    severity: passthrough > 10000 ? "critical" : passthrough > 3000 ? "high" : "medium",
    score: passthrough > 10000 ? 45 : passthrough > 3000 ? 30 : 20,
    details: `Mule pattern: ${ratio.toFixed(0)}% passthrough, ${uniqueSenders.size} sources → ${uniqueRecipients.size} destinations`,
    timestamp: now,
    userId,
    relatedUserIds: [...uniqueSenders, ...uniqueRecipients],
  };
}

function detectRapidAccountUsage(userId: string, activity: AccountActivity, now: number): FraudSignal | null {
  const accountAgeHours = (now - activity.createdAt) / 3600_000;
  if (accountAgeHours > 48) return null;

  if (!activity.firstTxAt) return null;
  const timeToFirstTx = (activity.firstTxAt - activity.createdAt) / 60_000;

  if (timeToFirstTx > 30 && activity.txCount24h < 5) return null;

  const severity = timeToFirstTx < 5 && activity.txCount24h > 10 ? "high" : "medium";
  return {
    type: "rapid_account_usage",
    severity,
    score: severity === "high" ? 25 : 15,
    details: `New account (${accountAgeHours.toFixed(0)}h old), first tx in ${timeToFirstTx.toFixed(0)}min, ${activity.txCount24h} txs in 24h`,
    timestamp: now,
    userId,
  };
}

function detectGeoInconsistency(userId: string, activity: AccountActivity, now: number): FraudSignal | null {
  if (activity.countries7d.length <= 1) return null;

  const severity = activity.countries7d.length > 3 ? "high" : "medium";
  return {
    type: "geo_inconsistency",
    severity,
    score: severity === "high" ? 25 : 15,
    details: `${activity.countries7d.length} countries in 7 days: ${activity.countries7d.join(", ")}`,
    timestamp: now,
    userId,
    metadata: { countries: activity.countries7d },
  };
}

function detectDeviceAnomaly(userId: string, activity: AccountActivity, now: number): FraudSignal | null {
  if (activity.deviceChanges7d < 3) return null;

  const severity = activity.deviceChanges7d >= 5 ? "high" : "medium";
  return {
    type: "device_anomaly",
    severity,
    score: severity === "high" ? 20 : 12,
    details: `${activity.deviceChanges7d} device changes in 7 days`,
    timestamp: now,
    userId,
  };
}

function detectAbnormalAmounts(userId: string, txs: TransactionRecord[], now: number): FraudSignal | null {
  const recentSent = txs.filter(t => t.senderId === userId && now - t.timestamp < CIRCULAR_WINDOW_MS);
  if (recentSent.length < 3) return null;

  const amounts = recentSent.map(t => t.amount);
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const maxAmount = Math.max(...amounts);

  if (maxAmount <= avg * 5 || maxAmount < 1000) return null;

  return {
    type: "abnormal_amount",
    severity: maxAmount > avg * 20 ? "high" : "medium",
    score: maxAmount > avg * 20 ? 20 : 10,
    details: `Abnormal transaction: max ${maxAmount} vs avg ${avg.toFixed(0)}`,
    timestamp: now,
    userId,
  };
}

function detectAbnormalTopup(userId: string, txs: TransactionRecord[], now: number): FraudSignal | null {
  const topups = txs.filter(t => t.type === "topup" && t.recipientId === userId && now - t.timestamp < CIRCULAR_WINDOW_MS);
  if (topups.length < 2) return null;

  const totalTopup = topups.reduce((s, t) => s + t.amount, 0);
  if (totalTopup < 5000) return null;

  const rapidTopups = topups.filter((t, i) =>
    i > 0 && t.timestamp - topups[i - 1].timestamp < 600_000
  );

  if (rapidTopups.length < 2) return null;

  return {
    type: "abnormal_topup",
    severity: totalTopup > 20000 ? "high" : "medium",
    score: totalTopup > 20000 ? 20 : 10,
    details: `${topups.length} topups in 24h totaling ${totalTopup}, ${rapidTopups.length} rapid`,
    timestamp: now,
    userId,
  };
}

function computeAggregateRisk(signals: FraudSignal[]): number {
  if (signals.length === 0) return 0;
  const total = signals.reduce((s, sig) => s + sig.score, 0);
  return Math.min(100, total);
}

function recommendFlag(riskScore: number, signals: FraudSignal[]): SecurityFlag {
  const hasCritical = signals.some(s => s.severity === "critical");
  const hasHigh = signals.some(s => s.severity === "high");

  if (hasCritical || riskScore >= 80) return "blocked";
  if (hasHigh && riskScore >= 60) return "restricted";
  if (riskScore >= 50) return "high_risk";
  if (riskScore >= 35) return "review_required";
  if (riskScore >= 20) return "suspicious";
  if (riskScore >= 10) return "low_risk";
  return "normal";
}

function recommendActions(riskLevel: string, signals: FraudSignal[]): string[] {
  const actions: string[] = [];

  if (riskLevel === "critical") {
    actions.push("freeze_wallet", "block_transactions", "flag_manual_review", "notify_security_team");
  } else if (riskLevel === "high") {
    actions.push("reduce_limits", "require_kyc", "require_otp_all", "flag_manual_review");
  } else if (riskLevel === "medium") {
    actions.push("reduce_limits", "require_otp_sensitive", "monitor_closely");
  } else {
    actions.push("monitor");
  }

  for (const sig of signals) {
    if (sig.type === "mule_account") actions.push("investigate_network");
    if (sig.type === "circular_transfer") actions.push("investigate_circular_network");
    if (sig.type === "geo_inconsistency") actions.push("verify_location");
  }

  return [...new Set(actions)];
}

export function analyzeAccountRelationships(userId: string): {
  relatedAccounts: string[];
  suspiciousLinks: number;
  networkRiskScore: number;
} {
  const txs = recentTransactions.get(userId) || [];
  const partnerIds = new Set<string>();

  for (const tx of txs) {
    if (tx.senderId === userId) partnerIds.add(tx.recipientId);
    if (tx.recipientId === userId) partnerIds.add(tx.senderId);
  }

  let suspiciousLinks = 0;
  for (const partnerId of partnerIds) {
    const partnerTxs = recentTransactions.get(partnerId) || [];
    const partnerPartners = new Set<string>();
    for (const tx of partnerTxs) {
      if (tx.senderId === partnerId) partnerPartners.add(tx.recipientId);
      if (tx.recipientId === partnerId) partnerPartners.add(tx.senderId);
    }

    const commonPartners = [...partnerPartners].filter(id => partnerIds.has(id) && id !== userId);
    if (commonPartners.length >= 2) suspiciousLinks++;
  }

  const networkRiskScore = Math.min(100, suspiciousLinks * 15);

  return {
    relatedAccounts: [...partnerIds],
    suspiciousLinks,
    networkRiskScore,
  };
}
