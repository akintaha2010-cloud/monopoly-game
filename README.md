# Monopoly

Tarayıcıda çalışan, 2–4 kişilik (aynı bilgisayarda sırayla) Monopoly oyunu. Saf HTML/CSS/JavaScript, derleme adımı yok.

## Özellikler

- 40 karelik klasik tahta, 8 renk grubu, 4 demiryolu, 2 idare
- Zar, çift atınca tekrar oynama, üst üste 3 çiftte hapis
- Mülk satın alma, kira (renk grubu tekelinde 2 kat), demiryolu ve idare kiraları
- Eşit dağılım kuralıyla ev/otel kurma ve satma
- İpotek etme ve ipotek kaldırma (%10 faiz)
- Şans ve Kamu Fonu kartları, hapisten ücretsiz çıkış kartı
- Hapis: çift atarak, 50₺ ödeyerek ya da kart kullanarak çıkış
- Borç ve iflas; son kalan oyuncu kazanır

## Çalıştırma

ES modülleri kullandığı için dosyayı doğrudan açmak yerine yerel bir sunucuyla aç:

```bash
python3 -m http.server 8080
# ya da: npm start
```

Ardından tarayıcıda http://localhost:8080 adresine git.

## Testler

```bash
npm test
```

## Yapı

- `js/board.js`: tahta kareleri, kira tabloları, kart desteleri
- `js/game.js`: oyun kuralları (arayüzden bağımsız `Game` sınıfı)
- `js/ui.js`: tahta çizimi ve butonlar
- `tests/game.test.js`: kural testleri (`node:test`)
