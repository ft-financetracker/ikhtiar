# IKHTIAR — Foundation v0.1.0

**Your Career, Your Move.** — Career Platform by Qulaimun.id.

Prototype fungsional untuk alur pertama: **Splash → Onboarding (3 slide) → Login/Daftar → Dashboard**.

## Teknologi (LOCK)

- GitHub Pages: hosting frontend statis.
- HTML + CSS + JavaScript: frontend tanpa Next.js, npm atau Vercel.
- Supabase: Auth (email/password & Google OAuth). PostgreSQL/Storage disiapkan untuk fase berikutnya.
- Google Apps Script + Google Sheets: *tetap dalam roadmap*, tidak dipanggil di Foundation ini.

## Cara jalankan

```bash
cd IKHTIAR_Foundation_v0.1
python -m http.server 8080
```

Buka `http://localhost:8080`. Mode dashboard demo dapat dicoba tanpa Supabase.

Untuk mengaktifkan autentikasi sungguhan, isi `config.js` menggunakan URL dan publishable/anon key Supabase Anda, lalu ikuti [`docs/SETUP_GITHUB_SUPABASE.md`](docs/SETUP_GITHUB_SUPABASE.md).

## Keamanan

Jangan letakkan Supabase `service_role` key atau Google OAuth client secret di frontend. Project URL dan anon/publishable key adalah publik dan harus dikombinasikan dengan RLS. Dashboard demo **bukan login** dan **bukan data pengguna**.

## Struktur

```
index.html                    # Shell dan SVG icon sprite
src/styles.css               # Design system responsif
src/app.js                   # Routing, onboarding, login, dashboard
config.js                    # Config publik Supabase (placeholder)
assets/brand/                # Logo diambil dari brand board yang LOCK
manifest.webmanifest         # PWA
sw.js                        # Cache aset statis, bukan data pribadi
supabase/001_profiles.sql    # Skema contoh tahap profil, opsional
.github/workflows/pages.yml  # Deploy GitHub Pages
```

**Batasan:** CV/portofolio/loker belum diimplementasi; berfungsi sebagai shortcut placeholder. Integrasi Sheets dan Apps Script belum dibuat karena tahap ini fokus pada foundation. Ikon mark adalah ekstraksi raster dari referensi brand board LOCK; aset SVG produksi perlu direkonstruksi dari sumber desain asli untuk presisi sempurna.
