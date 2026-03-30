/**
 * YouEditProfilePage — Edit profile sub-page (avatar, name, username, email).
 */
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

interface Props { onBack: () => void; }

export default function YouEditProfilePage({ onBack }: Props) {
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
  const shortId = userId.substring(0, 8).toUpperCase();
  const displayEmail = user?.email || "—";
  const initials = (displayName || displayEmail).substring(0, 2).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      setAvatarUrl(publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.id, displayName, avatarUrl);
      haptic("medium");
      toast.success("Profile updated!");
      onBack();
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Edit Profile</h2>
      </div>

      <div className="flex flex-col items-center mt-6 mb-6">
        <div className="relative">
          <Avatar className="w-24 h-24 border-2 border-primary/20">
            <AvatarImage src={avatarUrl} alt="Profile" />
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity">
            {uploading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-medium px-3 py-1 rounded-full border border-border/30 flex items-center gap-1.5 hover:bg-muted/30 transition-colors text-primary">
            <Image className="h-3 w-3" /> Gallery
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
          <Input value={displayEmail} disabled className="bg-muted/30 opacity-60" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Orbit ID</label>
          <div className="flex items-center gap-2">
            <Input value={`EL-${shortId}`} disabled className="bg-muted/30 opacity-60 font-mono" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(userId); setCopied(true); haptic("light"); toast.success("ID copied!"); setTimeout(() => setCopied(false), 2000); }} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <AtSign className="h-3 w-3" /> Username
          </label>
          <div className="flex items-center gap-2">
            <Input value={usernameInput} onChange={async (e) => {
              const v = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
              setUsernameInput(v);
              if (v.length >= 3) { const res = await checkAvailability(v); setUsernameStatus(res.available ? { msg: "✅ Available", ok: true } : { msg: res.error || "Taken", ok: false }); }
              else setUsernameStatus(v.length > 0 ? { msg: "Min 3 characters", ok: false } : null);
            }} placeholder="your.username" className="bg-muted/30 font-mono text-sm" />
            <Button variant="outline" size="sm" disabled={savingUsername || !usernameInput || usernameStatus?.ok === false}
              onClick={async () => { setSavingUsername(true); const res = await saveUsername(usernameInput); if (res.success) { toast.success("Username saved!"); haptic("medium"); } else toast.error(res.error || "Failed"); setSavingUsername(false); }}>
              {savingUsername ? "..." : "Set"}
            </Button>
          </div>
          {usernameStatus && <p className={`text-[10px] mt-1 ${usernameStatus.ok ? "text-primary" : "text-destructive"}`}>{usernameStatus.msg}</p>}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full mt-4">{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}
