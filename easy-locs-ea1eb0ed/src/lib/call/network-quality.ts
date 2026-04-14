export interface NetworkQualityMetrics {
  rtt: number;
  jitter: number;
  packetLossPercent: number;
  bitrate: number;
  qualityScore: number;
  qualityLabel: "excellent" | "good" | "fair" | "poor" | "critical";
  usingRelay: boolean;
  candidateType: string;
  timestamp: number;
}

const QUALITY_THRESHOLDS = {
  excellent: { rtt: 100, jitter: 20, packetLoss: 1 },
  good: { rtt: 200, jitter: 40, packetLoss: 3 },
  fair: { rtt: 400, jitter: 80, packetLoss: 8 },
  poor: { rtt: 800, jitter: 150, packetLoss: 15 },
};

export function computeQualityLabel(
  rtt: number,
  jitter: number,
  packetLoss: number
): NetworkQualityMetrics["qualityLabel"] {
  if (
    rtt <= QUALITY_THRESHOLDS.excellent.rtt &&
    jitter <= QUALITY_THRESHOLDS.excellent.jitter &&
    packetLoss <= QUALITY_THRESHOLDS.excellent.packetLoss
  )
    return "excellent";
  if (
    rtt <= QUALITY_THRESHOLDS.good.rtt &&
    jitter <= QUALITY_THRESHOLDS.good.jitter &&
    packetLoss <= QUALITY_THRESHOLDS.good.packetLoss
  )
    return "good";
  if (
    rtt <= QUALITY_THRESHOLDS.fair.rtt &&
    jitter <= QUALITY_THRESHOLDS.fair.jitter &&
    packetLoss <= QUALITY_THRESHOLDS.fair.packetLoss
  )
    return "fair";
  if (
    rtt <= QUALITY_THRESHOLDS.poor.rtt &&
    jitter <= QUALITY_THRESHOLDS.poor.jitter &&
    packetLoss <= QUALITY_THRESHOLDS.poor.packetLoss
  )
    return "poor";
  return "critical";
}

export function computeQualityScore(
  rtt: number,
  jitter: number,
  packetLoss: number
): number {
  const rttScore = Math.max(0, 100 - rtt / 8);
  const jitterScore = Math.max(0, 100 - jitter / 1.5);
  const lossScore = Math.max(0, 100 - packetLoss * 5);
  return Math.round(rttScore * 0.4 + jitterScore * 0.3 + lossScore * 0.3);
}

export class NetworkQualityMonitor {
  private pc: RTCPeerConnection | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private prevStats: Map<string, { bytesSent: number; bytesReceived: number; timestamp: number; packetsLost: number; packetsReceived: number }> = new Map();
  private _lastMetrics: NetworkQualityMetrics | null = null;
  private _onMetrics: ((m: NetworkQualityMetrics) => void) | null = null;

  get lastMetrics() {
    return this._lastMetrics;
  }

  start(pc: RTCPeerConnection, onMetrics?: (m: NetworkQualityMetrics) => void) {
    this.stop();
    this.pc = pc;
    this._onMetrics = onMetrics || null;
    this.interval = setInterval(() => void this.collect(), 3000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.pc = null;
    this.prevStats.clear();
    this._lastMetrics = null;
    this._onMetrics = null;
  }

  private async collect() {
    if (!this.pc) return;

    try {
      const stats = await this.pc.getStats();
      let rtt = 0;
      let jitter = 0;
      let packetLoss = 0;
      let bitrate = 0;
      let usingRelay = false;
      let candidateType = "unknown";

      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;

          const localCandidate = stats.get(report.localCandidateId);
          if (localCandidate) {
            candidateType = localCandidate.candidateType || "unknown";
            usingRelay = candidateType === "relay";
          }

          const prevEntry = this.prevStats.get("pair");
          const nowBytes = (report.bytesSent || 0) + (report.bytesReceived || 0);
          const nowTs = report.timestamp;

          if (prevEntry) {
            const deltaBytes = nowBytes - prevEntry.bytesSent;
            const deltaTime = (nowTs - prevEntry.timestamp) / 1000;
            if (deltaTime > 0) {
              bitrate = Math.round((deltaBytes * 8) / deltaTime / 1000);
            }
          }

          this.prevStats.set("pair", {
            bytesSent: nowBytes,
            bytesReceived: 0,
            timestamp: nowTs,
            packetsLost: 0,
            packetsReceived: 0,
          });
        }

        if (report.type === "inbound-rtp" && report.kind === "audio") {
          jitter = (report.jitter || 0) * 1000;
          const totalPackets = (report.packetsReceived || 0) + (report.packetsLost || 0);
          if (totalPackets > 0) {
            packetLoss = ((report.packetsLost || 0) / totalPackets) * 100;
          }
        }
      });

      const qualityLabel = computeQualityLabel(rtt, jitter, packetLoss);
      const qualityScore = computeQualityScore(rtt, jitter, packetLoss);

      this._lastMetrics = {
        rtt: Math.round(rtt),
        jitter: Math.round(jitter * 10) / 10,
        packetLossPercent: Math.round(packetLoss * 100) / 100,
        bitrate,
        qualityScore,
        qualityLabel,
        usingRelay,
        candidateType,
        timestamp: Date.now(),
      };

      this._onMetrics?.(this._lastMetrics);
    } catch {
      // stats collection failure is non-fatal
    }
  }
}
