import { motion } from "framer-motion";

interface PageLoaderProps {
  dark?: boolean;
}

export default function PageLoader({ dark }: PageLoaderProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
        dark ? "bg-[#0D1117]" : "bg-background"
      }`}
    >
      <motion.div
        className="w-[80px] h-[2px] rounded-full overflow-hidden"
        style={{ background: "rgba(26,174,142,0.12)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #1AAE8E, #14d4a6)",
            transformOrigin: "left",
            willChange: "transform",
          }}
          animate={{
            x: ["-70%", "-10%", "70%"],
            scaleX: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
