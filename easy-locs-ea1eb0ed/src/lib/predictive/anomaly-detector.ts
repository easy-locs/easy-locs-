import { platformBus } from "@/lib/shared/platform-bus";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { recordObservabilityProof } from "@/lib/enforcement/observability";

export interface AnomalyThresholds {
  errorVelocityPerMinute: number;
  latencyP95Ms: number;
  heapPressurePercent: number;
  trendSlopeThreshold: number;
}

interface TelemetryBucket {
  timestamp: number;
  errorCount: number;
  latencies: number[];
  heapUsedBytes: number;
  heapTotalBytes: number;
}

interface DomainTelemetry {
  domain: string;
  buckets: TelemetryBucket[];
  lastAnomalyAt: number | null;
  anomalyCount: number;
  throttleActive: boolean;
  throttleUntil: number;
}

export interface AnomalyDetection {
  domain: string;
  type: "error_velocity" | "latency_drift" | "memory_pressure" | "trend_acceleration";
  severity: "warning" | "critical";
  value: number;
  threshold: number;
  trend: "rising" | "stable" | "falling";
  timestamp: number;
  predictedBreachMs: number | null;
}

export interface PredictiveMetrics {
  totalPredictions: number;
  predictionsTriggered: number;
  preemptiveThrottles: number;
  domainsMonitored: number;
  activeDomains: string[];
  throttledDomains: string[];
  recentDetections: AnomalyDetection[];
}

const WINDOW_DURATION_MS = 60_000;
const BUCKET_DURATION_MS = 5_000;
const MAX_BUCKETS = Math.ceil(WINDOW_DURATION_MS / BUCKET_DURATION_MS);
const THROTTLE_COOLDOWN_MS = 30_000;
const MAX_RECENT_DETECTIONS = 50;

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  errorVelocityPerMinute: 10,
  latencyP95Ms: 2000,
  heapPressurePercent: 85,
  trendSlopeThreshold: 0.3,
};

class PredictiveAnomalyDetector {
  private domains = new Map<string, DomainTelemetry>();
  private thresholds: AnomalyThresholds = { ...DEFAULT_THRESHOLDS };
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _installed = false;
  private _unsubs: (() => void)[] = [];
  private _totalPredictions = 0;
  private _predictionsTriggered = 0;
  private _preemptiveThrottles = 0;
  private _recentDetections: AnomalyDetection[] = [];

  configure(thresholds: Partial<AnomalyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): AnomalyThresholds {
    return { ...this.thresholds };
  }

  private getOrCreate(domain: string): DomainTelemetry {
    if (!this.domains.has(domain)) {
      this.domains.set(domain, {
        domain,
        buckets: [],
        lastAnomalyAt: null,
        anomalyCount: 0,
        throttleActive: false,
        throttleUntil: 0,
      });
    }
    return this.domains.get(domain)!;
  }

  private getCurrentBucket(telemetry: DomainTelemetry): TelemetryBucket {
    const now = Date.now();
    const bucketStart = now - (now % BUCKET_DURATION_MS);

    const last = telemetry.buckets[telemetry.buckets.length - 1];
    if (last && last.timestamp === bucketStart) {
      return last;
    }

    const bucket: TelemetryBucket = {
      timestamp: bucketStart,
      errorCount: 0,
      latencies: [],
      heapUsedBytes: 0,
      heapTotalBytes: 0,
    };

    telemetry.buckets.push(bucket);
    if (telemetry.buckets.length > MAX_BUCKETS) {
      telemetry.buckets.splice(0, telemetry.buckets.length - MAX_BUCKETS);
    }

    return bucket;
  }

  private pruneOldBuckets(telemetry: DomainTelemetry): void {
    const cutoff = Date.now() - WINDOW_DURATION_MS;
    telemetry.buckets = telemetry.buckets.filter(b => b.timestamp >= cutoff);
  }

  recordError(domain: string): void {
    const telemetry = this.getOrCreate(domain);
    const bucket = this.getCurrentBucket(telemetry);
    bucket.errorCount++;
  }

  recordLatency(domain: string, latencyMs: number): void {
    const telemetry = this.getOrCreate(domain);
    const bucket = this.getCurrentBucket(telemetry);
    bucket.latencies.push(latencyMs);
    if (bucket.latencies.length > 200) {
      bucket.latencies.splice(0, bucket.latencies.length - 200);
    }
  }

  recordHeapSnapshot(heapUsedBytes: number, heapTotalBytes: number): void {
    for (const telemetry of this.domains.values()) {
      const bucket = this.getCurrentBucket(telemetry);
      bucket.heapUsedBytes = heapUsedBytes;
      bucket.heapTotalBytes = heapTotalBytes;
    }
  }

  private computeErrorVelocity(telemetry: DomainTelemetry): number {
    this.pruneOldBuckets(telemetry);
    const totalErrors = telemetry.buckets.reduce((sum, b) => sum + b.errorCount, 0);
    const windowSeconds = Math.max(1, telemetry.buckets.length * (BUCKET_DURATION_MS / 1000));
    return (totalErrors / windowSeconds) * 60;
  }

