import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeferredUiEngine } from "@/hooks/useDeferredUiEngine";
import { useI18n } from "@/lib/i18n";
import {
  uploadOnboardingMedia,
  submitHotelProvider,
} from "@/services/onboarding.service";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import ProductMediaUploader from "@/components/storefront/ProductMediaUploader";
import {
  Building, MapPin, Camera, BedDouble, CheckCircle2, CreditCard,
  ArrowRight, ArrowLeft, Loader2, Star, Plus, Trash2, Wifi,
} from "lucide-react";

const MIN_GALLERY_PHOTOS = 5;
const BED_TYPES = ["single", "double", "twin", "king", "queen"] as const;
const AMENITY_IDS = [
  "wifi", "parking", "pool", "spa", "restaurant", "gym",
  "ac", "heating", "room_service", "bar", "airport_shuttle", "concierge",
  "laundry", "breakfast", "pet_friendly", "beach_access",
] as const;

interface RoomType {
  id: string;
  name: string;
  capacity: number;
  bedType: string;
  pricePerNight: number;
  photoUrls: string[];
}

export default function HotelOnboardingWizard() {
  const { timedOut: uiTimedOut } = useDeferredUiEngine("onboarding-hotel");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const dir = (locale === "ar" || locale === "he" || locale === "ur" || locale === "fa") ? "rtl" : "ltr";
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const STEPS = [
    { key: "info", label: t("hotel.step_info" as any), icon: Building },
    { key: "location", label: t("hotel.step_location" as any), icon: MapPin },
    { key: "photos", label: t("hotel.step_photos" as any), icon: Camera },
    { key: "rooms", label: t("hotel.step_rooms" as any), icon: BedDouble },
    { key: "amenities", label: t("hotel.step_amenities" as any), icon: Wifi },
    { key: "payment", label: t("hotel.step_payment" as any), icon: CreditCard },
  ];

  const HOTEL_TYPES = [
    { value: "hotel", label: t("hotel.type_hotel" as any) },
    { value: "riad", label: t("hotel.type_riad" as any) },
    { value: "guesthouse", label: t("hotel.type_guesthouse" as any) },
    { value: "apart_hotel", label: t("hotel.type_apart_hotel" as any) },
  ];

  const [info, setInfo] = useState({
    name: "",
    stars: 3,
    type: "hotel",
    descriptionFr: "",
    descriptionEn: "",
    descriptionAr: "",
  });

  const [location, setLocation] = useState({
    address: "",
    city: "",
    country: "AE",
    postalCode: "",
    lat: 0,
    lng: 0,
    coverageRadius: 10,
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [coverIndex, setCoverIndex] = useState(0);

  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [newRoom, setNewRoom] = useState<RoomType>({
    id: "",
    name: "",
    capacity: 2,
    bedType: "double",
    pricePerNight: 0,
    photoUrls: [],
  });

  const [amenities, setAmenities] = useState<string[]>([]);

  const [payment, setPayment] = useState({
    iban: "",
    accountHolder: "",
    bankName: "",
    swift: "",
  });

  const canNext = useCallback(() => {
    if (step === 0) return info.name && info.type;
    if (step === 1) return location.address && location.city;
    if (step === 2) return !!heroImage && photos.length >= MIN_GALLERY_PHOTOS;
    if (step === 3) return rooms.length >= 1;
    if (step === 4) return true;
    if (step === 5) return payment.iban && payment.accountHolder;
    return true;
  }, [step, info, location, heroImage, photos, rooms, payment]);

  const addRoom = () => {
    if (!newRoom.name || newRoom.pricePerNight <= 0) {
      toast.error(t("hotel.fill_room_name_price" as any));
      return;
    }
    setRooms([...rooms, { ...newRoom, id: crypto.randomUUID() }]);
    setNewRoom({ id: "", name: "", capacity: 2, bedType: "double", pricePerNight: 0, photoUrls: [] });
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const toggleAmenity = (a: string) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isHero?: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    const url = await uploadOnboardingMedia(user.id, file, isHero ? "hotel-hero" : "hotel");
    if (url) {
      if (isHero) setHeroImage(url);
      else setPhotos((p) => [...p, url]);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      await submitHotelProvider({
        userId: user.id,
        info,
        location,
        heroImage,
        photos,
        amenities,
        payment,
        rooms,
      });

      toast.success(t("hotel.registration_complete" as any));
      navigate("/pro/dashboard");
    } catch (err: any) {
      toast.error(t("hotel.registration_failed" as any) + ": " + (err.message || t("ob.unknown_error" as any)));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div dir={dir} className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <Building className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("hotel.registration_title" as any)}</h1>
            <p className="text-xs text-muted-foreground">
              {(t("hotel.step_of" as any) as string).replace("{current}", String(step + 1)).replace("{total}", String(STEPS.length))} — {STEPS[step].label}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" aria-label={`Registration progress: step ${step + 1} of ${STEPS.length}`} />
        {uiTimedOut && (
          <p className="text-[10px] text-amber-500/60 mt-1">⚠ UI engine timed out — form remains fully functional</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="px-4 pb-6 space-y-4"
        >
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.establishment_name" as any)} *</label>
                <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder={t("hotel.ph_name" as any)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.classification" as any)}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInfo({ ...info, stars: s })}
                      aria-label={`${s} star${s > 1 ? "s" : ""}`}
                      aria-pressed={info.stars >= s}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        info.stars >= s ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.type" as any)} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {HOTEL_TYPES.map((ht) => (
                    <button
                      key={ht.value}
                      onClick={() => setInfo({ ...info, type: ht.value })}
                      aria-pressed={info.type === ht.value}
                      className={`p-3 rounded-xl text-sm font-medium border ${
                        info.type === ht.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {ht.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.description_en" as any)}</label>
                <textarea
                  value={info.descriptionEn}
                  onChange={(e) => setInfo({ ...info, descriptionEn: e.target.value })}
                  className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[80px] resize-none border-0"
                  placeholder={t("hotel.ph_desc_en" as any)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.description_fr" as any)}</label>
                <textarea
                  value={info.descriptionFr}
                  onChange={(e) => setInfo({ ...info, descriptionFr: e.target.value })}
                  className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[80px] resize-none border-0"
                  placeholder={t("hotel.ph_desc_fr" as any)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.full_address" as any)} *</label>
                <Input value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} placeholder={t("hotel.ph_address" as any)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.city" as any)} *</label>
                  <Input value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} placeholder={t("hotel.ph_city" as any)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.country" as any)}</label>
                  <Input value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} placeholder={t("hotel.ph_country" as any)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.postal_code" as any)}</label>
                <Input value={location.postalCode} onChange={(e) => setLocation({ ...location, postalCode: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.coverage_radius" as any)}</label>
                <Input type="number" value={location.coverageRadius} onChange={(e) => setLocation({ ...location, coverageRadius: parseInt(e.target.value) || 10 })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {(t("hotel.upload_photos_hint" as any) as string).replace("{min}", String(MIN_GALLERY_PHOTOS))}
              </p>
              <ProductMediaUploader
                images={photos}
                videoUrl={videoUrl}
                coverIndex={coverIndex}
                onImagesChange={(urls) => {
                  setPhotos(urls);
                  if (urls.length > 0 && !heroImage) setHeroImage(urls[0]);
                }}
                onVideoChange={setVideoUrl}
                onCoverChange={(idx) => {
                  setCoverIndex(idx);
                  if (photos[idx]) setHeroImage(photos[idx]);
                }}
              />
              {photos.length > 0 && photos.length < MIN_GALLERY_PHOTOS && (
                <p className="text-xs text-amber-500">
                  {MIN_GALLERY_PHOTOS - photos.length} {t("hotel.photos_remaining" as any)}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("hotel.at_least_one_room" as any)}</p>
              {rooms.map((r) => (
                <div key={r.id} className="rounded-xl bg-muted/30 p-3 flex items-center gap-3">
                  <BedDouble className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.bedType} · {r.capacity} guests · {r.pricePerNight} AED/night</p>
                  </div>
                  <button onClick={() => removeRoom(r.id)} aria-label={`Remove ${r.name} room type`} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="rounded-xl border border-border/20 p-4 space-y-3">
                <Input value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} placeholder={t("hotel.room_type_name" as any)} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">{t("hotel.bed_type" as any)}</label>
                    <select
                      value={newRoom.bedType}
                      onChange={(e) => setNewRoom({ ...newRoom, bedType: e.target.value })}
                      className="w-full rounded-lg bg-muted text-sm px-3 py-2 text-foreground border-0 mt-1"
                    >
                      {BED_TYPES.map((b) => <option key={b} value={b}>{t(`hotel.bed_${b}` as any)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("hotel.max_guests" as any)}</label>
                    <Input type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 1 })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("hotel.price_per_night" as any)}</label>
                  <Input type="number" value={newRoom.pricePerNight || ""} onChange={(e) => setNewRoom({ ...newRoom, pricePerNight: parseFloat(e.target.value) || 0 })} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{t("hotel.room_photos" as any)}</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {newRoom.photoUrls.map((url, i) => (
                      <div key={i} className="relative h-14 rounded-lg overflow-hidden">
                        <img loading="lazy" src={url} alt={`Room photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => setNewRoom({ ...newRoom, photoUrls: newRoom.photoUrls.filter((_, j) => j !== i) })} aria-label={`Remove room photo ${i + 1}`} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                    {newRoom.photoUrls.length < 5 && (
                      <button
                        aria-label="Upload room photo"
                        onClick={async () => {
                          if (!user?.id) return;
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = async (ev) => {
                            const file = (ev.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            const url = await uploadOnboardingMedia(user.id, file, "room");
                            if (url) setNewRoom((prev) => ({ ...prev, photoUrls: [...prev.photoUrls, url] }));
                          };
                          input.click();
                        }}
                        className="h-14 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center"
                      >
                        <Camera className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
                <Button onClick={addRoom} variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> {t("hotel.add_room" as any)}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("hotel.select_amenities" as any)}</p>
              <div className="grid grid-cols-2 gap-2">
                {AMENITY_IDS.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    aria-pressed={amenities.includes(a)}
                    className={`p-3 rounded-xl text-sm font-medium border text-left ${
                      amenities.includes(a)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/20 text-muted-foreground"
                    }`}
                  >
                    {amenities.includes(a) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {t(`hotel.amenity_${a}` as any)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.iban" as any)} *</label>
                <Input value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} placeholder={t("hotel.ph_iban" as any)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.account_holder" as any)} *</label>
                <Input value={payment.accountHolder} onChange={(e) => setPayment({ ...payment, accountHolder: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.bank_name" as any)}</label>
                <Input value={payment.bankName} onChange={(e) => setPayment({ ...payment, bankName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("hotel.swift_code" as any)}</label>
                <Input value={payment.swift} onChange={(e) => setPayment({ ...payment, swift: e.target.value })} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border/10">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("hotel.back" as any)}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1">
              {t("hotel.next" as any)} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {t("hotel.complete_registration" as any)}
            </Button>
          )}
        </div>
      </div>
    </SubPageShell>
  );
}
