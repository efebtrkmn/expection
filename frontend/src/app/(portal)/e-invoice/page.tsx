"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileCheck,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Eye,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const eInvoices = [
  { id: "1", invoiceNo: "FTR-2026-001", customer: "ABC Ticaret A.Ş.", total: 45000, gibStatus: "ACCEPTED", sentDate: "2026-03-25", uuid: "a1b2c3d4" },
  { id: "2", invoiceNo: "FTR-2026-002", customer: "XYZ Sanayi Ltd.", total: 87500, gibStatus: "PENDING", sentDate: "2026-03-26", uuid: "e5f6g7h8" },
  { id: "3", invoiceNo: "FTR-2026-003", customer: "DEF Hizmetler", total: 12000, gibStatus: "REJECTED", sentDate: "2026-03-27", uuid: "i9j0k1l2" },
  { id: "4", invoiceNo: "FTR-2026-004", customer: "GHI Danışmanlık", total: 25000, gibStatus: "ACCEPTED", sentDate: "2026-03-27", uuid: "m3n4o5p6" },
  { id: "5", invoiceNo: "FTR-2026-005", customer: "JKL Elektronik", total: 156000, gibStatus: "SENT", sentDate: "2026-03-28", uuid: "q7r8s9t0" },
];

function gibStatusBadge(status: string) {
  switch (status) {
    case "ACCEPTED": return { label: "Kabul Edildi", color: "text-green-400 bg-green-500/10", icon: CheckCircle };
    case "PENDING": return { label: "Beklemede", color: "text-amber-400 bg-amber-500/10", icon: Clock };
    case "REJECTED": return { label: "Reddedildi", color: "text-red-400 bg-red-500/10", icon: XCircle };
    case "SENT": return { label: "Gönderildi", color: "text-blue-400 bg-blue-500/10", icon: Send };
    default: return { label: status, color: "text-zinc-400 bg-zinc-500/10", icon: FileText };
  }
}

export default function EInvoicePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = eInvoices.filter(inv =>
    !searchQuery ||
    inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const accepted = eInvoices.filter(i => i.gibStatus === "ACCEPTED").length;
  const pending = eInvoices.filter(i => i.gibStatus === "PENDING" || i.gibStatus === "SENT").length;
  const rejected = eInvoices.filter(i => i.gibStatus === "REJECTED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">E-Fatura & E-Arşiv</h1>
        <p className="text-sm text-zinc-500 mt-1">GİB entegrasyonu ile e-fatura gönderimi ve durum takibi</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center"><FileCheck size={20} className="text-brand-400" /></div>
          <div><p className="text-xl font-semibold text-white">{eInvoices.length}</p><p className="text-xs text-zinc-500">Toplam E-Fatura</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center"><CheckCircle size={20} className="text-green-400" /></div>
          <div><p className="text-xl font-semibold text-green-400">{accepted}</p><p className="text-xs text-zinc-500">Kabul Edildi</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><Clock size={20} className="text-amber-400" /></div>
          <div><p className="text-xl font-semibold text-amber-400">{pending}</p><p className="text-xs text-zinc-500">Beklemede</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center"><XCircle size={20} className="text-red-400" /></div>
          <div><p className="text-xl font-semibold text-red-400">{rejected}</p><p className="text-xs text-zinc-500">Reddedildi</p></div>
        </motion.div>
      </div>

      {/* Info */}
      {rejected > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={16} />
          {rejected} adet reddedilen e-faturanız var. Lütfen kontrol edin.
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Fatura no veya müşteri ara..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 text-sm"
        />
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Fatura No</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Müşteri</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Tutar</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Gönderim Tarihi</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">GİB Durumu</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const badge = gibStatusBadge(inv.gibStatus);
                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-zinc-300">{inv.customer}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-zinc-400">{inv.sentDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${badge.color}`}>
                        <badge.icon size={12} /> {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all cursor-pointer" title="XML Görüntüle">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all cursor-pointer" title="Durumu Sorgula">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* E-Invoice Flow */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
        <h3 className="text-sm font-medium text-white mb-4">E-Fatura Gönderim Akışı</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-400 overflow-x-auto pb-2">
          {["Fatura Oluştur", "UBL-TR XML Üret", "Base64 Kodla", "Entegratöre Gönder", "GİB'e İlet", "Durum Güncelle"].map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-400 font-medium text-xs">{i + 1}</div>
              <span className="whitespace-nowrap">{step}</span>
              {i < 5 && <span className="text-zinc-600">→</span>}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
