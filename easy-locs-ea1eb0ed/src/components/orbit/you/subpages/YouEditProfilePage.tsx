import { useState, useRef, useEffect } from "react";
import { User, Camera, Image, AtSign, ChevronRight, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useResolvedIdentity } from "@/hooks/useResolvedIdentity";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { uploadAvatar, saveProfile } from "@/lib/orbit/orbit-account.repository";
import { useUsername } from "@/hooks/useUsername";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouEditProfilePage({ onBack }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const resolved = useResolvedIdentity({ display_name: user?.user_metadata?.full_name || user?.user_metadata?.display_name, email: user?.email, avatar_url: user?.user_metadata?.avatar_url });
  const [displayName, setDisplayName] = useState(resolved.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username, saveUsername, checkAvailability } = useUsername();
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => { if (username) setUsernameInput(username); }, [username]);

  const userId = user?.id || "—";
  const shortId = userId.replace(/-/g, "").substring(0, 8).toUpperCase();
  const initials = (displayName || "U").substring(0, 2).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      setAvatarUrl(publicUrl);
      toast.success(t("orbit.you.photo_uploaded"));
    } catch (err: any) { console.error("[Profile]", err.message); toast.error(t("orbit.you.upload_failed") || "Upload failed. Please try again."); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.id, displayName, avatarUrl);
      haptic("medium");
      toast.success(t("orbit.you.profile_updated"));
      onBack();
    } catch (err: any) { console.error("[Profile]", err.message); toast.error(t("orbit.you.save_failed") || "Save failed. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.edit_profile")}</h2>
      </div>

      <div className="flex flex-col items-center mt-6 mb-6">
        <div className="relative">
          <Avatar className="w-24 h-24 border-2 border-primary/20">
            <AvatarImage src={avatarUrl} alt={t("orbit.you.edit_profile")} />
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity">
            {uploading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-medium px-3 py-2 rounded-full border border-border/30 flex items-center gap-1.5 hover:bg-muted/30 transition-colors text-primary min-h-[44px]">
            <Image className="h-3 w-3" /> {t("orbit.you.gallery")}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("orbit.you.display_name_label")}</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("orbit.you.name_placeholder")} className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("orbit.you.orbit_id")}</label>
          <div className="flex items-center gap-2">
            <Input value={`EL-${shortId}`} disabled className="bg-muted/30 opacity-60 font-mono" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(userId); setCopied(true); haptic("light"); toast.success(t("orbit.you.id_copied")); setTimeout(() => setCopied(false), 2000); }} className="shrink-0 min-h-[44px] min-w-[44px]">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
            <AtSign className="h-3 w-3" /> {t("orbit.you.username")}
          </label>
          <div className="flex items-center gap-2">
            <Input value={usernameInput} onChange={async (e) => {
              const v = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
              setUsernameInput(v);
              if (v.length >= 3) { const res = await checkAvailability(v); setUsernameStatus(res.available ? { msg: t("orbit.you.username_available"), ok: true } : { msg: res.error || t("orbit.you.username_taken"), ok: false }); }
              else setUsernameStatus(v.length > 0 ? { msg: t("orbit.you.username_min"), ok: false } : null);
            }} placeholder={t("orbit.you.username_placeholder")} className="bg-muted/30 font-mono text-sm" />
            <Button variant="outline" size="sm" disabled={savingUsername || !usernameInput || usernameStatus?.ok === false}
              onClick={async () => { setSavingUsername(true); const res = await saveUsername(usernameInput); if (res.success) { toast.success(t("orbit.you.username_saved")); haptic("medium"); } else toast.error(res.error || t("orbit.you.username_save_failed")); setSavingUsername(false); }}
              className="min-h-[44px]">
              {savingUsername ? "..." : t("orbit.you.set")}
            </Button>
          </div>
          {usernameStatus && <p className={`text-[10px] mt-1 ${usernameStatus.ok ? "text-primary" : "text-destructive"}`}>{usernameStatus.msg}</p>}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full mt-4 min-h-[48px]">{saving ? t("orbit.you.saving") : t("orbit.you.save_changes")}</Button>
      </div>
    </div>
  );
}
