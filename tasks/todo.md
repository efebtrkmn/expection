# Backend Build Fix — TODO

## Durum: Planlama ✅ → Uygulama Devam Ediyor

Prisma generate sonrası 38 gerçek TS hatası kaldı. Kategorize ediyorum:

---

### Kategori 1: Test dosyalarında `postJournalEntry` 3 parametre bekliyor (dto, tenantId, userId)
- [x] `src/journal/journal.service.spec.ts` — 9 hata
- [x] `test/journal-acid.e2e-spec.ts` — 5 hata

### Kategori 2: `paidAt` ve `customerSupplier` gibi schema'da olmayan alanlar
- [x] `src/payments/iyzico/iyzico-callback.service.ts` — 6 hata (paidAt, customerSupplier include eksik)

### Kategori 3: `Public` decorator import yolu yanlış
- [x] `src/payments/payments.controller.ts` — 1 hata
- [x] `src/reconciliation/reconciliation.controller.ts` — 1 hata

### Kategori 4: Reconciliation service — Prisma include/select eksik
- [x] `src/reconciliation/reconciliation.service.ts` — 7 hata (tenant include, email select, customerSupplier include)

### Kategori 5: Banking test — Mt940 return tipi uyumsuz
- [x] `src/banking/mt940-parser.service.spec.ts` — 8 hata

### Kategori 6: Auth service — argon2 hash return tipi
- [x] `src/auth/auth.service.ts` — 1 hata

### Kategori 7: Önceki hacky fix'leri geri al
- [x] `tsconfig.json` — strict modunu geri aç (kök nedenleri düzeltildikten sonra)
- [x] `src/audit-log/audit-log.service.ts` — enum string literal'leri geri al
- [x] `src/auth/auth.service.ts` — `as any` ve string literal'leri geri al

---

## Doğrulama
- [x] `npx tsc --noEmit` 0 hata ile geçmeli
- [x] `npm run build` başarılı olmalı
- [x] `npm run start:dev` çalışmalı
