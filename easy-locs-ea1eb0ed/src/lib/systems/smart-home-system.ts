import { platformBus } from "@/lib/shared/platform-bus";

export type DeviceCategory = "lock" | "thermostat" | "camera" | "light" | "sensor" | "alarm" | "intercom" | "meter" | "appliance";
export type DeviceStatus = "online" | "offline" | "pairing" | "error" | "firmware_update";
export type AutomationTrigger = "schedule" | "event" | "geofence" | "sensor_threshold" | "manual";

export interface SmartDevice {
  deviceId: string;
  unitId: string;
  propertyId: string;
  category: DeviceCategory;
  name: string;
  model: string;
  manufacturer: string;
  status: DeviceStatus;
  batteryLevel: number | null;
  firmwareVersion: string;
  lastSeen: number;
  capabilities: string[];
  currentState: Record<string, unknown>;
}

export interface AutomationRule {
  ruleId: string;
  propertyId: string;
  unitId: string | null;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, unknown>;
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  lastTriggeredAt: number | null;
  executionCount: number;
}

export interface AutomationAction {
  deviceId: string;
  command: string;
  parameters: Record<string, unknown>;
  delaySeconds: number;
}

export interface AutomationCondition {
  type: "time_range" | "device_state" | "occupancy" | "weather";
  config: Record<string, unknown>;
}

export interface AccessLog {
  logId: string;
  deviceId: string;
  unitId: string;
  userId: string | null;
  accessType: "key_code" | "app_unlock" | "physical_key" | "guest_code" | "emergency";
  grantedBy: string;
  timestamp: number;
  success: boolean;
}

export interface GuestAccess {
  accessId: string;
  unitId: string;
  guestUserId: string | null;
  guestName: string;
  accessCode: string;
  validFrom: number;
  validUntil: number;
  maxUses: number | null;
  currentUses: number;
  status: "active" | "expired" | "revoked";
  createdBy: string;
}

export function isDeviceHealthy(device: SmartDevice): boolean {
  if (device.status !== "online") return false;
  if (device.batteryLevel !== null && device.batteryLevel < 10) return false;
  const offlineThreshold = 3600000;
  if (Date.now() - device.lastSeen > offlineThreshold) return false;
  return true;
}

export function isAccessCodeValid(access: GuestAccess): boolean {
  if (access.status !== "active") return false;
  const now = Date.now();
  if (now < access.validFrom || now > access.validUntil) return false;
  if (access.maxUses !== null && access.currentUses >= access.maxUses) return false;
  return true;
}

export function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function evaluateAutomationConditions(conditions: AutomationCondition[], context: Record<string, unknown>): boolean {
  for (const condition of conditions) {
    switch (condition.type) {
      case "time_range": {
        const now = new Date();
        const hour = now.getHours();
        const start = (condition.config.startHour as number) ?? 0;
        const end = (condition.config.endHour as number) ?? 24;
        if (hour < start || hour >= end) return false;
        break;
      }
      case "occupancy": {
        const occupied = context.occupied as boolean | undefined;
        const requiredState = condition.config.occupied as boolean;
        if (occupied !== requiredState) return false;
        break;
      }
      default:
        break;
    }
  }
  return true;
}

export function emitDeviceStateChanged(device: SmartDevice, previousState: Record<string, unknown>): void {
  platformBus.emit("property:device_state_changed", {
    deviceId: device.deviceId,
    unitId: device.unitId,
    propertyId: device.propertyId,
    category: device.category,
    previousState,
    currentState: device.currentState,
    timestamp: Date.now(),
  }, "smart-home");
}

export function emitAccessGranted(log: AccessLog): void {
  platformBus.emit("property:access_granted", {
    deviceId: log.deviceId,
    unitId: log.unitId,
    userId: log.userId,
    accessType: log.accessType,
    timestamp: log.timestamp,
  }, "smart-home");
}

export function emitDeviceAlert(device: SmartDevice, alertType: string, details: string): void {
  platformBus.emit("notification:created", {
    recipientId: "property_owner",
    type: "device_alert",
    title: `${device.name} Alert`,
    body: details,
    route: `/me/gestion-immo/${device.propertyId}/devices`,
  }, "smart-home");
}

export function emitAutomationTriggered(rule: AutomationRule): void {
  platformBus.emit("property:automation_triggered", {
    ruleId: rule.ruleId,
    propertyId: rule.propertyId,
    ruleName: rule.name,
    trigger: rule.trigger,
    timestamp: Date.now(),
  }, "smart-home");
}
