"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ArrowDownRight, ArrowUpRight, Calendar, Search } from "lucide-react";
import api from "@/lib/api";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  currency: string;
  description: string | null;
  transactionDate: string;
  paymentMethod: string;
  customerSupplier?: {
    id: string;
    name: string;
    type: string;
  };
}

const paymentMethodLabels: Record<string, string> = {
  BANK_TRANSFER: "Banka Transferi / EFT",
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  CHEQUE: "Çek",
  OTHER: "Diğer",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const res = await api.get("/client/transactions");
        setTransactions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const filtered = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      t.description?.toLowerCase().includes(q) ||
      t.customerSupplier?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">İşlemler Geçmişi</h1>
          <p className="text-sm text-zinc-500 mt-1">Tüm para giriş/çıkış hareketleri</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Açıklama veya Cari ile ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 text-sm"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tarih</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">İşlem Detayı</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">İlgili Cari</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ödeme Yöntemi</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-zinc-500 text-sm"><Loader2 size={20} className="animate-spin inline mr-2" />Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">Kayıtlı işlem bulunamadı.</td></tr>
              ) : filtered.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {formatDate(tx.transactionDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {tx.type === "INCOME" ? (
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                          <ArrowDownRight size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                          <ArrowUpRight size={16} />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{tx.type === "INCOME" ? "Para Girişi" : "Para Çıkışı"}</p>
                        <p className="text-[11px] text-zinc-500">{tx.description || "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {tx.customerSupplier ? tx.customerSupplier.name : <span className="text-zinc-500 italic">Bağımsız İşlem</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {paymentMethodLabels[tx.paymentMethod] || tx.paymentMethod}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${tx.type === "INCOME" ? "text-green-400" : "text-white"}`}>
                    {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
