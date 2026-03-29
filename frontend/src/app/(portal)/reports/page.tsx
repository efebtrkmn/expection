"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const profitLossData = [
  { month: "Oca", gelir: 45000, gider: 32000, kar: 13000 },
  { month: "Şub", gelir: 52000, gider: 38000, kar: 14000 },
  { month: "Mar", gelir: 48000, gider: 35000, kar: 13000 },
  { month: "Nis", gelir: 61000, gider: 42000, kar: 19000 },
  { month: "May", gelir: 55000, gider: 39000, kar: 16000 },
  { month: "Haz", gelir: 67000, gider: 45000, kar: 22000 },
];

const categoryData = [
  { name: "Personel", value: 45, color: "#7c3aed" },
  { name: "Kira", value: 20, color: "#3b82f6" },
  { name: "Hammadde", value: 15, color: "#22c55e" },
  { name: "Pazarlama", value: 12, color: "#f59e0b" },
  { name: "Diğer", value: 8, color: "#6b7280" },
];

const babsMockData = [
  { vkn: "1234567890", unvan: "ABC Ticaret A.Ş.", tutar: 125000, faturaAdet: 3 },
  { vkn: "9876543210", unvan: "XYZ Sanayi Ltd.", tutar: 87500, faturaAdet: 2 },
  { vkn: "5555555555", unvan: "DEF Hizmetler", tutar: 52000, faturaAdet: 1 },
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

type TabType = "profit-loss" | "babs" | "expense";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profit-loss");
  const [babsPeriod, setBabsPeriod] = useState("2026-03");

  const totalRevenue = profitLossData.reduce((s, d) => s + d.gelir, 0);
  const totalExpense = profitLossData.reduce((s, d) => s + d.gider, 0);
  const netProfit = totalRevenue - totalExpense;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "profit-loss", label: "Kâr / Zarar", icon: BarChart3 },
    { id: "expense", label: "Gider Dağılımı", icon: PieChart },
    { id: "babs", label: "Ba/Bs Formu", icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Raporlar & Analiz</h1>
          <p className="text-sm text-zinc-500 mt-1">Finansal raporlar, kâr/zarar analizi ve yasal bildirimler</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm text-zinc-300 hover:text-white transition-all cursor-pointer">
          <Download size={16} /> Rapor İndir
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Toplam Gelir</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-400"><TrendingUp size={12} /> +12% önceki döneme göre</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Toplam Gider</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(totalExpense)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-red-400"><TrendingDown size={12} /> +8% önceki döneme göre</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Net Kâr</p>
          <p className={`text-xl font-semibold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(netProfit)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-400"><TrendingUp size={12} /> Kârlılık: %{((netProfit / totalRevenue) * 100).toFixed(1)}</div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "profit-loss" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-medium text-white mb-4">Aylık Kâr/Zarar Grafiği</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={profitLossData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gelir" name="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gider" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kar" name="Net Kâr" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {activeTab === "expense" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-medium text-white mb-4">Gider Kategorileri Dağılımı</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={280}>
              <RePieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `%${val}`} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm text-zinc-300">{cat.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">%{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "babs" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-white">Ba/Bs Form Hazırlama</h3>
                <p className="text-xs text-zinc-500">VUK 148 — KDV hariç 5.000 TL üzeri alım/satımlar</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-zinc-500" />
                  <input
                    type="month"
                    value={babsPeriod}
                    onChange={(e) => setBabsPeriod(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs outline-none focus:border-brand-500/50 [color-scheme:dark]"
                  />
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs cursor-pointer">
                  <Download size={12} /> XML İndir
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">VKN/TCKN</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Unvan</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Toplam Tutar</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Belge Sayısı</th>
                  </tr>
                </thead>
                <tbody>
                  {babsMockData.map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{row.vkn}</td>
                      <td className="px-4 py-3 text-white">{row.unvan}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(row.tutar)}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{row.faturaAdet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
