import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

interface DbResult {
  data: unknown;
  error: unknown;
}

type ThenHandler = (v: DbResult) => unknown;

interface MockQueryBuilder {
  select: Mock;
  insert: Mock;
  update: Mock;
  upsert: Mock;
  delete: Mock;
  eq: Mock;
  neq: Mock;
  in: Mock;
  limit: Mock;
  order: Mock;
  single: Mock;
  maybeSingle: Mock;
  then: Mock;
}

function createQueryBuilder(): MockQueryBuilder {
  const builder = {} as MockQueryBuilder;
  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.upsert = vi.fn().mockReturnValue(builder);
  builder.delete = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.neq = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.then = vi.fn().mockImplementation(
    (resolve: ThenHandler) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
  );
  return builder;
}

const mockFrom = vi.fn().mockImplementation(() => createQueryBuilder());
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockFunctionsInvoke = vi.fn().mockResolvedValue({ data: null, error: null });
const mockStorageFrom = vi.fn().mockReturnValue({
  upload: vi.fn().mockResolvedValue({ data: { path: "mock" }, error: null }),
  getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://mock.url/file" } }),
  createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url" } }),
});

vi.mock("@/services/db", () => {
  const dbProxy = (...args: unknown[]) => mockFrom(...args);
  const dbFn = Object.assign(dbProxy, {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    functions: { invoke: (...args: unknown[]) => mockFunctionsInvoke(...args) },
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
  });
  return { db: dbFn, domainDb: {} };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
    schema: vi.fn(),
  },
}));

vi.mock("@/lib/shared/platform-bus", () => ({
  platformBus: { emit: vi.fn() },
}));

vi.mock("@/lib/schema/domain-schemas", () => ({
  DOMAIN_TABLE_MAP: {},
  LEGACY_TABLE_REDIRECTS: {},
}));

describe("kyc.service — checkAdminRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns isAdmin=true, isOwner=false for admin-only user", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: true })
      .mockResolvedValueOnce({ data: false });
    const { checkAdminRole } = await import("@/services/domain/kyc.service");
    const result = await checkAdminRole("user-1");
    expect(mockRpc).toHaveBeenCalledWith("has_role", { _user_id: "user-1", _role: "admin" });
    expect(mockRpc).toHaveBeenCalledWith("has_role", { _user_id: "user-1", _role: "owner" });
    expect(result).toEqual({ isAdmin: true, isOwner: false });
  });

  it("returns isAdmin=false, isOwner=true for owner-only user", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: false })
      .mockResolvedValueOnce({ data: true });
    const { checkAdminRole } = await import("@/services/domain/kyc.service");
    const result = await checkAdminRole("user-2");
    expect(result).toEqual({ isAdmin: false, isOwner: true });
  });

  it("returns both false when user has no roles", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });
    const { checkAdminRole } = await import("@/services/domain/kyc.service");
    const result = await checkAdminRole("user-3");
    expect(result).toEqual({ isAdmin: false, isOwner: false });
  });
});

