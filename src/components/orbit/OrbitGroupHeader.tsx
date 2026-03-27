import { Users } from "lucide-react";

type Props = {
  title: string;
  participantCount?: number;
  subtitle?: string | null;
};

export function OrbitGroupHeader({ title, participantCount, subtitle }: Props) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {participantCount ? `${participantCount} members` : ""}
          {participantCount && subtitle ? " · " : ""}
          {subtitle || ""}
        </p>
      </div>
    </div>
  );
}
