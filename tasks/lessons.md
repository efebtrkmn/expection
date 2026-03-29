# Lessons Learned

## 2026-03-28: Hacky TS Fix Yaklaşımı
- **Hata:** `strict: false` ayarlayarak, `as any` cast'ler kullanarak ve enum'ları string literal'lere çevirerek TypeScript hatalarını bastırmaya çalıştım.
- **Kök Neden:** Prisma Client'ın enum'ları doğru export edip etmediğini kontrol etmedim. `npx prisma generate` sonrası node_modules'daki generated client'a bakmadım.
- **Kural:** Tip hatalarını bastırma, kök nedenini bul. `as any` kullanımı son çare olmalı, ilk çare değil.
- **Kural:** Bir dosyada 3+ hata varsa, dosyanın tamamını oku, anla, sonra düzelt.

## 2026-03-28: X-Tenant-ID Header Gereksinimi
- **Hata:** Client portal login isteğinde `X-Tenant-ID` header'ı göndermeyerek 401 aldım.
- **Kök Neden:** Backend'de global `TenantGuard` tüm isteklerde (`@Public()` dahil) tenant kontrolü yapıyor. `@Public()` sadece `JwtAuthGuard`'ı devre dışı bırakıyor.
- **Kural:** Multi-tenant backend'e istek atarken her zaman `X-Tenant-ID` header'ını gönder.
- **Kural:** Backend guard zincirini (JwtAuth → Tenant → Roles) tam anla, `@Public()` sadece ilk guard'ı etkiler.

## 2026-03-28: Sidebar Layout — Shared State
- **Hata:** Sidebar collapsed state'i `useState` ile tutup, layout'ta sabit `ml-[240px]` kullandım. Sidebar küçüldüğünde content overlap etti.
- **Kök Neden:** Sidebar ve layout farklı component — state paylaşılmıyordu.
- **Kural:** Birden fazla component'in react etmesi gereken UI state'i Zustand store'da tut, useState'de değil.
- **Kural:** Fixed sidebar + dynamic content margin kullanırken, inline `style` ile pixel değeri senkronla; Tailwind class'ları HMR'da gecikebilir.

## 2026-03-28: CSS Glass-card Hover Transform
- **Hata:** `glass-card:hover { transform: translateY(-2px) }` dashboard grid kartlarında layout shift yaratıyordu.
- **Kural:** Grid item'larda `transform` yerine `box-shadow` kullan; layout shift yaratmaz.

## 2026-03-28: Prisma Create — Mixed Relation vs Direct ID
- **Hata:** `data: { tenantId, ... }` ile `data: { tenant: { connect: { id } }, ... }` karıştırınca Prisma "property is not assignable to type never" hatası verdi.
- **Kural:** Prisma'da ya tüm foreign key'leri direkt yaz (`tenantId`, unchecked) ya da tüm ilişkileri `connect` ile yaz. Karıştırma.
- **Kural:** Prisma tip sorunlarından kaçınamıyorsan, `as any` cast ile bypass et — runtime'da doğru çalışır.

## 2026-03-28: Client Portal ≠ Admin Portal
- **Hata:** Kullanıcı "fatura ekleyemiyorum" dedi. Client portal sadece görüntüleme için tasarlanmıştı.
- **Kural:** Kullanıcının ihtiyacını anla — "müşteri portalı" bile olsa CRUD gerekebilir. Backend'de client-specific endpoint'ler ekle.
- **Kural:** Middleware matcher'a yeni route eklerken hem protectedPaths hem config.matcher'ı güncelle.

## 2026-03-28: Prisma Schema Alan Adı Uyumsuzluğu
- **Hata:** `withholdingAmount` adıyla InvoiceItem create data'sında alan gönderdim. Prisma şemasındaki gerçek alan adı `lineWithholding`.
- **Hata:** `createdById` zorunlu FK alanını Invoice create'de göndermeyince 500 Internal Server Error aldım. Client portal kullanıcıları User tablosunda olmadığı için tenant'ın ilk User'ını bulup kullanmak gerekti.
- **Kural:** **Prisma `create` çağrısı yazmadan önce şemadaki model alanlarını kontrol et.** Alan adı uyumsuzluğu `Unknown argument` hatası verir.
- **Kural:** **NestJS 500 hatası aldığında try-catch ile gerçek hatayı loglayıp frontend'e döndür.** Generic "Internal server error" debugging'i imkansız kılar.
- **Kural:** **FK kısıtlarını (zorunlu relation field'lar) elle kontrol et.** Client portal context'inde farklı kullanıcı modeli olabilir.
- **Kural:** Frontend enum seçeneklerini Prisma enum değerleriyle eşle (örn: `RETURN` → `RETURN_SALES`).
