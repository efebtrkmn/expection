# Lessons Learned

## 2026-03-28: Hacky TS Fix Yaklaşımı
- **Hata:** `strict: false` ayarlayarak, `as any` cast'ler kullanarak ve enum'ları string literal'lere çevirerek TypeScript hatalarını bastırmaya çalıştım.
- **Kök Neden:** Prisma Client'ın enum'ları doğru export edip etmediğini kontrol etmedim. `npx prisma generate` sonrası node_modules'daki generated client'a bakmadım.
- **Kural:** Tip hatalarını bastırma, kök nedenini bul. `as any` kullanımı son çare olmalı, ilk çare değil.
- **Kural:** Bir dosyada 3+ hata varsa, dosyanın tamamını oku, anla, sonra düzelt.
