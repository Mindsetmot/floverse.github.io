# Subtitle Studio Pro (Mobile Optimized) 🎬

Subtitle Studio Pro adalah web-based SRT editor yang dirancang khusus untuk penggunaan di perangkat mobile. Fokus utama aplikasi ini adalah kecepatan sinkronisasi waktu (*timestamping*) dan kemudahan formatting untuk lirik musik.

## ✨ Fitur Utama

* **⚡ Instant Sync:** Tombol START & END yang responsif tanpa jeda (*zero lag*) untuk menangkap waktu secara real-time.
* **🎶 Music Mode Preset:** Format otomatis `{\an8}<b><i>` hanya dengan satu klik untuk tampilan lirik musik yang elegan di posisi atas.
* **↩️ Robust Undo/Redo:** Sistem riwayat hingga 50 langkah yang mencatat setiap perubahan kecil, termasuk perubahan timestamp instan.
* **📱 Mobile First Design:** Antarmuka yang ramah sentuhan, mendukung mode Portrait (9:16) dan Landscape (16:9).
* **💾 Auto-Draft:** Progress kerja otomatis tersimpan di LocalStorage, aman meskipun browser tertutup secara tidak sengaja.
* **🔍 Auto-Scroll:** Daftar subtitle akan otomatis mengikuti durasi video yang sedang diputar.

> **Note:** Fitur **Music Mode** menggunakan tag format `{\an8}` (Top-Center alignment) yang didukung oleh sebagian besar pemutar video modern seperti VLC, MPC-HC, dan pemutar video Android/iOS untuk memastikan lirik musik tidak menutupi teks utama.

## 🚀 Cara Menggunakan

1.  **Muat Video:** Klik "Pilih Video" untuk memuat file video lokal (MP4/WebM).
2.  **Impor/Tambah Subtitle:** Unggah file `.srt` yang sudah ada atau tambah baris baru menggunakan tombol `(+)`.
3.  **Sinkronisasi:** Putar video, dan tekan **START** pada baris subtitle saat ucapan dimulai, lalu tekan **END** saat ucapan berakhir.
4.  **Formatting:** Gunakan ikon musik untuk mengubah baris menjadi format lirik.
5.  **Ekspor:** Setelah selesai, klik "Simpan Subtitle" untuk mengunduh file `.srt` hasil editan.

## 🛠️ Teknologi yang Digunakan

* **HTML5 & CSS3:** Menggunakan CSS Grid dan Flexbox untuk layout responsif.
* **Vanilla JavaScript:** Performa maksimal tanpa dependensi library eksternal (No jQuery/React).
* **FontAwesome:** Untuk ikon antarmuka yang intuitif.

---
© 2025 Floverse - All Rights Reserved
