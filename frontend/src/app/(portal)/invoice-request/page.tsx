"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FilePlus,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle,
  Calendar,
  FileText,
  DollarSign,
  Hash,
} from "lucide-react";
import api from "@/lib/api";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const emptyItem: InvoiceItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 20,
};

export default function InvoiceCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    invoiceNumber: `FTR-${Date.now().toString().slice(-6)}`,
    type: "SALES",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    currency: "TRY",
    notes: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);

  const addItem = () => setItems([...items, { ...emptyItem }]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0,
  );
  const totalTax = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice * (it.taxRate / 100),
    0,
  );
  const grandTotal = subtotal + totalTax;

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(n);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.some((it) => !it.description || it.unitPrice <= 0)) {
      setError("Tüm kalemler için açıklama ve birim fiyat giriniz.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/client/invoices", {
        ...form,
        items: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
        })),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Fatura oluşturulurken hata oluştu.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle size={32} className="text-green-400" />
          </motion.div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Fatura Oluşturuldu!
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Faturanız taslak olarak kaydedildi. Faturalar sayfasından
            görüntüleyebilirsiniz.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/invoices")}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm transition-all cursor-pointer"
            >
              Faturalara Git
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setItems([{ ...emptyItem }]);
                setForm({
                  invoiceNumber: `FTR-${Date.now().toString().slice(-6)}`,
                  type: "SALES",
                  issueDate: new Date().toISOString().split("T")[0],
                  dueDate: "",
                  currency: "TRY",
                  notes: "",
                });
              }}
              className="px-4 py-2.5 rounded-xl glass text-zinc-300 text-sm hover:text-white transition-all cursor-pointer"
            >
              Yeni Fatura
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
          <FilePlus size={24} className="text-brand-400" />
          Yeni Fatura Oluştur
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Fatura bilgilerini girin ve kalemleri ekleyin
        </p>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <FileText size={18} className="text-brand-400" />
            Fatura Bilgileri
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1.5">
                <Hash size={13} />
                Fatura No
              </label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) =>
                  setForm({ ...form, invoiceNumber: e.target.value })
                }
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1.5">
                <FileText size={13} />
                Fatura Türü
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]"
              >
                <option value="SALES">Satış Faturası</option>
                <option value="PURCHASE">Alış Faturası</option>
                <option value="RETURN_SALES">Satış İade Faturası</option>
                <option value="RETURN_PURCHASE">Alış İade Faturası</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1.5">
                <Calendar size={13} />
                Düzenleme Tarihi
              </label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) =>
                  setForm({ ...form, issueDate: e.target.value })
                }
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1.5">
                <Calendar size={13} />
                Vade Tarihi
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-zinc-400 mb-1.5">Notlar</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Fatura notu (isteğe bağlı)"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 text-sm outline-none focus:border-brand-500/50 resize-none"
            />
          </div>
        </motion.div>

        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <DollarSign size={18} className="text-brand-400" />
              Fatura Kalemleri
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Plus size={14} />
              Kalem Ekle
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-12 gap-2 items-end"
              >
                {/* Description — 5 cols */}
                <div className="col-span-5">
                  {i === 0 && (
                    <label className="block text-xs text-zinc-500 mb-1">
                      Açıklama
                    </label>
                  )}
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(i, "description", e.target.value)
                    }
                    placeholder="Ürün/Hizmet"
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50"
                  />
                </div>

                {/* Quantity — 2 cols */}
                <div className="col-span-2">
                  {i === 0 && (
                    <label className="block text-xs text-zinc-500 mb-1">
                      Miktar
                    </label>
                  )}
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(i, "quantity", Number(e.target.value))
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50"
                  />
                </div>

                {/* Unit Price — 2 cols */}
                <div className="col-span-2">
                  {i === 0 && (
                    <label className="block text-xs text-zinc-500 mb-1">
                      Birim Fiyat
                    </label>
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(i, "unitPrice", Number(e.target.value))
                    }
                    placeholder="₺"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50"
                  />
                </div>

                {/* Tax Rate — 2 cols */}
                <div className="col-span-2">
                  {i === 0 && (
                    <label className="block text-xs text-zinc-500 mb-1">
                      KDV %
                    </label>
                  )}
                  <select
                    value={item.taxRate}
                    onChange={(e) =>
                      updateItem(i, "taxRate", Number(e.target.value))
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]"
                  >
                    <option value={0}>%0</option>
                    <option value={1}>%1</option>
                    <option value={8}>%8</option>
                    <option value={10}>%10</option>
                    <option value={20}>%20</option>
                  </select>
                </div>

                {/* Delete — 1 col */}
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:hover:text-zinc-500 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Totals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Ara Toplam</span>
              <span className="text-white">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">KDV</span>
              <span className="text-white">{formatMoney(totalTax)}</span>
            </div>
            <div className="border-t border-white/[0.06] pt-2">
              <div className="flex justify-between text-base font-semibold">
                <span className="text-zinc-300">Genel Toplam</span>
                <span className="text-white">{formatMoney(grandTotal)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          {saving ? "Kaydediliyor..." : "Faturayı Oluştur"}
        </button>
      </form>
    </div>
  );
}
