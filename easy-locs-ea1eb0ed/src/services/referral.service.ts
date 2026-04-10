import { db } from "./db";


export interface ReferralCodeRow {
  id: string;
  code: string;
  owner_user_id: string;
  reward_amount: number;
  reward_currency: string;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface ReferralRedemptionRow {
  id: string;
  code: string;
  referred_user_id: string;
  referrer_user_id: string;
  reward_amount: number;
  reward_currency: string;
  status: "pending" | "credited" | "expired";
  created_at: string;
}

function generateCode(prefix = "EL"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const referralService = {
  async getOrCreateCode(userId: string, currency = "AED"): Promise<ReferralCodeRow> {
    const { data: existing, error: fetchErr } = await db("referral_codes")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("is_active", true)
      .maybeSingle() as { data: ReferralCodeRow | null; error: any };

    if (fetchErr && fetchErr.code !== "42P01") throw fetchErr;
    if (existing) return existing;

    const code = generateCode();
    const { data, error } = await db("referral_codes")
      .insert({
        code,
        owner_user_id: userId,
        reward_amount: 10,
        reward_currency: currency,
        max_uses: null,
        use_count: 0,
        is_active: true,
      })
      .select()
      .single() as { data: ReferralCodeRow | null; error: any };

    if (error) {
      if (error.code === "42P01") {
        return {
          id: crypto.randomUUID(),
          code,
          owner_user_id: userId,
          reward_amount: 10,
          reward_currency: currency,
          max_uses: null,
          use_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          expires_at: null,
        };
      }
      throw error;
    }
    return data!;
  },

  async redeemCode(code: string, referredUserId: string): Promise<{ success: boolean; message: string }> {
    const { data: codeRow, error: fetchErr } = await db("referral_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .maybeSingle() as { data: ReferralCodeRow | null; error: any };

    if (fetchErr) {
      if (fetchErr.code === "42P01") return { success: false, message: "Referral system not yet available" };
      throw fetchErr;
    }
    if (!codeRow) return { success: false, message: "Invalid or expired referral code" };
    if (codeRow.owner_user_id === referredUserId) return { success: false, message: "Cannot use your own referral code" };
    if (codeRow.max_uses && codeRow.use_count >= codeRow.max_uses) return { success: false, message: "Referral code has reached maximum uses" };
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) return { success: false, message: "Referral code has expired" };

    const { data: existingRedeem, error: existErr } = await db("referral_redemptions")
      .select("id")
      .eq("referred_user_id", referredUserId)
      .maybeSingle() as { data: { id: string } | null; error: any };
    if (existErr && existErr.code !== "42P01") throw existErr;
    if (existingRedeem) return { success: false, message: "You have already used a referral code" };

    const { error: insertErr } = await db("referral_redemptions")
      .insert({
        code: codeRow.code,
        referred_user_id: referredUserId,
        referrer_user_id: codeRow.owner_user_id,
        reward_amount: codeRow.reward_amount,
        reward_currency: codeRow.reward_currency,
        status: "pending",
      });
    if (insertErr) {
      if (insertErr.code === "42P01") return { success: false, message: "Referral system not yet available" };
      throw insertErr;
    }

    const { error: updateErr } = await db("referral_codes")
      .update({ use_count: codeRow.use_count + 1 })
      .eq("id", codeRow.id);
    if (updateErr && updateErr.code !== "42P01") {
      throw updateErr;
    }

    return { success: true, message: `Referral applied! ${codeRow.reward_amount} ${codeRow.reward_currency} credit will be added after first order.` };
  },

  async fetchReferralStats(userId: string): Promise<{ code: string; totalReferred: number; totalEarned: number; currency: string }> {
    const codeRow = await this.getOrCreateCode(userId);

    const { data: redemptions, error: redemptionErr } = await db("referral_redemptions")
      .select("reward_amount, status")
      .eq("referrer_user_id", userId) as { data: Array<{ reward_amount: number; status: string }> | null; error: any };

    if (redemptionErr && redemptionErr.code !== "42P01") throw redemptionErr;

    const rows = redemptions ?? [];
    const credited = rows.filter(r => r.status === "credited");

    return {
      code: codeRow.code,
      totalReferred: rows.length,
      totalEarned: credited.reduce((s, r) => s + r.reward_amount, 0),
      currency: codeRow.reward_currency,
    };
  },
};
