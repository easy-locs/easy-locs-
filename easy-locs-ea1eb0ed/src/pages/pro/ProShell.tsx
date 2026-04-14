import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
import { useUiEngine } from "@/hooks/useUiEngine";
  LayoutDashboard, User, Image, Package, Calendar, DollarSign,
  ShoppingBag, MessageSquare, Star, Wallet, Users, BarChart3,
  Settings, Shield, Activity, ChevronLeft, ChevronRight, Bell,
  Search, Plus, Building2, CheckCircle2, AlertTriangle
} from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const NAVY_DARK = 'hsl(220 45% 12%)';
const GOLD = 'hsl(38 65% 56%)';
const GOLD_DIM = 'hsl(38 45% 42%)';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/pro', icon: LayoutDashboard },
  { label: 'Onboarding', path: '/pro/onboarding', icon: CheckCircle2 },
  { label: 'Profile', path: '/pro/profile', icon: User },
  { label: 'Media Studio', path: '/pro/media', icon: Image },
  { label: 'Catalog', path: '/pro/catalog', icon: Package },
  { label: 'Availability', path: '/pro/availability', icon: Calendar },
  { label: 'Pricing', path: '/pro/pricing', icon: DollarSign },
  { label: 'Orders', path: '/pro/orders', icon: ShoppingBag },
  { label: 'Inbox', path: '/pro/inbox', icon: MessageSquare },
  { label: 'Reviews', path: '/pro/reviews', icon: Star },
  { label: 'Wallet', path: '/pro/wallet', icon: Wallet },
  { label: 'Team', path: '/pro/team', icon: Users },
  { label: 'Analytics', path: '/pro/analytics', icon: BarChart3 },
  { label: 'Live Monitor', path: '/pro/monitor', icon: Activity },
  { label: 'Settings', path: '/pro/settings', icon: Settings },
  { label: 'Compliance', path: '/pro/compliance', icon: Shield },
];

export default function ProShell() {
  useUiEngine("pro-proshell");
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/pro') return location.pathname === '/pro';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: NAVY_DARK }}>
      <aside
        style={{
          width: collapsed ? 64 : 240,
          background: NAVY,
          borderRight: `1px solid ${NAVY_LIGHT}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            padding: collapsed ? '16px 12px' : '20px 16px',
            borderBottom: `1px solid ${NAVY_LIGHT}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: GOLD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={18} color={NAVY} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>Easy-Locs Pro</div>
              <div style={{ color: GOLD_DIM, fontSize: 11, whiteSpace: 'nowrap' }}>Business Console</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: collapsed ? '10px 20px' : '10px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? NAVY_LIGHT : 'transparent',
                  borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
                  color: active ? '#fff' : 'hsl(220 20% 65%)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: GOLD,
                      color: NAVY,
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 10,
                      padding: '1px 6px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: 12,
            border: 'none',
            borderTop: `1px solid ${NAVY_LIGHT}`,
            background: 'transparent',
            color: 'hsl(220 20% 55%)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <div style={{ flex: 1, marginLeft: collapsed ? 64 : 240, transition: 'margin-left 0.2s ease' }}>
        <header
          style={{
            height: 56,
            background: NAVY,
            borderBottom: `1px solid ${NAVY_LIGHT}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="hsl(220 20% 55%)" style={{ position: 'absolute', left: 10, top: 8 }} />
              <input
                placeholder="Search..."
                style={{
                  background: NAVY_LIGHT,
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px 8px 34px',
                  color: '#fff',
                  fontSize: 13,
                  width: 260,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => navigate('/pro/onboarding')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: GOLD,
                color: NAVY,
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Quick Create
            </button>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'hsl(220 20% 65%)',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Bell size={18} />
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />
            </button>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: NAVY_LIGHT,
                border: `2px solid ${GOLD_DIM}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              P
            </div>
          </div>
        </header>

        <main style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
