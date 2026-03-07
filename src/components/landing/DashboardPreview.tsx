import { motion } from "framer-motion";
import { BarChart3, Home, Users, FileText, CreditCard, CalendarRange, Bell, Globe } from "lucide-react";

const mockStats = [
  { label: "Properties", value: "24", icon: Home, color: "text-accent" },
  { label: "Tenants", value: "31", icon: Users, color: "text-info" },
  { label: "Revenue", value: "€18,420", icon: BarChart3, color: "text-success" },
  { label: "Documents", value: "142", icon: FileText, color: "text-warning" },
];

const mockActivities = [
  { text: "Rent payment received — Jean D. — €950", time: "2 min ago", type: "payment" },
  { text: "New booking request — Villa Palma — Jun 14–21", time: "18 min ago", type: "booking" },
  { text: "Lease renewal reminder — Apt. Roma 3B", time: "1h ago", type: "alert" },
  { text: "Document signed — Bail meublé — Sophie M.", time: "3h ago", type: "doc" },
];

const DashboardPreview = () => {
  return (
    <section id="demo" className="py-20 sm:py-28 bg-background">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            A Powerful <span className="text-gradient-gold">Dashboard</span> at Your Fingertips
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Monitor properties, tenants, payments, bookings and documents from a single interface — optimized for speed and clarity.
          </p>
        </motion.div>

        {/* Fake dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-border/60 bg-card shadow-card-hover overflow-hidden"
        >
          {/* Top bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-muted/30">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-muted rounded-md px-16 py-1 text-xs text-muted-foreground font-mono">app.easy-locs.com/dashboard</div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {mockStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="bg-muted/40 rounded-xl p-4 border border-border/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Two columns: chart placeholder + activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Chart placeholder */}
              <div className="bg-muted/30 rounded-xl border border-border/30 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Monthly Revenue</span>
                </div>
                <div className="flex items-end gap-2 h-32">
                  {[40, 65, 55, 80, 70, 95, 85, 100, 90, 78, 88, 92].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.4 }}
                      className="flex-1 rounded-t-sm bg-accent/60"
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>Jan</span><span>Jun</span><span>Dec</span>
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-muted/30 rounded-xl border border-border/30 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4 text-info" />
                  <span className="text-sm font-semibold text-foreground">Recent Activity</span>
                </div>
                <div className="space-y-3">
                  {mockActivities.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug truncate">{a.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick access modules */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
              {[
                { icon: Home, label: "Properties" },
                { icon: Users, label: "Tenants" },
                { icon: CalendarRange, label: "Bookings" },
                { icon: CreditCard, label: "Payments" },
                { icon: FileText, label: "Documents" },
                { icon: Globe, label: "Countries" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1.5 bg-muted/40 rounded-lg p-3 border border-border/20">
                  <m.icon className="h-4 w-4 text-accent" />
                  <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
