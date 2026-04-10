/**
 * ComposerAttachMenu — Single-purpose: dropdown menu for attachment options.
 */
import { memo, useRef, useState } from "react";
import { Paperclip, Camera, MapPin, Eye, Images, FileText, Headphones, Contact } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useOrbitLabels } from "@/families/orbit-i18n/orbit-labels";

interface AttachmentActions {
  onFileUpload?: (file: File) => void;
  onCameraCapture?: (file: File) => void;
  onLocation?: () => void;
  onViewOnce?: (file: File) => void;
  onMultiPhoto?: () => void;
  onDocument?: (file: File) => void;
  onAudio?: (file: File) => void;
  onContact?: () => void;
}

interface Props {
  actions: AttachmentActions;
  disabled?: boolean;
  children: React.ReactNode;
}

function ComposerAttachMenu({ actions, disabled, children }: Props) {
  const orbitLabels = useOrbitLabels();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && actions.onFileUpload) actions.onFileUpload(file);
          e.target.value = "";
        }}
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-44">
          <DropdownMenuItem onClick={() => { fileInputRef.current?.click(); setOpen(false); }}>
            <Paperclip className="h-4 w-4 mr-2 text-primary" /> {orbitLabels.media.file}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setOpen(false);
            const inp = document.createElement("input");
            inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
            inp.onchange = () => {
              const f = inp.files?.[0];
              if (f && actions.onCameraCapture) actions.onCameraCapture(f);
              else if (f && actions.onFileUpload) actions.onFileUpload(f);
            };
            inp.click();
          }}>
            <Camera className="h-4 w-4 mr-2 text-accent" /> {orbitLabels.media.camera}
          </DropdownMenuItem>
          {actions.onMultiPhoto && (
            <DropdownMenuItem onClick={() => { setOpen(false); actions.onMultiPhoto!(); }}>
              <Images className="h-4 w-4 mr-2 text-primary" /> {orbitLabels.media.multiPhotos}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => {
            setOpen(false);
            const inp = document.createElement("input");
            inp.type = "file"; inp.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";
            inp.onchange = () => {
              const f = inp.files?.[0];
              if (f && actions.onDocument) actions.onDocument(f);
              else if (f && actions.onFileUpload) actions.onFileUpload(f);
            };
            inp.click();
          }}>
            <FileText className="h-4 w-4 mr-2 text-blue-400" /> {orbitLabels.media.file}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setOpen(false);
            const inp = document.createElement("input");
            inp.type = "file"; inp.accept = "audio/*,.mp3,.m4a,.wav,.ogg,.aac";
            inp.onchange = () => {
              const f = inp.files?.[0];
              if (f && actions.onAudio) actions.onAudio(f);
              else if (f && actions.onFileUpload) actions.onFileUpload(f);
            };
            inp.click();
          }}>
            <Headphones className="h-4 w-4 mr-2 text-purple-400" /> {orbitLabels.message.attachment}
          </DropdownMenuItem>
          {actions.onLocation && (
            <DropdownMenuItem onClick={() => { setOpen(false); actions.onLocation!(); }}>
              <MapPin className="h-4 w-4 mr-2 text-accent" /> {orbitLabels.media.location}
            </DropdownMenuItem>
          )}
          {actions.onContact && (
            <DropdownMenuItem onClick={() => { setOpen(false); actions.onContact!(); }}>
              <Contact className="h-4 w-4 mr-2 text-green-400" /> {orbitLabels.actions.select}
            </DropdownMenuItem>
          )}
          {actions.onViewOnce && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setOpen(false);
                const inp = document.createElement("input");
                inp.type = "file"; inp.accept = "image/*";
                inp.onchange = () => { const f = inp.files?.[0]; if (f) actions.onViewOnce!(f); };
                inp.click();
              }}>
                <Eye className="h-4 w-4 mr-2 text-destructive" /> {orbitLabels.media.viewOnce}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default memo(ComposerAttachMenu);
