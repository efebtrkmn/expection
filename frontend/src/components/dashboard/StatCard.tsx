"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "danger" | "success" | "warning";
  delay?: number;
}

const variantStyles = {
  default: {
    iconBg: "bg-brand-500/15",
    iconColor: "text-brand-400",
    valueBorder: "border-brand-500/10",
  },
  danger: {
    iconBg: "bg-danger-500/15",
    iconColor: "text-red-400",
    valueBorder: "border-danger-500/10",
  },
  success: {
    iconBg: "bg-success-500/15",
    iconColor: "text-green-400",
    valueBorder: "border-success-500/10",
  },
  warning: {
    iconBg: "bg-warning-500/15",
    iconColor: "text-amber-400",
    valueBorder: "border-warning-500/10",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            styles.iconBg,
          )}
        >
          <Icon size={20} className={styles.iconColor} />
        </div>
      </div>

      <div>
        <p className="text-2xl font-semibold text-white tracking-tight">
          {value}
        </p>
        {trend && (
          <p className="text-xs text-zinc-500 mt-1">{trend}</p>
        )}
      </div>
    </motion.div>
  );
}
