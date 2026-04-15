/**
 * wallet-transfer — Backend-authoritative atomic P2P wallet transfer.
 * Uses atomic_wallet_transfer RPC for single-transaction execution.
 * Handles: auth, PIN verification (inline), limit checks, server-side anti-fraud, audit.
 * No partial success — all or nothing.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { argon2Verify } from "npm:hash-wasm@4.11.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { redisGet, redisSet, redisIncr, redisExpire } from "../_shared/redis-client.ts";

let _corsHeaders: Record<string, string> = {};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ..._corsHeaders, "Content-Type": "application/json" } });
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ..._corsHeaders, "Content-Type": "application/json" } });
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$argon2id$")) {
    return await argon2Verify({ password: pin, hash: storedHash });
  }
  const [salt] = storedHash.split(":");
  if (!salt) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(pin));
  const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  const computed = `${salt}:${hash}`;
  if (computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

const VELOCITY_WINDOW_MS = 3_600_000;
const MAX_UNIQUE_RECIPIENTS_PER_HOUR = 15;
const MAX_TX_PER_MINUTE = 10;
const RAPID_SUCCESSION_MS = 5_000;
const MAX_RAPID_TX = 3;
const SUSPICIOUS_AMOUNT_THRESHOLD = 25_000;

interface ServerFraudResult {
  pass: boolean;
  reason?: string;
  riskScore?: number;
}

async function serverAntifraudCheck(
  userId: string,
  receiverId: string,
  amount: number,
  idempotencyKey: string | null,
  securityFlag: string,
): Promise<ServerFraudResult> {
  if (securityFlag === "blocked" || securityFlag === "restricted") {
    return { pass: false, reason: "account_blocked", riskScore: 100 };
  }

  let redisAvailable = true;

  if (idempotencyKey) {
    const dupKey = `idem:transfer:${idempotencyKey}`;
    const existing = await redisGet<string>(dupKey);
    if (existing) {
      return { pass: false, reason: "duplicate_request", riskScore: 100 };
    }
  }

  const rateKey = `txrate:${userId}`;
  const currentCount = await redisIncr(rateKey);
  if (currentCount === null) {
    redisAvailable = false;
  } else {
    if (currentCount === 1) {
      await redisExpire(rateKey, 60);
    }
    const adjustedLimit = securityFlag === "high_risk" ? 2
      : securityFlag === "review_required" ? 3
      : securityFlag === "suspicious" ? 5
      : MAX_TX_PER_MINUTE;
    if (currentCount > adjustedLimit) {
      return { pass: false, reason: "rate_limited", riskScore: 80 };
    }
  }

  if (redisAvailable) {
    const rapidKey = `rapid:${userId}`;
    const rapidCount = await redisIncr(rapidKey);
    if (rapidCount === null) {
      redisAvailable = false;
    } else {
      if (rapidCount === 1) {
        await redisExpire(rapidKey, Math.ceil(RAPID_SUCCESSION_MS / 1000));
      }
      if (rapidCount > MAX_RAPID_TX) {
        return { pass: false, reason: "rapid_succession", riskScore: 75 };
      }
    }
  }

  if (redisAvailable) {
    const recipientCountKey = `recipients:${userId}`;
    const recipientSetKey = `recipientset:${userId}:${receiverId}`;
    const isNewRecipient = !(await redisGet<string>(recipientSetKey));
    if (isNewRecipient) {
      await redisSet(recipientSetKey, "1", Math.ceil(VELOCITY_WINDOW_MS / 1000));
      const count = await redisIncr(recipientCountKey);
      if (count !== null) {
        if (count === 1) {
          await redisExpire(recipientCountKey, Math.ceil(VELOCITY_WINDOW_MS / 1000));
        }
        const maxRecipients = securityFlag === "high_risk" ? 2
          : securityFlag === "review_required" ? 3
          : securityFlag === "suspicious" ? 8
          : MAX_UNIQUE_RECIPIENTS_PER_HOUR;
        if (count > maxRecipients) {
          return { pass: false, reason: "too_many_unique_recipients", riskScore: 75 };
        }
      } else {
        redisAvailable = false;
      }
    }
  }

  if (redisAvailable) {
    const adjustedThreshold = securityFlag === "high_risk" ? 500
      : securityFlag === "review_required" ? 1000
      : securityFlag === "suspicious" ? 5000
      : SUSPICIOUS_AMOUNT_THRESHOLD;

    const hourlyKey = `hourly_vol:${userId}`;
    const currentVol = await redisGet<number>(hourlyKey);
    const newVol = (currentVol || 0) + amount;
    if (newVol > adjustedThreshold) {
      return { pass: false, reason: "hourly_volume_exceeded", riskScore: 90 };
    }
    await redisSet(hourlyKey, newVol, Math.ceil(VELOCITY_WINDOW_MS / 1000));
  }

  if (!redisAvailable) {
    console.warn("[wallet-transfer] Redis unavailable — applying fail-closed amount cap");
    const FAIL_CLOSED_MAX = 500;
    if (amount > FAIL_CLOSED_MAX) {
      return { pass: false, reason: "security_service_unavailable", riskScore: 95 };
    }
  }

  let riskScore = 0;
  if (amount > 5000) riskScore += 20;
  if (amount > 10000) riskScore += 30;
  if (amount > 25000) riskScore += 50;
  if (securityFlag === "suspicious") riskScore += 20;
  if (securityFlag === "review_required") riskScore += 30;
  if (securityFlag === "high_risk") riskScore += 40;
  if (!redisAvailable) riskScore += 15;

  return { pass: true, riskScore: Math.min(riskScore, 100) };
}

Deno.serve(withEdgeLogging("wallet-transfer", async (req, logger) => {
  _corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: _corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const rlResult = await checkServerRateLimit(req, "wallet-transfer");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return err("Unauthorized", 401);
    const { data: ud, error: ue } = await sb.auth.getUser(token);
    if (ue || !ud.user) return err("Not authenticated", 401);
    const callerUserId = ud.user.id;

    const body = await req.json();
    const {
      sender_user_id,
      receiver_user_id,
      amount,
      currency = "AED",
      receiver_currency,
      idempotency_key,
      source = "manual",
      note,
      pin,
      high_value_confirmed,
      device_binding_proof,
      trust_score: clientTrustScore,
      security_flag: clientSecurityFlag,
    } = body;

    if (!sender_user_id || !receiver_user_id) return err("sender_user_id and receiver_user_id required");
    if (sender_user_id !== callerUserId) return err("Cannot transfer from another user's wallet", 403);
    if (sender_user_id === receiver_user_id) return err("Cannot transfer to yourself");
    if (!amount || typeof amount !== "number" || amount <= 0) return err("Amount must be a positive number");
    if (amount > 50000) return err("Transfer exceeds maximum limit");
    if (note && typeof note === "string" && note.length > 500) return err("Note must be 500 characters or less");

    if (amount > 100) {
      const { data: senderProvider } = await sb
        .from("providers")
        .select("kyc_level")
        .eq("user_id", sender_user_id)
        .maybeSingle();
      const kycLevel = senderProvider?.kyc_level || "none";
      const KYC_ORDER = ["none", "basic", "standard", "enhanced", "full"];
      if (KYC_ORDER.indexOf(kycLevel) < KYC_ORDER.indexOf("standard")) {
        return err(`KYC level "standard" required for transfers over 100 AED. Current: "${kycLevel}". Please complete verification.`, 403);
      }
    }

    if (
      !device_binding_proof ||
      typeof device_binding_proof !== "object" ||
      !device_binding_proof.userId ||
      !device_binding_proof.walletId ||
      !device_binding_proof.hmac ||
      !device_binding_proof.deviceId
    ) {
      return err("Device binding proof required — bind your wallet before transferring", 403);
    }

    if (device_binding_proof.userId !== sender_user_id) {
      return err("Device binding user mismatch — re-authenticate", 403);
    }

    const { data: serverBinding } = await sb
      .from("wallet_device_bindings")
      .select("hmac, device_id, salt")
      .eq("user_id", sender_user_id)
      .eq("wallet_id", device_binding_proof.walletId as string)
      .maybeSingle();

    if (!serverBinding) {
      console.warn("[wallet-transfer] No server-side device binding found for user:", sender_user_id);
      return err("Device not registered — please re-bind your wallet", 403);
    }

    if (serverBinding.device_id !== device_binding_proof.deviceId) {
      console.warn("[wallet-transfer] Device ID mismatch for user:", sender_user_id);
      return err("Transfer blocked — device does not match registered binding", 403);
    }

    const enc = new TextEncoder();
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(`${sender_user_id}:${serverBinding.salt}`),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const hmacMsg = enc.encode(`${sender_user_id}:${serverBinding.device_id}:${device_binding_proof.walletId}`);
    const hmacSig = await crypto.subtle.sign("HMAC", hmacKey, hmacMsg);
    const recomputedHmac = Array.from(new Uint8Array(hmacSig)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (recomputedHmac !== serverBinding.hmac) {
      console.warn("[wallet-transfer] Server HMAC recomputation mismatch — stored binding is corrupt for user:", sender_user_id);
      return err("Device binding integrity check failed — please re-bind your wallet", 403);
    }

    if (device_binding_proof.hmac !== recomputedHmac) {
      console.warn("[wallet-transfer] Client HMAC does not match server-recomputed HMAC for user:", sender_user_id);
      return err("Device binding verification failed — tampered binding detected", 403);
    }

    const { data: receiverProfile } = await sb
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", receiver_user_id)
      .maybeSingle();
    if (!receiverProfile) return err("Recipient not found — cannot transfer to unknown user");

    const { data: senderProfile } = await sb
      .from("profiles")
      .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
      .eq("id", sender_user_id)
      .maybeSingle();

    if (!pin) return err("Wallet PIN is required for all transfers", 403);

    if (!senderProfile?.wallet_pin_hash) {
      return err("Wallet PIN must be configured before making transfers. Go to Wallet → Security to set up your PIN.", 403);
    }

    if (senderProfile.wallet_pin_locked_until && new Date(senderProfile.wallet_pin_locked_until) > new Date()) {
      return err("Wallet PIN is temporarily locked. Try again later.", 403);
    }

    const pinMatches = await verifyPin(pin, senderProfile.wallet_pin_hash);
    if (!pinMatches) {
      const { data: lockoutResult } = await sb.rpc("atomic_pin_fail_increment", {
        p_user_id: sender_user_id,
        p_max_attempts: 5,
        p_lockout_seconds: 900,
      });
      const row = Array.isArray(lockoutResult) ? lockoutResult[0] : lockoutResult;
      const attempts = row?.new_attempts ?? (senderProfile.wallet_pin_failed_attempts || 0) + 1;
      return err(`Invalid PIN (${attempts}/5 attempts)`, 403);
    }
    await sb.rpc("atomic_pin_success_reset", { p_user_id: sender_user_id })
      .then(() => {}).catch(() => {});

    const PSD2_HIGH_VALUE_THRESHOLD = 250;
    if (amount >= PSD2_HIGH_VALUE_THRESHOLD && !high_value_confirmed) {
      return err(
        `Transfers of ${PSD2_HIGH_VALUE_THRESHOLD}+ ${currency} require explicit confirmation (PSD2 SCA). Resend with high_value_confirmed: true.`,
        428
      );
    }

    const TRUST_LEVEL_LIMITS: Record<number, { dailySend: number; singleTx: number }> = {
      0: { dailySend: 0, singleTx: 0 },
      1: { dailySend: 2000, singleTx: 500 },
      2: { dailySend: 5000, singleTx: 2000 },
      3: { dailySend: 20000, singleTx: 10000 },
      4: { dailySend: 100000, singleTx: 50000 },
    };
    const SECURITY_FLAG_MULTIPLIERS: Record<string, number> = {
      normal: 1.0, low_risk: 0.8, suspicious: 0.5,
      review_required: 0.3, high_risk: 0.1, restricted: 0, blocked: 0,
    };

    function getTrustLevelFromScore(score: number): number {
      if (score >= 85) return 4;
      if (score >= 60) return 3;
      if (score >= 30) return 2;
      if (score >= 10) return 1;
      return 0;
    }

    interface TrustProfile {
      kyc_status?: string;
      device_bound?: boolean;
      contacts_synced?: boolean;
      security_flag?: string;
    }
    interface AuthUser {
      phone?: string;
      email_confirmed_at?: string;
      created_at?: string;
    }

    function computeServerTrustScore(profile: TrustProfile, user: AuthUser, completedTxCount: number): number {
      let score = 0;
      if (user.phone) score += 10;
      if (user.email_confirmed_at) score += 5;
      const ks = profile?.kyc_status || "not_started";
      if (ks === "completed" || ks === "approved") score += 25;
      else if (ks === "submitted" || ks === "pending") score += 10;
      if (profile?.device_bound) score += 5;
      if (profile?.contacts_synced) score += 5;
      if (user.created_at) {
        const ageDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
        if (ageDays >= 365) score += 15;
        else if (ageDays >= 90) score += 10;
        else if (ageDays >= 30) score += 5;
        else if (ageDays >= 7) score += 2;
      }
      if (completedTxCount >= 100) score += 15;
      else if (completedTxCount >= 50) score += 10;
      else if (completedTxCount >= 10) score += 5;
      else if (completedTxCount >= 1) score += 2;
      return Math.min(score, 100);
    }

    function deriveSecurityFlag(profile: TrustProfile): string {
      if (profile?.security_flag && typeof profile.security_flag === "string") {
        return profile.security_flag;
      }
      return "normal";
    }

    const { data: trustProfile } = await sb
      .from("profiles")
      .select("kyc_status, device_bound, contacts_synced, security_flag")
      .eq("id", sender_user_id)
      .maybeSingle();

    const { count: completedTxCount } = await sb
      .from("unified_wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", sender_user_id)
      .eq("status", "completed");

    const serverTrustScore = computeServerTrustScore(trustProfile || {}, ud.user as AuthUser, completedTxCount || 0);
    const serverSecurityFlag = deriveSecurityFlag(trustProfile || {});

    if (typeof clientTrustScore === "number" && Math.abs(clientTrustScore - serverTrustScore) > 20) {
      console.warn(`[wallet-transfer] Trust score drift: client=${clientTrustScore}, server=${serverTrustScore}, user=${sender_user_id}`);
      await sb.from("audit_logs").insert({
        user_id: sender_user_id,
        action: "trust_score_drift_detected",
        metadata_json: { client: clientTrustScore, server: serverTrustScore, drift: Math.abs(clientTrustScore - serverTrustScore) },
      }).then(() => {}).catch(() => {});
    }
    if (typeof clientSecurityFlag === "string" && clientSecurityFlag !== serverSecurityFlag) {
      console.warn(`[wallet-transfer] Security flag drift: client=${clientSecurityFlag}, server=${serverSecurityFlag}, user=${sender_user_id}`);
    }

    const fraudCheck = await serverAntifraudCheck(
      sender_user_id, receiver_user_id, amount, idempotency_key || null, serverSecurityFlag
    );
    if (!fraudCheck.pass) {
      console.warn(`[wallet-transfer] Anti-fraud blocked: reason=${fraudCheck.reason}, user=${sender_user_id}`);
      await sb.from("audit_logs").insert({
        user_id: sender_user_id,
        action: "transfer_blocked_antifraud",
        metadata_json: { reason: fraudCheck.reason, amount, receiver: receiver_user_id, risk_score: fraudCheck.riskScore },
      }).then(() => {}).catch(() => {});

      const userMessages: Record<string, string> = {
        account_blocked: "Your account is restricted. Contact support for assistance.",
        duplicate_request: "This transfer was already processed.",
        rate_limited: "Too many transfers in a short period. Please wait a moment.",
        rapid_succession: "Transfers are happening too quickly. Please wait a few seconds.",
        too_many_unique_recipients: "You've sent to too many different recipients recently. Please wait.",
        hourly_volume_exceeded: "Hourly transfer volume exceeded. Please try again later.",
      };
      return err(userMessages[fraudCheck.reason || ""] || "Transfer blocked by security checks", 403);
    }

    const trustLevel = getTrustLevelFromScore(serverTrustScore);
    const baseLimits = TRUST_LEVEL_LIMITS[trustLevel] || TRUST_LEVEL_LIMITS[0];
    const flagMultiplier = SECURITY_FLAG_MULTIPLIERS[serverSecurityFlag] ?? 1.0;
    const effectiveDailyLimit = Math.round(baseLimits.dailySend * flagMultiplier);
    const effectiveSingleTxLimit = Math.round(baseLimits.singleTx * flagMultiplier);

    const { data: profileLimits } = await sb
      .from("wallet_limit_profiles")
      .select("single_tx_limit, daily_send_limit")
      .eq("user_id", sender_user_id)
      .maybeSingle();

    const finalDailyLimit = profileLimits ? Math.min(Number(profileLimits.daily_send_limit || effectiveDailyLimit), effectiveDailyLimit) : effectiveDailyLimit;
    const finalSingleTxLimit = profileLimits ? Math.min(Number(profileLimits.single_tx_limit || effectiveSingleTxLimit), effectiveSingleTxLimit) : effectiveSingleTxLimit;

    if (amount > finalSingleTxLimit) {
      return err(`Amount exceeds single transaction limit of ${finalSingleTxLimit} ${currency}`);
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: todayEntries } = await sb
      .from("wallet_ledger_entries")
      .select("amount")
      .eq("status", "posted")
      .eq("direction", "out")
      .eq("entry_type", "transfer")
      .gte("created_at", todayStart.toISOString())
      .in("wallet_account_id", (await sb.from("wallet_accounts").select("id").eq("owner_user_id", sender_user_id).eq("currency", currency)).data?.map((w: { id: string }) => w.id) || []);
    const todayTotal = (todayEntries || []).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    if (todayTotal + amount > finalDailyLimit) {
      return err(`Would exceed daily send limit of ${finalDailyLimit} ${currency}`);
    }

    let receiverAmount = amount;
    let receiverCcy = currency;
    let fxRateUsed: number | null = null;
    let fxSpread: number | null = null;

    if (receiver_currency && receiver_currency !== currency) {
      const PLATFORM_SPREAD = 0.02;
      let rates: Record<string, number> | null = null;

      const { data: cached } = await sb
        .from("fx_rates_cache")
        .select("rates_json")
        .gt("expires_at", new Date().toISOString())
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.rates_json && typeof cached.rates_json === "object") {
        rates = cached.rates_json as Record<string, number>;
      }

      if (!rates) {
        try {
          const ecbRes = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
          if (ecbRes.ok) {
            const xml = await ecbRes.text();
            rates = { EUR: 1 };
            const regex = /currency='([A-Z]+)'\s+rate='([0-9.]+)'/g;
            let match;
            while ((match = regex.exec(xml)) !== null) {
              rates[match[1]] = parseFloat(match[2]);
            }
          }
        } catch {}
      }

      if (!rates) return err("Unable to fetch exchange rates for cross-currency transfer");

      const senderRate = rates[currency];
      const receiverRate = rates[receiver_currency];
      if (!senderRate || !receiverRate) {
        return err(`Unsupported currency pair: ${currency} → ${receiver_currency}`);
      }

      const rawRate = receiverRate / senderRate;
      const spreadAdjustedRate = rawRate * (1 - PLATFORM_SPREAD);
      receiverAmount = Math.round(amount * spreadAdjustedRate * 100) / 100;
      receiverCcy = receiver_currency;
      fxRateUsed = rawRate;
      fxSpread = PLATFORM_SPREAD;
    }

    let result: Record<string, unknown> | null = null;

    if (fxRateUsed && receiverCcy !== currency) {
      const fxNote = `FX: ${amount} ${currency} → ${receiverAmount} ${receiverCcy} @${fxRateUsed.toFixed(6)} (${((fxSpread ?? 0) * 100).toFixed(1)}% spread)${note ? " | " + note : ""}`;

      const { data: fxResult, error: fxErr } = await sb.rpc("atomic_wallet_transfer_fx", {
        p_sender_user_id: sender_user_id,
        p_receiver_user_id: receiver_user_id,
        p_sender_amount: amount,
        p_sender_currency: currency,
        p_receiver_amount: receiverAmount,
        p_receiver_currency: receiverCcy,
        p_fx_rate: fxRateUsed,
        p_fx_spread: fxSpread,
        p_idempotency_key: idempotency_key || null,
        p_source: source,
        p_note: fxNote,
      });

      if (fxErr) {
        console.error("[wallet-transfer] FX RPC error:", fxErr.message);
        if (fxErr.message.includes("Insufficient balance")) return err(fxErr.message);
        if (fxErr.message.includes("Sender wallet not found")) return err("Wallet not found for this currency");
        return err(fxErr.message || "Transfer failed", 500);
      }
      result = fxResult as Record<string, unknown> | null;
    } else {
      const { data: stdResult, error: stdErr } = await sb.rpc("atomic_wallet_transfer", {
        p_sender_user_id: sender_user_id,
        p_receiver_user_id: receiver_user_id,
        p_amount: amount,
        p_currency: currency,
        p_idempotency_key: idempotency_key || null,
        p_source: source,
        p_note: note || null,
      });

      if (stdErr) {
        console.error("[wallet-transfer] RPC error:", stdErr.message);
        if (stdErr.message.includes("Insufficient balance")) return err(stdErr.message);
        if (stdErr.message.includes("Sender wallet not found")) return err("Wallet not found for this currency");
        return err(stdErr.message || "Transfer failed", 500);
      }
      result = stdResult as Record<string, unknown> | null;
    }

    if (idempotency_key) {
      const dupKey = `idem:transfer:${idempotency_key}`;
      await redisSet(dupKey, "1", 300);
    }

    const receiverName = receiverProfile.full_name || receiverProfile.username || "Unknown";

    await sb.from("financial_audit_trail").insert({
      user_id: sender_user_id,
      transaction_type: "wallet_transfer",
      amount,
      currency,
      counterparty_id: receiver_user_id,
      reference_id: String(result?.transfer_id ?? ""),
      reference_type: "wallet_transfer",
      payment_method: "wallet",
      status: "completed",
      metadata: {
        source,
        note: note || null,
        fx_rate: fxRateUsed,
        fx_spread: fxSpread,
        converted_amount: fxRateUsed ? receiverAmount : null,
        psd2_high_value: amount >= PSD2_HIGH_VALUE_THRESHOLD,
        server_trust_score: serverTrustScore,
        server_security_flag: serverSecurityFlag,
        fraud_risk_score: fraudCheck.riskScore,
      },
    }).then(() => {}).catch(() => {});

    return ok({
      success: true,
      transfer_id: result?.transfer_id,
      duplicate: result?.duplicate || false,
      amount,
      currency,
      converted_amount: fxRateUsed ? receiverAmount : undefined,
      converted_currency: fxRateUsed ? receiverCcy : undefined,
      fx_rate: fxRateUsed,
      fx_spread: fxSpread,
      receiver_name: receiverName,
      receiver_user_id,
    });
  } catch (e) {
    console.error("[wallet-transfer] Error:", e);
    return err(e instanceof Error ? e.message : "Transfer failed", 500);
  }
}));
