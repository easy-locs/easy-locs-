/**
 * Admin Domain — Port interfaces (hexagonal architecture).
 */
import type { DomainResult } from "../shared/types";

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAlert {
  id: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
}

export interface AdminUseCases {
  getAuditLog(filters: AuditFilters): Promise<DomainResult<AuditEntry[]>>;
  getAlerts(status?: string): Promise<DomainResult<AdminAlert[]>>;
  acknowledgeAlert(alertId: string): Promise<DomainResult<void>>;
  resolveAlert(alertId: string): Promise<DomainResult<void>>;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AuditRepository {
  findAll(filters: AuditFilters): Promise<AuditEntry[]>;
  append(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void>;
}

export interface AlertRepository {
  findByStatus(status?: string): Promise<AdminAlert[]>;
  updateStatus(id: string, status: AdminAlert["status"]): Promise<void>;
}

export interface AdminEventPort {
  alertCreated(alert: AdminAlert): void;
  alertResolved(alertId: string): void;
}
