import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTROL_SECTIONS } from "./sections";
import { useControlContext } from "./ControlContext";

interface ShortcutRow {
  keys: string;
  label: string;
}

const GLOBAL_SHORTCUTS: ShortcutRow[] = [
  { keys: "⌘K / Ctrl+K", label: "Open command palette" },
  { keys: "?", label: "Show keyboard shortcuts" },
  { keys: "Esc", label: "Close palette / detail panel" },
  { keys: "[", label: "Toggle sidebar" },
];

export default function ControlShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useControlContext();

  const navShortcuts: ShortcutRow[] = CONTROL_SECTIONS.filter((s) => s.shortcut).map((s) => ({
    keys: s.shortcut!,
    label: `Go to ${s.label}`,
  }));

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Move around the Control Plane without leaving your keyboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ShortcutGroup title="Global" rows={GLOBAL_SHORTCUTS} />
          <ShortcutGroup title="Navigation" rows={navShortcuts} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutGroup({ title, rows }: { title: string; rows: ShortcutRow[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="divide-y divide-border/40 rounded-md border border-border/40">
        {rows.map((r) => (
          <li key={r.keys + r.label} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{r.label}</span>
            <kbd className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[11px] tracking-widest text-muted-foreground">
              {r.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </section>
  );
}
