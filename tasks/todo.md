# Expection SaaS — TODO

## Sprint 6: Müşteri Portalı (Frontend)

### Durum: Tamamlandı ✅

Kullanılacak teknolojiler: **Next.js (App Router), TailwindCSS, Framer Motion, Zustand, React Query, UI (Radix/Shadcn)**

---

### Phase 1: Proje Kurulumu ve İskeleti
- [x] `expection/frontend` dizini içinde Next.js projesinin (TypeScript, Tailwind, App Router) kurulması.
- [x] Gereksiz varsayılan stillerin temizlenmesi.
- [x] Bağımlılıkların yüklenmesi: `framer-motion`, `axios`, `zustand`, `lucide-react`, `@radix-ui/react-*`, `@tanstack/react-query`.
- [x] `tailwind.config.ts` ile ana renk paletlerinin (Brand, Alert vb.) oluşturulması.
- [x] Global layout ve `providers.tsx` sarmalayıcısının entegrasyonu.

### Phase 2: Kimlik Doğrulama (Authentication)
- [x] Axios Interceptors (api.ts) yazılması ve JWT header entegrasyonu.
- [x] Modern, animasyonlu ve "Glassmorphism" tasarımlı Login sayfasının (`/login`) kodlanması.
- [x] Backend `POST /api/v1/client/auth/login` entegrasyonu.
- [x] Middleware tabanlı korumalı (Protected) rotalar (`/dashboard`, `/invoices` vb.) için kurgu.

### Phase 3: Dashboard ve Layout
- [x] Sidebar (Navigasyon) ve Header (Kullanıcı profili ve bildirimler) içeren ana App Layout'un tasarlanması.
- [x] Dashboard Sayfası Tasarımı: Üst tarafta glass statüs kartları (Toplam Bakiye, Son Gelişmeler).
- [x] Backend `GET /api/v1/client/summary` servisinin dashboard'a bağlanması.

### Phase 4: Faturalar ve Iyzico Ödeme Modülü
- [x] `GET /api/v1/client/invoices` sayfası: Faturaların Data Table üzerinden modern gösterimi.
- [x] Faturaların tıklandığında detayının (Drawer veya Modal) gösterilmesi.
- [x] Fatura ödeme ("Öde") akışı: `POST /api/v1/payments/iyzico/checkout/:invoiceId` ile Iyzico render'ı.
- [x] Ödeme başarılı / başarısız dönüş ekranları.

### Phase 5: Mutabakat Listesi ve Formları
- [x] `GET /api/v1/reconciliation` sayfaları: Form listesi ve detay sayfası kurulumu.
- [x] E-Mutabakat ekstresinin listelenmesi.
- [x] Mutabakat onayı için Onayla / Reddet (Neden Zorunlu) işlemleri (`POST /api/v1/reconciliation/respond`).

---

**Doğrulama Notu:** Manuel testlerle portala giriş yapılabildiği, token rotasyonunun çalıştığı ve basit bir Iyzico ödeme akışının başarılı sonuçlandığı (Faturanın ödendi statüsüne geçmesi) kontrol edilecek.

---

## Sprint 7: Cari İşlem Yönetimi & Test Doğrulamaları

### Phase 1: Altyapı Değişiklikleri
- [x] Prisma schema: `Transaction` → `CustomerSupplier` ilişkisi eklendi
- [x] `npx prisma db push` + `npx prisma generate` çalıştırıldı

### Phase 2: Backend Geliştirmeleri
- [x] `GET /client/transactions`: Cari ilişkili işlem listesi (include customerSupplier)
- [x] `POST /client/transactions`: Bakiye düşümlü işlem oluşturma (INCOME → balance--, EXPENSE → balance++)

### Phase 3: Frontend Geliştirmeleri
- [x] `QuickTransactionModal` bileşeni (Para Girişi/Çıkışı, cari seçimi)
- [x] `Header.tsx`'e "Hızlı İşlem" butonu eklendi
- [x] `/transactions` sayfası (İşlemler Geçmişi tablosu)
- [x] Sidebar + Middleware'e `/transactions` rotası

### Phase 4: Manuel Test & Doğrulamalar
- [x] Login testi — Dashboard başarıyla yüklendi ✅
- [x] Hızlı İşlem testi — Cariye 1000 TL para girişi, bakiyeden düşüldü ✅
---

## Sprint 8: Açık Yönet Butonlarının Düzeltilmesi & Platform Bağımsız Uygulama (PWA + Android)

### Phase 1: Yönet Butonları Hata Tespiti & Giderilmesi
- [x] Dashboard ve yan menülerdeki `href` yönlendirmelerinin doğrulanması
- [x] Henüz yapılmamış (Marketplace, Belgeler, Ürünler) sayfalardaki Yönet butonlarının pasife (Disabled) veya Coming Soon state'e çekilmesi
- [x] Responsive Link kırılmalarının onarılması

### Phase 2: Masaüstü Entegrasyonu (PWA Kurulumu)
- [x] `next-pwa` kütüphanesinin eklenmesi ve konfigürasyonunun yapılması (`next.config.mjs`)
- [x] `manifest.json` dosyasının projeye dahil edilmesi (app icon'lar ile)
- [x] Global Theme Meta Tag'lerinin `layout.tsx` tarafına işlenmesi
- [x] Masaüstü (Standalone) uygulamanın yüklenme testlerinin yapılması

### Phase 3: Android Native Entegrasyon (Capacitor)
- [x] `@capacitor/core` ve `@capacitor/cli` kurulumlarının tamamlanması
- [x] `npx cap init` ile Native katman projesinin oluşturulması (`capacitor.config.ts`)
- [x] Next.js static HTML export ('out' dizini) yeteneğinin aktif edilmesi
- [x] Cihaza `android` paketinin eklenmesi (`@capacitor/android`, `npx cap add android`)
- [x] Node NPM scripts dosyasına Android test scriptlerinin eklenmesi

- [x] Iyzico ödeme akışı — Fatura ISSUED yapıldı, Iyzico settings oluşturuldu, mock checkout + callback test ediliyor
- [x] Fatura "ödendi" statüsüne geçtiği teyit edilecek

## Sprint 9: Sürüm Çıkışı (GitHub Push), Detaylı Hata Ayıklama (Bug Bash) ve Öneriler

### Phase 1: Mükemmel GitHub Push Seti
- [x] `frontend/.gitignore` ve `backend/.gitignore` dosyalarının build ve android klasörlerini kapattığının teyidi.
- [ ] Git commit "Sprint 8 & 9" olarak atılması ve `git push origin main` komutu ile reponun senkronize edilmesi.

### Phase 2: Kapsamlı Hata Ayıklama (Bug Bash)
- [ ] Müşteri Portalı Login ve Dashboard UI/UX pürüzlerinin (görsel/işlevsel) silinmesi.
- [ ] Menü butonları ve rotalar da ki Typescript/Konsol hatalarının sıfırlanması.

### Phase 3: Vizyon Özellikleri
- [ ] **PDF Engine (HTML->PDF)** (Ekstrelerin PDF dosyası olarak indirilmesi entegrasyonu)
- [ ] **Yapay Zeka (AI) Sınıflandırma** Hazırlıkları
- [ ] **SaaS Admin Dashboard** Altyapı İyileştirmeleri
