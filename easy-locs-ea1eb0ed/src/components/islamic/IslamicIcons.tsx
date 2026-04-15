import { type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function iconBase(props: IconProps) {
  const { size = 24, ...rest } = props;
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...rest };
}

export function MosqueIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 2C8.5 2 5.5 5 5.5 8.5V12H4v2h1v6h2v-6h2v6h2v-6h2v6h2v-6h2v6h2v-6h1v-2h-1.5V8.5C18.5 5 15.5 2 12 2z" />
      <circle cx="12" cy="7" r="2" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function KaabaIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <rect x="5" y="5" width="14" height="14" rx="1" />
      <path d="M5 12h14" />
      <path d="M9 5v14" />
      <path d="M15 5v14" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function PrayerBeadsIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="7" cy="6" r="1.5" />
      <circle cx="4" cy="11" r="1.5" />
      <circle cx="5" cy="17" r="1.5" />
      <circle cx="10" cy="20" r="1.5" />
      <circle cx="14" cy="20" r="1.5" />
      <circle cx="19" cy="17" r="1.5" />
      <circle cx="20" cy="11" r="1.5" />
      <circle cx="17" cy="6" r="1.5" />
      <path d="M12 4L7 6L4 11L5 17L10 20" />
      <path d="M12 4L17 6L20 11L19 17L14 20" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <circle cx="12" cy="23.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function QuranBookIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M12 7v8" />
      <path d="M8 11c1.5-2 2.5-2.5 4-2.5s2.5.5 4 2.5" />
      <path d="M9 7c0 0 1.5 1 3 1s3-1 3-1" />
    </svg>
  );
}

export function CrescentStarIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 3a7 7 0 0 0 0 14 7 7 0 0 1 0-14z" />
      <path d="M18 9l.7 1.5 1.6.2-1.2 1.1.3 1.6L18 13l-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="currentColor" />
    </svg>
  );
}

export function QiblaCompassIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <polygon points="12,6 14,14 12,12 10,14" fill="currentColor" />
    </svg>
  );
}

export function DuaHandsIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M7 20c0-3 1-5 3-7 1-1 2-2 2-4V5a1 1 0 0 1 2 0v4c0 2 1 3 2 4 2 2 3 4 3 7" />
      <path d="M7 20h10" />
      <path d="M9 9V5a1 1 0 0 1 2 0" />
      <path d="M13 9V5a1 1 0 0 1 2 0" />
    </svg>
  );
}

export function ZakatIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="10" r="7" />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
      <path d="M8 19h8" />
      <path d="M10 19v2" />
      <path d="M14 19v2" />
    </svg>
  );
}

export function HijriCalendarIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M14 14a2 2 0 1 0-4 0 2 2 0 1 1-2 2" />
    </svg>
  );
}

export function TasbihCounterIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
