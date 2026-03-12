/**
 * GuestChatDrawer — Full-featured guest communication drawer.
 * Allows visitors to chat, send photos/videos, without creating an account.
 * Creates a temporary guest session with rate limiting and expiry.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import {
  MessageSquare, Send, Loader2, Image, Video, X, Camera,
  Shield, Clock, AlertTriangle, User, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  createGuestSession, sendGuestMessage, getGuestMessages,
  uploadGuestMedia, getCachedSession, type GuestSession,
} from "@/lib/guest-session";
import { validateMediaFile, isVideoFile, MEDIA_ACCEPT } from "@/lib/media-utils";

interface GuestChatDrawerProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  serviceTitle: string;
  orgId: string;
  contextType?: string;
  contextId?: string;
  providerPhone?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  is_from_host: boolean;
  attachment_urls?: string[];
  contact_name?: string;
}

export default function GuestChatDrawer({
  open, onClose, providerName, serviceTitle, orgId,
  contextType = "general", contextId, providerPhone,
}: GuestChatDrawerProps) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [step, setStep] = useState<"intro" | "chat">("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [limits, setLimits] = useState({ messages_remaining: 20, media_remaining: 5 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Check for existing session on open
  useEffect(() => {
    if (!open) return;
    const cached = getCachedSession();
    if (cached && cached.org_id === orgId) {
      setSession(cached);
      setStep("chat");
      loadMessages(cached.token);
    }
  }, [open, orgId]);

  // Poll for new messages
  useEffect(() => {
    if (step !== "chat" || !session) return;
    pollRef.current = setInterval(() => loadMessages(session.token), 10000);
    return () => clearInterval(pollRef.current);
  }, [step, session]);

  // Auto-scroll
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
      await sendGuestMessage(session.token, message.trim(), attachmentUrls);
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

  const timeLeft = session
    ? Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] pb-safe flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2 text-left">
            <MessageSquare className="h-5 w-5 text-accent" />
            {step === "intro" ? `Contact ${providerName}` : providerName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left">{serviceTitle}</p>
        </SheetHeader>

        {step === "intro" ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/5 border border-accent/10">
              <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Secure guest session</p>
                <p>No account needed. Your session will expire after 2 hours. Messages are rate-limited for security.</p>
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
            <div className="flex items-center gap-2 mb-2 px-1 text-xs text-muted-foreground">
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
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 min-h-0 border border-border rounded-xl p-3 mb-2">
              <div className="space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Send your first message to {providerName}
                  </p>
                )}
                {messages.map((m) => (
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
                    {m.content && (
                      <p className="text-foreground whitespace-pre-line">{m.content}</p>
                    )}
                    {m.attachment_urls && (m.attachment_urls as string[]).length > 0 && (
                      <div className="mt-1 space-y-1">
                        {(m.attachment_urls as string[]).map((url, i) => (
                          <ChatMediaPreview key={i} url={url} isMe={!m.is_from_host} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
              <div className="flex items-center gap-2 mt-2 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                Session expires in {timeLeft} minutes
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
