# Plan — Website Menonton Film dengan IS3 Storage

Website streaming film (katalog, pencarian, filter genre) dengan file video berukuran besar
(700MB–2GB) disimpan di **IS3 Storage** (object storage S3-compatible), diakses via **URL publik**.

---

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS (tema gelap ala Netflix) |
| Database | Prisma + SQLite (metadata film & job transcode) |
| Storage SDK | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (S3-compatible → IS3) |
| Upload besar | Presigned Multipart Upload langsung browser → IS3 |
| Transcoding | FFmpeg (system binary, fallback `ffmpeg-static`) |
| Player | `hls.js` (HLS adaptive + pemilih kualitas), fallback MP4 progresif |

## 2. Konfigurasi Environment

```env
IS3_ENDPOINT_URL=https://endpoint-is3.com
IS3_REGION=us-east-1
IS3_ACCESS_KEY_ID=xxxx
IS3_SECRET_ACCESS_KEY=xxxx
IS3_BUCKET=movie-bucket
IS3_PUBLIC_BASE_URL=https://bucket.endpoint-is3.com   # base URL publik untuk playback
```

## 3. Arsitektur Upload File Besar (700MB–2GB)

Upload TIDAK melewati server Next.js (hindari timeout/beban bandwidth). Alurnya:

```
POST /api/upload/init        → server eksekusi CreateMultipartUploadCommand
                               return { uploadId, key }
POST /api/upload/part-url    → server generate presigned URL per part (batch)
Browser                      → pecah file jadi chunk ±10MB, upload paralel (3–5 concurrent)
                               langsung ke endpoint IS3, retry per-chunk yang gagal
POST /api/upload/complete    → CompleteMultipartUploadCommand (dengan daftar ETag parts)
POST /api/upload/abort       → AbortMultipartUploadCommand (batalkan/cleanup)
```

- Progress bar menampilkan persen + kecepatan.
- Chunk gagal hanya di-retry sendiri (resume-friendly), bukan mengulang seluruh file.
- Setelah complete: simpan `originalUrl = IS3_PUBLIC_BASE_URL/{key}` ke database.

> ⚠️ **Prasyarat:** bucket IS3 harus dikonfigurasi CORS (izinkan method `PUT/HEAD`
> dari origin aplikasi) agar browser bisa upload langsung.

## 4. Transcode HLS (Manual + Pilih Resolusi)

- Di halaman admin, tiap film punya tombol **"Transcode ke HLS"** → modal centang resolusi:
  `360p ☐ 480p ☐ 720p ☐ 1080p ☐`.
- `POST /api/movies/[id]/transcode` `{ qualities: ["720p"] }` → spawn job FFmpeg background:
  - Per resolusi: `-vf scale=-2:H -c:v h264 -b:v {bitrate} -c:a aac`, segment HLS 6 detik.
  - Hasil per resolusi: variant playlist `.m3u8` + segmen `.ts`.
  - Master playlist dibuat manual dari variant yang dipilih.
- Semua output di-upload ke `videos/{slug}/hls/...` di bucket, lalu set:
  - `hlsUrl = master.m3u8 (URL publik)`
  - `hlsStatus = ready`, `hlsQualities = JSON array`

Bitrate ladder:

| Resolusi | Video Bitrate | Audio |
|---|---|---|
| 360p | ~800k | 96k AAC |
| 480p | ~1400k | 128k AAC |
| 720p | ~2800k | 128k AAC |
| 1080p | ~5000k | 192k AAC |

Status job (`none → processing → ready/failed`) tersimpan di tabel `TranscodeJob`,
halaman admin polling status tiap beberapa detik.

## 5. Playback (User Experience)

- Jika `hlsStatus = ready` → player memakai `hls.js` dengan menu pilih kualitas
  (**Auto / 1080p / 720p / …**) — kualitas menyesuaikan bandwidth otomatis saat Auto.
- Fallback: MP4 progresif (`originalUrl`) — tetap bisa stream & seek (HTTP Range).
- UI player: poster sebelum play, spinner buffering, kontrol native + overlay kualitas.

