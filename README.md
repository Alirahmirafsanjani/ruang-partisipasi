# Ruang Partisipasi

Portal peserta kegiatan untuk mengisi feedback dan mendapatkan **sertifikat partisipasi PDF secara otomatis**.

Aplikasi ini dibuat untuk **satu kegiatan**. Data peserta dapat diambil dari **Google Sheets private** (tanpa deploy ulang saat peserta berubah), dengan fallback ke file konfigurasi backend. Pertanyaan tetap disimpan di file konfigurasi. **Tidak ada dashboard admin, halaman login, atau CRUD.**

---

## 1. Teknologi yang dipakai

| Bagian | Teknologi |
| --- | --- |
| Frontend | React + TypeScript + Vite + CSS biasa |
| Ikon | Lucide React |
| Backend | Netlify Functions (TypeScript) |
| Validasi | Zod |
| Database & Storage | Supabase PostgreSQL + Supabase Storage |
| PDF | pdf-lib |
| Deploy | Netlify + GitHub |

Seluruh logika backend berjalan di Netlify Functions. Tidak ada Express, VPS, atau server tambahan.

---

## 2. Struktur project

```text
ruang-partisipasi/
├── src/
│   ├── components/          # Header, Hero, Stepper, formulir, sukses, dll.
│   ├── services/api.ts      # Pemanggil Netlify Functions dari browser
│   ├── styles/global.css    # Seluruh gaya visual
│   ├── types/index.ts       # Tipe data frontend
│   ├── App.tsx              # Alur 3 tahap (verifikasi → refleksi → sertifikat)
│   └── main.tsx
├── netlify/
│   └── functions/
│       ├── _shared/
│       │   ├── config.ts        # DATA KEGIATAN + PERTANYAAN + fallback peserta
│       │   ├── participants.ts  # Sumber peserta: Google Sheets private / config
│       │   ├── supabase.ts      # Service-role client (server only)
│       │   ├── validation.ts    # Zod + validasi jawaban
│       │   ├── certificate.ts   # Isi template.png + nomor surat + nama
│       │   ├── template-base64.ts # template.png yang disematkan (generated)
│       │   └── http.ts          # Response + error handler
│       ├── get-event-config.ts  # Info kegiatan & pertanyaan (publik, aman)
│       ├── verify-participant.ts# Cek NIM & status feedback
│       ├── submit-feedback.ts   # Simpan feedback + nomor + PDF + signed URL
│       └── recover-certificate.ts# Pemulihan PDF untuk operator
├── supabase/schema.sql      # Jalankan di Supabase SQL Editor
├── scripts/embed-template.mjs # Regenerate template-base64.ts
├── template.png             # Template sertifikat (background PDF)
├── public/
├── .env.example
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
└── README.md
```

---

## 3. Instalasi

Butuh **Node.js 20 atau lebih baru** dan npm.

```bash
npm install
```

Script yang tersedia:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan frontend **dan** Netlify Functions secara lokal (direkomendasikan) |
| `npm run dev:vite` | Menjalankan frontend saja (endpoint `/api` tidak akan bekerja) |
| `npm run typecheck` | Memeriksa TypeScript frontend + functions |
| `npm run build` | Type check + build produksi ke folder `dist/` |
| `npm run preview` | Melihat hasil build produksi |

---

## 4. Menjalankan project secara lokal

1. Salin contoh environment variable:

   ```bash
   cp .env.example .env
   ```

2. Isi minimal `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di `.env` (lihat bagian 6).

3. Jalankan:

   ```bash
   npm run dev
   ```

4. Buka `http://localhost:8888`.

`netlify dev` menjalankan Vite di port internal `5199` (diatur di `netlify.toml`), lalu meneruskan `/api/*` ke Netlify Functions. Alur lengkap bisa diuji di lokal. Jika port 5199 dipakai aplikasi lain, ubah `targetPort` di `netlify.toml` dan `server.port` di `vite.config.ts` agar sama.

