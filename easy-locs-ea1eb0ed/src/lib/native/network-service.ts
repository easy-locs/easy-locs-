export type ConnectionType = "wifi" | "cellular" | "none" | "unknown";

export interface NetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
}

type NetworkCallback = (status: NetworkStatus) => void;

let networkCallbacks: NetworkCallback[] = [];
let currentStatus: NetworkStatus = {
  connected: navigator.onLine,
  connectionType: "unknown",
};

export async function initNetworkMonitoring(): Promise<NetworkStatus> {
  try {
    const { Network } = await import("@capacitor/network");

    const status = await Network.getStatus();
    currentStatus = {
      connected: status.connected,
      connectionType: mapConnectionType(status.connectionType),
    };

    Network.addListener("networkStatusChange", (status) => {
      currentStatus = {
        connected: status.connected,
        connectionType: mapConnectionType(status.connectionType),
      };
      notifyCallbacks();
    });

    return currentStatus;
  } catch {
    return initWebNetworkMonitoring();
  }
}

function initWebNetworkMonitoring(): NetworkStatus {
  const updateStatus = () => {
    const nav = navigator as Navigator & { connection?: { type?: string; effectiveType?: string } };
    currentStatus = {
      connected: navigator.onLine,
      connectionType: detectWebConnectionType(nav.connection),
    };
    notifyCallbacks();
  };

  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);

  const nav = navigator as Navigator & { connection?: { addEventListener?: (type: string, listener: () => void) => void; type?: string; effectiveType?: string } };
  if (nav.connection?.addEventListener) {
    nav.connection.addEventListener("change", updateStatus);
  }

  return {
    connected: navigator.onLine,
    connectionType: detectWebConnectionType(nav.connection),
  };
}

function mapConnectionType(type: string): ConnectionType {
  switch (type) {
    case "wifi": return "wifi";
    case "cellular": return "cellular";
    case "none": return "none";
    default: return "unknown";
  }
}

function detectWebConnectionType(connection?: { type?: string; effectiveType?: string }): ConnectionType {
  if (!connection) return "unknown";
  if (connection.type === "wifi") return "wifi";
  if (connection.type === "cellular") return "cellular";
  if (connection.type === "none") return "none";
  if (connection.effectiveType) return connection.effectiveType === "4g" || connection.effectiveType === "3g" ? "cellular" : "unknown";
  return "unknown";
}

function notifyCallbacks(): void {
  networkCallbacks.forEach((cb) => cb(currentStatus));
}

export function onNetworkChange(callback: NetworkCallback): () => void {
  networkCallbacks.push(callback);
  return () => {
    networkCallbacks = networkCallbacks.filter((cb) => cb !== callback);
  };
}

export function getNetworkStatus(): NetworkStatus {
  return { ...currentStatus };
}

export function isOnline(): boolean {
  return currentStatus.connected;
}

export function isWifi(): boolean {
  return currentStatus.connectionType === "wifi";
}

export function isCellular(): boolean {
  return currentStatus.connectionType === "cellular";
}
