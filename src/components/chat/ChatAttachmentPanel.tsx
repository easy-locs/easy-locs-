import { useState } from "react";
import { useChatAttachmentStore } from "@/stores/chatAttachmentStore";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip } from "lucide-react";

export function ChatAttachmentPanel(props: {
  conversationId: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const uploadAttachment = useChatAttachmentStore((s) => s.uploadAttachment);
  const hydrateConversationAttachments = useChatAttachmentStore((s) => s.hydrateConversationAttachments);
  const items = useChatAttachmentStore((s) => s.items);
  const uploading = useChatAttachmentStore((s) => s.uploading);

  const filtered = props.conversationId
    ? items.filter((x) => x.conversation_id === props.conversationId)
    : [];

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Attachments</h3>

      {props.conversationId ? (
        <>
          <div className="flex items-center gap-2">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-foreground flex-1"
            />
            <Button
              size="sm"
              disabled={!file || uploading}
              onClick={async () => {
                if (!file || !props.conversationId) return;
                await uploadAttachment(props.conversationId, file);
                await hydrateConversationAttachments(props.conversationId);
                setFile(null);
              }}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
            </Button>
          </div>

          <div className="space-y-1">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.file_type ?? "unknown"}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No conversation selected</p>
      )}
    </div>
  );
}
