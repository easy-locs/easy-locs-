import { useState } from 'react';
import {
  Building2, MapPin, Image, Tags, Package, DollarSign,
  Calendar, FileText, Phone, Clock, Users, Shield,
  Eye, Rocket, Check, AlertCircle, ChevronRight
} from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

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

function statusIconColor(status: Step['status']): string {
  switch (status) {
    case 'completed': return 'text-green-500';
    case 'current': return 'text-accent';
    case 'blocked': return 'text-red-500';
    default: return 'text-[hsl(220,20%,45%)]';
  }
}

function statusIconBg(status: Step['status']): string {
  switch (status) {
    case 'completed': return 'bg-green-500/[0.12]';
    case 'current': return 'bg-accent/[0.08]';
    case 'blocked': return 'bg-red-500/[0.08]';
    default: return 'bg-white/[0.05]';
  }
}

export default function ProOnboarding() {
  useUiEngine("pro-proonboarding");
  const [activeStep, setActiveStep] = useState(3);

  const completed = STEPS.filter(s => s.status === 'completed').length;
  const progress = Math.round((completed / STEPS.length) * 100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-[22px] font-bold m-0">Business Setup</h1>
        <p className="text-[hsl(220,20%,55%)] text-sm mt-1 m-0">
          Complete each step to launch your business on Easy-Locs
        </p>
      </div>

      <div className="bg-[hsl(225,22%,18%)] rounded-xl p-5 border border-[hsl(225,22%,22%)] mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-white text-sm font-semibold">Overall Progress</span>
          <span className="text-accent text-sm font-bold">{completed}/{STEPS.length} steps</span>
        </div>
        <div className="h-2.5 rounded-full bg-[hsl(225,22%,22%)] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-in-out"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, hsl(var(--accent)), hsl(168 62% 52%))' }}
          />
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-green-500 text-xs">{completed} completed</span>
          <span className="text-accent text-xs">1 in progress</span>
          <span className="text-[hsl(220,20%,45%)] text-xs">{STEPS.length - completed - 1} remaining</span>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="flex flex-col gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-[10px] text-left cursor-pointer border transition-colors ${
                  isActive
                    ? 'bg-[hsl(225,22%,22%)] border-accent/25'
                    : 'bg-transparent border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${statusIconBg(step.status)}`}>
                  {step.status === 'completed' ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Icon size={16} className={statusIconColor(step.status)} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] flex items-center gap-1.5 ${isActive ? 'text-white font-semibold' : 'text-[hsl(220,20%,70%)] font-normal'}`}>
                    {step.label}
                    {step.required && <span className="text-red-500 text-[10px]">*</span>}
                  </div>
                </div>
                {isActive && <ChevronRight size={14} className="text-[hsl(220,20%,55%)]" />}
              </button>
            );
          })}
        </div>

        <div className="bg-[hsl(225,22%,18%)] rounded-xl p-7 border border-[hsl(225,22%,22%)]">
          {(() => {
            const step = STEPS[activeStep];
            const Icon = step.icon;
            return (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-accent/[0.08] flex items-center justify-center">
                    <Icon size={22} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-white text-lg font-bold m-0">{step.label}</h2>
                    <p className="text-[hsl(220,20%,55%)] text-[13px] mt-0.5 m-0">{step.description}</p>
                  </div>
                  {step.required && (
                    <span className="ml-auto bg-red-500/[0.12] text-red-500 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                      Required
                    </span>
                  )}
                </div>

                {step.status === 'completed' ? (
                  <div className="bg-green-500/[0.06] border border-green-500/[0.18] rounded-[10px] p-4 flex items-center gap-2.5">
                    <Check size={18} className="text-green-500" />
                    <span className="text-green-500 text-sm font-semibold">This step is completed</span>
                  </div>
                ) : (
                  <div>
                    <div className="bg-[hsl(225,22%,22%)] rounded-[10px] p-4 mb-4">
                      <div className="flex items-center gap-2 text-accent text-[13px] mb-2">
                        <AlertCircle size={14} />
                        Complete this step to continue
                      </div>
                      <p className="text-[hsl(220,20%,65%)] text-[13px] m-0 leading-relaxed">
                        Fill in all required fields for this step. Your progress is saved automatically.
                        {step.required && ' This step must be completed before your business can go live.'}
                      </p>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button className="px-6 py-2.5 bg-accent text-[hsl(225,22%,16%)] border-none rounded-lg text-[13px] font-semibold cursor-pointer">
                        Save & Continue
                      </button>
                      <button className="px-6 py-2.5 bg-transparent text-[hsl(220,20%,65%)] border border-[hsl(225,22%,22%)] rounded-lg text-[13px] cursor-pointer">
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
