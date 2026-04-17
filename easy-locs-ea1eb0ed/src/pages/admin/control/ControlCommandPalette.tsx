import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Keyboard } from "lucide-react";
import { CONTROL_SECTIONS } from "./sections";
import { useControlContext } from "./ControlContext";

export default function ControlCommandPalette() {
  const navigate = useNavigate();
  const { paletteOpen, setPaletteOpen, setShortcutsOpen } = useControlContext();

  const go = (path: string) => {
    setPaletteOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder="Search sections, agents, runs…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Go to section">
          {CONTROL_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <CommandItem
                key={s.id}
                value={`section ${s.id} ${s.label} ${s.description}`}
                onSelect={() => go(`/admin/control/${s.id}`)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{s.label}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">
                  {s.description}
                </span>
                {s.shortcut && <CommandShortcut>{s.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Help">
          <CommandItem
            value="shortcuts keyboard help"
            onSelect={() => {
              setPaletteOpen(false);
              setShortcutsOpen(true);
            }}
          >
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
