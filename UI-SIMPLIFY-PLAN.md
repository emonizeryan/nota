# Nota — Rencana Penyederhanaan UI (Violet, 2026-11-18)

> Dasar: feedback user langsung — *"masih bingung pakenya, UI harusnya lebih simple dan friendly"* — plus permintaan menu bahasa ID/EN.
> Sumber: screenshot desktop 1280px (`shots/desktop-1280-v3.png`), mobile 390px (`shots/mobile-390-v2.png`), dan situs live https://emonizeryan.github.io/nota/ (dilihat saja). Rencana ini hanya desain + copy; bukan perubahan kode.

## 1. Yang bikin bingung di UI sekarang (dari screenshot)

1. **10 tombol AI yang semuanya kelihatan sama penting.** Summarise, Key points, Action items, Tags, Rewrite shorter/formal/simpler, Proofread, Draft a reply, Deep analysis — dua baris penuh pil yang mirip. User baru harus memilih di antara 10 opsi sebelum ngapa-ngapain. Ini penyebab bingung nomor satu.
2. **Jargon teknis ada di mana-mana, di tempat yang paling dilihat.**
   - Baris meta di bawah editor: *"209 words · ~292 tokens · Local demo mode — connect Firebase for real Nano / Flash."* User tidak tahu token itu apa, Firebase itu apa.
   - Footer: satu paragraf penuh *"PREFER_ON_DEVICE"*, *"~3,500 tokens"*, *"Gemini Flash / Pro"*, *"ON DEVICE / IN CLOUD"*. Footernya bacaannya kayak README, bukan footer.
   - Sidebar: catatan kaki 4 baris soal *"localStorage"* dan kapan teks di-upload.
3. **Banner status AI bunyinya negatif dan menakutkan.** *"On-device AI: unavailable on this device"* + tombol Details + ✕. Kesan pertama: aplikasinya rusak. Padahal aplikasinya tetap jalan (cloud/demo). Di HP, banner ini makan hampir seperlima layar pertama.
4. **Tidak ada alur yang kelihatan.** Tidak ada yang bilang "langkah 1 tulis, langkah 2 pencet ini, langkah 3 baca hasil". User harus menebak sendiri tombol mana dulu.
5. **Di HP (390px), editor dan tombol AI ada di bawah lipatan.** Urutan layar pertama: top bar → banner → daftar Notes (dua kartu contoh + search + catatan kaki) → baru editor. User harus scroll jauh sebelum bisa pakai fitur utama. Tombol AI bahkan tidak kelihatan di layar pertama.
6. **"Delete note" duduk di sebelah info meta**, tampilannya sama tenangnya dengan teks info — gampang kepencet tanpa sengaja, dan posisinya tidak masuk akal (aksi destruktif di sebelah penghitung kata).
7. **Dua pil di pojok kanan atas ("● online" dan "AI: local demo")** tidak menjelaskan apa-apa ke user biasa. "Local demo" terdengar seperti mode rusak/percobaan.
8. **Contoh catatan berbahasa Inggris, panjang, dan isinya soal cara kerja hybrid AI.** Catatan pertama yang dilihat user malah menjelaskan teknologi ke dia — bukan contoh catatan yang terasa seperti miliknya.
9. **Tidak ada kontrol bahasa.** Semua teks Inggris saja, padahal user berbahasa Indonesia dan minta menu ID/EN.
10. **Judul + tagline + status berlapis-lapis.** "Nota / Private notes that think on your device" + banner + meta + footer semuanya bicara hal yang mirip dengan kata berbeda. Terlalu banyak teks sebelum user bisa mulai.

## 2. Layout baru: jauh lebih simpel (mobile dulu)

Prinsip: **satu layar, satu tugas — "tulis, pencet satu tombol, baca hasil."** Kalau sebuah elemen tidak membantu tugas itu, sembunyikan atau buang.

### Layar pertama di HP (390px) — yang HARUS kelihatan tanpa scroll

