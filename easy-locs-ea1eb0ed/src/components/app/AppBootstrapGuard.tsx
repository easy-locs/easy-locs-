import { useMasterAppBootstrap } from "@/hooks/useMasterAppBootstrap";

export default function AppBootstrapGuard() {
  useMasterAppBootstrap();
  return null;
}