## 6. Skema Database (Prisma + SQLite)

```prisma
model Movie {
  id           String   @id @default(cuid())
  title        String
  slug         String   @unique
  description  String?
  genres       String?            // dipisah koma: "Action, Sci-Fi"
  year         Int?
  durationSec  Int?
  posterUrl    String?
  originalUrl  String?            // MP4 asli di IS3 (public URL)
  hlsUrl       String?            // master.m3u8 public URL
  hlsStatus    String   @default("none") // none | processing | ready | failed
  hlsQualities String?            // JSON: ["360p","720p"]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model TranscodeJob {
  id         String    @id @default(cuid())
  movieId    String
  movie      Movie     @relation(fields: [movieId], references: [id], onDelete: Cascade)
  qualities  String              // JSON array
  status     String    @default("processing") // processing | ready | failed
  error      String?
  createdAt  DateTime  @default(now())
  finishedAt DateTime?
}
```

## 7. Struktur Proyek

```
src/
├── app/
│   ├── page.tsx                     # Katalog + search + filter genre
│   ├── movie/[slug]/page.tsx        # Detail + player
│   ├── admin/page.tsx               # CRUD film + upload + transcode
│   └── api/
│       ├── movies/route.ts                # GET list, POST create
│       ├── movies/[id]/route.ts           # GET, PUT, DELETE
│       ├── movies/[id]/transcode/route.ts # POST trigger, GET status job
│       └── upload/
│           ├── init/route.ts
│           ├── part-url/route.ts
│           ├── complete/route.ts
│           └── abort/route.ts
├── components/
│   ├── MovieCard.tsx
│   ├── SearchBar.tsx
│   ├── GenreFilter.tsx
│   ├── VideoPlayer.tsx        # hls.js + quality selector
│   ├── UploadDropzone.tsx     # multipart + progress
│   └── TranscodeModal.tsx     # pilih resolusi
└── lib/
    ├── db.ts                  # Prisma client singleton
    ├── s3.ts                  # S3Client + helper presign
    └── ffmpeg.ts              # resolve binary + ladder + runner job
prisma/
├── schema.prisma
└── seed.js                    # data contoh (video publik untuk demo)
```

## 8. Halaman & Fitur

| Route | Fitur |
|---|---|
| `/` | Grid poster film, search bar (judul), filter chip genre, hero section |
| `/movie/[slug]` | Poster, sinopsis, metadata (tahun, durasi, genre), player video |
| `/admin` | Daftar film (edit/hapus), form tambah/edit, upload video multipart dengan progress, tombol transcode + pilih resolusi, status job realtime |

## 9. Prasyarat Non-Kode (tanggung jawab pengguna)

1. **CORS di bucket IS3**: izinkan `PUT`, `HEAD` (+ `GET`) dari origin aplikasi — wajib untuk upload langsung dari browser.
2. **FFmpeg** terinstall di mesin/server (aplikasi otomatis fallback ke `ffmpeg-static` bila tidak ada).
3. Bucket mengizinkan **public read** (sesuai keputusan akses URL publik).
4. Hosting harus **server/VM** (bukan serverless) karena menjalankan proses FFmpeg.

## 10. Langkah Eksekusi & Status

- [x] Scaffold Next.js + TS + Tailwind
- [x] Install dependencies
- [x] Prisma schema + db push + seed contoh
- [x] Lib S3 client + FFmpeg helper + `.env.example`
- [x] API routes movies CRUD
- [x] API routes upload multipart
- [x] API routes transcode trigger/status + worker FFmpeg
- [x] Komponen UI
- [x] Halaman home/detail/admin
- [x] Verifikasi `npm run build` + dev server

## 11. Catatan Produksi (pengembangan lanjutan)

- Job transcode saat ini in-process (cukup untuk skala kecil); untuk skala besar pindahkan ke queue (BullMQ/Redis) atau worker terpisah.
- Untuk file >5GB naikkan ukuran chunk dan pertimbangkan lifecycle rule untuk membersihkan multipart yang menggantung.
- Poster saat ini diisi via URL; bisa ditambah upload poster ke IS3 nantinya.
