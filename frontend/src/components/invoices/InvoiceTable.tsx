"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { formatCurrency, formatDate, statusLabels, statusBadgeClass } from "@/lib/utils";
import type { Invoice } from "@/lib/hooks/use-invoices";

interface InvoiceTableProps {
  invoices: Invoice[];
  onSelect: (id: string) => void;
  onPay: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function InvoiceTable({ invoices, onSelect, onPay, onDelete }: InvoiceTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Fatura No
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Tarih
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Vade
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Tutar
            </th>
            <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Durum
            </th>
            <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              İşlem
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => (
            <motion.tr
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
              onClick={() => onSelect(inv.id)}
            >
              <td className="px-4 py-3 text-white font-medium">
                {inv.invoiceNumber}
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {formatDate(inv.issueDate)}
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {inv.dueDate ? formatDate(inv.dueDate) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-white">
                {formatCurrency(Number(inv.totalAmount))}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`badge ${statusBadgeClass(inv.status)}`}>
                  {statusLabels[inv.status] || inv.status}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  {inv.status !== "PAID" && inv.status !== "CANCELLED" && inv.status !== "DRAFT" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPay(inv.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-600/80 hover:bg-brand-500 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Öde
                    </button>
                  )}
                  {inv.status === "DRAFT" && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Bu taslak faturayı silmek istediğinize emin misiniz?")) {
                          onDelete(inv.id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>

      {invoices.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          Henüz faturanız bulunmamaktadır.
        </div>
      )}
    </div>
  );
}
