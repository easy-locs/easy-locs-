import { useState } from 'react';
import { Building2, MapPin, Globe, Phone, Mail, Clock, Eye, Save, AlertTriangle } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(225 22% 16%)';
const NAVY_LIGHT = 'hsl(225 22% 22%)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'hsl(225 22% 18%)';

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
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

function Field({ label, value, required, warning }: { label: string; value: string; required?: boolean; warning?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', color: 'hsl(220 20% 65%)', fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        defaultValue={value}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: NAVY_LIGHT,
          border: warning ? '1px solid #f59e0b50' : `1px solid transparent`,
          borderRadius: 8,
          color: '#fff',
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {warning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#f59e0b', fontSize: 11 }}>
          <AlertTriangle size={11} /> {warning}
        </div>
      )}
    </div>
  );
}

export default function ProProfile() {
  useUiEngine("pro-proprofile");
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Business Profile</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage your business information</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', border: `1px solid ${NAVY_LIGHT}`, borderRadius: 8, color: 'hsl(220 20% 65%)', fontSize: 13, cursor: 'pointer' }}>
            <Eye size={14} /> Preview
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: GOLD, border: 'none', borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>

      <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${GOLD}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 16 }}>42%</span>
        </div>
        <div>
          <div style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>Profile Completeness Score</div>
          <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12 }}>Complete all fields to improve your visibility</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <Section title="Basic Identity" icon={Building2}>
            <Field label="Business Name" value="" required />
            <Field label="Legal Name" value="" />
            <Field label="Brand Name" value="" />
            <Field label="Business Type" value="" required />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: 'hsl(220 20% 65%)', fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Short Description <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea defaultValue="" style={{ width: '100%', padding: '10px 14px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: 'hsl(220 20% 65%)', fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Full Description</label>
              <textarea defaultValue="" style={{ width: '100%', padding: '10px 14px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }} placeholder="Write a detailed description (150+ characters recommended)" />
            </div>
          </Section>

          <Section title="Contact Information" icon={Phone}>
            <Field label="Phone" value="" required warning="At least one contact method required" />
            <Field label="Email" value="" required />
            <Field label="WhatsApp" value="" />
          </Section>

          <Section title="Operating Hours" icon={Clock}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input type="checkbox" id="is247" style={{ accentColor: GOLD }} />
              <label htmlFor="is247" style={{ color: '#fff', fontSize: 13 }}>Open 24/7</label>
            </div>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ color: 'hsl(220 20% 65%)', fontSize: 13, width: 90 }}>{day}</span>
                <input type="time" defaultValue="09:00" style={{ padding: '6px 10px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13 }} />
                <span style={{ color: 'hsl(220 20% 45%)', fontSize: 12 }}>to</span>
                <input type="time" defaultValue="18:00" style={{ padding: '6px 10px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13 }} />
              </div>
            ))}
          </Section>
        </div>

        <div>
          <Section title="Location" icon={MapPin}>
            <Field label="Address Line 1" value="" required />
            <Field label="Address Line 2" value="" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City" value="" required />
              <Field label="Zone / District" value="" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Country" value="" required />
              <Field label="Postal Code" value="" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Latitude" value="" />
              <Field label="Longitude" value="" />
            </div>
            <Field label="Landmark" value="" />
          </Section>

          <Section title="Business Settings" icon={Globe}>
            <Field label="Currency" value="USD" required />
            <Field label="Timezone" value="UTC" required />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: 'hsl(220 20% 65%)', fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Languages</label>
              <input defaultValue="" placeholder="English, French, Arabic..." style={{ width: '100%', padding: '10px 14px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: 'hsl(220 20% 65%)', fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Tags</label>
              <input defaultValue="" placeholder="wifi, parking, pet-friendly..." style={{ width: '100%', padding: '10px 14px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </Section>

          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Trust Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ color: 'hsl(220 20% 65%)', fontSize: 13 }}>Verification: <span style={{ color: '#f59e0b' }}>Pending</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(220 20% 45%)' }} />
              <span style={{ color: 'hsl(220 20% 65%)', fontSize: 13 }}>Badge: <span style={{ color: 'hsl(220 20% 45%)' }}>Not Verified</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
