"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post(
        "/client/auth/login",
        { email, password, tenantId },
        { headers: { "X-Tenant-ID": tenantId } },
      );

      login({
        accessToken: data.accessToken,
        clientName: data.clientName,
        email: data.email,
        tenantId,
      });

      // Set cookie flag for middleware
      document.cookie = "expection-auth-flag=1; path=/; max-age=604800"; // 7 days

      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-brand-600/20 blur-[100px] animate-blob" />
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-brand-400/15 blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-purple-500/15 blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8 md:p-10">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/20 mb-4"
            >
              <span className="text-2xl font-bold gradient-text">E</span>
            </motion.div>
            <h1 className="text-2xl font-semibold text-white">
              Müşteri Portalı
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Hesabınıza giriş yapın
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tenant ID */}
            <div>
              <label
                htmlFor="tenantId"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                İşletme Kimliği
              </label>
              <input
                id="tenantId"
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="İşletme ID'si"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none transition-all focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@firma.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none transition-all focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none transition-all focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-600 mt-8">
            Expection SaaS Muhasebe Platformu
          </p>
        </div>
      </motion.div>
    </div>
  );
}
