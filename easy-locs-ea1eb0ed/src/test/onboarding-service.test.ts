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

const mockDbFrom = vi.fn().mockImplementation(() => createQueryBuilder());
const mockDomainOnboardingFrom = vi.fn().mockImplementation(() => createQueryBuilder());
const mockFunctionsInvoke = vi.fn().mockResolvedValue({ data: null, error: null });
const mockStorageFrom = vi.fn().mockReturnValue({
  upload: vi.fn().mockResolvedValue({ data: { path: "mock" }, error: null }),
  getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://mock.url/file" } }),
});

vi.mock("@/services/db", () => {
  const dbProxy = (...args: unknown[]) => mockDbFrom(...args);
  const dbFn = Object.assign(dbProxy, {
    from: (...args: unknown[]) => mockDbFrom(...args),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: { invoke: (...args: unknown[]) => mockFunctionsInvoke(...args) },
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
  });
  return {
    db: dbFn,
    domainDb: {
      onboarding: {
        schema: "onboarding",
        from: (...args: unknown[]) => mockDomainOnboardingFrom(...args),
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
    schema: vi.fn(),
  },
}));

vi.mock("@/lib/schema/domain-schemas", () => ({
  DOMAIN_TABLE_MAP: {
    onboarding: ["onboarding_sessions", "import_jobs", "staging_entities"],
  },
  LEGACY_TABLE_REDIRECTS: {},
}));

describe("onboarding.service — uploadOnboardingMedia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads to onboarding-media bucket and returns public URL", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: "ok" }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/photo.jpg" } });
    mockStorageFrom
      .mockReturnValueOnce({ upload: mockUpload })
      .mockReturnValueOnce({ getPublicUrl: mockGetPublicUrl });

    const { uploadOnboardingMedia } = await import("@/services/onboarding.service");
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    const url = await uploadOnboardingMedia("u1", file, "profile");

    expect(mockStorageFrom).toHaveBeenCalledWith("onboarding-media");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\/profile-\d+\.jpg$/),
      file,
      { upsert: true }
    );
    expect(url).toBe("https://cdn.example.com/photo.jpg");
  });

  it("propagates storage upload error", async () => {
    const uploadError = new Error("storage quota exceeded");
    mockStorageFrom
      .mockReturnValueOnce({ upload: vi.fn().mockRejectedValue(uploadError) });

    const { uploadOnboardingMedia } = await import("@/services/onboarding.service");
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    await expect(uploadOnboardingMedia("u1", file, "profile")).rejects.toThrow("storage quota exceeded");
  });

  it("returns null when getPublicUrl has no data", async () => {
    mockStorageFrom
      .mockReturnValueOnce({ upload: vi.fn().mockResolvedValue({ data: {}, error: null }) })
      .mockReturnValueOnce({ getPublicUrl: vi.fn().mockReturnValue({ data: null }) });

    const { uploadOnboardingMedia } = await import("@/services/onboarding.service");
    const file = new File(["x"], "pic.png", { type: "image/png" });
    const url = await uploadOnboardingMedia("u1", file, "vehicle");
    expect(url).toBeNull();
  });
});

describe("onboarding.service — uploadKycDocumentFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads KYC document to storage and inserts record", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    mockStorageFrom.mockReturnValueOnce({ upload: mockUpload });

    const insertQb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(insertQb);

    const { uploadKycDocumentFile } = await import("@/services/onboarding.service");
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
        status: "pending",
      })
    );
  });
});