  private computeP95Latency(telemetry: DomainTelemetry): number {
    const allLatencies: number[] = [];
    for (const b of telemetry.buckets) {
      allLatencies.push(...b.latencies);
    }
    if (allLatencies.length === 0) return 0;

    allLatencies.sort((a, b) => a - b);
    const idx = Math.floor(allLatencies.length * 0.95);
    return allLatencies[Math.min(idx, allLatencies.length - 1)];
  }

  private computeHeapPressure(telemetry: DomainTelemetry): number {
    const latest = telemetry.buckets[telemetry.buckets.length - 1];
    if (!latest || latest.heapTotalBytes === 0) return 0;
    return (latest.heapUsedBytes / latest.heapTotalBytes) * 100;
  }

  private computeTrendSlope(values: number[]): number {
    if (values.length < 3) return 0;
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return 0;
    return (n * sumXY - sumX * sumY) / denom;
  }

  private predictBreachTime(currentValue: number, threshold: number, slope: number): number | null {
    if (slope <= 0 || currentValue >= threshold) return null;
    const remaining = threshold - currentValue;
    const bucketsToBreachMs = (remaining / slope) * BUCKET_DURATION_MS;
    return bucketsToBreachMs > 0 ? Math.round(bucketsToBreachMs) : null;
  }

  analyze(domain: string): AnomalyDetection[] {
    const telemetry = this.getOrCreate(domain);
    this.pruneOldBuckets(telemetry);
    this._totalPredictions++;

    if (telemetry.buckets.length < 2) return [];

    const detections: AnomalyDetection[] = [];
    const now = Date.now();

    const errorVelocity = this.computeErrorVelocity(telemetry);
    const errorTrend = this.computeTrendSlope(telemetry.buckets.map(b => b.errorCount));
    const errorTrendDir = errorTrend > 0.1 ? "rising" : errorTrend < -0.1 ? "falling" : "stable";

    if (errorVelocity > this.thresholds.errorVelocityPerMinute * 0.7) {
      const severity = errorVelocity >= this.thresholds.errorVelocityPerMinute ? "critical" : "warning";
      detections.push({
        domain,
        type: "error_velocity",
        severity,
        value: Math.round(errorVelocity * 100) / 100,
        threshold: this.thresholds.errorVelocityPerMinute,
        trend: errorTrendDir,
        timestamp: now,
        predictedBreachMs: this.predictBreachTime(errorVelocity, this.thresholds.errorVelocityPerMinute * 1.5, errorTrend),
      });
    }

    const p95 = this.computeP95Latency(telemetry);
    const latencyValues = telemetry.buckets
      .map(b => b.latencies.length > 0 ? b.latencies.sort((a, c) => a - c)[Math.floor(b.latencies.length * 0.95)] : 0)
      .filter(v => v > 0);
    const latencyTrend = this.computeTrendSlope(latencyValues);
    const latencyTrendDir = latencyTrend > 10 ? "rising" : latencyTrend < -10 ? "falling" : "stable";

    if (p95 > this.thresholds.latencyP95Ms * 0.7) {
      const severity = p95 >= this.thresholds.latencyP95Ms ? "critical" : "warning";
      detections.push({
        domain,
        type: "latency_drift",
        severity,
        value: Math.round(p95),
        threshold: this.thresholds.latencyP95Ms,
        trend: latencyTrendDir,
        timestamp: now,
        predictedBreachMs: this.predictBreachTime(p95, this.thresholds.latencyP95Ms * 1.5, latencyTrend),
      });
    }

    const heapPressure = this.computeHeapPressure(telemetry);
    if (heapPressure > this.thresholds.heapPressurePercent * 0.8) {
      const heapValues = telemetry.buckets
        .filter(b => b.heapTotalBytes > 0)
        .map(b => (b.heapUsedBytes / b.heapTotalBytes) * 100);
      const heapTrend = this.computeTrendSlope(heapValues);
      const heapTrendDir = heapTrend > 0.5 ? "rising" : heapTrend < -0.5 ? "falling" : "stable";

      detections.push({
        domain,
        type: "memory_pressure",
        severity: heapPressure >= this.thresholds.heapPressurePercent ? "critical" : "warning",
        value: Math.round(heapPressure * 10) / 10,
        threshold: this.thresholds.heapPressurePercent,
        trend: heapTrendDir,
        timestamp: now,
        predictedBreachMs: this.predictBreachTime(heapPressure, 95, heapTrend),
      });
    }

    if (errorTrend > this.thresholds.trendSlopeThreshold && errorTrendDir === "rising") {
      detections.push({
        domain,
        type: "trend_acceleration",
        severity: errorTrend > this.thresholds.trendSlopeThreshold * 2 ? "critical" : "warning",
        value: Math.round(errorTrend * 1000) / 1000,
        threshold: this.thresholds.trendSlopeThreshold,
        trend: "rising",
        timestamp: now,
        predictedBreachMs: this.predictBreachTime(errorVelocity, this.thresholds.errorVelocityPerMinute, errorTrend),
      });
    }

    if (detections.length > 0) {
      this._predictionsTriggered++;
      telemetry.anomalyCount += detections.length;
      telemetry.lastAnomalyAt = now;

      for (const d of detections) {
        this._recentDetections.push(d);
        if (this._recentDetections.length > MAX_RECENT_DETECTIONS) {
          this._recentDetections.shift();
        }
      }

      const hasCritical = detections.some(d => d.severity === "critical");
      if (hasCritical && !telemetry.throttleActive) {
        this.activatePreemptiveThrottle(telemetry, detections);
      }
    }

    return detections;
  }

