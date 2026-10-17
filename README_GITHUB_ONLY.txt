IKHTIAR v0.1.4 — ADMIN CONSOLE | GITHUB ONLY

PERSIAPAN
1. Gunakan branch baru update/admin-console-v0.1.4 dari main.
2. Ekstrak ZIP, upload file seperti path di bawah (bukan ZIP-nya):
   index.html
   src/app.js
   src/styles.css
   sw.js
3. Jangan upload config.js, SQL, service_role key, atau dokumen Supabase ke GitHub.
4. Jalankan SQL TERPISAH: IKHTIAR_v0.1.4_SUPABASE_ONLY.sql, di Supabase SQL Editor.
5. Test admin dan user biasa, lalu Merge PR ke main.

BARU DI v0.1.4
- Panel Admin > Pengguna & Role: daftar akun (10/baris), pencarian, pagination.
- Perubahan User <-> Super Admin dengan dialog konfirmasi dan server-side RPC.
- Admin tidak dapat mengubah role akun sendiri.
- Audit perubahan role dan pengumuman, mulai setelah SQL 003 dipasang.
- Semua read/write administratif wajib diverifikasi di SQL berdasarkan auth.uid().
- Role user, tema, akun, email login, pengumuman, dan hero tetap tidak berubah.

CATATAN PENTING
Migrasi SQL v0.1.3/002 harus sudah aktif. SQL v0.1.4 tidak melakukan promosi Super Admin otomatis.
Admin yang sah harus sudah dipromosikan manual sebelumnya.
Admin dapat melihat email akun lain: ini adalah data pribadi. Berikan role Super Admin secara terbatas.
SQL Editor langsung dijalankan di Supabase; tidak lewat GitHub.
Jika SQL belum dijalankan, panel User Management tampilkan pesan keterbatasan, bukan menampilkan data palsu.
Audit log tidak memuat histori sebelum pemasangan trigger.
Logout perangkat lain tetap mengikuti waktu kedaluwarsa access token Supabase.

UJI WAJIB
[ ] Login User: Tidak melihat menu Admin, hash #/admin-settings dialihkan.
[ ] Login Super Admin: buka Administrasi > Pengguna & Role.
[ ] Daftar nama + email akun muncul setelah SQL berjalan.
[ ] Cari email user yang dikenal, tekan Cari.
[ ] Akun sendiri tidak memiliki tombol ubah role.
[ ] Klik Jadikan Super Admin, lalu Batal: data tidak berubah.
[ ] Jalankan perubahan pada AKUN UJI, bukan akun utama.
[ ] Refresh: role uji konsisten; Audit tampil catatannya.
[ ] Cabut role akun uji; akses administratif ditolak di backend.
[ ] User biasa: RPC ik_admin_list_users/ik_admin_set_role/ik_admin_list_audit ditolak.
[ ] Pengumuman masih berfungsi dan tercatat saat disunting.
[ ] Mobile 320px tidak overflow; auth & logout tetap berfungsi.
[ ] PWA update via prompt, tidak perlu unregister Service Worker.
