# IKHTIAR — Setup GitHub Pages & Supabase Auth (v0.1)

## 1. File yang diunggah ke GitHub

Unggah **isi folder `IKHTIAR_Foundation_v0.1`**, bukan folder luarnya:
`index.html`, `config.js`, `src/`, `assets/`, `manifest.webmanifest`, `sw.js`, `.github/`, dan seterusnya.

Buat repository baru atau gunakan repository IKHTIAR yang Anda tentukan. Tidak perlu Next.js, npm, Vercel, atau Apps Script untuk menjalankan Foundation.

### GitHub Pages

1. Commit file di branch `main`.
2. GitHub → repository → **Settings → Pages** → **Build and deployment → Source: GitHub Actions**.
3. Pastikan workflow `.github/workflows/pages.yml` sukses.
4. Buka URL GitHub Pages repository (atau custom domain jika sudah dikonfigurasi).

**Catatan GitHub Pages:** `https://username.github.io/nama-repo/` berbeda path dari custom domain; proyek menggunakan path relatif sehingga kompatibel dengan keduanya.

## 2. Buat proyek Supabase

1. Buka dashboard Supabase → New project.
2. Project Settings → Data API/API Keys: salin **Project URL** dan **publishable** atau **anon** key (bukan secret / `service_role`).
3. Edit `config.js`:

```js
export const CONFIG = {
  supabaseUrl: 'https://PROJECT_REF.supabase.co',
  supabaseAnonKey: 'PUBLISHABLE_OR_ANON_KEY',
};
```

Kunci publishable/anon memang dapat berada di frontend. Tetapi **wajib mengaktifkan Row Level Security (RLS)** pada seluruh data pribadi. Jangan menyimpan kunci rahasia di GitHub Pages.

## 3. Authentication (email + Google)

Di Supabase Dashboard → Authentication:

- Providers → **Email**: aktifkan email/password. Atur kebijakan verifikasi email untuk pengguna publik.
- Providers → **Google**: bila hendak memakai tombol Google, siapkan OAuth Client pada Google Cloud, masukkan Client ID + Secret **di Supabase Dashboard** (bukan di repo), dan set redirect callback Google sesuai instruksi Supabase.
- URL Configuration → Site URL: gunakan URL halaman publik IKHTIAR.
- Tambahkan **Redirect URLs** yang benar: GitHub Pages URL dan domain kustom Anda (misalnya `https://username.github.io/ikhtiar/**` bila sesuai). Jangan mengizinkan wildcard sembarang untuk produksi.

Gunakan URL Supabase yang sesungguhnya dan pastikan OAuth consent screen Google disiapkan untuk publik bila sudah rilis.

## 4. Cara kerja halaman

```
Splash 1,2 detik
 ├─ Akun sudah login -> Dashboard
 ├─ Belum onboarding -> 3 slide onboarding -> Login / Daftar
 └─ Pernah onboarding -> Login
      ├─ Email/password atau Google -> Supabase Auth -> Dashboard
      └─ Dashboard Demo -> Dashboard simulasi tanpa sesi login
```

- Dashboard **demo** tidak sama dengan autentikasi sungguhan dan ditandai secara jelas.
- Pada v0.1, aksi Portofolio, CV ATS, Cari Loker, dan Pengaturan masih placeholder. Tidak ada data pelamar yang benar-benar disimpan dari dashboard.
- Proses daftar email mungkin meminta verifikasi email sebelum pengguna dapat login.
- Link pemulihan kata sandi berfungsi setelah URL Auth dikonfigurasi dengan benar.

## 5. Uji lokal

Jangan membuka `index.html` lewat `file://` karena ES modules dan service worker memerlukan server lokal.

```bash
python -m http.server 8080
```

Buka `http://localhost:8080/` kemudian uji:

1. Splash → Onboarding pertama kali.
2. Onboarding 1, 2, 3 → Login.
3. Tanpa Supabase: tombol login nonaktif, tombol Dashboard Demo aktif.
4. Dashboard responsif di 390 px dan desktop.
5. Dengan Supabase: Login/Daftar dan sign out benar-benar memanggil Auth.
6. Dashboard asli **tidak** memakai statistik contoh (menampilkan nol).
7. Refresh saat login: Supabase Auth memulihkan sesi.
8. PWA: instal melalui browser setelah diakses via HTTPS/localhost.

## 6. Security & rilis

- Jangan memasukkan `service_role`, client secret Google, token API pribadi, maupun URL webhook Apps Script dengan token ke repo publik.
- Jangan menyimpan data sensitif user atau access token di localStorage buatan sendiri. Supabase JS mengelola sessionnya sendiri.
- Proteksi data harus dilakukan di database/Storage via RLS, bukan sekadar menyembunyikan menu UI.
- Jangan cache response Supabase Auth/API pada service worker.
- Sinkronisasi ke Spreadsheet dilakukan pada milestone selanjutnya, memakai proses server tepercaya, bukan memaparkan data pribadi di Spreadsheet publik.
- Untuk mengubah file PWA yang tercache, naikkan versi `CACHE` di `sw.js`.

## 7. Kelanjutan milestone

Setelah alur autentikasi diuji dan stabil: milestone 0.2 — profil pengguna & onboarding tujuan karier yang persisten di Supabase, kemudian 0.3 — Portofolio Builder, 0.4 — CV ATS, 0.5 — Job Explorer.
