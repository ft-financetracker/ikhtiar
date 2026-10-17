# Milestone 01 — Splash, Onboarding, Auth & Dashboard

## Sudah dikerjakan di paket ini
- [x] Splash loading dengan brand IKHTIAR terkunci, progress, dan tombol lewati.
- [x] Onboarding 3 langkah dengan skip/back/next dan hanya muncul sekali pada browser yang sama.
- [x] Login email/password dan registrasi menggunakan Supabase Auth, saat sudah dikonfigurasi.
- [x] Tombol Google OAuth (memerlukan setup Google Cloud + Supabase).
- [x] Lupa kata sandi dan set password baru melalui Supabase.
- [x] Dashboard responsif (sidebar desktop / bottom nav mobile), light/dark mode.
- [x] Dashboard demo berlabel jelas, tanpa sesi dan tanpa data asli.
- [x] Session persistence dikelola Supabase Auth, logout, serta route kembali ke dashboard.
- [x] Manifest PWA + service worker untuk aset statis, dan GitHub Actions deployment.
- [x] Pengujian tampilan desktop/mobile dan interaksi demo dalam Chromium (dengan harness inline), tanpa error JavaScript yang terdeteksi.

## Harus diselesaikan sebelum production
- [ ] Tentukan nama repo dan domain.
- [ ] Isi project URL + publishable/anon key Supabase di `config.js`.
- [ ] Aktifkan Email provider dan kebijakan verifikasi email.
- [ ] Siapkan Google Cloud OAuth consent, credentials, callback, dan redirect allowlist (jika login Google diaktifkan).
- [ ] Tes daftar, verifikasi email, login, password reset, refresh session, logout pada proyek Supabase yang nyata.
- [ ] Kebijakan privasi dan syarat layanan resmi.
- [ ] RLS untuk setiap tabel user yang nanti dibuat (contoh awal ada di `supabase/001_profiles.sql`).
- [ ] Jalankan security test termasuk ownership check (dua akun berbeda).
- [ ] Review ukuran ikon dan hasil ekstraksi raster logo dari brand board original (idealnya SVG final dari desainer).
- [ ] Integrasi user profile sungguhan, activity log, dan hitungan KPI — milestone berikutnya.
- [ ] Pengetesan installability PWA dan cache setelah deploy HTTPS GitHub Pages.

### Batasan penting
Login nyata memerlukan konfigurasi Supabase yang hanya bisa diisi pemilik proyek. Hasil pengujian Chromium yang tersedia hanya mencakup UI dan mode demo; bukan verifikasi alur backend eksternal atau OAuth produksi.
