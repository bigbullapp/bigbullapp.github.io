# BigBullApp Web Tasarım Sistemi

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2

Design Read: Reading this as: Turkish streaming plugin repository for Cloudstream and Nuvio viewers, returning to the iconic BigBullApp illustrated mascot identity set against an expansive widescreen backdrop with restrained Liquid Glass surfaces, dial ENERGY 2 / RHYTHM 2 / MOTION 2.

## Yon (Direction)

- **Product:** Cloudstream ve Nuvio istemcileri için 142 modül, 140 Nuvio eklentisi ve 189 canlı TV kanalını tek kurulum adresinde sunan Türkçe sağlayıcı deposu.
- **Character:** editoryal, optik, davetkar
- **World:** BigBullApp'in ikonik kulaklıklı karakterinin geniş ekran altın halesi üzerinde süzülen yalın optik cam paneller (Liquid Glass).
- **Moments:**
  1. Hero arkasını kaplayan dev BigBullApp illüstrasyonu üzerinde yüzen Liquid Glass üst bar ve Kurulum konsolu.
  2. Cam kenarlıklı (specular rim-light) çerçevelere oturan 142 sağlayıcıyı kapsayan 3 sütunlu dizin ve yenilenmiş Liquid Glass alt bilgi paneli.
- **Signature:** İkonik BigBullApp altın (`#F4B942`) vurgusu, optik cam kenar yansıması ve dokunsal `tabular-nums` indeks sayıları.

## Renk Sistemi

### Koyu Tema (Varsayilan, `data-theme="dark"`)

- `--dark-bg-canvas`: `#070B18`
- `--dark-bg-surface`: `#0E152B`
- `--dark-bg-card`: `rgba(16, 26, 54, 0.72)`
- `--dark-bg-glass`: `rgba(14, 22, 46, 0.28)`
- `--dark-border-glass`: `rgba(255, 255, 255, 0.28)`
- `--dark-border-hairline`: `rgba(182, 206, 255, 0.18)`
- `--dark-text-primary`: `#F3F6FF`
- `--dark-text-secondary`: `#BFCBE8`
- `--dark-text-muted`: `#8FA3CF`
- `--dark-accent`: `#F4B942`
- `--dark-accent-ink`: `#070B18`
- `--dark-status-ok`: `#34D399`
- `--dark-status-live`: `#F4B942`
- `--dark-status-off`: `#8FA3CF`

### Acik Tema (`data-theme="light"`)

- `--light-bg-canvas`: `#EEF2FA`
- `--light-bg-surface`: `#FFFFFF`
- `--light-bg-card`: `rgba(255, 255, 255, 0.78)`
- `--light-bg-glass`: `rgba(255, 255, 255, 0.42)`
- `--light-border-glass`: `rgba(255, 255, 255, 0.85)`
- `--light-border-hairline`: `rgba(29, 53, 128, 0.14)`
- `--light-text-primary`: `#0F1733`
- `--light-text-secondary`: `#344166`
- `--light-text-muted`: `#505E82`
- `--light-accent`: `#1D3580`
- `--light-accent-ink`: `#FFFFFF`
- `--light-accent-signal`: `#9A5B00`
- `--light-status-ok`: `#0F7A4D`
- `--light-status-live`: `#9A5B00`
- `--light-status-off`: `#505E82`

## Typography

### Font Aileleri

- Display (`--font-display`): `Newsreader`, Georgia, serif (weights 500)
- Arayuz / Govde (`--font-sans`): `Schibsted Grotesk`, system-ui, sans-serif (weights 400, 500, 600)
- Kod / Sayaclar (`--font-mono`): `JetBrains Mono`, ui-monospace, monospace (weights 400, 600)

### Boyut Olcegi (Yalniz Bu 7 Adim)

- `12px` (`0.75rem`): Tus kapaklari ve meta veriler
- `14px` (`0.875rem`): Navigasyon, butonlar, filtre haplari, kart alt durumlari
- `16px` (`1rem`): Govde metni, hero aciklamasi, arama girdisi
- `20px` (`1.25rem`): Saglayici kart basliklari (`h3`) ve alt basliklar
- `28px` (`1.75rem`): Kurulum panel basligi (`h2`)
- `36px` (`2.25rem`): Bolum basliklari (`h2`) ve mobil `h1`
- `52px` (`3.25rem`): Masaustu `h1`

## Liquid Glass & Kose Olcegi

- Cam yuzeyler: Yuzen Ust Bar, Kurulum Konsolu, Durum Grafigi, Arama/Filtre Bari, Footer Paneli (`backdrop-filter: blur(26px) saturate(240%)`).
- Kartlar (`22px` radius): Yari saydam cam-yuzeyli optik spekuler ust kenar isigi (`backdrop-filter` olmadan 60fps kaydirma icin GPU dostu).
- Tum bosluklar `4px` izgarasinda (`4, 8, 12, 16, 20, 24, 32, 48, 64, 88`).
