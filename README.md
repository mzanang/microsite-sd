# Microsite SD Negeri Dukuhwaru 01

Microsite sekolah berbasis Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Storage, Zod, dan dnd-kit.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local` dan isi URL serta publishable key Supabase.
2. Jalankan migration `supabase/migrations/202610120001_initial.sql` melalui Supabase CLI atau SQL Editor.
3. Buat akun admin melalui Supabase Auth secara terkontrol, lalu masukkan `auth.users.id` ke `public.admin_profiles`.
4. Jalankan `npm install`, kemudian `npm run dev`.

Tanpa environment Supabase, halaman publik memakai konfigurasi lokal yang aman untuk preview visual. Operasi draf/publikasi tetap menolak request sampai Supabase dikonfigurasi.

## Deploy ke Vercel

1. Import repository `https://github.com/mzanang/microsite-sd.git` ke Vercel.
2. Pilih framework **Next.js** dan biarkan Build Command memakai `npm run build`.
3. Tambahkan environment variables berikut untuk **Production**, **Preview**, dan **Development**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` dengan URL deployment Vercel, misalnya `https://nama-proyek.vercel.app`
4. Deploy, lalu jalankan migration Supabase melalui SQL Editor sebelum memakai halaman admin.
5. Setelah domain Vercel aktif, tambahkan URL deployment tersebut ke Supabase Auth URL Configuration sebagai Site URL dan Redirect URL bila login admin dipakai.

`SUPABASE_SERVICE_ROLE_KEY` tidak diperlukan oleh runtime aplikasi ini dan jangan dimasukkan ke client-side code. Jika dipakai untuk tooling terpisah, simpan hanya sebagai environment variable server.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable/anon key untuk browser dan server session.
- `SUPABASE_SERVICE_ROLE_KEY`: hanya untuk job/server tooling khusus; tidak pernah diimpor ke Client Component.
- `NEXT_PUBLIC_SITE_URL`: URL deployment, misalnya `https://microsite.example.id`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

Rute publik membaca record berstatus `published`. Rute admin dilindungi middleware dan pemeriksaan `admin_profiles`; publishing dilakukan melalui fungsi database bertransaksi dan membuat snapshot versi.