describe("onboarding.service — submitTaxiDriverProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  const validParams = {
    userId: "u1",
    personal: { fullName: "Ali Hassan", dateOfBirth: "1990-01-01", nationality: "AE", phone: "+971501234567" },
    profilePhoto: "https://cdn.example.com/photo.jpg",
    zone: { city: "Dubai", maxRadiusKm: 25, preferredZones: ["airport", "city_center"] },
    vehiclePhotos: ["https://cdn.example.com/car1.jpg"],
    vehicle: { type: "sedan", brand: "Toyota", model: "Camry", plateNumber: "ABC 123", seats: 4 },
  };

  it("upserts provider and rider_profiles with correct payloads", async () => {
    const providerQb = createQueryBuilder();
    const riderQb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(providerQb).mockReturnValueOnce(riderQb);

    const { submitTaxiDriverProvider } = await import("@/services/onboarding.service");
    await submitTaxiDriverProvider(validParams);

    expect(providerQb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        provider_type: "taxi_driver",
        display_name: "Ali Hassan",
        city: "Dubai",
        onboarding_status: "completed",
        kyc_status: "documents_pending",
        is_active: false,
      }),
      { onConflict: "user_id" }
    );

    expect(riderQb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        full_name: "Ali Hassan",
        rider_mode: "taxi",
        vehicle_type: "taxi_standard",
        vehicle_brand: "Toyota",
        plate_number: "ABC 123",
        is_verified: false,
      }),
      { onConflict: "user_id" }
    );
  });

  it("maps luxury vehicle type to taxi_premium", async () => {
    mockDbFrom.mockImplementation(() => createQueryBuilder());

    const { submitTaxiDriverProvider } = await import("@/services/onboarding.service");
    await submitTaxiDriverProvider({
      ...validParams,
      vehicle: { ...validParams.vehicle, type: "luxury" },
    });

    const riderCall = mockDbFrom.mock.results[1].value as MockQueryBuilder;
    expect(riderCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ vehicle_type: "taxi_premium" }),
      expect.anything()
    );
  });

  it("maps suv vehicle type to taxi_xl", async () => {
    mockDbFrom.mockImplementation(() => createQueryBuilder());

    const { submitTaxiDriverProvider } = await import("@/services/onboarding.service");
    await submitTaxiDriverProvider({
      ...validParams,
      vehicle: { ...validParams.vehicle, type: "suv" },
    });

    const riderCall = mockDbFrom.mock.results[1].value as MockQueryBuilder;
    expect(riderCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ vehicle_type: "taxi_xl" }),
      expect.anything()
    );
  });

  it("throws when provider upsert fails", async () => {
    const providerQb = createQueryBuilder();
    providerQb.then.mockImplementationOnce(
      (resolve: ThenHandler) => Promise.resolve({ data: null, error: { message: "provider error" } }).then(resolve)
    );
    mockDbFrom.mockReturnValueOnce(providerQb);

    const { submitTaxiDriverProvider } = await import("@/services/onboarding.service");
    await expect(submitTaxiDriverProvider(validParams)).rejects.toEqual({ message: "provider error" });
  });
});

describe("onboarding.service — submitServiceProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  const validParams = {
    userId: "u2",
    email: "plumber@test.com",
    coverageRadiusKm: 30,
    portfolioPhotos: ["https://cdn.example.com/work1.jpg"],
    profile: { bio: "Expert plumber", yearsExperience: 10, languages: ["english", "arabic"] },
    payment: { iban: "AE123456", accountHolder: "Mohamed", bankName: "Emirates NBD", swift: "EBILAEAD", minTravelFee: 50 },
    availability: { monday: ["09:00", "17:00"] },
    category: "plumbing",
    subCategory: "emergency",
    services: [{
      title: "Pipe Repair",
      description: "Fix broken pipes",
      durationMinutes: 60,
      priceType: "fixed",
      price: 200,
      locationType: "at_client",
    }],
    certificationUrls: ["https://cdn.example.com/cert.pdf"],
  };

  it("upserts provider with all service-provider fields", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import("@/services/onboarding.service");
    await submitServiceProvider(validParams);

    expect(qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u2",
        provider_type: "service_provider",
        display_name: "plumber",
        bank_iban: "AE123456",
        tags: ["plumbing", "emergency"],
        onboarding_status: "completed",
        kyc_status: "not_started",
      }),
      { onConflict: "user_id" }
    );
  });

  it("uses fallback display name when no email", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import("@/services/onboarding.service");
    await submitServiceProvider({ ...validParams, email: undefined });

    expect(qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Service Provider" }),
      expect.anything()
    );
  });

  it("throws when upsert fails", async () => {
    const qb = createQueryBuilder();
    qb.then.mockImplementationOnce(
      (resolve: ThenHandler) => Promise.resolve({ data: null, error: { message: "db failure" } }).then(resolve)
    );
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import("@/services/onboarding.service");
    await expect(submitServiceProvider(validParams)).rejects.toEqual({ message: "db failure" });
  });
});

