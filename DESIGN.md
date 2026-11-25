# BigBullApp Web Tasarım Sistemi

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2

Design Read: Reading this as: Turkish streaming plugin repository for Cloudstream and Nuvio viewers, returning to the iconic BigBullApp illustrated mascot identity set against an expansive widescreen backdrop with restrained Liquid Glass surfaces, dial ENERGY 2 / RHYTHM 2 / MOTION 2.

## Yon (Direction)

- **Product:** Cloudstream ve Nuvio istemcileri için 113 modül, 111 akış eklentisi ve 156 canlı TV kanalını tek kurulum adresinde sunan Türkçe sağlayıcı deposu.
- **Character:** editoryal, optik, davetkar
- **World:** BigBullApp'in ikonik kulaklıklı karakterinin geniş ekran altın halesi üzerinde süzülen yalın optik cam paneller (Liquid Glass).
- **Moments:**
  1. Hero arkasını kaplayan dev BigBullApp illüstrasyonu üzerinde yüzen Liquid Glass üst bar ve Kurulum konsolu.
  2. Cam kenarlıklı (specular rim-light) çerçevelere oturan 111 gerçek sağlayıcı logolu 3 sütunlu dizin ve yenilenmiş Liquid Glass alt bilgi paneli.
- **Signature:** İkonik BigBullApp altın (`#EAB83B`) vurgusu, optik cam kenar yansıması ve dokunsal `tabular-nums` indeks sayıları.

## Renk Sistemi

### Koyu Tema (Varsayilan, `data-theme="dark"`)

- `--bg-canvas`: `#0C0D12`
- `--bg-surface`: `#13151C`
- `--bg-glass`: `rgba(20, 22, 30, 0.56)`
- `--border-glass`: `rgba(255, 255, 255, 0.16)`
- `--border-hairline`: `rgba(243, 245, 248, 0.10)`
- `--text-primary`: `#F4F5F7`
- `--text-secondary`: `#B8BECB`
- `--text-muted`: `#8E95A6`
- `--accent`: `#EAB83B`
- `--accent-ink`: `#0C0D12`
- `--status-ok`: `#4CD98B`
- `--status-live`: `#EAB83B`
- `--status-off`: `#8E95A6`

### Acik Tema (`data-theme="light"`)

- `--bg-canvas`: `#F2F3F6`
- `--bg-surface`: `#FFFFFF`
- `--bg-glass`: `rgba(255, 255, 255, 0.62)`
- `--border-glass`: `rgba(14, 16, 21, 0.14)`
- `--border-hairline`: `rgba(14, 16, 21, 0.09)`
- `--text-primary`: `#0E1015`
- `--text-secondary`: `#3C424F`
- `--text-muted`: `#555C6B`
- `--accent`: `#0E1015`
- `--accent-ink`: `#FFFFFF`
- `--accent-signal`: `#8F5B00`
- `--status-ok`: `#13733E`
- `--status-live`: `#8F5B00`
- `--status-off`: `#555C6B`

## Typography

### Font Aileleri

- Display (`--font-display`): `Newsreader`, Georgia, serif (weights 500, 600)
- Arayuz / Govde (`--font-sans`): `Schibsted Grotesk`, system-ui, sans-serif (weights 400, 500, 600)
- Kod / Sayaclar (`--font-mono`): `JetBrains Mono`, ui-monospace, monospace (weights 400, 500)

### Boyut Olcegi (Yalniz Bu 7 Adim)

- `12px` (`0.75rem`): Tus kapaklari ve meta veriler
- `14px` (`0.875rem`): Navigasyon, butonlar, filtre haplari, kart alt durumlari
- `16px` (`1rem`): Govde metni, hero aciklamasi, arama girdisi
- `20px` (`1.25rem`): Saglayici kart basliklari (`h3`) ve alt basliklar
- `28px` (`1.75rem`): Kurulum panel basligi (`h2`)
- `36px` (`2.25rem`): Bolum basliklari (`h2`) ve mobil `h1`
- `52px` (`3.25rem`): Masaustu `h1`

## Liquid Glass & Kose Olcegi

- 4 cam yuzey: Yuzen Ust Bar, Kurulum Konsolu, Arama/Filtre Bari, Footer Paneli (`backdrop-filter: blur(26px) saturate(180%)`).
- Kartlar (`18px` radius): Yari saydam cam-yuzeyli optik spekuler ust kenar isigi ile yenilenmis cerceve.
- Tum bosluklar `4px` izgarasinda (`4, 8, 12, 16, 20, 24, 32, 48, 64, 88`).
