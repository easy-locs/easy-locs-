import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, resetAllMocks, type MockSupabaseClient } from "@/test/__mocks__/supabase";

const mockEmit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
    schema: vi.fn(),
  },
}));

vi.mock("@/lib/shared/platform-bus", () => ({
  platformBus: { emit: mockEmit },
}));

vi.mock("@/lib/schema/domain-schemas", () => ({
  DOMAIN_TABLE_MAP: {},
  LEGACY_TABLE_REDIRECTS: {},
}));

const mockClient = createMockSupabase();
const mockFunctionsInvoke = vi.fn().mockResolvedValue({ data: null, error: null });
mockClient.functions.invoke = mockFunctionsInvoke;

vi.mock("@/services/db", () => {
  const dbProxy = (...args: unknown[]) => mockClient.from(...args);
  const dbFn = Object.assign(dbProxy, {
    from: (...args: unknown[]) => mockClient.from(...args),
    rpc: (...args: unknown[]) => mockClient.rpc(...args),
    auth: mockClient.auth,
    functions: mockClient.functions,
    storage: mockClient.storage,
  });
  return { db: dbFn, domainDb: {} };
});

describe("KYC Integration — full upload-to-review workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllMocks(mockClient);
  });

  it("completes full workflow: upload → insert → status update → emit → review", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: "user-1/national_id-123.jpg" }, error: null });
    mockClient.storage.from.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://mock.url/file" } }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url" } }),
    });

    const insertQb = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "doc-1" }, error: null }),
    };
    const updateQb = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockClient.from
      .mockReturnValueOnce(insertQb)
      .mockReturnValueOnce(updateQb);

    const { uploadKycDocument } = await import("@/services/domain/kyc.service");
    const file = new File(["test-data"], "id-card.jpg", { type: "image/jpeg" });
    await uploadKycDocument({ userId: "user-1", documentType: "national_id", file });

    expect(mockClient.storage.from).toHaveBeenCalledWith("kyc-documents");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining("user-1/national_id-"),
      file,
      { contentType: "image/jpeg", upsert: false }
    );

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        document_type: "national_id",
        status: "pending",
      })
    );

    expect(updateQb.update).toHaveBeenCalledWith({ kyc_status: "documents_pending" });
    expect(updateQb.eq).toHaveBeenCalledWith("user_id", "user-1");

    expect(mockEmit).toHaveBeenCalledWith("kyc:document_submitted", {
      userId: "user-1",
      documentType: "national_id",
    });

    mockClient.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "admin-token" } },
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { success: true, newKycLevel: "standard" },
      error: null,
    });

    const { reviewKycDocument } = await import("@/services/domain/kyc.service");
    const result = await reviewKycDocument("doc-1", "approve");

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("kyc-review", {
      body: { documentId: "doc-1", action: "approve", reason: undefined },
      headers: { Authorization: "Bearer admin-token" },
    });
    expect(result).toEqual({ success: true, newKycLevel: "standard" });
  });

  it("handles upload failure gracefully without proceeding to review", async () => {
    mockClient.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: "quota exceeded" } }),
    });

    const { uploadKycDocument } = await import("@/services/domain/kyc.service");
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });

    await expect(
      uploadKycDocument({ userId: "user-1", documentType: "passport", file })
    ).rejects.toThrow("File upload failed: quota exceeded");

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("handles review rejection with reason", async () => {
    mockClient.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "admin-tok" } },
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const { reviewKycDocument } = await import("@/services/domain/kyc.service");
    await reviewKycDocument("doc-99", "reject", "Image is blurry");

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("kyc-review", {
      body: { documentId: "doc-99", action: "reject", reason: "Image is blurry" },
      headers: { Authorization: "Bearer admin-tok" },
    });
  });

  it("multi-document upload workflow groups by user in queue", async () => {
    const docs = [
      { id: "d1", user_id: "u1", document_type: "national_id", status: "pending" },
      { id: "d2", user_id: "u1", document_type: "selfie", status: "pending" },
    ];
    const providers = [
      { id: "p1", user_id: "u1", display_name: "Alice", provider_type: "commerce", kyc_level: "basic", kyc_status: "pending", profile_photo_url: null, onboarding_status: "completed", created_at: "2025-01-01" },
    ];

    function chainQb(overrides: Record<string, unknown>) {
      const qb: Record<string, unknown> = {};
      const methods = ["select", "eq", "neq", "in", "order", "limit", "single", "maybeSingle", "gt", "gte", "lt", "lte"];
      for (const m of methods) qb[m] = vi.fn().mockReturnValue(qb);
      Object.assign(qb, overrides);
      return qb;
    }
    const docsQb = chainQb({ order: vi.fn().mockResolvedValue({ data: docs, error: null }) });
    const providersQb = chainQb({ in: vi.fn().mockResolvedValue({ data: providers, error: null }) });
    const profilesQb = chainQb({ in: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const reviewQb = chainQb({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });

    mockClient.from
      .mockReturnValueOnce(docsQb)
      .mockReturnValueOnce(providersQb)
      .mockReturnValueOnce(profilesQb)
      .mockReturnValueOnce(reviewQb);

    const { fetchKycQueue } = await import("@/services/domain/kyc.service");
    const queue = await fetchKycQueue("pending");

    expect(queue).toHaveLength(1);
    expect(queue[0].documents).toHaveLength(2);
    expect(queue[0].displayName).toBe("Alice");
  });
});