describe("onboarding.service — submitHotelProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  const validParams = {
    userId: "u3",
    info: { name: "Grand Hotel", stars: 5, type: "hotel", descriptionFr: "Un grand hôtel", descriptionEn: "A grand hotel", descriptionAr: "فندق كبير" },
    location: { address: "123 Main St", city: "Dubai", country: "AE", postalCode: "00000", lat: 25.2, lng: 55.27, coverageRadius: 10 },
    heroImage: "https://cdn.example.com/hero.jpg",
    photos: ["https://cdn.example.com/p1.jpg"],
    amenities: ["wifi", "pool", "spa"],
    payment: { iban: "AE999", accountHolder: "Hotel Corp", bankName: "ADCB", swift: "ADCBAEAA" },
    rooms: [{
      id: "r1",
      name: "Deluxe Suite",
      capacity: 2,
      bedType: "king",
      pricePerNight: 500,
      photoUrls: ["https://cdn.example.com/room1.jpg"],
    }],
  };

  it("upserts provider with hotel metadata", async () => {
    const providerQb = createQueryBuilder();
    providerQb.single.mockResolvedValueOnce({ data: { id: "prov-1" }, error: null });
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: { id: "hotel-1" }, error: null });
    const roomQb = createQueryBuilder();
    roomQb.single.mockResolvedValueOnce({ data: { id: "room-1" }, error: null });
    const ratePlanQb = createQueryBuilder();
    const availQb = createQueryBuilder();

    mockDbFrom
      .mockReturnValueOnce(providerQb)
      .mockReturnValueOnce(hotelQb)
      .mockReturnValueOnce(roomQb)
      .mockReturnValueOnce(ratePlanQb)
      .mockReturnValueOnce(availQb);

    const { submitHotelProvider } = await import("@/services/onboarding.service");
    await submitHotelProvider(validParams);

    expect(providerQb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u3",
        provider_type: "hotel",
        display_name: "Grand Hotel",
        kyc_status: "documents_pending",
      }),
      { onConflict: "user_id" }
    );
    expect(hotelQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Grand Hotel",
        stars: 5,
        source_type: "onboarding",
        visibility_mode: "pending",
      })
    );
    expect(roomQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        hotel_id: "hotel-1",
        name: "Deluxe Suite",
        capacity: 2,
        bed_type: "king",
      })
    );
    expect(ratePlanQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        room_id: "room-1",
        name: "Standard Rate",
      })
    );
    expect(availQb.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          room_id: "room-1",
          available: true,
          price: 500,
          currency: "AED",
        }),
      ])
    );
  });

  it("throws when provider upsert fails", async () => {
    const providerQb = createQueryBuilder();
    providerQb.single.mockResolvedValueOnce({ data: null, error: { message: "upsert failed" } });
    mockDbFrom.mockReturnValueOnce(providerQb);

    const { submitHotelProvider } = await import("@/services/onboarding.service");
    await expect(submitHotelProvider(validParams)).rejects.toEqual({ message: "upsert failed" });
  });

  it("skips room creation when hotel insert returns no id", async () => {
    const providerQb = createQueryBuilder();
    providerQb.single.mockResolvedValueOnce({ data: { id: "prov-1" }, error: null });
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: null, error: null });

    mockDbFrom
      .mockReturnValueOnce(providerQb)
      .mockReturnValueOnce(hotelQb);

    const { submitHotelProvider } = await import("@/services/onboarding.service");
    await submitHotelProvider(validParams);
    expect(mockDbFrom).toHaveBeenCalledTimes(2);
  });
});

