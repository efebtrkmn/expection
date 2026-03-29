"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Handshake,
  Settings,
  Bot,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Package,
  BarChart3,
  ShoppingBag,
  FileCheck,
  Lightbulb,
  Headset,
  ArrowLeftRight,
  FolderOpen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/lib/sidebar-store";

interface NavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    href: string;
    icon: any;
  }[];
}

const navGroups: NavGroup[] = [
  {
    title: "Ana",
    items: [
      { id: "nav-dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "nav-contacts", label: "Cariler", href: "/contacts", icon: Users },
      { id: "nav-invoices", label: "Faturalar", href: "/invoices", icon: FileText },
      { id: "nav-invoice-request", label: "Fatura Oluştur", href: "/invoice-request", icon: FilePlus },
    ],
  },
  {
    title: "Finans",
    items: [
      { id: "nav-cash-flow", label: "Nakit Akışı", href: "/cash-flow", icon: Wallet },
      { id: "nav-transactions", label: "İşlemler Geçmişi", href: "/transactions", icon: ArrowLeftRight },
      { id: "nav-e-invoice", label: "E-Fatura", href: "/e-invoice", icon: FileCheck },
      { id: "nav-reconciliation", label: "Mutabakat", href: "/reconciliation", icon: Handshake },
      { id: "nav-reports", label: "Raporlar", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Yönetim",
    items: [
      { id: "nav-products", label: "Stok & Ürünler", href: "/products", icon: Package },
      { id: "nav-marketplace", label: "Pazaryeri", href: "/marketplace", icon: ShoppingBag },
      { id: "nav-documents", label: "Belgeler", href: "/documents", icon: FolderOpen },
    ],
  },
  {
    title: "Diğer",
    items: [
      { id: "nav-ai-assistant", label: "AI Asistan", href: "/ai-assistant", icon: Bot },
      { id: "nav-settings", label: "Ayarlar", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/[0.06] bg-surface-50 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
          <span className="text-sm font-bold gradient-text">E</span>
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-base font-semibold text-white whitespace-nowrap"
          >
            Expection
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav id="sidebar-nav" className="flex-1 py-3 px-3 space-y-4 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-1.5">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    id={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all relative group",
                      isActive
                        ? "text-white bg-brand-500/15"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.04]",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon
                      size={18}
                      className={cn(
                        "flex-shrink-0",
                        isActive
                          ? "text-brand-400"
                          : "text-zinc-500 group-hover:text-zinc-300",
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