```
┌─────────────────────────────────┐
│ N  Nota            [🌐 ID | EN] │  ← top bar: logo, nama, toggle bahasa
│ ─────────────────────────────── │
│ ✏️ Tulis atau tempel catatanmu  │  ← judul editor, ramah, bukan "Note title"
│ ┌─────────────────────────────┐ │
│ │ (kotak teks besar, kosong    │  ← placeholder bantu, bukan instruksi
│ │  atau isi contoh singkat)   │     panjang
│ └─────────────────────────────┘ │
│ 209 kata                        │  ← meta: hitungan kata saja
│ ┌─────────────────────────────┐ │
│ │  ✦  Ringkas catatan ini     │  ← SATU tombol utama, besar, full-width
│ └─────────────────────────────┘ │
│        Lainnya ▾                │  ← semua aksi lain di balik ini
│ ─────────────────────────────── │
│ ▼ Hasilnya muncul di sini       │  ← kartu hasil (setelah tombol dipencet)
└─────────────────────────────────┘
   Daftar catatan ("Catatanku") pindah ke BAWAH hasil,
   atau jadi tombol ☰ di top bar yang membuka daftar.
```

Yang pindah / hilang dari layar pertama HP:
- Banner status AI → **hapus dari layar.** Ganti satu titik kecil di top bar: titik hijau "Siap" / kuning "Demo" (ketuk untuk lihat penjelasan). Jangan pernah tampilkan kalimat negatif "unavailable" sebagai headline.
- Daftar Notes + search → **di bawah editor/hasil**, atau di balik tombol "☰ Catatanku". Daftar bukan hal pertama yang harus dilihat.
- Pil "online" / "local demo" → **hapus.** Status jaringan hanya relevan saat AI cloud gagal; kalau begitu, beri tahu di dalam kartu hasil, bukan di top bar.
- Footer paragraf teknis → **satu baris kecil**: "Gratis, tanpa akun. Catatanmu tidak keluar dari HP ini." + link "Cara kerja".

### Desktop (1280px) — sama, cuma lebih lega

- Sidebar kiri tetap ada tapi ramping: judul "Catatanku", tombol "+ Catatan baru", search, daftar. **Hapus catatan kaki 4 baris** di sidebar; ganti satu baris: "Tersimpan di browser ini saja."
- Editor di kanan: judul catatan, kotak teks, "209 kata", **satu tombol utama besar** + "Lainnya ▾", kartu hasil di bawahnya.
- Banner status AI: **tidak ada.** Titik status kecil di top bar (sama seperti HP).

### Satu tombol utama + "Lainnya ▾" (progressive disclosure)

- **Tombol utama (selalu kelihatan, besar, warna hijau):** ✦ Ringkas / ✦ Summarise. Ini aksi yang paling sering dipakai dan paling mudah dipahami.
- **"Lainnya ▾" (satu tombol, teks saja):** saat dibuka, muncul kelompok kecil berlabel jelas — jangan tampilkan 9 pil sekaligus tanpa kelompok:
  - **Rapikan:** Perbaiki tulisan · Tulis ulang — lebih singkat · Tulis ulang — lebih formal · Tulis ulang — lebih sederhana
  - **Cari tahu:** Poin penting · Yang harus dilakukan · Tag
  - **Balas:** Buatkan balasan
  - **Mendalam:** Analisis mendalam (tulis kecil di bawahnya: "pakai internet")
- Setelah user memilih satu aksi dari "Lainnya", panel menutup lagi. Hasilnya selalu muncul di kartu yang sama di bawah editor — user belajar satu pola: pencet → hasil muncul di bawah.
- "Deep analysis" tetap ada, tapi tanpa kata "(cloud Pro)" dan tanpa panah "→". Penjelasan cloud-nya cukup satu baris kecil di bawah labelnya.

### Kartu hasil

- Judul hasil + satu chip kecil berbahasa biasa (lihat §3): "Di HP ini" / "Di cloud" / "Demo". Chip boleh berwarna (hijau = perangkat, biru = cloud, kuning = demo) tapi teksnya kata sehari-hari.
- Dua tombol saja: "Salin" dan "Ganti catatan dengan ini". "Delete note" **pindah** ke menu ⋯ di samping judul catatan (dengan konfirmasi), bukan di samping info meta.

