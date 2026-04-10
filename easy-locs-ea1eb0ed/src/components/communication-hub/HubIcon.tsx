/**
 * HubIcon — Premium communication hub icon.
 * Combines a message bubble with a central pulse node.
 * Used as quick access in topbar (desktop) and floating button (mobile).
 */
import { SVGProps } from "react";

export default function HubIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Message bubble silhouette */}
      <path
        d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2h-5l-3 3-3-3H4a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Central node — smart pulse dot */}
      <circle cx="12" cy="11" r="2.2" fill="currentColor" opacity="0.9" />
      {/* Pulse ring — live activity indicator */}
      <circle cx="12" cy="11" r="4" stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}
