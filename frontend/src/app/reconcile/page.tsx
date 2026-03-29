"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useReconciliationVerify } from "@/lib/hooks/use-reconciliation";
import {
  formatCurrency,
  formatDate,
  statusLabels,
  statusBadgeClass,
} from "@/lib/utils";
import api from "@/lib/api";

function ReconcileContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { data, isLoading, error } = useReconciliationVerify(token);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!token || !decision) return;
    if (decision === "REJECTED" && !note.trim()) {
      alert("Ret gerekçesi zorunludur.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: res } = await api.post(
        `/reconciliation/respond?token=${token}`,
        {
          decision,
          note: note.trim() || undefined,
        },
      );
      setResult({ success: true, message: res.message });
    } catch (err: any) {
      setResult({
        success: false,
        message:
          err.response?.data?.message || "İşlem sırasında bir hata oluştu.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // No token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white">
            Geçersiz Bağlantı
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Bu mutabakat bağlantısı geçersiz veya eksik.
          </p>
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center max-w-md"
        >
          {result.success ? (
            <>
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white">
                {decision === "APPROVED"
                  ? "Mutabakat Onaylandı"
                  : "Mutabakat Reddedildi"}
              </h1>
            </>
          ) : (
            <>
              <XCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white">
                İşlem Başarısız
              </h1>
            </>
          )}
          <p className="text-zinc-400 text-sm mt-2">{result.message}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-600/15 blur-[100px] animate-blob" />
        <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-purple-500/10 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {isLoading ? (
          <div className="glass-card p-8 text-center">
            <Loader2
              size={32}
              className="animate-spin text-brand-400 mx-auto mb-3"
            />
            <p className="text-zinc-400">Mutabakat bilgileri yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">
              Bağlantı Geçersiz
            </h1>
            <p className="text-zinc-400 text-sm">
              Bu mutabakat bağlantısı geçersiz veya süresi dolmuş olabilir.
            </p>
          </div>
        ) : data ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold gradient-text">E</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">
                    E-Mutabakat
                  </h1>
                  <p className="text-xs text-zinc-500">Expection SaaS</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Clock size={14} />
                <span>
                  Son {data.expiresInHours} saat içinde yanıtlanmalıdır
                </span>
              </div>

              <div className="mt-4 glass p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Toplam Bakiye</span>
                  <span className="text-xl font-semibold text-white">
                    {formatCurrency(data.statement.totalDebt)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {data.statement.invoiceCount} adet fatura
                </p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-sm font-medium text-zinc-300">
                  Fatura Ekstresi
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                        Fatura No
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                        Tarih
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                        Vade
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                        Tutar
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.statement.invoices.map((inv, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`badge ${statusBadgeClass(inv.status)}`}
                          >
                            {statusLabels[inv.status] || inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-sm font-medium text-zinc-300">
                Mutabakat Yanıtınız
              </h2>

              <div className="flex gap-3">
                <button
                  onClick={() => setDecision("APPROVED")}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                    decision === "APPROVED"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "glass text-zinc-400 hover:text-white"
                  }`}
                >
                  ✓ Onaylıyorum
                </button>
                <button
                  onClick={() => setDecision("REJECTED")}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                    decision === "REJECTED"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "glass text-zinc-400 hover:text-white"
                  }`}
                >
                  ✗ Reddediyorum
                </button>
              </div>

              {decision === "REJECTED" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <label className="block text-sm text-zinc-400 mb-1.5">
                    Ret Gerekçesi <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Lütfen ret nedeninizi belirtin..."
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm resize-none"
                  />
                </motion.div>
              )}

              {decision && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <button
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      (decision === "REJECTED" && !note.trim())
                    }
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {submitting ? "Gönderiliyor..." : "Yanıtı Gönder"}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default function ReconcilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-brand-400" />
        </div>
      }
    >
      <ReconcileContent />
    </Suspense>
  );
}
