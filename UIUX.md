# UIUX.md — Rencana Peningkatan UI/UX CineBox

Dokumen ini melengkapi `Plan.md` dengan fokus khusus pengalaman pengguna.
Scope yang disetujui: **Fase 1 + Fase 2**, termasuk fitur lanjut-tonton
(localStorage) dan rating film.

---

## 1. Evaluasi Kondisi Awal

| Area | Masalah Utama |
|---|---|
| Player video | Menu kualitas hanya muncul saat hover (tidak ditemukan di perangkat sentuh), tidak ada shortcut keyboard, tidak ada resume posisi, tidak ada state error |
| Katalog | Tidak ada skeleton loading, filter genre tanpa tombol reset "Semua", tanpa opsi urutkan, hero statis |
| Admin | Banner notifikasi kasar, `window.confirm()` bawaan browser, slug manual sepenuhnya |
| Global | Belum ada `loading.tsx` / `error.tsx` / `not-found.tsx`, class Tailwind berulang ad-hoc |

## 2. Perubahan Database

- Kolom baru `Movie.rating Float?` (skala 0–10, opsional).
- Migrasi via `prisma db push` (additive, aman terhadap data lama).
- API `POST/PUT /api/movies` menerima & memvalidasi rating (clamp 0–10).
- Seed contoh diperbarui dengan rating.

## 3. Fase 1 — Perbaikan Kritis

### 3.1 Player Video (`VideoPlayer.tsx`)
- Tombol pemilih kualitas **selalu terlihat** (menghapus pola hide-until-hover).
- Tap target minimal 44×44px untuk semua kontrol overlay.
- State error: overlay pesan + tombol "Coba Lagi" saat video gagal dimuat
  (HLS fatal tanpa fallback MP4, atau elemen `<video>` error).
- Props baru `slug` untuk identitas resume.

### 3.2 Skeleton & Error Page
- `src/app/loading.tsx` — shimmer hero + grid kartu (animate-pulse).
- `src/app/movie/[slug]/loading.tsx` — kotak player + baris teks shimmer.
- `src/app/error.tsx` — pesan ramah + tombol reset (client component).
- `src/app/not-found.tsx` — halaman 404 bertema sinema + link ke katalog.

### 3.3 Filter & Urutkan Katalog
- Chip **"Semua"** di GenreFilter (aktif ketika tanpa filter genre).
- Komponen `SortDropdown`: Terbaru / Tahun ↓ / Judul A–Z → query param `?sort=`.
- Mapping orderBy di server page.

### 3.4 Admin
- Komponen `Toaster` — toast auto-dismiss 4 detik menggantikan banner.
- Komponen `ConfirmModal` — dialog konfirmasi hapus yang proper.
- Auto-slug live: slug terisi otomatis dari judul selama belum diedit manual.

## 4. Fase 2 — Pengalaman Penonton

### 4.1 Hero Carousel (`HeroCarousel.tsx`)
- Rotasi otomatis maksimal 5 film terbaru (interval 6 detik).
- Dot indicator + tombol panah prev/next; pause saat hover.
- Transisi fade antar slide.

### 4.2 Lanjut Tonton (`lib/watch-progress.ts`)
- Helper localStorage: simpan/muat/hapus posisi per slug (`cb-pos-{slug}`).
- Simpan posisi pada `timeupdate` (throttle ~5 detik) dan `pause`.
- Saat halaman detail dibuka dan ada posisi tersimpan (>15s, < durasi−30s):
  tampilkan bar "Lanjutkan dari mm:ss?" dengan pilihan Lanjutkan / Mulai Ulang.

### 4.3 Shortcut Keyboard Player
- Space/K: play-pause; ←/→: seek ±10 detik; F: fullscreen; M: mute.
- Aktif global di halaman detail, diabaikan saat fokus berada di input/textarea.
- Baris hint kecil di bawah player (hanya desktop).

### 4.4 Film Serupa
- Query film dengan genre overlap (exclude film aktif, limit 6).
- Grid mini `MovieCard` di bawah bagian info.

### 4.5 Rating & Bagikan
- Badge ⭐ rating di `MovieCard` (format `8.5`, hanya jika > 0).
- Input rating di form admin (0–10).
- Tombol Bagikan di halaman detail → salin link + toast konfirmasi.

## 5. File yang Dibuat/Diubah

```
Baru:
  prisma (kolom rating via schema.prisma)
  src/lib/watch-progress.ts
  src/components/{Toaster,ConfirmModal,SortDropdown,HeroCarousel}.tsx
  src/app/loading.tsx
  src/app/movie/[slug]/loading.tsx
  src/app/error.tsx
  src/app/not-found.tsx

Diubah:
  prisma/schema.prisma, prisma/seed.js
  src/components/{VideoPlayer,GenreFilter,MovieCard}.tsx
  src/app/page.tsx, src/app/movie/[slug]/page.tsx, src/app/admin/page.tsx
  src/app/api/movies/route.ts, src/app/api/movies/[id]/route.ts
```

## 6. Checklist Eksekusi

- [x] Migrasi DB kolom rating + API + seed
- [x] Helper watch-progress + komponen reusable (Toaster, ConfirmModal, SortDropdown, HeroCarousel)
- [x] Rombak VideoPlayer (kualitas selalu tampak, shortcut, resume, share, error state)
- [x] Halaman publik (skeletons, error/404, filter+sort, carousel, film serupa, badge rating)
- [x] Admin (toast, modal hapus, auto-slug, input rating)
- [x] Verifikasi `npm run build` + smoke test interaksi

## 7. Catatan Implementasi

### Status HTTP 404 pada halaman detail yang di-streaming
Next.js 16 melakukan *streaming* respons untuk halaman dinamis: begitu ada `await`
yang menunda render, header terkirim dengan status 200 dan tidak bisa diubah
lagi — meskipun halaman memanggil `notFound()`. Ini perilaku resmi framework
(lihat dokumen bawaan: `loading.md § Status Codes`):

- Halaman 404 tetap tampil benar di browser.
- Next.js otomatis menyisipkan `<meta name="robots" content="noindex">` pada
  HTML hasil streaming sehingga **tidak akan terindeks** meski statusnya 200.
- Jika suatu saat dibutuhkan status 404 "sungguhan" (misal untuk analitik),
  solusi resminya adalah pengecekan slug di `proxy.ts` sebelum rendering.
