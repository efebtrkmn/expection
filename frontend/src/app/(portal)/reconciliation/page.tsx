"use client";

import { motion } from "framer-motion";
import { Handshake, ExternalLink } from "lucide-react";

export default function ReconciliationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Mutabakat</h1>
        <p className="text-sm text-zinc-500 mt-1">
          E-Mutabakat süreçlerinizi takip edin
        </p>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-brand-500/15 flex items-center justify-center mx-auto mb-4">
          <Handshake size={32} className="text-brand-400" />
        </div>

        <h2 className="text-lg font-medium text-white mb-2">
          E-Mutabakat Sistemi
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
          İşletmeniz size e-posta ile mutabakat bağlantısı gönderdiğinde, bu
          bağlantı üzerinden bakiye ekstrenizi görüntüleyebilir ve
          onaylayabilir veya reddedebilirsiniz.
        </p>

        <div className="glass p-4 rounded-xl text-left max-w-md mx-auto">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            Nasıl Çalışır?
          </h3>
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
            <li>İşletmeniz mutabakat talebi oluşturur</li>
            <li>E-postanıza özel bir bağlantı gönderilir</li>
            <li>Bağlantıya tıklayarak bakiye ekstrenizi görüntülersiniz</li>
            <li>Bakiyeyi onaylar veya gerekçe belirterek reddedersiniz</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
}
