import React from "react";

/**
 * SplashScreen — Pass-through wrapper. No blocking splash overlay.
 * The brand identity is already visible in the Hero and Navbar.
 */
export default function SplashScreen({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
