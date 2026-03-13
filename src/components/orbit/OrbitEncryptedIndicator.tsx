/**
 * OrbitEncryptedBubbleIndicator — Small lock icon for encrypted messages
 */
import { Lock, FileKey } from "lucide-react";
import { isE2EEncrypted } from "@/lib/orbit-metadata-guard";
import { parseEncryptedFileRef } from "@/lib/orbit-file-encryption";

interface Props {
  content: string;
  encrypted?: boolean;
}

export default function OrbitEncryptedIndicator({ content, encrypted }: Props) {
  const isEncrypted = encrypted || isE2EEncrypted(content);
  const isEncryptedFile = !!parseEncryptedFileRef(content);

  if (!isEncrypted && !isEncryptedFile) return null;

  return (
    <span className="inline-flex items-center gap-0.5 ml-1" title="End-to-end encrypted">
      {isEncryptedFile ? (
        <FileKey className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-success) / 0.5)" }} />
      ) : (
        <Lock className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-success) / 0.5)" }} />
      )}
    </span>
  );
}
