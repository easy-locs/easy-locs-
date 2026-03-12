/**
 * GuestChatDrawer — Full-featured guest communication drawer.
 * Allows visitors to chat, send photos/videos, and make encrypted calls
 * without creating an account. Creates a temporary guest session.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import GuestCallDialog from "@/components/guest/GuestCallDialog";
import {
  MessageSquare, Send, Loader2, Image, Video, X, Camera,
  Shield, Clock, AlertTriangle, Phone, Globe, ChevronDown,
  PhoneCall, VideoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  createGuestSession, sendGuestMessage, getGuestMessages,
  uploadGuestMedia, getCachedSession, type GuestSession,
} from "@/lib/guest-session";
import { validateMediaFile, isVideoFile, MEDIA_ACCEPT } from "@/lib/media-utils";
import { GuestCallManager } from "@/lib/guest-call";

interface GuestChatDrawerProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  serviceTitle: string;
  orgId: string;
  contextType?: string;
  contextId?: string;
  providerPhone?: string;
  providerWhatsApp?: string;
  listingUrl?: string;
  listingPrice?: string;
  listingCity?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  translated_content?: string;
  created_at: string;
  is_from_host: boolean;
  attachment_urls?: string[];
  contact_name?: string;
}

const GUEST_LANGUAGES = [
  { code: "en", label: "English" }, { code: "fr", label: "Français" },
  { code: "es", label: "Español" }, { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" }, { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" }, { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" }, { code: "ko", label: "한국어" },
  { code: "tr", label: "Türkçe" }, { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" }, { code: "ru", label: "Русский" },
];

export default function GuestChatDrawer({
  open, onClose, providerName, serviceTitle, orgId,
  contextType = "general", contextId, providerPhone, providerWhatsApp,
  listingUrl, listingPrice, listingCity,
}: GuestChatDrawerProps) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [step, setStep] = useState<"intro" | "chat">("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guestLang, setGuestLang] = useState(() => navigator.language?.slice(0, 2) || "en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [limits, setLimits] = useState({ messages_remaining: 20, media_remaining: 5 });
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callManager, setCallManager] = useState<GuestCallManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!open) return;
    const cached = getCachedSession();
    if (cached && cached.org_id === orgId) {
      setSession(cached);
      setStep("chat");
      loadMessages(cached.token);
    }
  }, [open, orgId]);

  useEffect(() => {
    if (step !== "chat" || !session) return;
    pollRef.current = setInterval(() => loadMessages(session.token), 10000);
    return () => clearInterval(pollRef.current);
  }, [step, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = useCallback(async (token: string) => {
    try {
      const data = await getGuestMessages(token);
      setMessages(data.messages || []);
    } catch { /* silent */ }
  }, []);

  const handleStartSession = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    setLoading(true);
    try {
      const sess = await createGuestSession({
        displayName: name.trim(),
        email: email.trim() || undefined,
        orgId,
        contextType,
        contextId,
      });
      setSession(sess);
      setStep("chat");
      await loadMessages(sess.token);
    } catch (err: any) {
      if (err.message?.includes("Too many")) {
        toast.error("Too many sessions. Please try again later.");
      } else {
        toast.error("Failed to start session");
      }
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!session || (!message.trim() && previews.length === 0)) return;
    if (limits.messages_remaining <= 0) {
      toast.error("Message limit reached for this session");
      return;
    }
    setSending(true);
    try {
      let attachmentUrls: string[] = [];
      if (previews.length > 0) {
        if (limits.media_remaining <= 0) {
          toast.error("Media limit reached for this session");
          setSending(false);
          return;
        }
        setUploading(true);
        for (const { file } of previews) {
          const url = await uploadGuestMedia(file, session.id);
          attachmentUrls.push(url);
        }
        setUploading(false);
      }

      await sendGuestMessage(session.token, message.trim(), attachmentUrls, guestLang);
      setMessage("");
      previews.forEach(p => URL.revokeObjectURL(p.url));
      setPreviews([]);
      setLimits(prev => ({
        messages_remaining: prev.messages_remaining - 1,
        media_remaining: prev.media_remaining - attachmentUrls.length,
      }));
      await loadMessages(session.token);
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    }
    setSending(false);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPreviews: { file: File; url: string }[] = [];
    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const err = validateMediaFile(files[i]);
      if (err) { toast.error(err); continue; }
      newPreviews.push({ file: files[i], url: URL.createObjectURL(files[i]) });
    }
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 3));
  };

  const removePreview = (idx: number) => {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleStartCall = (isVideo: boolean) => {
    if (!session) return;
    const manager = new GuestCallManager({
      token: session.token,
      isGuest: true,
      role: "caller",
      onStateChange: () => {},
    });
    setCallManager(manager);
    setCallDialogOpen(true);
    manager.requestCall(isVideo).catch((err) => {
      toast.error(err.message || "Failed to start call");
      setCallDialogOpen(false);
    });
  };

  const timeLeft = session
    ? Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000))
    : 0;

  const toggleOriginal = (id: string) => {
    setShowOriginal(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] pb-safe flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2 text-left">
              <MessageSquare className="h-5 w-5 text-accent" />
              {step === "intro" ? `Contact ${providerName}` : providerName}
            </SheetTitle>
            <p className="text-sm text-muted-foreground text-left">
              {serviceTitle}
              {listingCity && <span className="ml-1">— {listingCity}</span>}
              {listingPrice && <span className="ml-1">· {listingPrice}</span>}
            </p>
          </SheetHeader>

          {step === "intro" ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/5 border border-accent/10">
                <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Secure guest session</p>
                  <p>No account needed. Your session expires after 2 hours. Messages are rate-limited and automatically translated.</p>
                </div>
              </div>

              <Input
                placeholder="Your name *"
                value={name}
                onChange={e => setName(e.target.value)}
                className="min-h-[44px]"
                maxLength={100}
              />
              <Input
                type="email"
                placeholder="Your email (optional, for replies)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="min-h-[44px]"
              />

              {/* Language selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{GUEST_LANGUAGES.find(l => l.code === guestLang)?.label || "English"}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {showLangPicker && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg">
                    {GUEST_LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setGuestLang(l.code); setShowLangPicker(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors ${l.code === guestLang ? "bg-accent/5 font-medium" : ""}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleStartSession} disabled={loading} className="w-full gap-2 min-h-[44px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Start conversation
              </Button>

              {providerPhone && (
                <a
                  href={`tel:${providerPhone}`}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Phone className="h-4 w-4" /> Or call directly
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 mt-2">
              {/* Session info bar */}
              <div className="flex items-center gap-2 mb-2 px-1 text-xs text-muted-foreground flex-wrap">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock className="h-3 w-3" />
                  {timeLeft}m left
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <MessageSquare className="h-3 w-3" />
                  {limits.messages_remaining} msgs
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Image className="h-3 w-3" />
                  {limits.media_remaining} media
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Globe className="h-3 w-3" />
                  {GUEST_LANGUAGES.find(l => l.code === guestLang)?.label}
                </Badge>
              </div>

              {/* Context banner + call buttons */}
              <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <span className="truncate font-medium">{serviceTitle}</span>
                {listingCity && <span>· {listingCity}</span>}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleStartCall(false)}
                    className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors"
                    title="Audio call"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleStartCall(true)}
                    className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors"
                    title="Video call"
                  >
                    <VideoIcon className="h-3.5 w-3.5" />
                  </button>
                  {listingUrl && (
                    <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline ml-1">
                      View
                    </a>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 min-h-0 border border-border rounded-xl p-3 mb-2">
                <div className="space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Send your first message to {providerName}
                    </p>
                  )}
                  {messages.map((m) => {
                    const hasTranslation = m.translated_content && m.translated_content !== m.content;
                    const showOrig = showOriginal[m.id];
                    const displayText = hasTranslation && !showOrig ? m.translated_content : m.content;

                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-lg text-sm max-w-[85%] ${
                          m.is_from_host
                            ? "bg-card border border-border mr-auto"
                            : "bg-accent/10 border border-accent/20 ml-auto"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {m.is_from_host ? providerName : "You"}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {format(new Date(m.created_at), "HH:mm")}
                          </span>
                        </div>
                        {displayText && (
                          <p className="text-foreground whitespace-pre-line">{displayText}</p>
                        )}
                        {hasTranslation && (
                          <button
                            onClick={() => toggleOriginal(m.id)}
                            className="text-[10px] text-accent/70 hover:text-accent mt-1 flex items-center gap-1"
                          >
                            <Globe className="h-2.5 w-2.5" />
                            {showOrig ? "Show translation" : "Show original"}
                          </button>
                        )}
                        {m.attachment_urls && (m.attachment_urls as string[]).length > 0 && (
                          <div className="mt-1 space-y-1">
                            {(m.attachment_urls as string[]).map((url, i) => (
                              <ChatMediaPreview key={i} url={url} isMe={!m.is_from_host} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Media previews */}
              {previews.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  {previews.map((p, i) => (
                    <div key={i} className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted">
                      {isVideoFile(p.file) ? (
                        <div className="w-full h-full flex items-center justify-center"><Video className="h-5 w-5 text-muted-foreground" /></div>
                      ) : p.file.type.startsWith("image/") ? (
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Image className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <button onClick={() => removePreview(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input area */}
              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={MEDIA_ACCEPT}
                  onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || limits.media_remaining <= 0}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Textarea
                  placeholder="Type a message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="min-h-[40px] max-h-[100px] resize-none text-sm flex-1"
                  rows={1}
                  maxLength={2000}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={handleSend}
                  disabled={sending || uploading || (!message.trim() && previews.length === 0)}
                >
                  {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              {timeLeft <= 10 && timeLeft > 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Session expires in {timeLeft} minutes
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Call dialog */}
      <GuestCallDialog
        open={callDialogOpen}
        onClose={() => {
          callManager?.cleanup();
          setCallManager(null);
          setCallDialogOpen(false);
        }}
        callManager={callManager}
        providerName={providerName}
        serviceTitle={serviceTitle}
        onFallbackChat={() => setCallDialogOpen(false)}
        providerPhone={providerPhone}
        providerWhatsApp={providerPhone}
      />
    </>
  );
}
