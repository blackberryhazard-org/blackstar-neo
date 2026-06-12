# AGENTS.md — Blackstar

> Dokumen ini adalah sumber kebenaran tunggal untuk Jules saat bekerja di codebase Blackstar.
> Baca seluruhnya sebelum memulai task apapun. Jika ada konflik antara instruksi user dan dokumen ini, klarifikasi dulu sebelum bertindak.

---

## 1. Project Overview

**Blackstar** adalah bot WhatsApp dan Telegram yang berjalan dalam satu codebase. Bot ini menyediakan fitur otomatisasi chat, utilitas grup, dan command interaktif untuk pengguna personal maupun grup.

| Field   | Value                  |
|---------|------------------------|
| Version | v0.1.0                 |
| Status  | Active development     |
| Runtime | Node.js ≥ 22 — ESM (`"type": "module"`, gunakan `import`) |

---

## 2. Tech Stack

| Kategori           | Package / Tool          |
|--------------------|-------------------------|
| WhatsApp framework | `@itsliaaa/baileys`     |
| Telegram framework | `telegraf-hardened`     |
| HTTP client        | `axios`                 |
| Storage            | JSON (flat file)        |
| Package manager    | npm                     |
| Lint & Format      | Biome (`@biomejs/biome`)|
| Testing            | Node.js native test runner (`node --test`) |
| Deployment         | HidenCloud (Pterodactyl)|

---

## 3. Struktur Proyek

```
[root]/
  lib/
    Components/   # Modul fitur bot: economy, anti-spam, quiz, AI integration, dll.
    *.js          # Utility inti: database, listener, watcher, serializer, scraper, dll.
  tg/             # Bot Telegram — command, middleware, runtime event
  wa/             # Bot WhatsApp — command, middleware, runtime event
  index.js        # Entrypoint
  config.js       # Konfigurasi aplikasi
  load_globals.js # Bootstrap config ke global scope
```

**Aturan penempatan file:**

- Logic command dan fitur bot → `lib/Components/`
- Helper dan utilitas lintas fitur → `lib/`
- **Dilarang membuat folder baru tanpa konfirmasi user.**
- **Dilarang memindahkan atau menghapus file tanpa konfirmasi user.**

---

## 4. Commands

```bash
npm start            # Jalankan bot (production: memory cap + GC, lihat package.json)
npm run lint         # Cek code style & lint dengan Biome (read-only)
npm run format       # Perbaiki & format kode dengan Biome (--write)
npm test             # Jalankan semua test (*.test.js) via node --test
```

> Catatan: hanya empat script di atas yang tersedia di `package.json`. Belum ada pemisahan `test:unit` / `test:e2e`.

Jalankan command yang **paling relevan** dengan perubahan yang dilakukan. Tidak perlu menjalankan semuanya, tapi validasi minimal wajib dilakukan.

---

## 5. Conventions

### 5.1 Penamaan File & Variabel

| Konteks                       | Konvensi           | Contoh                |
|-------------------------------|--------------------|-----------------------|
| File utility / helper         | `camelCase.js`     | `messageParser.js`    |
| File class / constructor      | `PascalCase.js`    | (ikuti pola file lama)|
| Folder                        | Ikuti pola existing| `Components/`         |
| File test                     | `*.test.js`        | `economy.test.js`     |
| Variabel & fungsi             | `camelCase`        | `parseMessage()`      |
| Konstanta                     | `UPPER_SNAKE_CASE` | `MAX_RETRIES`         |

> Konsistensi dengan file di sekitarnya lebih diutamakan daripada memaksa konvensi baru.

### 5.2 Code Style

- Tulis kode yang **clean, mudah dibaca, dan minim duplikasi**.
- Gunakan `try/catch` untuk semua operasi async: handler command, request API, dan operasi file.
- Pesan error harus menyebutkan konteks yang jelas — nama command atau nama fitur yang gagal.
- Tulis komentar singkat bila ada fallback behavior yang tidak langsung terlihat dari kode.
- **Dilarang menambahkan dependency baru tanpa konfirmasi user.**

**Urutan import** (ESM — proyek ini memakai `import`, bukan `require`):

```js
// 1. External libraries
import axios from "axios";

// 2. Internal relative modules
import config from "../config.js";
import { Database } from "../lib/Database.js";
```

> `biome check` akan mengurutkan import secara otomatis (`organizeImports`). Selalu sertakan ekstensi `.js` pada import relatif.

---

## 6. Aturan Bot WhatsApp & Telegram

- Setiap perubahan pada modul bersama harus mempertimbangkan **kompatibilitas kedua platform**.
- Jangan asumsikan format message WhatsApp dan Telegram identik — normalisasi input terlebih dahulu sebelum diproses.
- Tambahkan guard untuk edge case berikut:
  - Message kosong atau undefined
  - Command tanpa argumen wajib
  - User atau grup tidak terdaftar
  - Rate limit / anti-spam trigger