> Pastikan yang terbuka adalah `http://localhost:8888` dan judul tab bertuliskan **Ruang Partisipasi**. Jika yang muncul halaman login "Volunteer Feedback & Certificate", berarti kamu masih membuka project lama atau port internal bentrok — hentikan server lama lalu jalankan ulang `npm run dev` dari folder `volunteer` ini.

> Jika menjalankan `npm run dev:vite`, halaman tetap tampil, tetapi tombol verifikasi akan gagal karena tidak ada Functions server. Gunakan `npm run dev` untuk pengujian penuh.

---

## 5. Membuat project Supabase dan menjalankan schema

1. Buat akun dan project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → **New query**.
3. Salin seluruh isi `supabase/schema.sql`, lalu klik **Run**.
4. File ini membuat:
   - Tabel `feedback_submissions` dengan constraint unik `(event_id, nim)` dan `certificate_number`.
   - Tabel `event_counters` untuk penomoran sertifikat.
   - Row Level Security aktif, **tanpa policy publik** — anon/authenticated tidak bisa membaca data.
   - RPC `allocate_certificate_number(event_id, prefix)` yang hanya bisa dipanggil `service_role`.
   - Bucket Storage private bernama `certificates`.

Schema aman dijalankan ulang.

### Cara kerja penomoran

Function SQL melakukan `INSERT ... ON CONFLICT DO NOTHING` lalu `UPDATE ... RETURNING` pada satu baris counter. `UPDATE` mengunci baris tersebut, sehingga dua request bersamaan tetap mendapat nomor berurutan dan tidak ada nomor ganda. Formatnya:

```text
SI-2026-0001
SI-2026-0002
```

Prefix diambil dari `CERTIFICATE_PREFIX` (default `SI`), tahun dari waktu server database. Nomor dibuat **di database**, bukan di frontend.

### Template sertifikat dan nomor surat

PDF dibuat dengan memakai **`template.png` sebagai background penuh halaman A4 landscape**. Dua teks yang ditambahkan oleh backend:

1. **Nomor surat**, tepat di atas kalimat "Diberikan Kepada:":
   ```text
   038.001/B/SERT/HIMSI/UAA/XI/2026
   ```
   Bagian `001` berasal dari counter database yang sama dengan `SI-2026-0001`, jadi naik otomatis menjadi `002`, `003`, dan seterusnya setiap sertifikat dibuat. Format prefix/suffix ada di `CERTIFICATE_LETTER_FORMAT` dalam `_shared/config.ts`.
2. **Nama peserta**, tepat di bawah "Diberikan Kepada:" dan di atas garis kosong pada template.

Teks lain (nama organisasi, judul sertifikat, kegiatan, tanggal, tanda tangan) sudah tercetak di `template.png`, jadi tidak digambar ulang oleh aplikasi.

Jika `template.png` diganti, jalankan:

```bash
npm run template:embed
```

Perintah ini memperbarui `netlify/functions/_shared/template-base64.ts`. File base64 itu yang ikut terbundle ke Netlify Functions, jadi gambar tidak perlu di-upload terpisah.

---

## 6. Environment variables

Salin `.env.example` menjadi `.env` lalu isi:

### Wajib di Netlify (server / Rahasia)

| Variable | Contoh | Keterangan |
| --- | --- | --- |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key. **Jangan pernah pakai prefix `VITE_`** |
| `EVENT_ID` | `ruang-partisipasi-2026` | Harus sama dengan `EVENT.eventId` di `_shared/config.ts` |
| `CERTIFICATE_PREFIX` | `SI` | Prefix nomor sertifikat |

### Disarankan

| Variable | Keterangan |
| --- | --- |
| `CERTIFICATE_RECOVERY_TOKEN` | Token rahasia untuk function pemulihan sertifikat. Gunakan string acak panjang. |

### Sumber peserta — Google Sheets private

| Variable | Contoh | Keterangan |
| --- | --- | --- |
| `GOOGLE_SHEET_ID` | `1AbC...xyz` | ID spreadsheet (bagian dari URL Sheets) |
| `GOOGLE_SHEET_RANGE` | `Peserta!A:A` | Tab + rentang. Hanya kolom A = NIM yang dipakai |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `xxx@xxx.iam.gserviceaccount.com` | Email service account yang diberi akses **Viewer** ke sheet |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Private key dari file JSON service account. Boleh pakai `\n` literal |

