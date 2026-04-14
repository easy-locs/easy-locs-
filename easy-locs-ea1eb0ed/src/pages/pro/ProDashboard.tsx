import { useState, useEffect } from 'react';
import {
  DollarSign, ShoppingBag, Clock, Star, Image, Calendar,
  Wallet, TrendingUp, AlertTriangle, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

interface WidgetProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  color?: string;
  onClick?: () => void;
}

function Widget({ title, value, subtitle, icon: Icon, trend, color = GOLD, onClick }: WidgetProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD_BG,
        borderRadius: 12,
        padding: 20,
        border: `1px solid ${NAVY_LIGHT}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={color} />
        </div>
        {trend && (
          <span style={{ fontSize: 12, color: trend.startsWith('+') ? '#22c55e' : '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
      </div>
      <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{value}</div>
      <div style={{ color: 'hsl(220 20% 55%)', fontSize: 13 }}>{title}</div>
      {subtitle && <div style={{ color: GOLD, fontSize: 11, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

interface ActionItem {
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  path: string;
}

function ActionCard({ item, onClick }: { item: ActionItem; onClick: () => void }) {
  const colors = { high: '#ef4444', medium: GOLD, low: '#22c55e' };
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD_BG,
        borderRadius: 10,
        padding: '14px 16px',
        borderLeft: `3px solid ${colors[item.priority]}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{item.label}</div>
        <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginTop: 2 }}>{item.description}</div>
      </div>
      <ArrowUpRight size={16} color="hsl(220 20% 55%)" />
    </div>
  );
}

export default function ProDashboard() {
  useUiEngine("pro-prodashboard");
  const navigate = useNavigate();

  const actions: ActionItem[] = [
    { label: 'Complete Profile', description: '3 fields missing for full score', priority: 'high', path: '/pro/profile' },
    { label: 'Upload Photos', description: 'Add cover & gallery for better visibility', priority: 'high', path: '/pro/media' },
    { label: 'Set Availability', description: 'Configure your operating calendar', priority: 'medium', path: '/pro/availability' },
    { label: 'Review Pricing', description: 'Ensure pricing is up to date', priority: 'low', path: '/pro/pricing' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Overview of your business performance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Widget title="Revenue Today" value="$0.00" icon={DollarSign} trend="+0%" onClick={() => navigate('/pro/analytics')} />
        <Widget title="Orders Today" value="0" icon={ShoppingBag} onClick={() => navigate('/pro/orders')} />
        <Widget title="Response Time" value="—" subtitle="No messages yet" icon={Clock} />
        <Widget title="Profile Score" value="42%" subtitle="Needs improvement" icon={CheckCircle2} color="#f59e0b" onClick={() => navigate('/pro/profile')} />
        <Widget title="Media Quality" value="—" subtitle="Upload photos" icon={Image} onClick={() => navigate('/pro/media')} />
        <Widget title="Availability" value="Not Set" icon={Calendar} color="#ef4444" onClick={() => navigate('/pro/availability')} />
        <Widget title="Pending Payouts" value="$0.00" icon={Wallet} onClick={() => navigate('/pro/wallet')} />
        <Widget title="Reviews" value="0" subtitle="No reviews yet" icon={Star} onClick={() => navigate('/pro/reviews')} />
        <Widget title="Top Items" value="—" icon={TrendingUp} onClick={() => navigate('/pro/catalog')} />
        <Widget title="Alerts" value="0" icon={AlertTriangle} color="#22c55e" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Actions Needed</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map(a => (
              <ActionCard key={a.label} item={a} onClick={() => navigate(a.path)} />
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Onboarding Progress</h2>
          <div
            style={{
              background: CARD_BG,
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${NAVY_LIGHT}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Setup Progress</span>
              <span style={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>3/14</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: NAVY_LIGHT, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '21%', background: GOLD, borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginTop: 8 }}>
              Complete all required steps to go live
            </div>
            <button
              onClick={() => navigate('/pro/onboarding')}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '10px 0',
                background: GOLD,
                color: NAVY,
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Continue Setup
            </button>
          </div>

          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>Quality Warnings</h2>
          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 13 }}>
              <AlertTriangle size={16} />
              No cover image — reduces visibility by 40%
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 13, marginTop: 8 }}>
              <AlertTriangle size={16} />
              Description too short — aim for 150+ characters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
