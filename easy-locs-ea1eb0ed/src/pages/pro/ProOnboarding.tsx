import { useState } from 'react';
import {
import { useUiEngine } from "@/hooks/useUiEngine";
  Building2, MapPin, Image, Tags, Package, DollarSign,
  Calendar, FileText, Phone, Clock, Users, Shield,
  Eye, Rocket, Check, AlertCircle, ChevronRight
} from 'lucide-react';

const NAVY = 'hsl(225 22% 16%)';
const NAVY_LIGHT = 'hsl(225 22% 22%)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'hsl(225 22% 18%)';

interface Step {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
  status: 'completed' | 'current' | 'pending' | 'blocked';
}

const STEPS: Step[] = [
  { key: 'identity', label: 'Business Identity', description: 'Name, type, and legal information', icon: Building2, required: true, status: 'completed' },
  { key: 'location', label: 'Location', description: 'Address, city, country, and GPS', icon: MapPin, required: true, status: 'completed' },
  { key: 'category', label: 'Category', description: 'Business category and taxonomy', icon: Tags, required: true, status: 'completed' },
  { key: 'contact', label: 'Contact Details', description: 'Phone, email, and messaging', icon: Phone, required: false, status: 'current' },
  { key: 'hours', label: 'Opening Hours', description: 'Schedule and time zone', icon: Clock, required: false, status: 'pending' },
  { key: 'media', label: 'Media Upload', description: 'Logo, cover, and gallery photos', icon: Image, required: false, status: 'pending' },
  { key: 'catalog', label: 'Catalog / Services', description: 'Products, menus, rooms, or services', icon: Package, required: true, status: 'pending' },
  { key: 'pricing', label: 'Pricing', description: 'Base prices, fees, and rules', icon: DollarSign, required: true, status: 'pending' },
  { key: 'availability', label: 'Availability', description: 'Calendar, slots, and capacity', icon: Calendar, required: true, status: 'pending' },
  { key: 'policies', label: 'Policies', description: 'Cancellation, refund, and terms', icon: FileText, required: false, status: 'pending' },
  { key: 'team', label: 'Team & Operations', description: 'Staff, roles, and assignments', icon: Users, required: false, status: 'pending' },
  { key: 'verification', label: 'Verification', description: 'ID and business documents', icon: Shield, required: false, status: 'pending' },
  { key: 'review', label: 'Final Review', description: 'Review everything before launch', icon: Eye, required: false, status: 'pending' },
  { key: 'go_live', label: 'Go Live', description: 'Publish your business', icon: Rocket, required: false, status: 'pending' },
];

export default function ProOnboarding() {
  useUiEngine("pro-proonboarding");
  const [activeStep, setActiveStep] = useState(3);

  const completed = STEPS.filter(s => s.status === 'completed').length;
  const progress = Math.round((completed / STEPS.length) * 100);

  const statusColors = {
    completed: '#22c55e',
    current: GOLD,
    pending: 'hsl(220 20% 45%)',
    blocked: '#ef4444',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Business Setup</h1>
        <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>
          Complete each step to launch your business on Easy-Locs
        </p>
      </div>

      <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>{completed}/{STEPS.length} steps</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: NAVY_LIGHT, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, hsl(168 62% 52%))`, borderRadius: 5, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <span style={{ color: '#22c55e', fontSize: 12 }}>{completed} completed</span>
          <span style={{ color: GOLD, fontSize: 12 }}>1 in progress</span>
          <span style={{ color: 'hsl(220 20% 45%)', fontSize: 12 }}>{STEPS.length - completed - 1} remaining</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: isActive ? NAVY_LIGHT : 'transparent',
                  border: isActive ? `1px solid ${GOLD}40` : '1px solid transparent',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: step.status === 'completed' ? '#22c55e20' : `${statusColors[step.status]}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {step.status === 'completed' ? (
                    <Check size={16} color="#22c55e" />
                  ) : (
                    <Icon size={16} color={statusColors[step.status]} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isActive ? '#fff' : 'hsl(220 20% 70%)', fontSize: 13, fontWeight: isActive ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {step.label}
                    {step.required && <span style={{ color: '#ef4444', fontSize: 10 }}>*</span>}
                  </div>
                </div>
                {isActive && <ChevronRight size={14} color="hsl(220 20% 55%)" />}
              </button>
            );
          })}
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 28, border: `1px solid ${NAVY_LIGHT}` }}>
          {(() => {
            const step = STEPS[activeStep];
            const Icon = step.icon;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={GOLD} />
                  </div>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{step.label}</h2>
                    <p style={{ color: 'hsl(220 20% 55%)', fontSize: 13, margin: '2px 0 0' }}>{step.description}</p>
                  </div>
                  {step.required && (
                    <span style={{ marginLeft: 'auto', background: '#ef444420', color: '#ef4444', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>
                      Required
                    </span>
                  )}
                </div>

                {step.status === 'completed' ? (
                  <div style={{ background: '#22c55e10', border: '1px solid #22c55e30', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Check size={18} color="#22c55e" />
                    <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>This step is completed</span>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: NAVY_LIGHT, borderRadius: 10, padding: 16, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GOLD, fontSize: 13, marginBottom: 8 }}>
                        <AlertCircle size={14} />
                        Complete this step to continue
                      </div>
                      <p style={{ color: 'hsl(220 20% 65%)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                        Fill in all required fields for this step. Your progress is saved automatically.
                        {step.required && ' This step must be completed before your business can go live.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                      <button
                        style={{
                          padding: '10px 24px',
                          background: GOLD,
                          color: NAVY,
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Save & Continue
                      </button>
                      <button
                        style={{
                          padding: '10px 24px',
                          background: 'transparent',
                          color: 'hsl(220 20% 65%)',
                          border: `1px solid ${NAVY_LIGHT}`,
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Skip for Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