Jika keempat variabel ini diisi, daftar **NIM** diambil dari Sheets. Jika belum diisi, aplikasi memakai `PARTICIPANT_NIMS` di `_shared/config.ts` sebagai fallback.

### Aman untuk browser

| Variable | Keterangan |
| --- | --- |
| `VITE_EVENT_TITLE` | Teks sementara sebelum konfigurasi backend dimuat |
| `VITE_EVENT_SUBTITLE` | Subjudul hero |
| `VITE_EVENT_DATE` | Tanggal kegiatan |
| `VITE_EVENT_ORGANIZER` | Nama penyelenggara |

Variabel `VITE_` akan ikut ter-build ke bundle browser, jadi **jangan** memasukkan secret di sini. Nilai final yang ditampilkan tetap berasal dari endpoint `get-event-config` (backend).

Di Netlify: **Site configuration → Environment variables**. Centang "Apply to production and deploy previews" sesuai kebutuhan.

---

## 7. Data peserta dan nama di sertifikat

Aturan yang dipakai:

- **Yang unik hanya NIM.** Spreadsheet / config hanya berisi daftar NIM yang boleh verifikasi.
- **Nama diketik sendiri oleh peserta** di form **Verifikasi**, bersamaan dengan NIM.
- Nama inilah yang disimpan di `feedback_submissions` dan dicetak di sertifikat.
- Backend tetap memvalidasi format nama dan menolak NIM yang tidak terdaftar.

### Opsi 1 — Google Sheets private (disarankan)

Backend mengambil daftar NIM dari spreadsheet. Menambah/menghapus NIM tidak perlu deploy ulang.

1. Buat tab bernama `Peserta` dengan **satu kolom saja**:

   | NIM |
   | --- |
   | `20230001` |
   | `20230002` |

   Kolom lain boleh ada, tetapi diabaikan. Duplikat NIM otomatis diabaikan.

2. **Format kolom NIM sebagai _Plain text_** agar angka nol di depan tidak hilang.
3. Di Google Cloud: aktifkan **Google Sheets API**, buat **Service Account**, unduh file JSON-nya.
4. Klik **Share** pada spreadsheet, tambahkan `client_email` dari file JSON tersebut sebagai **Viewer**.
5. Isi environment variables (JWT dihasilkan otomatis oleh Functions):
   ```env
   GOOGLE_SHEET_ID=1AbC...xyz
   GOOGLE_SHEET_RANGE=Peserta!A:A
   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
6. Untuk lokal, isi juga di `.env`; untuk produksi, isi di **Netlify → Site configuration → Environment variables**, lalu deploy ulang.

Header dikenali jika ditulis `nim`, `nomor induk mahasiswa`, atau `nomor induk`. Jika tidak ada header, backend memakai kolom A.

Data di-cache di memory selama **5 menit** per instance Function. Jika Google Sheets gagal dibaca dan cache lama masih ada, aplikasi memakai cache lama agar layanan tetap tersedia.

> Spreadsheet **jangan** di-publish ke web / "Anyone with the link". Daftar NIM tidak boleh bisa diakses publik.

### Opsi 2 — Fallback `config.ts` (tanpa Google Sheets)

Jika variabel `GOOGLE_*` belum diisi, backend memakai array `PARTICIPANT_NIMS` di `netlify/functions/_shared/config.ts`:

```ts
export const PARTICIPANT_NIMS: string[] = [
  '20230001',
  '20230002',
  '20230003',
];
```

NIM ditulis sebagai **string** agar angka nol di depan tidak hilang. Setelah mengubah fallback ini, jalankan ulang deployment.

Daftar NIM **hanya diproses di backend** dan tidak pernah dikirim ke browser. Endpoint publik `get-event-config` tetap hanya berisi info kegiatan dan pertanyaan.

---

## 8. Menyesuaikan pertanyaan

Masih di file `_shared/config.ts`, ubah array `QUESTIONS`:

```ts
{
  id: 'overall_rating',        // unik, tidak diubah setelah dipakai
  label: 'Seberapa puas kamu ...?',
  type: 'rating',              // 'rating' (1–5) atau 'text'
  required: true,              // true / false
  hint: '1 = perlu perbaikan...',
  maxLength: 1000,             // khusus tipe text, opsional
}
```

Frontend mengambil pertanyaan dari `get-event-config`, jadi form dan validasi backend otomatis mengikuti konfigurasi ini. Tidak perlu mengubah komponen React hanya untuk menambah pertanyaan.

---

## 9. Bucket Storage

Schema sudah membuat bucket `certificates` dengan status **private**.

- Peserta tidak bisa mengakses file langsung.
- Setelah PDF berhasil dibuat, backend membuat **signed URL** yang berlaku **7 hari**.
- Tidak ada signed URL permanen.
- Tidak perlu membuat storage policy; akses hanya lewat service role di Functions.

Jika ingin memeriksa: **Supabase → Storage → buckets → certificates** → pastikan toggle **Public bucket** mati.

---

## 10. Menghubungkan GitHub dengan Netlify

1. Buat repository GitHub baru, lalu push project ini:

   ```bash
   git init
   git add .
   git commit -m "Initial Ruang Partisipasi"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

