/**
 * GroupedMediaBubble — Renders a grouped media message as a tiled album.
 * Supports 2-4+ items in a premium grid layout with tap-to-open viewer.
 * Memoized for performance.
 */
import { memo, useCallback } from "react";
import { Film, FileText } from "lucide-react";
import { useGroupedMediaViewer } from "@/families/media/media-group";

interface GroupedItem {
  url: string;
  kind: string;
  name?: string;
}

interface Props {
  items: GroupedItem[];
  caption?: string;
  isMe: boolean;
}

function GroupedMediaBubbleInner({ items, caption, isMe }: Props) {
  const { open } = useGroupedMediaViewer();

  const handleOpenViewer = useCallback(
    (startIndex: number) => {
      open(
        items.map((i) => ({ url: i.url, kind: i.kind })),
        startIndex,
      );
    },
    [items, open],
  );

  if (!items.length) return null;

  const count = items.length;

  return (
    <div className="space-y-1">
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${isMe ? "hsl(var(--primary) / 0.1)" : "hsl(var(--border) / 0.08)"}`,
        }}
      >
        {count === 1 && <SingleTile item={items[0]} onClick={() => handleOpenViewer(0)} />}
        {count === 2 && (
          <div className="grid grid-cols-2 gap-px" style={{ background: "hsl(var(--border) / 0.1)" }}>
            {items.map((item, idx) => (
              <SingleTile key={idx} item={item} onClick={() => handleOpenViewer(idx)} aspectClass="aspect-[3/4]" />
            ))}
          </div>
        )}
        {count === 3 && (
          <div className="grid grid-cols-2 gap-px" style={{ background: "hsl(var(--border) / 0.1)" }}>
            <div className="row-span-2">
              <SingleTile item={items[0]} onClick={() => handleOpenViewer(0)} aspectClass="aspect-[3/4]" fullHeight />
            </div>
            <SingleTile item={items[1]} onClick={() => handleOpenViewer(1)} aspectClass="aspect-square" />
            <SingleTile item={items[2]} onClick={() => handleOpenViewer(2)} aspectClass="aspect-square" />
          </div>
        )}
        {count >= 4 && (
          <div className="grid grid-cols-2 gap-px" style={{ background: "hsl(var(--border) / 0.1)" }}>
            {items.slice(0, 4).map((item, idx) => (
              <div key={idx} className="relative">
                <SingleTile item={item} onClick={() => handleOpenViewer(idx)} aspectClass="aspect-square" />
                {idx === 3 && count > 4 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "hsl(0 0% 0% / 0.5)" }}
                  >
                    <span className="text-white text-lg font-bold">+{count - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {caption && (
        <p className="text-sm px-1 leading-snug" style={{ color: "hsl(var(--foreground))" }}>
          {caption}
        </p>
      )}
    </div>
  );
}

function SingleTile({
  item,
  onClick,
  aspectClass = "aspect-video",
  fullHeight,
}: {
  item: GroupedItem;
  onClick: () => void;
  aspectClass?: string;
  fullHeight?: boolean;
}) {
  const isImage = item.kind === "image";
  const isVideo = item.kind === "video";

  return (
    <button
      onClick={onClick}
      className={`relative w-full overflow-hidden hover:opacity-90 transition-opacity ${fullHeight ? "h-full" : aspectClass}`}
      style={{ background: "hsl(var(--muted) / 0.3)" }}
    >
      {isImage && (
        <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
      {isVideo && (
        <>
          <video src={item.url} preload="metadata" muted playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "hsl(0 0% 100% / 0.85)" }}
            >
              <Film className="h-4 w-4" style={{ color: "hsl(0 0% 10%)" }} />
            </div>
          </div>
        </>
      )}
      {!isImage && !isVideo && (
        <div className="w-full h-full flex items-center justify-center">
          <FileText className="h-6 w-6" style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>
      )}
    </button>
  );
}

export const GroupedMediaBubble = memo(GroupedMediaBubbleInner);
GroupedMediaBubble.displayName = "GroupedMediaBubble";
