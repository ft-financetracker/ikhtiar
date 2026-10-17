IKHTIAR v0.1.3 — PENGATURAN & ROLE
======================================

1) FILE UPLOAD LANGSUNG
Ekstrak ZIP. Upload file pada branch update/settings-v0.1.3 di GitHub,
dengan struktur folder yang sama:
  index.html
  src/app.js
  src/styles.css
  sw.js
  supabase/002_settings_roles.sql   (dokumentasi migrasi, TIDAK dieksekusi GitHub Pages)

GitHub Pages hanya menjalankan frontend. Sebelum publish, buka Pull Request dan lihat
perbedaan file. Jangan unggah config.js dari komputer ke ZIP ini.

2) SUPABASE — WAJIB UNTUK SUPER ADMIN
Supabase Dashboard > SQL Editor > New query > salin isi
  supabase/002_settings_roles.sql
Jalankan SQL. SQL ini membuat tabel account_roles dan platform_settings.
Kemudian jalankan secara TERPISAH (di SQL Editor, bukan GitHub) penetapan Super Admin:
  INSERT INTO public.account_roles(user_id, role)
  SELECT id, 'super_admin' FROM auth.users WHERE email = 'EMAIL_ANDA_SENDIRI'
  ON CONFLICT (user_id) DO UPDATE SET role = excluded.role;
Ganti email dengan email akun yang benar. Pastikan akun terdaftar dan query menyasar
tepat satu user. Setelah itu login ulang / refresh.

Tanpa migrasi, fitur Pengaturan USER tetap berjalan. Panel admin TIDAK terbuka.
Tidak ada promosi admin melalui metadata pengguna atau localStorage.

3) FITUR TERSEDIA
- Pengaturan USER: kartu accordion, ubah nama akun, tema terang/gelap/otomatis,
  ukuran teks, kirim tautan reset password, konfirmasi logout lokal/semua sesi.
- Area SUPER ADMIN: navigasi terpisah, pengumuman resmi yang tersimpan di
  public.platform_settings dan tampil di Dashboard pengguna.
- Halaman privasi & info versi hanya informatif; manajemen role seluruh pengguna,
  audit log, maintenance, dan penghapusan akun belum tersedia.
- Dashboard hero, menu Portofolio/CV/Job, registrasi, dan login tetap seperti v0.1.2.

4) PENGUJIAN
[ ] Dari USER: Pengaturan terbuka dan kartu bisa expand/collapse.
[ ] USER tidak melihat Panel Super Admin dan tidak dapat membuka #/admin-settings.
[ ] Save nama, refresh, nama baru masih sama.
[ ] Tema/ukuran teks tetap setelah refresh; browser mobile tidak overflow.
[ ] Reset password mengirim email (perhatikan rate limit Supabase).
[ ] Logout lokal dan semua perangkat memiliki konfirmasi yang sesuai.
[ ] Dari SUPER ADMIN: muncul navigasi Admin dan dapat simpan pengumuman.
[ ] USER biasa tidak dapat melakukan UPDATE public.platform_settings (RLS).
[ ] Pengumuman muncul di Dashboard User setelah refresh.
[ ] PWA update tanpa hapus Service Worker.

PENTING: Logout semua perangkat mencabut refresh token di Supabase; perangkat lain
mungkin masih bisa memakai access token sampai masa berlakunya habis. Pengujian
RLS sebaiknya menggunakan akun user non-admin terpisah.
