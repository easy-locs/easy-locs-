import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CONTROL_SECTIONS } from "./sections";
import { useControlContext } from "./ControlContext";

const SECTION_BY_KEY = new Map(
  CONTROL_SECTIONS.filter((s) => s.shortcut?.startsWith("g ")).map((s) => [
    s.shortcut!.slice(2),
    s.id,
  ]),
);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useControlHotkeys(opts: {
  onToggleSidebar: () => void;
  onCloseDetail: () => void;
}) {
  const navigate = useNavigate();
  const { setPaletteOpen, setShortcutsOpen, paletteOpen, shortcutsOpen, detail } =
    useControlContext();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? — shortcuts
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(!shortcutsOpen);
        return;
      }

      // Esc — close palette / shortcuts / detail
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (detail) opts.onCloseDetail();
        return;
      }

      // [ — toggle sidebar
      if (e.key === "[") {
        e.preventDefault();
        opts.onToggleSidebar();
        return;
      }

      // g <letter> — go to section
      if (e.key === "g") {
        if (pendingG.current) window.clearTimeout(pendingG.current);
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, 800);
        return;
      }
      if (pendingG.current) {
        const id = SECTION_BY_KEY.get(e.key);
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (id) {
          e.preventDefault();
          navigate(`/admin/control/${id}`);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (pendingG.current) window.clearTimeout(pendingG.current);
    };
  }, [navigate, setPaletteOpen, setShortcutsOpen, paletteOpen, shortcutsOpen, detail, opts]);
}
