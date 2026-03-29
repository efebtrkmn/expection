"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  Search,
  Plus,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
}

const cashFlowData = [
  { month: "Oca", giren: 85000, cikan: 62000 },
  { month: "Şub", giren: 92000, cikan: 71000 },
  { month: "Mar", giren: 78000, cikan: 65000 },
  { month: "Nis", giren: 105000, cikan: 78000 },
  { month: "May", giren: 95000, cikan: 72000 },
  { month: "Haz", giren: 112000, cikan: 85000 },
];

const bankAccounts = [
  { name: "Garanti BBVA", iban: "TR12 0001 ****", balance: 87500, color: "#00a651" },
  { name: "İş Bankası", iban: "TR45 0006 ****", balance: 42300, color: "#003087" },
  { name: "Yapı Kredi", iban: "TR78 0067 ****", balance: 28900, color: "#00205b" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const emptyTxForm = {
  type: "INCOME",
  amount: 0,
  description: "",
  transactionDate: new Date().toISOString().split("T")[0],
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "",
};

export default function CashFlowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ ...emptyTxForm });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/client/transactions");
      setTransactions(res.data);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalIn = transactions
    .filter(t => t.type === "INCOME")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalOut = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);

  const filtered = transactions.filter(t =>
    !searchQuery || (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.amount || form.amount <= 0) {
      setError("Tutar sıfırdan büyük olmalıdır.");
      return;
    }
    if (!form.description) {
      setError("Açıklama zorunludur.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/client/transactions", form);
      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setForm({ ...emptyTxForm });
        fetchTransactions();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || "İşlem oluşturulurken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const formatPaymentMethod = (m: string) => {
    const map: Record<string, string> = {
      CASH: "Nakit", BANK_TRANSFER: "Havale/EFT", CREDIT_CARD: "Kredi Kartı",
      CHECK: "Çek", IYZICO: "Iyzico", PAYTR: "PayTR", OTHER: "Diğer",
    };
    return map[m] || m;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Nakit Akışı</h1>
          <p className="text-sm text-zinc-500 mt-1">Gelir-gider takibi ve banka hesapları</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(null); setSuccess(false); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all cursor-pointer"
        >
          <Plus size={16} /> İşlem Ekle
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Toplam Bakiye</span>
            <Wallet size={18} className="text-brand-400" />
          </div>
          <p className="text-2xl font-semibold text-white">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-zinc-500 mt-1">{bankAccounts.length} banka hesabı</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Gelen</span>
            <ArrowDownLeft size={18} className="text-green-400" />
          </div>
          <p className="text-2xl font-semibold text-green-400">{formatCurrency(totalIn)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
            <TrendingUp size={12} /> Toplam gelir
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Çıkan</span>
            <ArrowUpRight size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-semibold text-red-400">{formatCurrency(totalOut)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
            <TrendingDown size={12} /> Toplam gider
          </div>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-white">Nakit Akışı Grafiği</h3>
            <p className="text-xs text-zinc-500">Aylık gelen vs çıkan</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Gelen</span>
            <span className="flex items-center gap-1.5 text-zinc-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Çıkan</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={cashFlowData}>
            <defs>
              <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="giren" name="Gelen" stroke="#22c55e" fill="url(#inGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="cikan" name="Çıkan" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Bank Accounts + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bank Accounts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-brand-400" /> Banka Hesapları
          </h3>
          <div className="space-y-3">
            {bankAccounts.map((acc) => (
              <div key={acc.name} className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: acc.color + "20" }}>
                    <Building2 size={14} style={{ color: acc.color }} />
                  </div>
                  <div>
                    <p className="text-sm text-white">{acc.name}</p>
                    <p className="text-xs text-zinc-500">{acc.iban}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-white">{formatCurrency(acc.balance)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">Son İşlemler</h3>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ara..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 text-xs outline-none focus:border-brand-500/50 w-40"
              />
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <div className="text-center py-8 text-zinc-500 text-sm"><Loader2 size={18} className="animate-spin inline mr-2" />Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {transactions.length === 0 ? "Henüz işlem yok. \"İşlem Ekle\" butonuna tıklayarak başlayın." : "Arama sonucu bulunamadı."}
              </div>
            ) : filtered.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "INCOME" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    {tx.type === "INCOME" ? <ArrowDownLeft size={14} className="text-green-400" /> : <ArrowUpRight size={14} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-white">{tx.description || "İşlem"}</p>
                    <p className="text-xs text-zinc-500">{new Date(tx.transactionDate).toLocaleDateString("tr-TR")} · {formatPaymentMethod(tx.paymentMethod)}</p>
                  </div>
                </div>
                <p className={`text-sm font-medium ${tx.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                  {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-6 w-full max-w-md"
            >
              {success ? (
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                    className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white">İşlem Kaydedildi!</h3>
                  <p className="text-sm text-zinc-400 mt-1">Gelir/gider başarıyla eklendi.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Wallet size={20} className="text-brand-400" /> Yeni İşlem Ekle
                    </h2>
                    <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type selector */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-2">İşlem Türü</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "INCOME", label: "Gelir", color: "bg-green-500/15 text-green-400 border-green-500/30" },
                          { value: "EXPENSE", label: "Gider", color: "bg-red-500/15 text-red-400 border-red-500/30" },
                          { value: "TRANSFER", label: "Transfer", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, type: opt.value })}
                            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                              form.type === opt.value ? opt.color : "bg-white/[0.02] text-zinc-500 border-white/[0.06] hover:border-white/[0.12]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Tutar (₺) *</label>
                      <input type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(e) => setForm({...form, amount: Number(e.target.value)})} required placeholder="0.00"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 text-lg font-semibold" />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Açıklama *</label>
                      <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required placeholder="Ödeme açıklaması"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Tarih</label>
                        <input type="date" value={form.transactionDate} onChange={(e) => setForm({...form, transactionDate: e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Ödeme Yöntemi</label>
                        <select value={form.paymentMethod} onChange={(e) => setForm({...form, paymentMethod: e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]">
                          <option value="BANK_TRANSFER">Havale/EFT</option>
                          <option value="CASH">Nakit</option>
                          <option value="CREDIT_CARD">Kredi Kartı</option>
                          <option value="CHECK">Çek</option>
                          <option value="OTHER">Diğer</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Referans No</label>
                      <input type="text" value={form.referenceNumber} onChange={(e) => setForm({...form, referenceNumber: e.target.value})} placeholder="İsteğe bağlı"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                    </div>

                    <button type="submit" disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all disabled:opacity-50 cursor-pointer">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {saving ? "Kaydediliyor..." : "İşlemi Kaydet"}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
