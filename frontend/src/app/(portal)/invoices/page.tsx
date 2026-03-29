"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  FilePlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { InvoiceDetailDrawer } from "@/components/invoices/InvoiceDetailDrawer";
import api from "@/lib/api";

const statusFilterOptions = [
  { value: "ALL", label: "Tümü" },
  { value: "DRAFT", label: "Taslak" },
  { value: "ISSUED", label: "Kesilmiş" },
  { value: "SENT", label: "Gönderilmiş" },
  { value: "PARTIALLY_PAID", label: "Kısmi Ödeme" },
  { value: "PAID", label: "Ödenmiş" },
  { value: "OVERDUE", label: "Vadesi Geçmiş" },
  { value: "CANCELLED", label: "İptal" },
];

export default function InvoicesPage() {
  const { data: invoices, isLoading, error, refetch } = useInvoices();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const matchesSearch =
        !searchQuery ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(inv.totalAmount).includes(searchQuery);
      const matchesStatus =
        statusFilter === "ALL" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handlePay = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      const { data } = await api.post(
        `/payments/iyzico/checkout/${invoiceId}`,
      );

      if (data.checkoutFormContent) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.checkoutFormContent);
          win.document.close();
        }
      } else if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
      }
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Ödeme başlatılamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setPayingId(null);
    }
  };

  const handleDownloadStatement = async () => {
    try {
      const response = await api.get("/client/statement/pdf", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `ekstre_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Ekstre indirilemedi.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Faturalar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Tüm faturalarınızı görüntüleyin ve ödemelerinizi yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass text-sm text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Yenile"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleDownloadStatement}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Ekstre İndir</span>
          </button>
          <Link
            href="/invoice-request"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
          >
            <FilePlus size={16} />
            <span className="hidden sm:inline">Fatura Oluştur</span>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fatura no veya tutar ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
            showFilters || statusFilter !== "ALL"
              ? "bg-brand-500/15 text-brand-400 border border-brand-500/20"
              : "glass text-zinc-300 hover:text-white"
          }`}
        >
          <Filter size={16} />
          Filtre
          {statusFilter !== "ALL" && (
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          )}
        </button>
      </div>

      {/* Filter Pills */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                statusFilter === opt.value
                  ? "bg-brand-500/20 text-brand-400 border border-brand-500/20"
                  : "glass text-zinc-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && invoices && (
        <div className="text-xs text-zinc-500">
          {filteredInvoices.length === invoices.length
            ? `${invoices.length} fatura`
            : `${filteredInvoices.length} / ${invoices.length} fatura gösteriliyor`}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <p className="text-danger-500">Faturalar yüklenirken hata oluştu.</p>
        </div>
      ) : (
        <InvoiceTable
          invoices={filteredInvoices}
          onSelect={(id) => setSelectedId(id)}
          onPay={handlePay}
          onDelete={async (id) => {
            try {
              await api.delete(`/client/invoices/${id}`);
              refetch();
            } catch (err: any) {
              alert(err.response?.data?.message || 'Fatura silinemedi.');
            }
          }}
        />
      )}

      {/* Detail Drawer */}
      <InvoiceDetailDrawer
        invoiceId={selectedId}
        onClose={() => setSelectedId(null)}
        onPay={handlePay}
      />

      {/* Loading overlay for payment */}
      {payingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="glass-card p-8 text-center">
            <Loader2
              size={32}
              className="animate-spin text-brand-400 mx-auto mb-3"
            />
            <p className="text-white font-medium">Ödeme başlatılıyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