  private activatePreemptiveThrottle(telemetry: DomainTelemetry, detections: AnomalyDetection[]): void {
    const now = Date.now();
    if (now < telemetry.throttleUntil) return;

    telemetry.throttleActive = true;
    telemetry.throttleUntil = now + THROTTLE_COOLDOWN_MS;
    this._preemptiveThrottles++;

    platformBus.emit("predictive:preemptive_throttle", {
      domain: telemetry.domain,
      detections: detections.map(d => ({ type: d.type, severity: d.severity, value: d.value })),
      throttleUntil: telemetry.throttleUntil,
    }, "system");

    reportHealth(telemetry.domain, "degraded", undefined, `Predictive throttle: ${detections.map(d => d.type).join(", ")}`);

    recordObservabilityProof({
      id: `proof-predictive-${telemetry.domain}-${now}`,
      source: "predictive-anomaly-detector",
      category: "runtime_incident",
      timestamp: new Date(now).toISOString(),
      what: `Preemptive throttle activated for ${telemetry.domain}`,
      why: detections.map(d => `${d.type}: ${d.value} (threshold: ${d.threshold}, trend: ${d.trend})`).join("; "),
      where: `domain:${telemetry.domain}`,
      correction: "Domain circuit breaker notified for preemptive throttling",
      fallbackUsed: false,
      rollbackUsed: false,
      recurrenceRisk: detections.some(d => d.trend === "rising") ? "high" : "medium",
      metadata: {
        detections,
        throttleUntil: telemetry.throttleUntil,
        anomalyCount: telemetry.anomalyCount,
      },
    });

    setTimeout(() => {
      telemetry.throttleActive = false;
      platformBus.emit("predictive:throttle_lifted", {
        domain: telemetry.domain,
      }, "system");
    }, THROTTLE_COOLDOWN_MS);
  }

  analyzeAll(): AnomalyDetection[] {
    const allDetections: AnomalyDetection[] = [];
    for (const domain of this.domains.keys()) {
      allDetections.push(...this.analyze(domain));
    }

    if (typeof performance !== "undefined" && "memory" in performance) {
      const mem = (performance as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      this.recordHeapSnapshot(mem.usedJSHeapSize, mem.jsHeapSizeLimit);
    }

    return allDetections;
  }

  getMetrics(): PredictiveMetrics {
    const throttledDomains: string[] = [];
    const activeDomains: string[] = [];
    const now = Date.now();

    for (const [domain, telemetry] of this.domains) {
      if (telemetry.buckets.length > 0) activeDomains.push(domain);
      if (telemetry.throttleActive && now < telemetry.throttleUntil) throttledDomains.push(domain);
    }

    return {
      totalPredictions: this._totalPredictions,
      predictionsTriggered: this._predictionsTriggered,
      preemptiveThrottles: this._preemptiveThrottles,
      domainsMonitored: this.domains.size,
      activeDomains,
      throttledDomains,
      recentDetections: [...this._recentDetections],
    };
  }

  isThrottled(domain: string): boolean {
    const telemetry = this.domains.get(domain);
    if (!telemetry) return false;
    return telemetry.throttleActive && Date.now() < telemetry.throttleUntil;
  }

  install(): () => void {
    if (this._installed) return () => {};
    this._installed = true;

    this._unsubs.push(
      platformBus.onAll((event) => {
        const domain = event.type.includes(":") ? event.type.split(":")[0] : null;
        if (!domain) return;

        if (event.type.includes("error") || event.type.includes("fail")) {
          this.recordError(domain);
        }
      })
    );

    this._intervalId = setInterval(() => this.analyzeAll(), BUCKET_DURATION_MS);

    return () => this.uninstall();
  }

  uninstall(): void {
    this._installed = false;
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  reset(): void {
    this.uninstall();
    this.domains.clear();
    this._totalPredictions = 0;
    this._predictionsTriggered = 0;
    this._preemptiveThrottles = 0;
    this._recentDetections = [];
  }
}

export const predictiveAnomalyDetector = new PredictiveAnomalyDetector();
