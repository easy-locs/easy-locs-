import { describe, it, expect, vi } from "vitest";
import { generateTransactionReceipt } from "@/lib/wallet-export";

const mockTx = {
  id: "tx-abc123-def456",
  user_id: "u1",
  type: "transfer" as const,
  direction: "out" as const,
  amount: 250,
  currency: "LOCS",
  status: "completed" as const,
  created_at: "2026-03-15T10:30:00Z",
  description: "Test payment",
  reference_code: "EL-20260315-0001",
  original_amount: null,
  original_currency: null,
  fx_rate_used: null,
  counterpart_user_id: null,
  thread_id: null,
  reference_type: null,
  reference_id: null,
  metadata_json: null,
};

describe("Wallet Export", () => {
  describe("generateTransactionReceipt", () => {
    it("includes reference code", () => {
      const receipt = generateTransactionReceipt(mockTx as any);
      expect(receipt).toContain("EL-20260315-0001");
    });

    it("includes amount and currency", () => {
      const receipt = generateTransactionReceipt(mockTx as any);
      expect(receipt).toContain("250 LOCS");
    });

    it("shows SENT for outgoing", () => {
      const receipt = generateTransactionReceipt(mockTx as any);
      expect(receipt).toContain("SENT");
    });

    it("shows RECEIVED for incoming", () => {
      const inTx = { ...mockTx, direction: "in" as const };
      const receipt = generateTransactionReceipt(inTx as any);
      expect(receipt).toContain("RECEIVED");
    });

    it("includes description", () => {
      const receipt = generateTransactionReceipt(mockTx as any);
      expect(receipt).toContain("Test payment");
    });

    it("includes EASY-LOCS branding", () => {
      const receipt = generateTransactionReceipt(mockTx as any);
      expect(receipt).toContain("EASY-LOCS");
    });

    it("shows FX info when present", () => {
      const fxTx = { ...mockTx, original_amount: 200, original_currency: "EUR", fx_rate_used: 1.25 };
      const receipt = generateTransactionReceipt(fxTx as any);
      expect(receipt).toContain("200 EUR");
      expect(receipt).toContain("1.25");
    });
  });
});
