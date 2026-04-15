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
  single: Mock;
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
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.then = vi.fn().mockImplementation(
    (resolve: ThenHandler) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  );
  return builder;
}

const mockDbFrom = vi.fn().mockImplementation(() => createQueryBuilder());

vi.mock("@/services/db", () => {
  const dbProxy = (...args: unknown[]) => mockDbFrom(...args);
  const dbFn = Object.assign(dbProxy, {
    from: (...args: unknown[]) => mockDbFrom(...args),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    storage: { from: vi.fn() },
  });
  return {
    db: dbFn,
    domainDb: {
      onboarding: {
        schema: "onboarding",
        from: vi.fn().mockImplementation(() => createQueryBuilder()),
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
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

describe("buildProviderBase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all required ProviderBaseFields with correct defaults", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );

    const now = Date.now();
    const result = buildProviderBase("user-123", "taxi_driver", "Ali Hassan");

    expect(result).toEqual({
      user_id: "user-123",
      provider_type: "taxi_driver",
      display_name: "Ali Hassan",
      city: "Dubai",
      country: "AE",
      coverage_radius_km: 0,
      gallery_urls: [],
      is_active: false,
      onboarding_status: "completed",
      onboarding_completed_at: expect.any(String),
      kyc_status: "not_started",
      metadata: {},
    });

    const completedAt = new Date(result.onboarding_completed_at).getTime();
    expect(completedAt).toBeGreaterThanOrEqual(now);
    expect(completedAt).toBeLessThanOrEqual(Date.now());
  });

  it("is_active is always false", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "hotel", "Hotel X");
    expect(result.is_active).toBe(false);
  });

  it("onboarding_status is always 'completed'", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "service_provider", "SP");
    expect(result.onboarding_status).toBe("completed");
  });

  it("onboarding_completed_at is a valid ISO 8601 timestamp", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "taxi_driver", "Name");
    expect(result.onboarding_completed_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(() => new Date(result.onboarding_completed_at)).not.toThrow();
    expect(
      new Date(result.onboarding_completed_at).toISOString(),
    ).toBe(result.onboarding_completed_at);
  });

  it("applies city override", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "hotel", "H", { city: "Abu Dhabi" });
    expect(result.city).toBe("Abu Dhabi");
  });

  it("applies country override", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "hotel", "H", { country: "SA" });
    expect(result.country).toBe("SA");
  });

  it("applies coverageRadiusKm override", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "taxi_driver", "T", {
      coverageRadiusKm: 50,
    });
    expect(result.coverage_radius_km).toBe(50);
  });

  it("applies galleryUrls override", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const urls = ["https://img.example.com/1.jpg", "https://img.example.com/2.jpg"];
    const result = buildProviderBase("u1", "hotel", "H", {
      galleryUrls: urls,
    });
    expect(result.gallery_urls).toEqual(urls);
  });

  it("applies kycStatus override", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "taxi_driver", "T", {
      kycStatus: "documents_pending",
    });
    expect(result.kyc_status).toBe("documents_pending");
  });

  it("applies metadata override", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const meta = { phone: "+971", nationality: "AE" };
    const result = buildProviderBase("u1", "taxi_driver", "T", {
      metadata: meta,
    });
    expect(result.metadata).toEqual(meta);
  });

  it("applies all overrides simultaneously", async () => {
    const { buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = buildProviderBase("u1", "hotel", "Grand", {
      city: "Riyadh",
      country: "SA",
      coverageRadiusKm: 100,
      galleryUrls: ["a.jpg"],
      kycStatus: "verified",
      metadata: { stars: 5 },
    });
    expect(result.city).toBe("Riyadh");
    expect(result.country).toBe("SA");
    expect(result.coverage_radius_km).toBe(100);
    expect(result.gallery_urls).toEqual(["a.jpg"]);
    expect(result.kyc_status).toBe("verified");
    expect(result.metadata).toEqual({ stars: 5 });
  });
});

