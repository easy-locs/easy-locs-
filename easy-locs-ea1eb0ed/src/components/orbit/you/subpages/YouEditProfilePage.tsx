import { useState, useRef, useEffect, useMemo } from "react";
import { User, Camera, Image, AtSign, ChevronLeft, Copy, Check, Mail, Phone, MapPin, FileText, Shield, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useResolvedIdentity } from "@/hooks/useResolvedIdentity";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { uploadAvatar, saveProfile, updateAvatarOnly } from "@/lib/orbit/orbit-account.repository";
import type { ProfileData } from "@/lib/orbit/orbit-account.repository";
import { useUsername } from "@/hooks/useUsername";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

function ProfileCompletionBar({ percent }: { percent: number }) {
  const color = percent >= 80 ? "hsl(142 71% 45%)" : percent >= 50 ? "hsl(var(--accent))" : "hsl(0 72% 51%)";
  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground))" }}>Profile completion</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{percent}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "hsl(var(--muted) / 0.3)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, borderRadius: 3, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground) / 0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, marginTop: 20 }}>{children}</p>;
}

function FieldRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "hsl(var(--muted-foreground) / 0.7)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon style={{ width: 14, height: 14 }} /> {label}
      </label>
      {children}
    </div>
  );
}

export default function YouEditProfilePage({ onBack }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const resolved = useResolvedIdentity({ display_name: user?.user_metadata?.full_name || user?.user_metadata?.display_name, email: user?.email, avatar_url: user?.user_metadata?.avatar_url });

  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || "");
  const [displayName, setDisplayName] = useState(resolved.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [bio, setBio] = useState(user?.user_metadata?.bio || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || user?.phone || "");
  const [city, setCity] = useState(user?.user_metadata?.city || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username, saveUsername, checkAvailability } = useUsername();
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => { if (username) setUsernameInput(username); }, [username]);

  useEffect(() => {
    const fn = user?.user_metadata?.full_name || user?.user_metadata?.display_name || "";
    if (!firstName && !lastName && fn) {
      const parts = fn.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else {
        setFirstName(parts[0]);
      }
    }
  }, []);

  const userId = user?.id || "";
  const shortId = userId.replace(/-/g, "").substring(0, 8).toUpperCase();
  const initials = (displayName || firstName || "U").substring(0, 2).toUpperCase();
  const email = user?.email || "";

  const completionPercent = useMemo(() => {
    let filled = 0;
    let total = 7;
    if (avatarUrl) filled++;
    if (displayName.trim()) filled++;
    if (firstName.trim()) filled++;
    if (lastName.trim()) filled++;
    if (bio.trim()) filled++;
    if (phone.trim()) filled++;
    if (city.trim()) filled++;
    return Math.round((filled / total) * 100);
  }, [avatarUrl, displayName, firstName, lastName, bio, phone, city]);

  useEffect(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (fn || ln) {
      setDisplayName([fn, ln].filter(Boolean).join(" "));
    }
  }, [firstName, lastName]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      setAvatarUrl(publicUrl);
      await updateAvatarOnly(user.id, publicUrl);
      toast.success(t("orbit.you.photo_uploaded"));
    } catch (err: any) {
      console.error("[Profile]", err);
      toast.error(`${t("orbit.you.upload_failed") || "Upload failed"}: ${err.message || "Unknown error"}`);
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) { toast.error("Display name is required"); return; }
    setSaving(true);
    try {
      const profileData: ProfileData = {
        displayName: displayName.trim(),
        avatarUrl,
        bio: bio.trim(),
        phone: phone.trim(),
        city: city.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      await saveProfile(user.id, profileData);
      haptic("medium");
      toast.success(t("orbit.you.profile_updated"));
      onBack();
    } catch (err: any) {
      console.error("[Profile]", err.message);
      toast.error(t("orbit.you.save_failed") || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: "1px solid hsl(var(--border) / 0.15)" }}>
        <button onClick={onBack} style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "transparent", border: "none", cursor: "pointer" }}>
          <ChevronLeft style={{ width: 20, height: 20, color: "hsl(var(--muted-foreground))" }} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>{t("orbit.you.edit_profile") || "Edit Profile"}</h2>
          <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, marginTop: 2 }}>Complete your profile to unlock all features</p>
        </div>
      </div>

      <ProfileCompletionBar percent={completionPercent} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 8 }}>
        <div style={{ position: "relative" }}>
          <Avatar className="w-28 h-28" style={{ border: "3px solid hsl(var(--accent) / 0.3)" }}>
            <AvatarImage src={avatarUrl} alt="Profile" />
            <AvatarFallback style={{ fontSize: 24, fontWeight: 700, background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              position: "absolute", bottom: 2, right: 2, width: 36, height: 36, borderRadius: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "hsl(var(--accent))", color: "#fff", border: "3px solid hsl(226 24% 14%)",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            {uploading ? <div style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> : <Camera style={{ width: 16, height: 16 }} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: "hsl(var(--accent))", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 20, minHeight: 44 }}>
          <Image style={{ width: 14, height: 14 }} /> {t("orbit.you.gallery") || "Choose photo"}
        </button>
      </div>

      <SectionLabel>Personal Information</SectionLabel>

      <FieldRow icon={User} label={t("orbit.you.first_name") || "First name"}>
        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="bg-muted/30" />
      </FieldRow>

      <FieldRow icon={User} label={t("orbit.you.last_name") || "Last name"}>
        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="bg-muted/30" />
      </FieldRow>

      <FieldRow icon={User} label={t("orbit.you.display_name_label") || "Display name"}>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("orbit.you.name_placeholder") || "Your display name"} className="bg-muted/30" />
      </FieldRow>

      <FieldRow icon={FileText} label={t("orbit.you.bio") || "Bio"}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          placeholder={t("orbit.you.bio_placeholder") || "Tell us about yourself..."}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14, resize: "none",
            background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.2)",
            color: "hsl(var(--foreground))", outline: "none", fontFamily: "inherit"
          }}
        />
        <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground) / 0.5)", textAlign: "right", marginTop: 2 }}>{bio.length}/160</p>
      </FieldRow>

      <SectionLabel>Contact</SectionLabel>

      <FieldRow icon={Mail} label={t("orbit.you.email") || "Email"}>
        <Input value={email} disabled className="bg-muted/30 opacity-60" />
        <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground) / 0.4)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <Shield style={{ width: 10, height: 10 }} /> Verified via authentication
        </p>
      </FieldRow>

      <FieldRow icon={Phone} label={t("orbit.you.phone") || "Phone number"}>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className="bg-muted/30" type="tel" />
      </FieldRow>

      <FieldRow icon={MapPin} label={t("orbit.you.city") || "City"}>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris, London, New York..." className="bg-muted/30" />
      </FieldRow>

      <SectionLabel>Identity</SectionLabel>

      <FieldRow icon={AtSign} label={t("orbit.you.username") || "Username"}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            value={usernameInput}
            onChange={async (e) => {
              const v = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
              setUsernameInput(v);
              if (v.length >= 3) {
                const res = await checkAvailability(v);
                setUsernameStatus(res.available ? { msg: t("orbit.you.username_available") || "Available", ok: true } : { msg: res.error || t("orbit.you.username_taken") || "Taken", ok: false });
              } else {
                setUsernameStatus(v.length > 0 ? { msg: t("orbit.you.username_min") || "Min 3 characters", ok: false } : null);
              }
            }}
            placeholder={t("orbit.you.username_placeholder") || "your.username"}
            className="bg-muted/30 font-mono text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={savingUsername || !usernameInput || usernameStatus?.ok === false}
            onClick={async () => {
              setSavingUsername(true);
              const res = await saveUsername(usernameInput);
              if (res.success) { toast.success(t("orbit.you.username_saved") || "Username saved"); haptic("medium"); }
              else toast.error(res.error || t("orbit.you.username_save_failed") || "Failed");
              setSavingUsername(false);
            }}
            className="min-h-[44px] shrink-0"
          >
            {savingUsername ? "..." : t("orbit.you.set") || "Set"}
          </Button>
        </div>
        {usernameStatus && <p style={{ fontSize: 11, marginTop: 4, color: usernameStatus.ok ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{usernameStatus.msg}</p>}
      </FieldRow>

      <FieldRow icon={Shield} label={t("orbit.you.orbit_id") || "Easy-Locs ID"}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Input value={`EL-${shortId}`} disabled className="bg-muted/30 opacity-60 font-mono" />
          <Button
            variant="outline"
            size="icon"
            onClick={async () => { const { copyToClipboard } = await import("@/lib/clipboard"); const r = await copyToClipboard(userId); if (r.ok) { setCopied(true); haptic("light"); toast.success(t("orbit.you.id_copied") || "ID copied"); setTimeout(() => setCopied(false), 2000); } }}
            className="shrink-0 min-h-[44px] min-w-[44px]"
          >
            {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
          </Button>
        </div>
      </FieldRow>

      <div style={{ marginTop: 24, paddingBottom: 32 }}>
        <Button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          style={{
            width: "100%", minHeight: 52, borderRadius: 14, fontSize: 16, fontWeight: 700,
            background: "hsl(var(--accent))", color: "hsl(226 24% 14%)", border: "none"
          }}
        >
          {saving ? t("orbit.you.saving") || "Saving..." : t("orbit.you.save_changes") || "Save changes"}
        </Button>
      </div>
    </div>
  );
}