describe("kyc.service — fetchKycQueue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no documents match status", async () => {
    const qb = createQueryBuilder();
    qb.order.mockResolvedValueOnce({ data: [], error: null });
    mockFrom.mockReturnValueOnce(qb);

    const { fetchKycQueue } = await import("@/services/domain/kyc.service");
    const result = await fetchKycQueue("pending");
    expect(result).toEqual([]);
    expect(qb.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("returns empty array when docs data is null", async () => {
    const qb = createQueryBuilder();
    qb.order.mockResolvedValueOnce({ data: null, error: null });
    mockFrom.mockReturnValueOnce(qb);

    const { fetchKycQueue } = await import("@/services/domain/kyc.service");
    const result = await fetchKycQueue("approved");
    expect(result).toEqual([]);
  });

  it("groups documents by user and joins provider/profile data", async () => {
    const docs = [
      { id: "d1", user_id: "u1", document_type: "national_id", status: "pending" },
      { id: "d2", user_id: "u1", document_type: "selfie", status: "pending" },
      { id: "d3", user_id: "u2", document_type: "passport", status: "pending" },
    ];
    const providers = [
      { id: "p1", user_id: "u1", display_name: "Alice", provider_type: "taxi_driver", kyc_level: "basic", kyc_status: "pending", profile_photo_url: null, onboarding_status: "completed", created_at: "2025-01-01" },
    ];
    const profiles = [
      { id: "u1", email: "alice@test.com", phone: "+1234", created_at: "2025-01-01" },
    ];

    const docsQb = createQueryBuilder();
    docsQb.order.mockResolvedValueOnce({ data: docs, error: null });

    const providersQb = createQueryBuilder();
    providersQb.in.mockResolvedValueOnce({ data: providers, error: null });
    const profilesQb = createQueryBuilder();
    profilesQb.in.mockResolvedValueOnce({ data: profiles, error: null });
    const reviewQb = createQueryBuilder();
    reviewQb.order.mockResolvedValueOnce({ data: [], error: null });

    mockFrom
      .mockReturnValueOnce(docsQb)
      .mockReturnValueOnce(providersQb)
      .mockReturnValueOnce(profilesQb)
      .mockReturnValueOnce(reviewQb);

    const { fetchKycQueue } = await import("@/services/domain/kyc.service");
    const result = await fetchKycQueue("pending");

    expect(result).toHaveLength(2);
    const case1 = result.find((c) => c.userId === "u1");
    expect(case1).toBeDefined();
    expect(case1!.displayName).toBe("Alice");
    expect(case1!.documents).toHaveLength(2);
    expect(case1!.userProfile?.email).toBe("alice@test.com");

    const case2 = result.find((c) => c.userId === "u2");
    expect(case2).toBeDefined();
    expect(case2!.displayName).toBe("Unknown");
    expect(case2!.documents).toHaveLength(1);
  });
});

describe("kyc.service — reviewKycDocument", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes kyc-review edge function with auth token", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-123" } },
    });
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    const { reviewKycDocument } = await import("@/services/domain/kyc.service");
    const result = await reviewKycDocument("doc-1", "approve");

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("kyc-review", {
      body: { documentId: "doc-1", action: "approve", reason: undefined },
      headers: { Authorization: "Bearer tok-123" },
    });
    expect(result).toEqual({ success: true });
  });

  it("invokes without auth header when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    mockFunctionsInvoke.mockResolvedValueOnce({ data: {}, error: null });

    const { reviewKycDocument } = await import("@/services/domain/kyc.service");
    await reviewKycDocument("doc-2", "reject", "blurry");

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("kyc-review", {
      body: { documentId: "doc-2", action: "reject", reason: "blurry" },
      headers: undefined,
    });
  });

  it("throws when edge function returns error", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: { message: "unauthorized" } });

    const { reviewKycDocument } = await import("@/services/domain/kyc.service");
    await expect(reviewKycDocument("doc-3", "approve")).rejects.toEqual({ message: "unauthorized" });
  });
});

describe("kyc.service — uploadKycDocument", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads file to storage, inserts record, and updates provider status", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: "test" }, error: null });
    mockStorageFrom.mockReturnValueOnce({ upload: mockUpload });

    const insertQb = createQueryBuilder();
    const updateQb = createQueryBuilder();
    mockFrom.mockReturnValueOnce(insertQb).mockReturnValueOnce(updateQb);

    const { uploadKycDocument } = await import("@/services/domain/kyc.service");
    const file = new File(["data"], "id-card.jpg", { type: "image/jpeg" });
    await uploadKycDocument({ userId: "u1", documentType: "national_id", file });

    expect(mockStorageFrom).toHaveBeenCalledWith("kyc-documents");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining("u1/national_id-"),
      file,
      { contentType: "image/jpeg", upsert: false }
    );
    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        document_type: "national_id",
        file_name: "id-card.jpg",
        status: "pending",
      })
    );
    expect(updateQb.update).toHaveBeenCalledWith({ kyc_status: "documents_pending" });
  });

  it("throws when storage upload fails", async () => {
    mockStorageFrom.mockReturnValueOnce({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: "quota exceeded" } }),
    });

    const { uploadKycDocument } = await import("@/services/domain/kyc.service");
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    await expect(
      uploadKycDocument({ userId: "u1", documentType: "passport", file })
    ).rejects.toThrow("File upload failed: quota exceeded");
  });

  it("throws when kyc_documents insert fails", async () => {
    mockStorageFrom.mockReturnValueOnce({
      upload: vi.fn().mockResolvedValue({ data: { path: "ok" }, error: null }),
    });
    const insertQb = createQueryBuilder();
    insertQb.then.mockImplementationOnce(
      (resolve: ThenHandler) => Promise.resolve({ data: null, error: { message: "insert error" } }).then(resolve)
    );
    mockFrom.mockReturnValueOnce(insertQb);

    const { uploadKycDocument } = await import("@/services/domain/kyc.service");
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    await expect(
      uploadKycDocument({ userId: "u1", documentType: "passport", file })
    ).rejects.toEqual({ message: "insert error" });
  });

  it("emits kyc:document_submitted event on success", async () => {
    mockStorageFrom.mockReturnValueOnce({
      upload: vi.fn().mockResolvedValue({ data: { path: "ok" }, error: null }),
    });
    mockFrom.mockImplementation(() => createQueryBuilder());

    const { uploadKycDocument } = await import("@/services/domain/kyc.service");
    const { platformBus } = await import("@/lib/shared/platform-bus");
    const file = new File(["data"], "doc.jpg", { type: "image/jpeg" });
    await uploadKycDocument({ userId: "u1", documentType: "selfie", file });

    expect(platformBus.emit).toHaveBeenCalledWith("kyc:document_submitted", {
      userId: "u1",
      documentType: "selfie",
    });
  });
});

