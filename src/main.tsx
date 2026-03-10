import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Defer non-critical init to after first paint
requestIdleCallback?.(() => {
  import("./lib/analytics").then(({ initAnalytics }) => initAnalytics());
  import("./lib/monitoring").then(({ initMonitoring }) => initMonitoring());
}) ?? setTimeout(() => {
  import("./lib/analytics").then(({ initAnalytics }) => initAnalytics());
  import("./lib/monitoring").then(({ initMonitoring }) => initMonitoring());
}, 2000);
