import { Shield, FileText, Upload, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

interface VerificationItem {
  label: string;
  description: string;
  status: 'verified' | 'pending' | 'required' | 'rejected';
}

const VERIFICATIONS: VerificationItem[] = [
  { label: 'Phone Verification', description: 'OTP verified phone number', status: 'verified' },
  { label: 'Email Verification', description: 'Confirmed email address', status: 'verified' },
  { label: 'Business Identity', description: 'Trade license or business registration', status: 'pending' },
  { label: 'Owner Identity', description: 'Government-issued ID document', status: 'required' },
  { label: 'Address Verification', description: 'Utility bill or lease agreement', status: 'required' },
  { label: 'Payment Verification', description: 'Bank account or payment method', status: 'required' },
];

const statusConfig = {
  verified: { icon: CheckCircle2, color: '#22c55e', bg: '#22c55e15', label: 'Verified' },
  pending: { icon: Clock, color: GOLD, bg: `${GOLD}15`, label: 'Pending Review' },
  required: { icon: AlertTriangle, color: '#ef4444', bg: '#ef444415', label: 'Required' },
  rejected: { icon: XCircle, color: '#ef4444', bg: '#ef444415', label: 'Rejected' },
};

export default function ProCompliance() {
  const verified = VERIFICATIONS.filter(v => v.status === 'verified').length;
  const total = VERIFICATIONS.length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Compliance & Verification</h1>
        <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Verify your business identity and meet platform requirements</p>
      </div>

      <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Verification Progress</span>
          <span style={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>{verified}/{total}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: NAVY_LIGHT, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(verified / total) * 100}%`, background: GOLD, borderRadius: 4 }} />
        </div>
        <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginTop: 8 }}>
          Complete all verifications to unlock the verified badge and boost visibility
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {VERIFICATIONS.map(item => {
          const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          return (
            <div key={item.label} style={{ background: CARD_BG, borderRadius: 12, padding: '16px 20px', border: `1px solid ${NAVY_LIGHT}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={cfg.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginTop: 2 }}>{item.description}</div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              {(item.status === 'required' || item.status === 'rejected') && (
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: GOLD, border: 'none', borderRadius: 8, color: NAVY, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Upload size={12} /> Upload
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color={GOLD} /> Anti-Scam Protection
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Phone OTP', status: 'Active', color: '#22c55e' },
            { label: 'Identity Check', status: 'Pending', color: GOLD },
            { label: 'Payment Pattern', status: 'Monitoring', color: '#3b82f6' },
          ].map(item => (
            <div key={item.label} style={{ background: NAVY_LIGHT, borderRadius: 8, padding: 14, textAlign: 'center' }}>
              <div style={{ color: item.color, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.status}</div>
              <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
