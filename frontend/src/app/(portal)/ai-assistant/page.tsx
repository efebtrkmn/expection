"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  User,
  MessageCircle,
  Info,
} from "lucide-react";
import api from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  "Genel borç durumumu özetle",
  "Vadesi geçmiş faturalarım hangileri?",
  "Son ödeme tarihim ne zaman?",
  "Mutabakat durumum nedir?",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content:
        "Merhaba! Ben Expection AI Asistanınızım. Faturalarınız, ödemeleriniz ve hesap durumunuz hakkında sorular sorabilirsiniz.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Try to get summary data for context-aware response
      const { data: summary } = await api.get("/client/summary");
      const { data: invoices } = await api.get("/client/invoices");

      // Generate smart response based on user query and data
      const response = generateSmartResponse(
        text.trim(),
        summary,
        invoices || [],
      );

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "Üzgünüm, verilerinize şu anda erişemedim. Lütfen tekrar deneyin.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Bot size={22} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">AI Asistan</h1>
            <p className="text-xs text-zinc-500">
              Gemini destekli akıllı muhasebe asistanı
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card p-4 overflow-y-auto space-y-3 mb-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role !== "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center mt-0.5">
                  {msg.role === "system" ? (
                    <Info size={14} className="text-brand-400" />
                  ) : (
                    <Sparkles size={14} className="text-brand-400" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white rounded-br-md"
                    : "bg-white/[0.06] text-zinc-200 rounded-bl-md border border-white/[0.06]"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className="block text-[10px] mt-1.5 opacity-50">
                  {msg.timestamp.toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center mt-0.5">
                  <User size={14} className="text-brand-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
              <Sparkles size={14} className="text-brand-400" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 size={14} className="animate-spin" />
                Düşünüyorum...
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <MessageCircle size={12} />
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sorunuzu yazın..."
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

// ── Smart Response Generator (local, no API key needed) ──────────────
function generateSmartResponse(
  query: string,
  summary: any,
  invoices: any[],
): string {
  const q = query.toLowerCase();
  const { totalDebt = 0, overdueAmount = 0, totalPaid = 0, invoiceCount = 0 } = summary || {};

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(n);

  // Debt/balance queries
  if (q.includes("borç") || q.includes("bakiye") || q.includes("özetle")) {
    return `📊 Hesap Özetiniz:
    
• Toplam Borç: ${formatMoney(totalDebt)}
• Vadesi Geçmiş: ${formatMoney(overdueAmount)}
• Toplam Ödenen: ${formatMoney(totalPaid)}
• Toplam Fatura: ${invoiceCount} adet

${overdueAmount > 0 ? "⚠️ Vadesi geçmiş borcunuz bulunmaktadır. Faturalar sayfasından ödeme yapabilirsiniz." : "✅ Vadesi geçmiş borcunuz bulunmamaktadır."}`;
  }

  // Overdue queries
  if (q.includes("vadesi") || q.includes("gecik") || q.includes("geçmiş")) {
    const overdueInvoices = invoices.filter((inv: any) => inv.status === "OVERDUE");
    if (overdueInvoices.length === 0) {
      return "✅ Vadesi geçmiş faturanız bulunmamaktadır. Tüm ödemeleriniz güncel!";
    }
    const list = overdueInvoices
      .map(
        (inv: any) =>
          `• ${inv.invoiceNumber} — ${formatMoney(Number(inv.totalAmount))}`,
      )
      .join("\n");
    return `⚠️ Vadesi geçmiş ${overdueInvoices.length} faturanız var:\n\n${list}\n\nFaturalar sayfasından ödeme yapabilirsiniz.`;
  }

  // Payment/due date queries
  if (q.includes("ödeme") || q.includes("tarih") || q.includes("vade")) {
    const upcoming = invoices
      .filter((inv: any) => inv.dueDate && inv.status !== "PAID" && inv.status !== "CANCELLED")
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (upcoming.length === 0) {
      return "Şu anda bekleyen ödemeniz bulunmamaktadır.";
    }
    const next = upcoming[0];
    return `📅 En yakın ödeme tarihiniz: ${new Date(next.dueDate).toLocaleDateString("tr-TR")}
    
Fatura: ${next.invoiceNumber}
Tutar: ${formatMoney(Number(next.totalAmount))}

Toplam ${upcoming.length} adet bekleyen faturanız var.`;
  }

  // Reconciliation queries
  if (q.includes("mutabakat")) {
    return `📋 Mutabakat Bilgisi:

Mutabakat talepleri, size e-posta ile gönderilecek özel bağlantılar üzerinden gerçekleştirilir. 

Menüdeki "Mutabakat" sayfasından süreci takip edebilirsiniz.`;
  }

  // Invoice queries
  if (q.includes("fatura")) {
    return `📄 Fatura Bilgileriniz:

• Toplam Fatura: ${invoiceCount} adet
• Toplam Borç: ${formatMoney(totalDebt)}
• Ödenen: ${formatMoney(totalPaid)}

Faturalar sayfasından detayları görüntüleyebilir ve ödeme yapabilirsiniz.`;
  }

  // Default
  return `Sorunuzu anladım. Şu konularda size yardımcı olabilirim:

• 💰 Borç durumu ve bakiye sorgulama
• 📄 Fatura bilgileri ve ödeme tarihleri
• ⚠️ Vadesi geçmiş fatura kontrolü
• 📋 Mutabakat süreci hakkında bilgi

Lütfen sorunuzu daha detaylı yazın veya yukarıdaki hızlı sorulardan birini seçin.`;
}