2. Di Netlify: **Add new site → Import an existing project → GitHub**.
3. Pilih repository tersebut.
4. Netlify akan membaca `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. Isi environment variables (bagian 6) sebelum/console setelah deploy pertama, lalu **Trigger deploy → Deploy site**.

Routing `/api/*` diteruskan ke Functions. Tidak perlu SPA fallback karena aplikasi hanya punya satu halaman.

---

## 11. Alur backend (ringkas)

1. `GET /api/get-event-config` → judul, tanggal, penyelenggara, dan pertanyaan. **Tidak mengirim daftar peserta.**
2. `POST /api/verify-participant` → `{ nim }`.
   - Mencocokkan NIM dari konfigurasi backend.
   - Menolak NIM yang sudah pernah mengirim feedback (`409 ALREADY_SUBMITTED`).
   - Mengembalikan nama peserta yang cocok.
3. `POST /api/submit-feedback` → `{ nim, answers: [{ id, value }] }`.
   - Nama peserta **diambil ulang dari backend**, bukan dipercaya dari payload.
   - Semua jawaban divalidasi ulang dengan Zod + konfigurasi pertanyaan.
   - Constraint database mencegah submit ganda.
   - Nomor sertifikat dibuat RPC database secara atomik.
   - Feedback disimpan **sebelum** PDF dibuat.
   - PDF diunggah ke bucket private dan signed URL dikembalikan.
4. Jika PDF gagal setelah feedback tersimpan, data feedback **tidak dihapus**. Response tetap sukses dengan `certificate.ready = false`, dan frontend menampilkan pesan "sertifikat sedang disiapkan".

---

## 12. Pemulihan sertifikat (untuk operator)

Gunakan hanya jika ada submission dengan `certificate_path` kosong (misalnya karena unggah PDF gagal). Function ini **bukan** untuk peserta dan dilindungi token.

```bash
curl -X POST https://<site>.netlify.app/.netlify/functions/recover-certificate \
  -H "Content-Type: application/json" \
  -H "x-recovery-token: <CERTIFICATE_RECOVERY_TOKEN>" \
  -d '{"nim":"20230001","certificateNumber":"SI-2026-0001"}'
```

Function akan:

- mencari submission yang cocok (event + NIM + nomor sertifikat);
- membuat ulang PDF dari data yang sudah tersimpan;
- mengunggah ke bucket yang sama;
- mengisi `certificate_path` dan `certificate_generated_at`;
- mengembalikan signed URL baru.

Nomor sertifikat bisa dilihat peserta di halaman sukses, atau oleh developer dari tabel `feedback_submissions`. Jangan pernah membagikan `CERTIFICATE_RECOVERY_TOKEN`.

---

## 13. Checklist pengujian manual

Sebelum deploy produksi:

- [ ] `npm install` berhasil.
- [ ] `npm run typecheck` tanpa error.
- [ ] `npm run build` tanpa error.
- [ ] Buka `npm run dev`, halaman tampil di `http://localhost:8888`.
- [ ] `GET /api/get-event-config` hanya berisi info kegiatan + pertanyaan (tanpa peserta).
- [ ] NIM placeholder yang terdaftar berhasil diverifikasi dan nama muncul.
- [ ] NIM tidak terdaftar menampilkan pesan yang jelas.
- [ ] Feedback wajib kosong tidak bisa dikirim.
- [ ] Rating di luar 1–5 ditolak backend.
- [ ] Teks lebih dari batas ditolak.
- [ ] Submit berhasil → halaman sukses, nomor sertifikat muncul, tombol unduh bekerja.
- [ ] PDF terbuka dengan benar memakai `template.png` sebagai background.
- [ ] Nomor surat `038.xxx/B/SERT/HIMSI/UAA/XI/2026` tampil di atas "Diberikan Kepada:" dan urutannya naik tiap generate.
- [ ] Nama peserta tampil di bawah "Diberikan Kepada:" dan tidak keluar dari garis, termasuk untuk nama panjang.
- [ ] Mengirim ulang dengan NIM yang sama ditolak (`409`).
- [ ] Cek bundle `dist/assets/*.js`: tidak ada `SUPABASE_SERVICE_ROLE_KEY` atau secret lain.
- [ ] Cek bucket `certificates` tetap private.
- [ ] Cek RLS: dengan anon key tidak bisa `select` dari `feedback_submissions`.
- [ ] Uji dua submit bersamaan untuk dua NIM berbeda → nomor sertifikat tetap unik.
- [ ] Tampilan dicek di smartphone, tablet, dan desktop.
- [ ] Link `/api/*` berfungsi di Netlify setelah deploy.
- [ ] Jika pakai Sheets: sheet bersifat private, service account hanya Viewer, dan NIM berformat Plain text.
- [ ] Verifikasi NIM dari sheet berhasil; NIM yang tidak ada ditolak dengan pesan yang sama.
- [ ] Nama diketik peserta di form Verifikasi dan tampil persis di sertifikat.

---

## 14. Yang masih perlu kamu isi sebelum produksi

1. **Daftar NIM asli**: isi Google Sheets private dan env `GOOGLE_*` (disarankan), atau ganti placeholder `PARTICIPANT_NIMS` di `_shared/config.ts`. Nama tidak perlu di sheet.
2. **Detail kegiatan**: judul, tanggal, penyelenggara, dan daftar pertanyaan di file yang sama.
3. **Supabase**: jalankan `supabase/schema.sql` di project produksi.
4. **Environment variables di Netlify**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVENT_ID`, `CERTIFICATE_PREFIX`, `CERTIFICATE_RECOVERY_TOKEN`, dan `GOOGLE_*` bila memakai Sheets.
5. **Pastikan `EVENT_ID` sama** dengan `EVENT.eventId` di config.
6. **Teks hero** (opsional) lewat `VITE_EVENT_*` bila ingin nilai awal berbeda saat loading.
7. **Template sertifikat**: `template.png` sudah disiapkan di root project. Jika diubah, jalankan `npm run template:embed` sebelum deploy. Teks dinamis memakai font standar pdf-lib (Times/Helvetica) yang mendukung karakter Latin; nama dengan aksara non-Latin perlu penyesuaian font embed.

---

## 15. Catatan keamanan

- Service role key hanya ada di Netlify Functions.
- Daftar NIM tidak pernah dikirim ke browser.
- NIM divalidasi ulang dari Google Sheets private / konfigurasi backend.
- Nama berasal dari input peserta, tetapi formatnya divalidasi ulang di backend sebelum disimpan dan dicetak.
- Spreadsheet peserta tidak dipublish publik; kredensial service account hanya ada di Netlify Functions.
- Feedback pengguna lain tidak bisa dibaca lewat API publik.
- Signed URL sertifikat berlaku terbatas (7 hari).
- Error internal dicatat di log server, tetapi pesan ke pengguna dibuat umum dan informatif.

---

Dibuat sebagai aplikasi produksi minimalis: sederhana, stabil, dan mudah dioperasikan.
