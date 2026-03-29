import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TourStep {
  target: string; // CSS selector or element ID
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

interface TourState {
  isActive: boolean;
  currentStep: number;
  hasSeenTour: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  resetTour: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      isActive: false,
      currentStep: 0,
      hasSeenTour: false,
      startTour: () => set({ isActive: true, currentStep: 0 }),
      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
      prevStep: () =>
        set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
      endTour: () => set({ isActive: false, currentStep: 0, hasSeenTour: true }),
      resetTour: () => set({ isActive: false, currentStep: 0, hasSeenTour: false }),
    }),
    { name: "expection-tour" },
  ),
);

export const tourSteps: TourStep[] = [
  {
    target: "#sidebar-nav",
    title: "Navigasyon Menüsü",
    description:
      "Sol menüden tüm modüllere erişebilirsiniz: Dashboard, Faturalar, Nakit Akışı, Stok, Raporlar ve daha fazlası. Alt kısımdaki ok ile menüyü daraltabilirsiniz.",
    position: "right",
  },
  {
    target: "#stat-cards",
    title: "Özet Kartları",
    description:
      "Toplam borcunuz, vadesi geçmiş tutarlar, ödemeleriniz ve fatura sayınız burada gösterilir.",
    position: "bottom",
  },
  {
    target: "#header-user",
    title: "Kullanıcı Bilgileri",
    description:
      "Hesap adınız ve e-posta adresiniz burada görünür. 'Çıkış' butonuyla oturumunuzu sonlandırabilirsiniz.",
    position: "bottom",
  },
  {
    target: "#nav-invoices",
    title: "Faturalar",
    description:
      "Tüm faturalarınızı listeleyebilir, detaylarını görüntüleyebilir ve online ödeme yapabilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-invoice-request",
    title: "Fatura Oluştur",
    description:
      "Yeni fatura oluşturabilirsiniz. Kalem ekleyip, KDV oranı belirleyip faturanızı taslak olarak kaydedebilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-cash-flow",
    title: "Nakit Akışı",
    description:
      "Gelir-gider takibi, aylık nakit akışı grafiği ve banka hesaplarınızı görüntüleyebilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-e-invoice",
    title: "E-Fatura & E-Arşiv",
    description:
      "GİB entegrasyonu ile e-faturalarınızın gönderim durumunu takip edebilir, XML görüntüleyebilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-reconciliation",
    title: "Mutabakat",
    description:
      "E-Mutabakat süreçlerinizi takip edebilir, bakiye ekstrelerinizi görüntüleyip onaylayabilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-reports",
    title: "Raporlar & Analiz",
    description:
      "Kâr/zarar tablosu, gider dağılımı ve Ba/Bs form hazırlama modülüne buradan erişebilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-products",
    title: "Stok & Ürünler",
    description:
      "Ürün ve hizmet envanterinizi takip edin. Kritik stok uyarıları ve stok değeri hesaplamaları burada.",
    position: "right",
  },
  {
    target: "#nav-marketplace",
    title: "Pazaryeri Entegrasyonu",
    description:
      "Trendyol, Hepsiburada ve Amazon bağlantılarınızı yönetin, siparişleri otomatik senkronize edin.",
    position: "right",
  },
  {
    target: "#nav-documents",
    title: "Belge Yönetimi",
    description:
      "Faturalar, ekstreler ve sözleşmelerinizi görüntüleyin, indirin ve e-imzalayın.",
    position: "right",
  },
  {
    target: "#nav-ai-assistant",
    title: "AI Asistan",
    description:
      "Gemini destekli akıllı asistanla borç durumu, fatura bilgileri ve ödeme tarihleri hakkında sohbet edebilirsiniz.",
    position: "right",
  },
  {
    target: "#nav-settings",
    title: "Ayarlar",
    description:
      "Şifrenizi değiştirebilir, profil bilgilerinizi görüntüleyebilir ve öğretici turu yeniden başlatabilirsiniz.",
    position: "right",
  },
];
