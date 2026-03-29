"use client";

import { motion } from "framer-motion";
import { XCircle, RotateCcw, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-red-500/10 blur-[100px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-brand-500/10 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 glass-card p-10 max-w-md w-full mx-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6"
        >
          <XCircle size={40} className="text-red-400" />
        </motion.div>

        <h1 className="text-2xl font-semibold text-white mb-2">
          Ödeme Başarısız
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          Ödeme işleminiz tamamlanamadı. Lütfen tekrar deneyin veya farklı bir
          ödeme yöntemi kullanın.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/invoices"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Tekrar Dene
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass text-zinc-300 hover:text-white font-medium transition-all"
          >
            Dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
