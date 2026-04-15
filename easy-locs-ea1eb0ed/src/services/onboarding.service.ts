import { db } from "@/services/db";

export async function uploadOnboardingMedia(userId: string, file: File, prefix: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  await db.storage.from("onboarding-media").upload(path, file, { upsert: true });
  const { data } = db.storage.from("onboarding-media").getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function uploadKycDocumentFile(userId: string, docType: string, file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${userId}/${docType}-${Date.now()}.${ext}`;

  await db.storage.from("kyc-documents").upload(filePath, file, { upsert: false });

  await db.from("kyc_documents").insert({
    user_id: userId,
    document_type: docType,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    status: "pending",
  });
}

export async function submitTaxiDriverProvider(params: {
  userId: string;
  personal: { fullName: string; dateOfBirth: string; nationality: string; phone: string };
  profilePhoto: string | null;
  zone: { city: string; maxRadiusKm: number; preferredZones: string[] };
  vehiclePhotos: string[];
  vehicle: { type: string; brand: string; model: string; plateNumber: string; seats: number };
}) {
  const { userId, personal, profilePhoto, zone, vehiclePhotos, vehicle } = params;

  const { error } = await db.from("providers").upsert({
    user_id: userId,
    provider_type: "taxi_driver",
    display_name: personal.fullName,
    profile_photo_url: profilePhoto,
    address_line1: zone.city,
    city: zone.city,
    country: "AE",
    coverage_radius_km: zone.maxRadiusKm,
    gallery_urls: vehiclePhotos,
    onboarding_status: "completed",
    onboarding_completed_at: new Date().toISOString(),
    kyc_status: "documents_pending",
    is_active: false,
    metadata: {
      date_of_birth: personal.dateOfBirth,
      nationality: personal.nationality,
      phone: personal.phone,
      preferred_zones: zone.preferredZones,
    },
  }, { onConflict: "user_id" });

  if (error) throw error;

  await db.from("rider_profiles").upsert({
    user_id: userId,
    full_name: personal.fullName,
    phone: personal.phone,
    rider_mode: "taxi",
    vehicle_type: vehicle.type === "luxury" ? "taxi_premium" : vehicle.type === "suv" ? "taxi_xl" : "taxi_standard",
    vehicle_brand: vehicle.brand,
    vehicle_model: vehicle.model,
    plate_number: vehicle.plateNumber,
    seats: vehicle.seats,
    is_verified: false,
    is_online: false,
    is_available: false,
  }, { onConflict: "user_id" });
}

export async function submitServiceProvider(params: {
  userId: string;
  email: string | undefined;
  coverageRadiusKm: number;
  portfolioPhotos: string[];
  profile: { bio: string; yearsExperience: number; languages: string[] };
  payment: { iban: string; accountHolder: string; bankName: string; swift: string; minTravelFee: number };
  availability: Record<string, string[]>;
  category: string;
  subCategory: string;
  services: Array<{
    title: string;
    description: string;
    durationMinutes: number;
    priceType: string;
    price: number;
    locationType: string;
  }>;
  certificationUrls: string[];
}) {
  const { userId, email, coverageRadiusKm, portfolioPhotos, profile, payment, availability, category, subCategory, services, certificationUrls } = params;

  const { error } = await db.from("providers").upsert({
    user_id: userId,
    provider_type: "service_provider",
    display_name: email?.split("@")[0] || "Service Provider",
    city: "Dubai",
    country: "AE",
    coverage_radius_km: coverageRadiusKm,
    gallery_urls: portfolioPhotos,
    description: profile.bio,
    bank_iban: payment.iban,
    bank_account_holder: payment.accountHolder,
    bank_name: payment.bankName,
    bank_swift: payment.swift,
    operating_hours: availability,
    onboarding_status: "completed",
    onboarding_completed_at: new Date().toISOString(),
    kyc_status: "not_started",
    is_active: false,
    tags: [category, subCategory].filter(Boolean),
    metadata: {
      category,
      sub_category: subCategory,
      years_experience: profile.yearsExperience,
      languages: profile.languages,
      services: services.map((s) => ({
        title: s.title,
        description: s.description,
        duration_minutes: s.durationMinutes,
        price_type: s.priceType,
        price: s.price,
        location_type: s.locationType,
      })),
      certifications: certificationUrls,
      min_travel_fee: payment.minTravelFee,
    },
  }, { onConflict: "user_id" });

  if (error) throw error;
}

interface RoomType {
  id: string;
  name: string;
  capacity: number;
  bedType: string;
  pricePerNight: number;
  photoUrls: string[];
}

export async function submitHotelProvider(params: {
  userId: string;
  info: {
    name: string;
    stars: number;
    type: string;
    descriptionFr: string;
    descriptionEn: string;
    descriptionAr: string;
  };
  location: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    lat: number;
    lng: number;
    coverageRadius: number;
  };
  heroImage: string | null;
  photos: string[];
  amenities: string[];
  payment: { iban: string; accountHolder: string; bankName: string; swift: string };
  rooms: RoomType[];
}) {
  const { userId, info, location, heroImage, photos, amenities, payment, rooms } = params;

  const { data: providerData, error } = await db.from("providers").upsert({
    user_id: userId,
    provider_type: "hotel",
    display_name: info.name,
    legal_name: info.name,
    address_line1: location.address,
    city: location.city,
    country: location.country,
    postal_code: location.postalCode,
    lat: location.lat || null,
    lng: location.lng || null,
    coverage_radius_km: location.coverageRadius,
    profile_photo_url: heroImage,
    gallery_urls: photos,
    description: info.descriptionEn || info.descriptionFr,
    bank_iban: payment.iban,
    bank_account_holder: payment.accountHolder,
    bank_name: payment.bankName,
    bank_swift: payment.swift,
    operating_hours: {},
    onboarding_status: "completed",
    onboarding_completed_at: new Date().toISOString(),
    kyc_status: "documents_pending",
    is_active: false,
    metadata: {
      hotel_type: info.type,
      stars: info.stars,
      amenities,
      descriptions: {
        fr: info.descriptionFr,
        en: info.descriptionEn,
        ar: info.descriptionAr,
      },
    },
  }, { onConflict: "user_id" }).select("id").single();

  if (error) throw error;

  const { data: hotelData } = await db
    .from("hotels")
    .insert({
      name: info.name,
      description: info.descriptionEn || info.descriptionFr,
      stars: info.stars,
      address: location.address,
      city: location.city,
      country: location.country,
      lat: location.lat || null,
      lng: location.lng || null,
      cover_image: heroImage,
      gallery_json: photos,
      amenities_json: amenities,
      source_type: "onboarding",
      visibility_mode: "pending",
    })
    .select("id")
    .single();

  if (hotelData?.id) {
    for (const room of rooms) {
      const { data: roomData } = await db.from("hotel_rooms").insert({
        hotel_id: hotelData.id,
        name: room.name,
        capacity: room.capacity,
        bed_type: room.bedType,
        images_json: room.photoUrls,
      }).select("id").single();

      if (roomData?.id && room.pricePerNight > 0) {
        await db.from("hotel_rate_plans").insert({
          room_id: roomData.id,
          name: "Standard Rate",
          cancellation_policy: "flexible",
          refundable: true,
        });

        const today = new Date();
        const availabilityRows = Array.from({ length: 90 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          return {
            room_id: roomData.id,
            date: date.toISOString().split("T")[0],
            available: true,
            price: room.pricePerNight,
            currency: "AED",
          };
        });
        await db.from("hotel_availability").insert(availabilityRows);
      }
    }
  }
}

export async function uploadHotelPhoto(userId: string, file: File, isHero?: boolean) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/hotel-${isHero ? "hero" : Date.now()}.${ext}`;
  await db.storage.from("onboarding-media").upload(path, file, { upsert: true });
  const { data } = db.storage.from("onboarding-media").getPublicUrl(path);
  return data?.publicUrl || null;
}