describe("onboarding.service — uploadHotelPhoto", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads hero photo with deterministic path", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/hero.jpg" } });
    mockStorageFrom
      .mockReturnValueOnce({ upload: mockUpload })
      .mockReturnValueOnce({ getPublicUrl: mockGetPublicUrl });

    const { uploadHotelPhoto } = await import("@/services/onboarding.service");
    const file = new File(["img"], "main.jpg", { type: "image/jpeg" });
    const url = await uploadHotelPhoto("u3", file, true);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining("hotel-hero"),
      file,
      { upsert: true }
    );
    expect(url).toBe("https://cdn.example.com/hero.jpg");
  });

  it("uploads non-hero photo with timestamp path", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    mockStorageFrom
      .mockReturnValueOnce({ upload: mockUpload })
      .mockReturnValueOnce({ getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/gallery.jpg" } }) });

    const { uploadHotelPhoto } = await import("@/services/onboarding.service");
    const file = new File(["img"], "gallery.jpg", { type: "image/jpeg" });
    const url = await uploadHotelPhoto("u3", file, false);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.not.stringContaining("hero"),
      file,
      { upsert: true }
    );
    expect(url).toBe("https://cdn.example.com/gallery.jpg");
  });
});

describe("Onboarding Domain Service (domain/onboarding.service.ts)", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchOnboardingSessions", () => {
    it("delegates to onboardingRepo.listSessions", async () => {
      const sessions = [
        { id: "s1", user_id: "u1", created_at: "2025-01-01" },
        { id: "s2", user_id: "u1", created_at: "2025-01-02" },
      ];
      const qb = createQueryBuilder();
      qb.order.mockResolvedValueOnce({ data: sessions, error: null });
      mockDomainOnboardingFrom.mockReturnValueOnce(qb);

      const { fetchOnboardingSessions } = await import("@/services/domain/onboarding.service");
      const result = await fetchOnboardingSessions("u1");
      expect(mockDomainOnboardingFrom).toHaveBeenCalledWith("onboarding_sessions");
      expect(result).toEqual(sessions);
    });

    it("returns empty array when no sessions exist", async () => {
      const qb = createQueryBuilder();
      qb.order.mockResolvedValueOnce({ data: null, error: null });
      mockDomainOnboardingFrom.mockReturnValueOnce(qb);

      const { fetchOnboardingSessions } = await import("@/services/domain/onboarding.service");
      const result = await fetchOnboardingSessions("u-none");
      expect(result).toEqual([]);
    });
  });

  describe("upsertOnboardingSession", () => {
    it("calls upsert with record", async () => {
      const qb = createQueryBuilder();
      mockDomainOnboardingFrom.mockReturnValueOnce(qb);

      const { upsertOnboardingSession } = await import("@/services/domain/onboarding.service");
      await upsertOnboardingSession({ user_id: "u1", step: 3 });
      expect(mockDomainOnboardingFrom).toHaveBeenCalledWith("onboarding_sessions");
      expect(qb.upsert).toHaveBeenCalledWith({ user_id: "u1", step: 3 });
    });

    it("throws when upsert returns an error", async () => {
      const qb = createQueryBuilder();
      qb.then.mockImplementationOnce(
        (resolve: ThenHandler) => Promise.resolve({ data: null, error: { message: "insert failed" } }).then(resolve)
      );
      mockDomainOnboardingFrom.mockReturnValueOnce(qb);

      const { upsertOnboardingSession } = await import("@/services/domain/onboarding.service");
      await expect(upsertOnboardingSession({ user_id: "u1" })).rejects.toEqual({ message: "insert failed" });
    });
  });
});