### Bantuan pertama kali (first-run, sekali saja)

Kalau catatan kosong dan user baru pertama buka, tampilkan 3 langkah kecil di atas editor (bisa di-dismiss, jangan tampil permanen):

> **1** Tulis atau tempel teks · **2** Pencet ✦ Ringkas · **3** Baca hasilnya di bawah

Itu saja. Tidak ada penjelasan teknologi di langkah ini.

### Contoh catatan (seed) — ganti

Ganti dua contoh Inggris yang panjang dengan dua contoh **pendek, Bahasa Indonesia, yang terasa nyata**:

- "Rapat tim — 18 Nov": 3–4 baris soal siapa mengerjakan apa (mirip yang lama, tapi singkat dan bahasa Indonesia).
- "Belanja mingguan": daftar singkat 4–5 barang + satu kalimat.

User langsung paham "oh, ini catatan biasa" — dan tombol Ringkas langsung terasa berguna saat dicoba.

## 3. Copy yang ramah — semua label, ID + EN

Aturan: kalimat pendek, kata sehari-hari, **nol jargon di semua yang terlihat user**. Kata-kata ini DILARANG muncul di UI: `PREFER_ON_DEVICE`, `InferenceMode`, `tokens`, `localStorage`, `Firebase`, `Gemini Nano/Flash/Pro`, `ON DEVICE` / `IN CLOUD` (huruf kapital semua), `local demo mode`, `App Check`, `responseSchema`.

| Tempat | Bahasa Indonesia | English |
|---|---|---|
| Tagline (di bawah logo) | Catatan pribadi yang ringkas sendiri. | Private notes that think on your device. |
| Judul editor / placeholder judul | Judul catatan… | Note title… |
| Placeholder isi | Tulis atau tempel teks di sini — artikel, email, notulen rapat, apa saja. | Write or paste text here — an article, an email, meeting notes, anything. |
| Hitungan kata | 209 kata | 209 words |
| Tombol utama | ✦ Ringkas catatan ini | ✦ Summarise this note |
| Tombol "Lainnya" | Lainnya ▾ | More ▾ |
| Kelompok "Rapikan" | Rapikan | Tidy up |
| — Perbaiki tulisan | Perbaiki tulisan | Proofread |
| — Tulis ulang singkat | Lebih singkat | Shorter |
| — Tulis ulang formal | Lebih formal | More formal |
| — Tulis ulang sederhana | Lebih sederhana | Simpler |
| Kelompok "Cari tahu" | Cari tahu | Find out |
| — Poin penting | Poin penting | Key points |
| — Yang harus dilakukan | Yang harus dilakukan | Action items |
| — Tag | Tag | Tags |
| Kelompok "Balas" | Balas | Reply |
| — Buatkan balasan | Buatkan balasan | Draft a reply |
| Kelompok "Mendalam" | Mendalam | Go deeper |
| — Analisis mendalam | Analisis mendalam | Deep analysis |
| — keterangan kecil | pakai internet | uses the internet |
| Judul kartu hasil | Hasilnya | Result |
| Chip "di perangkat" | 📱 Di HP ini | 📱 On this device |
| Chip "di cloud" | ☁️ Di cloud | ☁️ In the cloud |
| Chip "demo" | Demo | Demo |
| Catatan di bawah hasil (perangkat) | Dibuat di HP ini — teksmu tidak keluar ke mana-mana. | Made on this device — your text never left it. |
| Catatan di bawah hasil (cloud) | Dibuat di cloud karena dokumennya panjang. | Made in the cloud because the document is long. |
| Catatan di bawah hasil (demo) | Mode demo — sambungkan Firebase untuk AI asli. | Demo mode — connect Firebase for the real AI. |
| Tombol salin | Salin | Copy |
| Tombol ganti catatan | Ganti catatan dengan ini | Replace note with this |
| Tombol disalin | Tersalin ✓ | Copied ✓ |
| Sidebar — judul | Catatanku | My notes |
| Sidebar — tombol baru | + Catatan baru | + New note |
| Sidebar — search | Cari catatan… | Search notes… |
| Sidebar — catatan kaki | Tersimpan di browser ini saja. | Stored in this browser only. |
| Sidebar — kosong | Belum ada catatan yang cocok. | No notes match that search. |
| Kosong — editor kosong | Tulis dulu ya, baru bisa diringkas. | Write or paste some text first. |
| Sedang mikir | Lagi mikir… | Thinking… |
| Gagal | Ups, gagal. Coba lagi ya. | Something went wrong. Try again. |
| Hapus catatan (menu ⋯) | Hapus catatan | Delete note |
| Konfirmasi hapus | Hapus "…"? | Delete "…"? |
| Toggle "hanya di perangkat" | Catatanku jangan keluar dari HP ini | Keep my notes on this device |
| Penjelasan toggle | Kalau aktif, AI cloud tidak dipakai. | When on, no cloud AI is used. |
| Status top bar (siap) | ● Siap | ● Ready |
| Status top bar (demo) | ● Demo | ● Demo |
| Detail status (ketuk titik) | AI di HP ini belum siap, jadi jawaban dibuat lewat cloud/demo. Semua tetap jalan. | On-device AI isn't ready here, so answers come from the cloud/demo. Everything still works. |
| Footer | Gratis, tanpa akun. Catatanmu tidak keluar dari HP ini. | Free, no account. Your notes never leave this device. |
| Langkah 1-2-3 | 1 Tulis atau tempel teks · 2 Pencet ✦ Ringkas · 3 Baca hasilnya di bawah | 1 Write or paste text · 2 Tap ✦ Summarise · 3 Read the result below |
| Hasil kosong (tidak ada aksi) | Tidak ada yang harus dilakukan di catatan ini. | No clear action items found in this note. |

