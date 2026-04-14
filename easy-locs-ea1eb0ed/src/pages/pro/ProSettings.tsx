import { Settings, Globe, Bell, Shield, Palette, Link, Database } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(226 24% 11%)';
const NAVY_LIGHT = 'hsl(0 0% 100% / 0.06)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))';

function SettingSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Icon size={18} color={GOLD} />
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, description, defaultChecked }: { label: string; description?: string; defaultChecked?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${NAVY_LIGHT}` }}>
      <div>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, marginTop: 2 }}>{description}</div>}
      </div>
      <input type="checkbox" defaultChecked={defaultChecked} style={{ accentColor: GOLD, width: 18, height: 18 }} />
    </div>
  );
}

export default function ProSettings() {
  useUiEngine("pro-prosettings");
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 14, margin: '4px 0 0' }}>Configure your business preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <SettingSection title="Notifications" icon={Bell}>
            <Toggle label="New Orders" description="Get notified for incoming orders" defaultChecked />
            <Toggle label="New Reviews" description="Alert when customers leave reviews" defaultChecked />
            <Toggle label="Low Availability" description="Warn when slots are running out" defaultChecked />
            <Toggle label="Payout Alerts" description="Notification on payout events" defaultChecked />
            <Toggle label="Marketing Updates" description="Platform news and tips" />
          </SettingSection>

          <SettingSection title="Integrations" icon={Link}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Orbit Messaging', 'Wallet Payouts', 'Radar Discovery', 'Analytics Dashboard'].map(int => (
                <div key={int} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: NAVY_LIGHT, borderRadius: 8 }}>
                  <span style={{ color: '#fff', fontSize: 13 }}>{int}</span>
                  <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Connected</span>
                </div>
              ))}
            </div>
          </SettingSection>
        </div>

        <div>
          <SettingSection title="Localization" icon={Globe}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: 'hsl(0 0% 100% / 0.5)', fontSize: 12 }}>Default Language</label>
              <select style={{ width: '100%', padding: '8px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, marginTop: 4, outline: 'none' }}>
                <option>English</option>
                <option>French</option>
                <option>Arabic</option>
                <option>Spanish</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: 'hsl(0 0% 100% / 0.5)', fontSize: 12 }}>Currency Display</label>
              <select style={{ width: '100%', padding: '8px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, marginTop: 4, outline: 'none' }}>
                <option>USD — US Dollar</option>
                <option>EUR — Euro</option>
                <option>GBP — British Pound</option>
                <option>AED — UAE Dirham</option>
              </select>
            </div>
          </SettingSection>

          <SettingSection title="Privacy & Security" icon={Shield}>
            <Toggle label="Two-Factor Authentication" description="Extra security for your account" />
            <Toggle label="Public Profile" description="Allow customers to view your profile" defaultChecked />
            <Toggle label="Show Phone Number" description="Display phone on public listing" defaultChecked />
            <Toggle label="Allow Direct Messages" description="Let customers message you via Orbit" defaultChecked />
          </SettingSection>

          <SettingSection title="Data & Storage" icon={Database}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ color: 'hsl(0 0% 100% / 0.5)', fontSize: 13 }}>Media Storage Used</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>24 MB / 500 MB</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: NAVY_LIGHT, overflow: 'hidden' }}>
              <div style={{ width: '5%', height: '100%', background: '#22c55e', borderRadius: 3 }} />
            </div>
          </SettingSection>
        </div>
      </div>
    </div>
  );
}
