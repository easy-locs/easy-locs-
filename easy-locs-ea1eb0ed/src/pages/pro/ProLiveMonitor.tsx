import { useState, useEffect } from 'react';
import { Activity, Cpu, AlertTriangle, CheckCircle2, XCircle, Clock, Zap, RefreshCw, Server, Database } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(226 24% 11%)';
const NAVY_LIGHT = 'hsl(0 0% 100% / 0.06)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))';

interface Engine {
  name: string;
  status: 'alive' | 'slow' | 'dead';
  lastPing: string;
  execPerMin: number;
  avgMs: number;
}

const ENGINES: Engine[] = [
  { name: 'Trust Score Engine', status: 'alive', lastPing: '2s ago', execPerMin: 12, avgMs: 45 },
  { name: 'Anti-Fake Engine', status: 'alive', lastPing: '5s ago', execPerMin: 8, avgMs: 120 },
  { name: 'Ranking Engine', status: 'alive', lastPing: '3s ago', execPerMin: 24, avgMs: 32 },
  { name: 'Behavior Engine', status: 'alive', lastPing: '1s ago', execPerMin: 45, avgMs: 18 },
  { name: 'Visibility Engine', status: 'slow', lastPing: '28s ago', execPerMin: 2, avgMs: 890 },
  { name: 'Quality Score Engine', status: 'alive', lastPing: '4s ago', execPerMin: 6, avgMs: 210 },
  { name: 'Proof Log Engine', status: 'alive', lastPing: '2s ago', execPerMin: 32, avgMs: 12 },
  { name: 'Onboarding Engine', status: 'alive', lastPing: '7s ago', execPerMin: 3, avgMs: 156 },
  { name: 'Media Validation', status: 'alive', lastPing: '6s ago', execPerMin: 5, avgMs: 340 },
  { name: 'Task Execution', status: 'alive', lastPing: '4s ago', execPerMin: 15, avgMs: 67 },
  { name: 'Sentinel Core', status: 'alive', lastPing: '1s ago', execPerMin: 25, avgMs: 28 },
  { name: 'Omega Core', status: 'alive', lastPing: '3s ago', execPerMin: 10, avgMs: 89 },
];

interface ActivityEntry {
  engine: string;
  action: string;
  entity: string;
  status: 'success' | 'fail';
  time: string;
  duration: string;
}

const ACTIVITY: ActivityEntry[] = [
  { engine: 'Trust Score', action: 'recompute', entity: 'biz_123', status: 'success', time: '2s ago', duration: '45ms' },
  { engine: 'Anti-Fake', action: 'scan', entity: 'biz_456', status: 'success', time: '5s ago', duration: '120ms' },
  { engine: 'Ranking', action: 'recalculate', entity: 'batch_12', status: 'success', time: '8s ago', duration: '32ms' },
  { engine: 'Behavior', action: 'track_click', entity: 'user_789', status: 'success', time: '10s ago', duration: '18ms' },
  { engine: 'Visibility', action: 'update', entity: 'biz_321', status: 'fail', time: '28s ago', duration: '890ms' },
  { engine: 'Proof Log', action: 'log_trust_change', entity: 'biz_123', status: 'success', time: '12s ago', duration: '12ms' },
];

const statusColors = { alive: '#22c55e', slow: '#f59e0b', dead: '#ef4444' };
const statusIcons = { alive: CheckCircle2, slow: Clock, dead: XCircle };

export default function ProLiveMonitor() {
  useUiEngine("pro-prolivemonitor");
  const [refreshKey, setRefreshKey] = useState(0);

  const alive = ENGINES.filter(e => e.status === 'alive').length;
  const slow = ENGINES.filter(e => e.status === 'slow').length;
  const dead = ENGINES.filter(e => e.status === 'dead').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>System Live Monitor</h1>
          <p style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 14, margin: '4px 0 0' }}>Real-time engine activity and health status</p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}` }}>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{ENGINES.length}</div>
          <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12 }}>Total Engines</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}` }}>
          <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{alive}</div>
          <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12 }}>Active</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}` }}>
          <div style={{ color: '#f59e0b', fontSize: 20, fontWeight: 700 }}>{slow}</div>
          <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12 }}>Warnings</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}` }}>
          <div style={{ color: '#ef4444', fontSize: 20, fontWeight: 700 }}>{dead}</div>
          <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12 }}>Dead</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}` }}>
          <div style={{ color: GOLD, fontSize: 20, fontWeight: 700 }}>0.2%</div>
          <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12 }}>Error Rate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Engine Grid</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ENGINES.map(engine => {
              const Icon = statusIcons[engine.status];
              return (
                <div key={engine.name} style={{ background: CARD_BG, borderRadius: 10, padding: '12px 14px', border: `1px solid ${NAVY_LIGHT}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} color={statusColors[engine.status]} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{engine.name}</div>
                    <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 10 }}>{engine.execPerMin}/min — {engine.avgMs}ms avg</div>
                  </div>
                  <span style={{ color: 'hsl(0 0% 100% / 0.35)', fontSize: 10, flexShrink: 0 }}>{engine.lastPing}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Live Activity Stream</h2>
          <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
            {ACTIVITY.map((entry, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: `1px solid ${NAVY_LIGHT}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.status === 'success' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600 }}>{entry.engine}</span>
                  <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11 }}> {entry.action} </span>
                  <span style={{ color: 'hsl(0 0% 100% / 0.5)', fontSize: 11 }}>{entry.entity}</span>
                </div>
                <span style={{ color: 'hsl(0 0% 100% / 0.35)', fontSize: 10, flexShrink: 0 }}>{entry.duration}</span>
                <span style={{ color: 'hsl(0 0% 100% / 0.3)', fontSize: 10, flexShrink: 0 }}>{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Cron Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>25</div>
              <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11 }}>Active Jobs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#f59e0b', fontSize: 20, fontWeight: 700 }}>0</div>
              <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11 }}>Delayed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'hsl(0 0% 100% / 0.35)', fontSize: 20, fontWeight: 700 }}>0</div>
              <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11 }}>Collisions</div>
            </div>
          </div>
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Error Panel</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#ef444410', borderRadius: 8, border: '1px solid #ef444430' }}>
            <AlertTriangle size={16} color="#ef4444" />
            <div>
              <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>Visibility Engine — Slow Response</div>
              <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11 }}>890ms avg (threshold: 500ms) — 28s ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
