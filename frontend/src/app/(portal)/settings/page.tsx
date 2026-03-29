"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, Save, Loader2, HelpCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTourStore } from "@/lib/tour-store";
import api from "@/lib/api";

export default function SettingsPage() {
  const { clientName, email } = useAuthStore();
  const { resetTour, startTour } = useTourStore();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Yeni şifreler eşleşmiyor." });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Yeni şifre en az 8 karakter olmalıdır.",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post("/client/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setMessage({ type: "success", text: "Şifreniz başarıyla değiştirildi." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Şifre değiştirilirken hata oluştu.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestartTour = () => {
    resetTour();
    startTour();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Ayarlar</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Profil ve güvenlik ayarlarınızı yönetin
        </p>
      </div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <User size={20} className="text-brand-400" />
          <h2 className="text-base font-medium text-white">
            Profil Bilgileri
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              İşletme Adı
            </label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm">
              {clientName || "—"}
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              E-posta
            </label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm">
              {email || "—"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Password Change */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <Lock size={20} className="text-brand-400" />
          <h2 className="text-base font-medium text-white">Şifre Değiştir</h2>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={`mb-4 p-3 rounded-xl text-sm text-center ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-danger-500/10 border border-danger-500/20 text-danger-500"
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Mevcut Şifre
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm pr-12"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Yeni Şifre
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 8 karakter"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Yeni Şifre (Tekrar)
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrarlayın"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Kaydediliyor..." : "Şifreyi Değiştir"}
          </button>
        </form>
      </motion.div>

      {/* Tour Restart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <HelpCircle size={20} className="text-brand-400" />
          <h2 className="text-base font-medium text-white">Uygulama Turu</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Portalın nasıl kullanıldığını adım adım gösteren öğretici turu tekrar
          başlatabilirsiniz.
        </p>
        <button
          onClick={handleRestartTour}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <HelpCircle size={16} />
          Turu Tekrar Başlat
        </button>
      </motion.div>
    </div>
  );
}