- Response error ke user harus aman — **jangan bocorkan stack trace atau path internal.**

---

## 7. Data & Persistence

- Validasi shape data sebelum setiap operasi read/write.
- Hindari write berulang di jalur message high-frequency.
- Gunakan operasi safe write / atomik bila sudah tersedia di utility project.
- Setiap perubahan schema harus kompatibel mundur, atau disertai migrasi sederhana.
- **Dilarang menghapus data existing tanpa instruksi eksplisit.**

---

## 8. API & Integrasi Eksternal

- Setiap pemanggilan API eksternal wajib memiliki **timeout dan error handling**.
- Implementasikan retry bila diperlukan — jangan retry tanpa batas.
- Jangan expose raw error dari third-party ke pengguna akhir.
- Semua endpoint, API key, dan credential harus dibaca dari **environment variables**.

**Format respons internal yang disarankan untuk helper service:**

```js
{ success: boolean, data: any | null, message: string }
```

---

## 9. Security

- Jangan commit file `.env`, secret, atau credential apapun.
- Jangan log token sesi WhatsApp atau Telegram.
- Jangan expose API key di pesan chat atau output apapun.
- Validasi semua input user sebelum diproses, terutama pada command sensitif.
- Batasi operasi berisiko (`eval`, shell command, akses file sistem) dengan guard yang ketat.

---

## 10. Testing

**Prioritas pengujian:**

1. Utility function di `lib/`
2. Business logic command di `lib/Components/`
3. Parser, serializer, dan error handling

**Checklist wajib sebelum task dianggap selesai:**

- [ ] Test relevan sudah dijalankan terhadap modul yang diubah.
- [ ] Jika belum ada test, lakukan sanity check via lint atau runtime.
- [ ] Jangan klaim test *pass* jika command belum benar-benar dijalankan.

---

## 11. Git

**Format commit message:**

```
feat:     Fitur baru
fix:      Perbaikan bug
refactor: Perubahan kode tanpa mengubah behavior
style:    Formatting, whitespace, tidak ada logic change
docs:     Perubahan dokumentasi
test:     Penambahan atau perbaikan test
chore:    Maintenance, dependency update, config
```

**Aturan commit:**

- Satu commit = satu perubahan yang fokus dan jelas.
- Jangan campur refactor besar dengan fix kecil yang tidak berkaitan.
- Pastikan `git diff` bersih dari file rahasia atau file sementara sebelum commit.

---

## 12. Larangan

Jika instruksi user ambigu, **klarifikasi dulu sebelum mengimplementasikan apapun.**

Jules dilarang keras:

- Membuat folder baru tanpa konfirmasi user.
- Menggunakan WhatsApp framework selain `@itsliaaa/baileys`.
- Menghapus atau memindahkan file tanpa konfirmasi user.
- Menginstall package baru tanpa konfirmasi user.
- Mengubah fitur yang sudah berjalan tanpa instruksi yang jelas.
- Menjalankan aksi destruktif terhadap data production.
- Menyimpan atau mengekspos kredensial dalam bentuk apapun — kode, log, maupun output.

---

## 13. Definition of Done

Task dianggap **selesai** jika memenuhi semua kriteria berikut:

1. Perubahan sesuai dengan permintaan user.
2. Tidak ada pelanggaran terhadap aturan di AGENTS.md ini.
3. Validasi atau test relevan sudah dijalankan — atau limitasinya disebutkan secara jujur.
4. Commit sudah dibuat dengan format yang benar.
5. Ringkasan perubahan jelas dan dapat ditelusuri.

---

## 14. Post-Task

Setelah seluruh task selesai, **dua langkah berikut wajib dilakukan** sebelum benar-benar mengakhiri sesi:

### 14.1 Kirim Notifikasi Webhook

Kirim POST request ke endpoint berikut:

```
https://webhook.notifine.com/beep/RcWM02gS
```

Isi pesan harus menjelaskan perubahan yang dilakukan. Gunakan format berikut sebagai panduan:

```
Halo, saya Jules!

Tugas mengenai [topik singkat] sudah selesai dikerjakan.

Perubahan yang dilakukan:
• [perubahan 1]
• [perubahan 2]
• ...

[Tambahkan konteks relevan dan emoji secukupnya]
```

Catatan: kirim request sebagai text, bukan json!

### 14.2 Perbarui MEMORY.md

Catat setiap informasi baru yang diperoleh dari sesi ini ke dalam `MEMORY.md` — termasuk keputusan teknis, pola yang ditemukan, atau hal-hal yang perlu diingat untuk sesi berikutnya.
