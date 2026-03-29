"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { QuickTransactionModal } from "@/components/modals/QuickTransactionModal";
import { useState } from "react";

export function Header() {
  const router = useRouter();
  const { clientName, email, logout } = useAuthStore();
  const [showQuickTx, setShowQuickTx] = useState(false);

  const handleLogout = () => {
    logout();
    document.cookie = "expection-auth-flag=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <>
      <header className="h-16 border-b border-white/[0.06] bg-surface-50/80 backdrop-blur-xl flex items-center justify-between px-6">
        {/* Left — Hızlı İşlem Butonu */}
        <div>
          <button
            onClick={() => setShowQuickTx(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 text-sm font-medium transition-all cursor-pointer"
          >
            Hızlı İşlem
          </button>
        </div>

      {/* Right — User info */}
      <div id="header-user" className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
            <User size={16} className="text-brand-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-tight">
              {clientName || "Müşteri"}
            </p>
            <p className="text-xs text-zinc-500 leading-tight">{email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
      </header>
      
      <QuickTransactionModal 
        isOpen={showQuickTx}
        onClose={() => setShowQuickTx(false)}
      />
    </>
  );
}