describe("upsertProviderRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls db.from('providers').upsert with onConflict user_id", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { upsertProviderRecord, buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const payload = { ...buildProviderBase("u1", "taxi_driver", "Name") };
    await upsertProviderRecord(payload);

    expect(mockDbFrom).toHaveBeenCalledWith("providers");
    expect(qb.upsert).toHaveBeenCalledWith(payload, { onConflict: "user_id" });
  });

  it("returns empty object when no select option is provided", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { upsertProviderRecord, buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = await upsertProviderRecord(
      buildProviderBase("u1", "hotel", "H"),
    );
    expect(result).toEqual({});
  });

  it("returns data when select option is provided", async () => {
    const qb = createQueryBuilder();
    qb.single.mockResolvedValueOnce({
      data: { id: "prov-42" },
      error: null,
    });
    mockDbFrom.mockReturnValueOnce(qb);

    const { upsertProviderRecord, buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = await upsertProviderRecord(
      buildProviderBase("u1", "hotel", "H"),
      { select: "id" },
    );
    expect(qb.select).toHaveBeenCalledWith("id");
    expect(qb.single).toHaveBeenCalled();
    expect(result).toEqual({ id: "prov-42" });
  });

  it("throws when upsert returns an error (no select)", async () => {
    const qb = createQueryBuilder();
    const dbError = { message: "unique constraint violation", code: "23505" };
    qb.then.mockImplementationOnce((resolve: ThenHandler) =>
      Promise.resolve({ data: null, error: dbError }).then(resolve),
    );
    mockDbFrom.mockReturnValueOnce(qb);

    const { upsertProviderRecord, buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    await expect(
      upsertProviderRecord(buildProviderBase("u1", "taxi_driver", "N")),
    ).rejects.toEqual(dbError);
  });

  it("throws when upsert with select returns an error", async () => {
    const qb = createQueryBuilder();
    const dbError = { message: "relation does not exist" };
    qb.single.mockResolvedValueOnce({ data: null, error: dbError });
    mockDbFrom.mockReturnValueOnce(qb);

    const { upsertProviderRecord, buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    await expect(
      upsertProviderRecord(buildProviderBase("u1", "hotel", "H"), {
        select: "id",
      }),
    ).rejects.toEqual(dbError);
  });

  it("returns empty object when select returns null data", async () => {
    const qb = createQueryBuilder();
    qb.single.mockResolvedValueOnce({ data: null, error: null });
    mockDbFrom.mockReturnValueOnce(qb);

    const { upsertProviderRecord, buildProviderBase } = await import(
      "@/services/onboarding-providers.service"
    );
    const result = await upsertProviderRecord(
      buildProviderBase("u1", "hotel", "H"),
      { select: "id" },
    );
    expect(result).toEqual({});
  });
});

describe("submitTaxiDriverProvider — full payload shape", () => {
  beforeEach(() => vi.clearAllMocks());

  const taxiParams = {
    userId: "taxi-u1",
    personal: {
      fullName: "Ali Hassan",
      dateOfBirth: "1990-05-15",
      nationality: "AE",
      phone: "+971501234567",
    },
    profilePhoto: "https://cdn.example.com/photo.jpg",
    zone: { city: "Sharjah", maxRadiusKm: 25, preferredZones: ["airport"] },
    vehiclePhotos: ["https://cdn.example.com/car1.jpg"],
    vehicle: {
      type: "sedan",
      brand: "Toyota",
      model: "Camry",
      plateNumber: "ABC 123",
      seats: 4,
    },
  };

  it("produces exact provider payload with all base and optional fields", async () => {
    const providerQb = createQueryBuilder();
    const riderQb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(providerQb).mockReturnValueOnce(riderQb);

    const { submitTaxiDriverProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitTaxiDriverProvider(taxiParams);

    const upsertCall = providerQb.upsert.mock.calls[0];
    const payload = upsertCall[0];
    const conflict = upsertCall[1];

    expect(conflict).toEqual({ onConflict: "user_id" });

    expect(payload.user_id).toBe("taxi-u1");
    expect(payload.provider_type).toBe("taxi_driver");
    expect(payload.display_name).toBe("Ali Hassan");
    expect(payload.city).toBe("Sharjah");
    expect(payload.country).toBe("AE");
    expect(payload.coverage_radius_km).toBe(25);
    expect(payload.gallery_urls).toEqual(["https://cdn.example.com/car1.jpg"]);
    expect(payload.is_active).toBe(false);
    expect(payload.onboarding_status).toBe("completed");
    expect(payload.onboarding_completed_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(payload.kyc_status).toBe("documents_pending");
    expect(payload.metadata).toEqual({
      date_of_birth: "1990-05-15",
      nationality: "AE",
      phone: "+971501234567",
      preferred_zones: ["airport"],
    });
    expect(payload.profile_photo_url).toBe("https://cdn.example.com/photo.jpg");
    expect(payload.address_line1).toBe("Sharjah");

    const allKeys = Object.keys(payload).sort();
    expect(allKeys).toEqual([
      "address_line1",
      "city",
      "country",
      "coverage_radius_km",
      "display_name",
      "gallery_urls",
      "is_active",
      "kyc_status",
      "metadata",
      "onboarding_completed_at",
      "onboarding_status",
      "profile_photo_url",
      "provider_type",
      "user_id",
    ]);
  });

  it("propagates error from upsertProviderRecord", async () => {
    const providerQb = createQueryBuilder();
    const dbError = { message: "provider insert failed", code: "23505" };
    providerQb.then.mockImplementationOnce((resolve: ThenHandler) =>
      Promise.resolve({ data: null, error: dbError }).then(resolve),
    );
    mockDbFrom.mockReturnValueOnce(providerQb);

    const { submitTaxiDriverProvider } = await import(
      "@/services/onboarding.service"
    );
    await expect(submitTaxiDriverProvider(taxiParams)).rejects.toEqual(dbError);
  });

  it("completes without throwing when rider_profiles upsert returns error (no error check in source)", async () => {
    const providerQb = createQueryBuilder();
    const riderQb = createQueryBuilder();
    riderQb.then.mockImplementationOnce((resolve: ThenHandler) =>
      Promise.resolve({
        data: null,
        error: { message: "rider profile constraint violation" },
      }).then(resolve),
    );
    mockDbFrom.mockReturnValueOnce(providerQb).mockReturnValueOnce(riderQb);

    const { submitTaxiDriverProvider } = await import(
      "@/services/onboarding.service"
    );
    await expect(
      submitTaxiDriverProvider(taxiParams),
    ).resolves.toBeUndefined();
  });

  it("sets profile_photo_url to null when no photo provided", async () => {
    mockDbFrom.mockImplementation(() => createQueryBuilder());

    const { submitTaxiDriverProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitTaxiDriverProvider({ ...taxiParams, profilePhoto: null });

    const providerCall = mockDbFrom.mock.results[0].value as MockQueryBuilder;
    const payload = providerCall.upsert.mock.calls[0][0];
    expect(payload.profile_photo_url).toBeNull();
  });
});

describe("submitServiceProvider — full payload shape", () => {
  beforeEach(() => vi.clearAllMocks());

  const serviceParams = {
    userId: "sp-u1",
    email: "plumber@test.com",
    coverageRadiusKm: 30,
    portfolioPhotos: ["https://cdn.example.com/work1.jpg"],
    profile: {
      bio: "Expert plumber with 10 years experience",
      yearsExperience: 10,
      languages: ["english", "arabic"],
    },
    payment: {
      iban: "AE123456789",
      accountHolder: "Mohamed Ali",
      bankName: "Emirates NBD",
      swift: "EBILAEAD",
      minTravelFee: 50,
    },
    availability: { monday: ["09:00", "17:00"], tuesday: ["09:00", "17:00"] },
    category: "plumbing",
    subCategory: "emergency",
    services: [
      {
        title: "Pipe Repair",
        description: "Fix broken pipes",
        durationMinutes: 60,
        priceType: "fixed",
        price: 200,
        locationType: "at_client",
      },
    ],
    certificationUrls: ["https://cdn.example.com/cert.pdf"],
  };

  it("produces exact provider payload with all service-provider fields", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitServiceProvider(serviceParams);

    const payload = qb.upsert.mock.calls[0][0];
    const conflict = qb.upsert.mock.calls[0][1];

    expect(conflict).toEqual({ onConflict: "user_id" });

    expect(payload.user_id).toBe("sp-u1");
    expect(payload.provider_type).toBe("service_provider");
    expect(payload.display_name).toBe("plumber");
    expect(payload.city).toBe("Dubai");
    expect(payload.country).toBe("AE");
    expect(payload.coverage_radius_km).toBe(30);
    expect(payload.gallery_urls).toEqual(["https://cdn.example.com/work1.jpg"]);
    expect(payload.is_active).toBe(false);
    expect(payload.onboarding_status).toBe("completed");
    expect(payload.onboarding_completed_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(payload.kyc_status).toBe("not_started");

    expect(payload.metadata).toEqual({
      category: "plumbing",
      sub_category: "emergency",
      years_experience: 10,
      languages: ["english", "arabic"],
      services: [
        {
          title: "Pipe Repair",
          description: "Fix broken pipes",
          duration_minutes: 60,
          price_type: "fixed",
          price: 200,
          location_type: "at_client",
        },
      ],
      certifications: ["https://cdn.example.com/cert.pdf"],
      min_travel_fee: 50,
    });

    expect(payload.description).toBe("Expert plumber with 10 years experience");
    expect(payload.bank_iban).toBe("AE123456789");
    expect(payload.bank_account_holder).toBe("Mohamed Ali");
    expect(payload.bank_name).toBe("Emirates NBD");
    expect(payload.bank_swift).toBe("EBILAEAD");
    expect(payload.operating_hours).toEqual({
      monday: ["09:00", "17:00"],
      tuesday: ["09:00", "17:00"],
    });
    expect(payload.tags).toEqual(["plumbing", "emergency"]);

    const allKeys = Object.keys(payload).sort();
    expect(allKeys).toEqual([
      "bank_account_holder",
      "bank_iban",
      "bank_name",
      "bank_swift",
      "city",
      "country",
      "coverage_radius_km",
      "description",
      "display_name",
      "gallery_urls",
      "is_active",
      "kyc_status",
      "metadata",
      "onboarding_completed_at",
      "onboarding_status",
      "operating_hours",
      "provider_type",
      "tags",
      "user_id",
    ]);
  });

  it("maps services array fields from camelCase to snake_case in metadata", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitServiceProvider({
      ...serviceParams,
      services: [
        {
          title: "AC Install",
          description: "Full installation",
          durationMinutes: 120,
          priceType: "hourly",
          price: 100,
          locationType: "at_provider",
        },
      ],
    });

    const metadata = qb.upsert.mock.calls[0][0].metadata;
    const service = metadata.services[0];
    expect(service).toEqual({
      title: "AC Install",
      description: "Full installation",
      duration_minutes: 120,
      price_type: "hourly",
      price: 100,
      location_type: "at_provider",
    });
    expect(service).not.toHaveProperty("durationMinutes");
    expect(service).not.toHaveProperty("priceType");
    expect(service).not.toHaveProperty("locationType");
  });

  it("propagates error from upsertProviderRecord", async () => {
    const qb = createQueryBuilder();
    const dbError = { message: "service provider insert failed" };
    qb.then.mockImplementationOnce((resolve: ThenHandler) =>
      Promise.resolve({ data: null, error: dbError }).then(resolve),
    );
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import(
      "@/services/onboarding.service"
    );
    await expect(submitServiceProvider(serviceParams)).rejects.toEqual(dbError);
  });

  it("filters falsy values from tags", async () => {
    const qb = createQueryBuilder();
    mockDbFrom.mockReturnValueOnce(qb);

    const { submitServiceProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitServiceProvider({
      ...serviceParams,
      category: "plumbing",
      subCategory: "",
    });

    const payload = qb.upsert.mock.calls[0][0];
    expect(payload.tags).toEqual(["plumbing"]);
  });
});

describe("submitHotelProvider — full payload shape", () => {
  beforeEach(() => vi.clearAllMocks());

  const hotelParams = {
    userId: "hotel-u1",
    info: {
      name: "Grand Palace",
      stars: 5,
      type: "resort",
      descriptionFr: "Un palace magnifique",
      descriptionEn: "A magnificent palace",
      descriptionAr: "قصر رائع",
    },
    location: {
      address: "456 Beach Rd",
      city: "Abu Dhabi",
      country: "AE",
      postalCode: "12345",
      lat: 24.45,
      lng: 54.65,
      coverageRadius: 15,
    },
    heroImage: "https://cdn.example.com/hero.jpg",
    photos: ["https://cdn.example.com/p1.jpg", "https://cdn.example.com/p2.jpg"],
    amenities: ["wifi", "pool", "gym"],
    payment: {
      iban: "AE999888777",
      accountHolder: "Palace Corp",
      bankName: "ADCB",
      swift: "ADCBAEAA",
    },
    rooms: [
      {
        id: "r1",
        name: "Standard Room",
        capacity: 2,
        bedType: "queen",
        pricePerNight: 300,
        photoUrls: ["https://cdn.example.com/room1.jpg"],
      },
    ],
  };

  it("produces exact provider payload with all hotel fields", async () => {
    const providerQb = createQueryBuilder();
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: { id: "h-1" }, error: null });
    const roomQb = createQueryBuilder();
    roomQb.single.mockResolvedValueOnce({ data: { id: "rm-1" }, error: null });
    const ratePlanQb = createQueryBuilder();
    const availQb = createQueryBuilder();

    mockDbFrom
      .mockReturnValueOnce(providerQb)
      .mockReturnValueOnce(hotelQb)
      .mockReturnValueOnce(roomQb)
      .mockReturnValueOnce(ratePlanQb)
      .mockReturnValueOnce(availQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitHotelProvider(hotelParams);

    const payload = providerQb.upsert.mock.calls[0][0];
    const conflict = providerQb.upsert.mock.calls[0][1];

    expect(conflict).toEqual({ onConflict: "user_id" });

    expect(payload.user_id).toBe("hotel-u1");
    expect(payload.provider_type).toBe("hotel");
    expect(payload.display_name).toBe("Grand Palace");
    expect(payload.city).toBe("Abu Dhabi");
    expect(payload.country).toBe("AE");
    expect(payload.coverage_radius_km).toBe(15);
    expect(payload.gallery_urls).toEqual([
      "https://cdn.example.com/p1.jpg",
      "https://cdn.example.com/p2.jpg",
    ]);
    expect(payload.is_active).toBe(false);
    expect(payload.onboarding_status).toBe("completed");
    expect(payload.onboarding_completed_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(payload.kyc_status).toBe("documents_pending");
    expect(payload.metadata).toEqual({
      hotel_type: "resort",
      stars: 5,
      amenities: ["wifi", "pool", "gym"],
      descriptions: {
        fr: "Un palace magnifique",
        en: "A magnificent palace",
        ar: "قصر رائع",
      },
    });

    expect(payload.legal_name).toBe("Grand Palace");
    expect(payload.address_line1).toBe("456 Beach Rd");
    expect(payload.postal_code).toBe("12345");
    expect(payload.lat).toBe(24.45);
    expect(payload.lng).toBe(54.65);
    expect(payload.profile_photo_url).toBe("https://cdn.example.com/hero.jpg");
    expect(payload.description).toBe("A magnificent palace");
    expect(payload.bank_iban).toBe("AE999888777");
    expect(payload.bank_account_holder).toBe("Palace Corp");
    expect(payload.bank_name).toBe("ADCB");
    expect(payload.bank_swift).toBe("ADCBAEAA");
    expect(payload.operating_hours).toEqual({});

    const allKeys = Object.keys(payload).sort();
    expect(allKeys).toEqual([
      "address_line1",
      "bank_account_holder",
      "bank_iban",
      "bank_name",
      "bank_swift",
      "city",
      "country",
      "coverage_radius_km",
      "description",
      "display_name",
      "gallery_urls",
      "is_active",
      "kyc_status",
      "lat",
      "legal_name",
      "lng",
      "metadata",
      "onboarding_completed_at",
      "onboarding_status",
      "operating_hours",
      "postal_code",
      "profile_photo_url",
      "provider_type",
      "user_id",
    ]);
  });

  it("falls back description to French when English is empty", async () => {
    const providerQb = createQueryBuilder();
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: null, error: null });

    mockDbFrom.mockReturnValueOnce(providerQb).mockReturnValueOnce(hotelQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitHotelProvider({
      ...hotelParams,
      info: { ...hotelParams.info, descriptionEn: "" },
    });

    const payload = providerQb.upsert.mock.calls[0][0];
    expect(payload.description).toBe("Un palace magnifique");
  });

  it("sets lat/lng to null when zero", async () => {
    const providerQb = createQueryBuilder();
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: null, error: null });

    mockDbFrom.mockReturnValueOnce(providerQb).mockReturnValueOnce(hotelQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitHotelProvider({
      ...hotelParams,
      location: { ...hotelParams.location, lat: 0, lng: 0 },
    });

    const payload = providerQb.upsert.mock.calls[0][0];
    expect(payload.lat).toBeNull();
    expect(payload.lng).toBeNull();
  });

  it("creates 90 availability rows for a room with pricePerNight > 0", async () => {
    const providerQb = createQueryBuilder();
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: { id: "h-1" }, error: null });
    const roomQb = createQueryBuilder();
    roomQb.single.mockResolvedValueOnce({ data: { id: "rm-1" }, error: null });
    const ratePlanQb = createQueryBuilder();
    const availQb = createQueryBuilder();

    mockDbFrom
      .mockReturnValueOnce(providerQb)
      .mockReturnValueOnce(hotelQb)
      .mockReturnValueOnce(roomQb)
      .mockReturnValueOnce(ratePlanQb)
      .mockReturnValueOnce(availQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitHotelProvider(hotelParams);

    const availRows = availQb.insert.mock.calls[0][0];
    expect(availRows).toHaveLength(90);
    expect(availRows[0]).toEqual(
      expect.objectContaining({
        room_id: "rm-1",
        available: true,
        price: 300,
        currency: "AED",
      }),
    );
    expect(availRows[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("skips rate plan and availability for room with pricePerNight = 0", async () => {
    const providerQb = createQueryBuilder();
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({ data: { id: "h-1" }, error: null });
    const roomQb = createQueryBuilder();
    roomQb.single.mockResolvedValueOnce({ data: { id: "rm-1" }, error: null });

    mockDbFrom
      .mockReturnValueOnce(providerQb)
      .mockReturnValueOnce(hotelQb)
      .mockReturnValueOnce(roomQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitHotelProvider({
      ...hotelParams,
      rooms: [{ ...hotelParams.rooms[0], pricePerNight: 0 }],
    });

    expect(mockDbFrom).toHaveBeenCalledTimes(3);
  });

  it("skips rooms when hotels insert returns error (no data)", async () => {
    const providerQb = createQueryBuilder();
    const hotelQb = createQueryBuilder();
    hotelQb.single.mockResolvedValueOnce({
      data: null,
      error: { message: "hotels insert failed" },
    });

    mockDbFrom.mockReturnValueOnce(providerQb).mockReturnValueOnce(hotelQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await submitHotelProvider(hotelParams);
    expect(mockDbFrom).toHaveBeenCalledTimes(2);
  });

  it("propagates error from upsertProviderRecord in hotel flow", async () => {
    const providerQb = createQueryBuilder();
    const dbError = { message: "connection refused", code: "08001" };
    providerQb.then.mockImplementationOnce((resolve: ThenHandler) =>
      Promise.resolve({ data: null, error: dbError }).then(resolve),
    );
    mockDbFrom.mockReturnValueOnce(providerQb);

    const { submitHotelProvider } = await import(
      "@/services/onboarding.service"
    );
    await expect(submitHotelProvider(hotelParams)).rejects.toEqual(dbError);
  });
});
