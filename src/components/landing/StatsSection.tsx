import { motion } from "framer-motion";

const stats = [
  { value: "10,000+", label: "Properties Managed" },
  { value: "110+", label: "Countries Supported" },
  { value: "50,000+", label: "Documents Generated" },
  { value: "€2M+", label: "Payments Processed" },
];

const StatsSection = () => {
  return (
    <section className="py-20 sm:py-24 bg-muted/30">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Trusted by <span className="text-gradient-gold">Property Professionals</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Powering property management operations across the globe.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border/50 rounded-xl p-6 text-center hover:shadow-card-hover transition-all"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-gradient-gold mb-2 tabular-nums">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
