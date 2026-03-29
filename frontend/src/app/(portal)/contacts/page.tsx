"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  Building,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";

type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH";

interface Contact {
  id: string;
  name: string;
  type: ContactType;
  taxNumber: string | null;
  taxOffice: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  balance: number;
}

const emptyForm: Omit<Contact, "id" | "balance"> = {
  name: "",
  type: "CUSTOMER",
  taxNumber: "",
  taxOffice: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  notes: "",
};

const typeLabels: Record<ContactType, string> = {
  CUSTOMER: "Müşteri",
  SUPPLIER: "Tedarikçi",
  BOTH: "Müşteri & Tedarikçi",
};

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/client/contacts");
      setContacts(res.data);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        c.name.toLowerCase().includes(q) ||
        c.taxNumber?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    });
  }, [searchQuery, contacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.name) {
      setError("Cari ünvanı/adı zorunludur.");
      return;
    }
    
    setSaving(true);
    try {
      await api.post("/client/contacts", form);
      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setForm({ ...emptyForm });
        fetchContacts();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || "Kayıt oluşturulurken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} adlı cariyi silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/client/contacts/${id}`);
      fetchContacts();
    } catch {
      alert("Cari silinemedi.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cariler</h1>
          <p className="text-sm text-zinc-500 mt-1">Müşteri ve tedarikçi yönetimi</p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setError(null);
            setSuccess(false);
            setForm({ ...emptyForm });
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
        >
          <Plus size={16} /> Yeni Cari Ekle
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
            <Users size={20} className="text-brand-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">{contacts.length}</p>
            <p className="text-xs text-zinc-500">Toplam Kayıtlı Cari</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
            <UserIcon size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-green-400">
              {contacts.filter(c => c.type === 'CUSTOMER' || c.type === 'BOTH').length}
            </p>
            <p className="text-xs text-zinc-500">Müşteriler</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Building size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-amber-400">
              {contacts.filter(c => c.type === 'SUPPLIER' || c.type === 'BOTH').length}
            </p>
            <p className="text-xs text-zinc-500">Tedarikçiler</p>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Unvan, vergi no, telefon, e-posta ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 text-sm"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cari Unvanı / Adı</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tip</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Vergi No</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">İletişim</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">İl / İlçe</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Bakiye</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-zinc-500 text-sm"><Loader2 size={20} className="animate-spin inline mr-2" />Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-zinc-500 text-sm">
                  {contacts.length === 0 ? "Henüz cari eklenmemiş. \"Yeni Cari Ekle\" butonuna tıklayarak başlayın." : "Arama sonucu bulunamadı."}
                </td></tr>
              ) : filtered.map((contact, i) => (
                <motion.tr
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{contact.name}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    <span className={`px-2 py-0.5 rounded border ${
                      contact.type === 'CUSTOMER' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      contact.type === 'SUPPLIER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-brand-500/10 border-brand-500/20 text-brand-400'
                    }`}>
                      {typeLabels[contact.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{contact.taxNumber || "-"}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs space-y-1">
                    {contact.phone && <div className="flex items-center gap-1.5"><Phone size={12}/>{contact.phone}</div>}
                    {contact.email && <div className="flex items-center gap-1.5"><Mail size={12}/>{contact.email}</div>}
                    {(!contact.phone && !contact.email) && "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {contact.city ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-zinc-500"/>
                        {contact.city}
                      </div>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">
                    {formatCurrency(Number(contact.balance))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(contact.id, contact.name)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Contact Modal */}
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
              className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {success ? (
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                    className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white">Cari Eklendi!</h3>
                  <p className="text-sm text-zinc-400 mt-1">Cari kart başarıyla kaydedildi.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Users size={20} className="text-brand-400" /> Yeni Cari Kartı
                    </h2>
                    <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Cari Unvanı / Adı *</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Örn: Expection Teknoloji A.Ş."
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Cari Tipi</label>
                        <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value as ContactType})}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 [color-scheme:dark]">
                          <option value="CUSTOMER">Müşteri</option>
                          <option value="SUPPLIER">Tedarikçi</option>
                          <option value="BOTH">Müşteri & Tedarikçi (İkisi Birden)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Şehir / İl</label>
                        <input type="text" value={form.city || ""} onChange={(e) => setForm({...form, city: e.target.value})} placeholder="Örn: İstanbul"
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Vergi Numarası / TCKN</label>
                        <input type="text" value={form.taxNumber || ""} onChange={(e) => setForm({...form, taxNumber: e.target.value})} placeholder="10 veya 11 haneli no"
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Vergi Dairesi</label>
                        <input type="text" value={form.taxOffice || ""} onChange={(e) => setForm({...form, taxOffice: e.target.value})} placeholder="Örn: Zincirlikuyu VD."
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Telefon</label>
                        <input type="tel" value={form.phone || ""} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="0555..."
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">E-posta Adresi</label>
                        <input type="email" value={form.email || ""} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="ornek@firma.com"
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50" />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Açık Adres</label>
                        <textarea value={form.address || ""} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Fatura adresi" rows={2}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-brand-500/50 resize-y" />
                      </div>
                    </div>

                    <button type="submit" disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all disabled:opacity-50 mt-4">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {saving ? "Kaydediliyor..." : "Cariyi Kaydet"}
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
