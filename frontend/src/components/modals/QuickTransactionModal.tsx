"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, X, Loader2, CheckCircle, Wallet } from "lucide-react";
import api from "@/lib/api";

interface Contact {
  id: string;
  name: string;
}

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickTransactionModal({ isOpen, onClose, onSuccess }: QuickTransactionModalProps) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setType("INCOME");
      setAmount("");
      setDescription("");
      setContactId("");
      setSuccess(false);
      setError(null);
      
      // Fetch contacts
      api.get("/client/contacts")
        .then((res) => setContacts(res.data))
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError("Geçerli bir tutar giriniz.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/client/transactions", {
        type,
        amount: Number(amount),
        description,
        customerSupplierId: contactId || undefined,
        transactionDate: new Date(),
        paymentMethod: "CASH" // Defaulting to cash for quick tx
      });
      
      setSuccess(true);
      if (onSuccess) onSuccess();
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "İşlem kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
           onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {success ? (
              <div className="text-center py-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                  className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white">İşlem Kaydedildi!</h3>
                <p className="text-sm text-zinc-400 mt-1">Kasa/Banka bakiyeniz güncellendi.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Wallet size={20} className="text-brand-400" /> Hızlı İşlem
                  </h2>
                  <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>
                )}

                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setType("INCOME")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      type === "INCOME" 
                        ? "bg-green-500/10 border-green-500/30 text-green-400" 
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Plus size={16} /> Para Girişi
                  </button>
                  <button
                    onClick={() => setType("EXPENSE")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      type === "EXPENSE" 
                        ? "bg-red-500/10 border-red-500/30 text-red-400" 
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Minus size={16} /> Para Çıkışı
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cari (Kişi/Firma Seçimi)</label>
                    <div className="text-[10px] text-zinc-500 mb-1.5">Boş bırakılırsa doğrudan kasaya işlenir. Seçilirse ilgili kişinin bakiyesinden düşer.</div>
                    <select
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]"
                    >
                      <option value="">-- Bağımsız İşlem (Cari Seçme) --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Tutar (₺) *</label>
                    <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 text-xl font-medium" />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Açıklama</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Örn: Tahsilat, Ödeme vs."
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                  </div>

                  <button type="submit" disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all disabled:opacity-50 mt-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (type === "INCOME" ? <Plus size={16} /> : <Minus size={16} />)}
                    {saving ? "İşleniyor..." : "İşlemi Kaydet"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