Catatan untuk builder: teks hasil AI (ringkasan, poin, balasan) harus mengikuti bahasa yang dipilih — lihat §4. Kunci JSON internal tetap Inggris, hanya nilai/isi jawaban yang berbahasa pilihan user.

## 4. Menu bahasa ID / EN

**Posisi:** di top bar, kanan atas — persis di sebelah titik status, sebelum/sesudahnya tidak ada kontrol lain. Harus kelihatan di HP tanpa scroll dan tanpa membuka menu apa pun.

**Bentuk:** segmented toggle kecil, dua tombol berdampingan di satu pil:

```
[ 🌐 ID | EN ]        →   aktif: latar hijau, teks putih
                          tidak aktif: latar transparan, teks biasa
```

- Label cukup "ID | EN" (dengan ikon globe kecil 🌐 opsional di depan). Jangan pakai dropdown/select — dropdown menyembunyikan pilihan dan butuh dua ketukan.
- Lebar total kecil (±70px) supaya di HP 390px tetap muat di samping logo + titik status. Di layar kecil, tagline di bawah "Nota" boleh disembunyikan; toggle bahasa JANGAN disembunyikan.
- Saat diketuk: semua label UI langsung berubah (tanpa reload halaman), atribut `<html lang="...">` ikut berubah, pilihan disimpan di `localStorage` (mis. `nota.lang`) supaya pilihan user ingat di kunjungan berikutnya.
- Bahasa awal: ikuti bahasa browser kalau `id`/`en` (HP user kemungkinan besar sudah Indonesia), kalau bahasa lain atau tidak terdeteksi → **EN** (bahasa submission/juri). Pilihan tersimpan selalu menang atas deteksi.
- **Yang ikut berubah:** semua label, placeholder, tombol, chip, catatan kaki, langkah 1-2-3, dan pesan error/kosong (tabel §3).
- **Jawaban AI ikut bahasa pilihan:** prompt ke model diberi instruksi "Jawab dalam Bahasa Indonesia" / "Reply in English" sesuai toggle saat tombol dipencet. Ringkasan berbahasa Indonesia kalau toggle di ID, Inggris kalau di EN. Mode demo (extractive) tidak menerjemahkan — hasilnya mengikuti bahasa catatan aslinya, dan itu boleh dijelaskan satu baris kecil di kartu hasil demo kalau perlu (opsional, jangan tambah teks kalau tidak perlu).

