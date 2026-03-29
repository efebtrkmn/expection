"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileText } from "lucide-react";
import { useInvoiceDetail } from "@/lib/hooks/use-invoices";
import {
  formatCurrency,
  formatDate,
  statusLabels,
  statusBadgeClass,
} from "@/lib/utils";

interface InvoiceDetailDrawerProps {
  invoiceId: string | null;
  onClose: () => void;
  onPay: (id: string) => void;
}

export function InvoiceDetailDrawer({
  invoiceId,
  onClose,
  onPay,
}: InvoiceDetailDrawerProps) {
  const { data: invoice, isLoading } = useInvoiceDetail(invoiceId);

  return (
    <AnimatePresence>
      {invoiceId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-surface-50 border-l border-white/[0.06] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-brand-400" />
                <h2 className="text-lg font-semibold text-white">
                  Fatura Detayı
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="skeleton h-6 w-48" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-40 w-full mt-8" />
                </div>
              ) : invoice ? (
                <div className="space-y-6">
                  {/* Invoice Info */}
                  <div className="glass-card p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Fatura No</span>
                      <span className="text-sm font-medium text-white">
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Tarih</span>
                      <span className="text-sm text-white">
                        {formatDate(invoice.issueDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Vade</span>
                      <span className="text-sm text-white">
                        {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Durum</span>
                      <span
                        className={`badge ${statusBadgeClass(invoice.status)}`}
                      >
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/[0.06]">
                      <span className="text-sm font-medium text-zinc-300">
                        Toplam Tutar
                      </span>
                      <span className="text-lg font-semibold text-white">
                        {formatCurrency(Number(invoice.totalAmount))}
                      </span>
                    </div>
                  </div>

                  {/* Line Items */}
                  {invoice.items && invoice.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-zinc-300 mb-3">
                        Kalemler
                      </h3>
                      <div className="space-y-2">
                        {invoice.items.map((item) => (
                          <div
                            key={item.id}
                            className="glass-card p-4 flex justify-between items-center"
                          >
                            <div>
                              <p className="text-sm text-white">
                                {item.description}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                                {item.taxRate > 0 && ` (KDV %${item.taxRate})`}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-white">
                              {formatCurrency(Number(item.lineTotal))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pay Button */}
                  {invoice.status !== "PAID" &&
                    invoice.status !== "CANCELLED" && (
                      <button
                        onClick={() => onPay(invoice.id)}
                        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors cursor-pointer"
                      >
                        Faturayı Öde
                      </button>
                    )}
                </div>
              ) : (
                <p className="text-zinc-500 text-center">Fatura bulunamadı.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
