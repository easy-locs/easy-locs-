import { motion } from "framer-motion";
import { BarChart3, Home, Users, FileText, CreditCard, CalendarRange, Bell, Globe, ArrowUpRight } from "lucide-react";

const mockStats = [
  { label: "Properties", value: "24", change: "+3", icon: Home, color: "accent" },
  { label: "Tenants", value: "31", change: "+5", icon: Users, color: "info" },
  { label: "Revenue", value: "€18,420", change: "+12%", icon: BarChart3, color: "success" },
  { label: "Documents", value: "142", change: "+18", icon: FileText, color: "warning" },
];

const mockActivities = [
  { text: "Rent payment received — Jean D. — €950", time: "2 min ago", dot: "success" },
  { text: "New booking request — Villa Palma — Jun 14–21", time: "18 min ago", dot: "info" },
  { text: "Lease renewal reminder — Apt. Roma 3B", time: "1h ago", dot: "warning" },
  { text: "Document signed — Bail meublé — Sophie M.", time: "3h ago", dot: "accent" },
];

const DashboardPreview = () => {
  return (
    <section id="demo" className="py-24 sm:py-32 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px]"
        style={{ background: 'hsl(var(--accent) / 0.03)' }}
      />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
          >
            Live Preview
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
            A Powerful <span className="text-gradient-gold">Dashboard</span> at Your Fingertips
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Monitor properties, tenants, payments, bookings and documents from a single interface.
          </p>
        </motion.div>

        {/* Dashboard mockup with futuristic frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-3xl border border-border/40 overflow-hidden relative"
          style={{
            boxShadow: '0 0 60px hsl(var(--accent) / 0.06), 0 25px 50px hsl(0 0% 0% / 0.1)',
            background: 'hsl(var(--card))',
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border/30" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-background/80 rounded-lg px-16 py-1.5 text-xs text-muted-foreground font-mono border border-border/30">
                app.easy-locs.com/dashboard
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Stats with micro-animations */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {mockStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="rounded-xl p-4 border border-border/30 relative overflow-hidden group hover:border-accent/20 transition-colors"
                  style={{ background: 'hsl(var(--muted) / 0.3)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4" style={{ color: `hsl(var(--${s.color}))` }} />
                      <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-success flex items-center gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                      {s.change}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Charts and Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border/30 p-5" style={{ background: 'hsl(var(--muted) / 0.2)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold text-foreground">Monthly Revenue</span>
                </div>
                <div className="flex items-end gap-1.5 h-36">
                  {[40, 65, 55, 80, 70, 95, 85, 100, 90, 78, 88, 92].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.04, duration: 0.5 }}
                      className="flex-1 rounded-t-md"
                      style={{
                        background: `linear-gradient(180deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.3) 100%)`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                  <span>Jan</span><span>Jun</span><span>Dec</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 p-5" style={{ background: 'hsl(var(--muted) / 0.2)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <Bell className="h-4 w-4 text-info" />
                  <span className="text-sm font-bold text-foreground">Recent Activity</span>
                </div>
                <div className="space-y-3.5">
                  {mockActivities.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: `hsl(var(--${a.dot}))`, boxShadow: `0 0 8px hsl(var(--${a.dot}) / 0.4)` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug truncate">{a.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick access with hover glow */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
              {[
                { icon: Home, label: "Properties", color: "accent" },
                { icon: Users, label: "Tenants", color: "info" },
                { icon: CalendarRange, label: "Bookings", color: "success" },
                { icon: CreditCard, label: "Payments", color: "warning" },
                { icon: FileText, label: "Documents", color: "accent" },
                { icon: Globe, label: "Countries", color: "info" },
              ].map((m) => (
                <motion.div
                  key={m.label}
                  whileHover={{ y: -3, scale: 1.05 }}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 border border-border/20 cursor-pointer transition-colors hover:border-accent/20"
                  style={{ background: 'hsl(var(--muted) / 0.3)' }}
                >
                  <m.icon className="h-4 w-4" style={{ color: `hsl(var(--${m.color}))` }} />
                  <span className="text-[10px] font-semibold text-muted-foreground">{m.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
