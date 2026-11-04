# AutoPro

Detailing ve oto kuaför atölyeleri için araç kabul, hasar kaydı, atölye panosu, randevu ve kasa.

## Çalıştırma

```bash
npm install
cp .env.example .env   # DATABASE_URL ve SESSION_SECRET doldurulur
npx prisma db push
npm run db:seed        # Örnek atölye, iş emirleri, usta ve demo hesapları yükler
npm run dev
```

Üretimde `npm start`: önce `prisma db push` (yalnızca veri kaybettirmeyen değişiklikler), sonra `next start`.

## Yapı

- **Veritabanı:** kendi `autopro` veritabanı (LaundryPro ile aynı MySQL sunucusu, ayrı veritabanı ve kullanıcı). Şema: `prisma/schema.prisma`.
- **Oturum:** imzalı, httpOnly çerez (`lib/session.ts`); sayfalar sunucuda veriyi okur.
- **Tasarım:** grafit zemin, tek vurgu rengi sinyal sarısı (`app/globals.css`); başlık ve plaka Barlow, metin Inter. Plaka bileşeni `components/plate.tsx`.
- **LaundryPro'dan alınanlar:** `lib/turkey-time.ts`, `lib/route-order.ts`, `lib/geocode.ts`, `lib/csv.ts`, `lib/turkish-locations.ts`, `scripts/start.mjs`.

## Yol haritası

1. ✓ İskelet: kayıt, giriş, Bugün, menü
2. Hizmetler ve fiyatlar (araç sınıfı katsayıları)
3. Araç kabul: plaka → araç/müşteri → hizmetler → hasar şeması ve fotoğraf → onay
4. Atölye panosu ve iş emri
5. Müşteri takip sayfası
6. Randevu takvimi (istasyon çakışması)
7. Kasa, giderler, usta primi
8. Bakım hatırlatmaları
9. ✓ Android kabuğu (Capacitor) ve yasal metinler

### Mobil (Capacitor)

```bash
npm run cap:sync    # Web varlıklarını ve eklentileri Android projesine eşitler
npm run cap:open    # Android Studio'yu açar
```

Uygulama canlı siteyi açar (`https://autopro.kodleon.com`); başka bir sunucu için `CAPACITOR_SERVER_URL` verilir. Gradle için Java 21 gerekir. Yayın imzası `android/keystore.properties` ve `android/autopro-upload.jks` dosyalarından okunur, ikisi de depoya girmez; kaybolursa uygulama aynı imzayla güncellenemez, yedekleyin. Sitedeki APK: `cd android && ./gradlew assembleRelease`, sonra `app/build/outputs/apk/release/app-release.apk` dosyası `public/AutoPro.apk` olarak kopyalanır. İkon ve açılış görselleri `assets/` klasöründen `npx @capacitor/assets generate --android` ile üretilir.

### Demo modu

`AUTO_SEED=true` ile uygulama herkese açık demo olarak çalışır: demo atölyesi açılışta ve her gece 03.00'te yeniden kurulur, demo hesapta şifre, işletme bilgisi ve personel işlemleri kapanır, fotoğraf yüklemeye sınır gelir. Kendi kaydolan atölyeler, bir hafta boyunca giriş yapılmaz ve iş açılmazsa silinir.