describe("kyc.service — getKycDocumentPreviewUrl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns signed URL for document", async () => {
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example.com" } }),
    });

    const { getKycDocumentPreviewUrl } = await import("@/services/domain/kyc.service");
    const url = await getKycDocumentPreviewUrl("u1/doc.pdf");
    expect(mockStorageFrom).toHaveBeenCalledWith("kyc-documents");
    expect(url).toBe("https://signed.example.com");
  });

  it("returns null when no signed URL is available", async () => {
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null }),
    });

    const { getKycDocumentPreviewUrl } = await import("@/services/domain/kyc.service");
    const url = await getKycDocumentPreviewUrl("nonexistent");
    expect(url).toBeNull();
  });
});

describe("kyc.service — fetchUserKycDocuments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches documents for user ordered by submission", async () => {
    const docs = [{ id: "d1" }, { id: "d2" }];
    const qb = createQueryBuilder();
    qb.order.mockResolvedValueOnce({ data: docs, error: null });
    mockFrom.mockReturnValueOnce(qb);

    const { fetchUserKycDocuments } = await import("@/services/domain/kyc.service");
    const result = await fetchUserKycDocuments("u1");
    expect(mockFrom).toHaveBeenCalledWith("kyc_documents");
    expect(result).toEqual(docs);
  });

  it("returns empty array when no documents exist", async () => {
    const qb = createQueryBuilder();
    qb.order.mockResolvedValueOnce({ data: null, error: null });
    mockFrom.mockReturnValueOnce(qb);

    const { fetchUserKycDocuments } = await import("@/services/domain/kyc.service");
    const result = await fetchUserKycDocuments("u-new");
    expect(result).toEqual([]);
  });
});

describe("kyc.service — fetchProviderKycProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns kyc_level and kyc_status", async () => {
    const qb = createQueryBuilder();
    qb.maybeSingle.mockResolvedValueOnce({ data: { kyc_level: "standard", kyc_status: "verified" }, error: null });
    mockFrom.mockReturnValueOnce(qb);

    const { fetchProviderKycProfile } = await import("@/services/domain/kyc.service");
    const result = await fetchProviderKycProfile("u1");
    expect(result).toEqual({ kyc_level: "standard", kyc_status: "verified" });
  });

  it("returns null when no provider exists", async () => {
    const qb = createQueryBuilder();
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockFrom.mockReturnValueOnce(qb);

    const { fetchProviderKycProfile } = await import("@/services/domain/kyc.service");
    const result = await fetchProviderKycProfile("u-none");
    expect(result).toBeNull();
  });
});

describe("kyc.service — uploadKycDocumentFile (lightweight onboarding variant)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads file to kyc-documents bucket and inserts record without provider update", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: "test" }, error: null });
    mockStorageFrom.mockReturnValueOnce({ upload: mockUpload });

    const insertQb = createQueryBuilder();
    mockFrom.mockReturnValueOnce(insertQb);

    const { uploadKycDocumentFile } = await import("@/services/domain/kyc.service");
    const file = new File(["data"], "license.pdf", { type: "application/pdf" });
    await uploadKycDocumentFile("u1", "driving_license", file);

    expect(mockStorageFrom).toHaveBeenCalledWith("kyc-documents");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining("u1/driving_license-"),
      file,
      { upsert: false }
    );
    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        document_type: "driving_license",
        file_name: "license.pdf",
        file_size: file.size,
        mime_type: "application/pdf",
        status: "pending",
      })
    );
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("propagates storage upload error", async () => {
    const uploadError = new Error("bucket full");
    mockStorageFrom.mockReturnValueOnce({
      upload: vi.fn().mockRejectedValue(uploadError),
    });

    const { uploadKycDocumentFile } = await import("@/services/domain/kyc.service");
    const file = new File(["data"], "doc.jpg", { type: "image/jpeg" });
    await expect(uploadKycDocumentFile("u1", "selfie", file)).rejects.toThrow("bucket full");
  });
});

describe("kyc.service — barrel re-export compatibility", () => {
  it("re-exports all public APIs from @/services/kyc.service", async () => {
    const barrel = await import("@/services/kyc.service");
    expect(barrel.checkAdminRole).toBeTypeOf("function");
    expect(barrel.fetchKycQueue).toBeTypeOf("function");
    expect(barrel.reviewKycDocument).toBeTypeOf("function");
    expect(barrel.getKycDocumentPreviewUrl).toBeTypeOf("function");
    expect(barrel.fetchUserKycDocuments).toBeTypeOf("function");
    expect(barrel.fetchProviderKycProfile).toBeTypeOf("function");
    expect(barrel.uploadKycDocument).toBeTypeOf("function");
    expect(barrel.uploadKycDocumentFile).toBeTypeOf("function");
  });
});