## 5. Checklist builder — satu jalan (one pass)

Kerjakan berurutan; jangan lompat-lompat. Setiap item bisa dicek dari screenshot, bukan dari membaca kode.

- [ ] **1. Top bar:** tambahkan toggle `ID | EN` di kanan atas (segmented, aktif = hijau). Sembunyikan tagline di layar ≤760px kalau sempit. Titik status kecil (● Siap / ● Demo) tetap di top bar; pil "online" dan "AI: local demo" dihapus.
- [ ] **2. Hapus banner status AI** dari alur utama. Penjelasan status pindah ke panel kecil yang muncul saat titik status diketuk (pakai copy ramah §3, tanpa kata "unavailable" sebagai headline).
- [ ] **3. Susun ulang HP (mobile-first):** urutan kolom jadi — top bar → editor (+ tombol utama) → kartu hasil → daftar "Catatanku" (atau di balik tombol ☰). Pastikan tombol ✦ Ringkas kelihatan di layar pertama 390px tanpa scroll.
- [ ] **4. Satu tombol utama:** ✦ Ringkas / Summarise — besar, full-width di HP, hijau solid. Semua aksi lain pindah ke "Lainnya ▾" dengan 4 kelompok berlabel (§2).
- [ ] **5. Ganti semua copy** ke tabel §3 (ID + EN). Cari dan hapus dari semua yang terlihat: `PREFER_ON_DEVICE`, `InferenceMode`, `tokens`, `localStorage`, `Firebase`, `Gemini Nano/Flash/Pro`, `ON DEVICE`/`IN CLOUD`, `local demo mode`, `App Check`.
- [ ] **6. Meta editor:** tinggalkan hitungan kata saja ("209 kata"). Hapus "~292 tokens" dan nag "connect Firebase" dari baris meta (pindah ke panel status / README).
- [ ] **7. Chip hasil:** jadi "📱 Di HP ini" / "☁️ Di cloud" / "Demo" + satu kalimat penjelasan biasa (§3). Hapus chip huruf kapital semua.
- [ ] **8. Delete note:** pindah ke menu ⋯ di samping judul catatan, tetap dengan konfirmasi. Bukan lagi tombol di samping meta.
- [ ] **9. Sidebar + footer:** catatan kaki sidebar jadi satu baris; footer jadi satu baris + link "Cara kerja". Hapus paragraf teknis footer.
- [ ] **10. Contoh catatan:** ganti dua seed Inggris yang panjang dengan dua contoh pendek Bahasa Indonesia (§2).
- [ ] **11. Langkah 1-2-3:** tampilkan sekali saat pertama buka / saat catatan kosong; bisa di-dismiss; jangan permanen.
- [ ] **12. Bahasa:** toggle mengubah semua label + `lang` + jawaban AI mengikuti (§4); pilihan tersimpan di `localStorage`; bahasa awal = bahasa browser (id/en) lalu fallback EN.
- [ ] **13. Verifikasi dari render (bukan dari kode):** screenshot desktop 1280px + HP 390px; cek (a) tombol ✦ Ringkas kelihatan di layar pertama HP, (b) tidak ada lagi kata jargon §5 di screenshot mana pun, (c) toggle ID/EN mengubah label saat diklik, (d) `?selftest=1` tetap jalan, (e) tidak ada console error baru. Jangan klaim selesai sebelum screenshot dicek.

## Yang sengaja TIDAK diubah

- Arsitektur hybrid, model, dan routing AI tetap sama — ini murni UI + copy.
- Desain visual dasar (warna hijau, kertas off-white, font) tetap — user suka tampilannya, dia hanya bingung pakainya.
- Fitur tidak dikurangi — semua 10 aksi tetap ada, hanya 9 di antaranya pindah ke balik "Lainnya ▾".
