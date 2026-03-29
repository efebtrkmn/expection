"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ArrowRight,
  Clock,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { useSummary } from "@/lib/hooks/use-summary";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { formatCurrency, statusLabels, formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface PivotData {
  id: string;
  name: string;
  type: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  invoiceCount: number;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  overdueAmount: number;
  overdueCount: number;
  lastInvoiceDate: string | null;
  nextDueDate: string | null;
}


// Simulated monthly revenue data
const monthlyData = [
  { month: "Oca", gelir: 45000, gider: 32000 },
  { month: "Şub", gelir: 52000, gider: 38000 },
  { month: "Mar", gelir: 48000, gider: 35000 },
  { month: "Nis", gelir: 61000, gider: 42000 },
  { month: "May", gelir: 55000, gider: 39000 },
  { month: "Haz", gelir: 67000, gider: 45000 },
  { month: "Tem", gelir: 72000, gider: 48000 },
  { month: "Ağu", gelir: 58000, gider: 41000 },
  { month: "Eyl", gelir: 63000, gider: 44000 },
  { month: "Eki", gelir: 69000, gider: 47000 },
  { month: "Kas", gelir: 75000, gider: 50000 },
  { month: "Ara", gelir: 82000, gider: 55000 },
];

const cashFlowData = [
  { day: "1", bakiye: 125000 },
  { day: "5", bakiye: 118000 },
  { day: "10", bakiye: 132000 },
  { day: "15", bakiye: 127000 },
  { day: "20", bakiye: 145000 },
  { day: "25", bakiye: 138000 },
  { day: "30", bakiye: 152000 },
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

export default function DashboardPage() {
  const { data, isLoading, error } = useSummary();
  const { data: invoices } = useInvoices();
  
  // Pivot Table State
  const [pivotData, setPivotData] = useState<PivotData[]>([]);
  const [pivotLoading, setPivotLoading] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string>("ALL");

  useEffect(() => {
    const fetchPivot = async () => {
      try {
        setPivotLoading(true);
        const res = await api.get("/client/contacts/pivot");
        setPivotData(res.data);
      } catch (err) {
        console.error("Pivot verisi alinirken hata", err);
      } finally {
        setPivotLoading(false);
      }
    };
    fetchPivot();
  }, []);

  // Proactive insights
  const insights = useMemo(() => {
    const list: { icon: any; text: string; type: "info" | "warning" | "success" }[] = [];
    if (!data) return list;

    if (data.overdueAmount > 0) {
      list.push({
        icon: AlertTriangle,
        text: `${formatCurrency(data.overdueAmount)} tutarında vadesi geçmiş ödemeniz var!`,
        type: "warning",
      });
    }
    if (data.totalPaid > 0 && data.totalDebt === 0) {
      list.push({
        icon: CheckCircle,
        text: "Tebrikler! Tüm borçlarınız ödenmiş durumda.",
        type: "success",
      });
    }
    if (data.invoiceCount > 0 && data.overdueAmount === 0) {
      list.push({
        icon: Lightbulb,
        text: "Tüm faturalarınız güncel. Ödeme takviminize uyuyorsunuz.",
        type: "info",
      });
    }
    return list;
  }, [data]);

  const recentInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.slice(0, 5);
  }, [invoices]);

  const filteredPivot = useMemo(() => {
    if (selectedContactId === "ALL") return pivotData;
    return pivotData.filter((c) => c.id === selectedContactId);
  }, [selectedContactId, pivotData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Hesap özetiniz, finansal analizler ve son gelişmeler
        </p>
      </div>

      {/* Proactive Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                insight.type === "warning"
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
                  : insight.type === "success"
                    ? "bg-green-500/5 border-green-500/20 text-green-400"
                    : "bg-brand-500/5 border-brand-500/20 text-brand-400"
              }`}
            >
              <insight.icon size={16} className="flex-shrink-0" />
              {insight.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-[140px]" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <p className="text-danger-500">Veriler yüklenirken hata oluştu.</p>
        </div>
      ) : (
        <div id="stat-cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Toplam Borç" value={formatCurrency(data?.totalDebt ?? 0)} icon={Wallet} variant="default" delay={0.05} />
          <StatCard title="Vadesi Geçmiş" value={formatCurrency(data?.overdueAmount ?? 0)} icon={AlertTriangle} variant="danger" delay={0.1} />
          <StatCard title="Toplam Ödenen" value={formatCurrency(data?.totalPaid ?? 0)} icon={CheckCircle} variant="success" delay={0.15} />
          <StatCard title="Fatura Sayısı" value={String(data?.invoiceCount ?? 0)} icon={FileText} variant="warning" delay={0.2} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white">Gelir / Gider</h3>
              <p className="text-xs text-zinc-500">Aylık karşılaştırma</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                Gelir
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                Gider
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gelir" name="Gelir" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gider" name="Gider" fill="#3f3f46" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Cash Flow Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white">Nakit Akışı</h3>
              <p className="text-xs text-zinc-500">Bu ay</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <TrendingUp size={14} />
              +%8.5
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashFlowData}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="bakiye" name="Bakiye" stroke="#7c3aed" fill="url(#cashGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Clock size={16} className="text-brand-400" />
            Son Faturalar
          </h3>
          <Link href="/invoices" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Tümünü Gör <ArrowRight size={12} />
          </Link>
        </div>
        {recentInvoices.length > 0 ? (
          <div className="space-y-2">
            {recentInvoices.map((inv, i) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={14} className="text-zinc-500" />
                  <div>
                    <p className="text-sm text-white">{inv.invoiceNumber}</p>
                    <p className="text-xs text-zinc-500">{formatDate(inv.issueDate)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{formatCurrency(Number(inv.totalAmount))}</p>
                  <p className="text-xs text-zinc-500">{statusLabels[inv.status] || inv.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">
            Henüz fatura kaydınız bulunmamaktadır.
          </p>
        )}
      </motion.div>

      {/* Cari Pivot Tablo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <FileCheck size={16} className="text-brand-400" />
              Cari & Ödeme Pivot Tablo
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Kişi ve firma bazlı finansal özet</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Filtrele:</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs outline-none focus:border-brand-500/50 [color-scheme:dark]"
            >
              <option value="ALL">Tümü</option>
              {pivotData.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Link href="/contacts" className="text-xs text-brand-400 hover:text-brand-300 ml-3">
              Yönet
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.06] mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cari Unvanı</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">İletişim & Konum</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Toplam Fatura</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ödenen</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Kalan Bakiye</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Gecikmiş</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Vade Durumu</th>
              </tr>
            </thead>
            <tbody>
              {pivotLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500 text-xs">Yükleniyor...</td>
                </tr>
              ) : filteredPivot.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500 text-xs">Veri bulunamadı.</td>
                </tr>
              ) : (
                filteredPivot.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      <div>{row.city || "-"}</div>
                      {(row.phone || row.email) && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {row.phone} {row.phone && row.email ? "•" : ""} {row.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-white">{formatCurrency(row.totalDebt)}</div>
                      <div className="text-[10px] text-zinc-500">{row.invoiceCount} adet</div>
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(row.totalPaid)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${row.remaining > 0 ? "text-amber-400" : "text-white"}`}>
                        {formatCurrency(row.remaining)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.overdueAmount > 0 ? (
                        <div className="text-red-400">
                          {formatCurrency(row.overdueAmount)}
                          <div className="text-[10px] opacity-75">{row.overdueCount} gecikmiş</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {row.overdueAmount > 0 ? (
                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">Vade Geçti!</span>
                      ) : row.nextDueDate ? (
                        <span className="text-zinc-400">Son: {formatDate(row.nextDueDate)}</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Tamamen Ödendi</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
