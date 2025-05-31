# Expense Tracker Telegram Bot with Google Apps Script

Aplikasi bot Telegram untuk mencatat pengeluaran dan saldo keuangan sederhana menggunakan Google Apps Script dan Google Sheets.

## Fitur

- Mencatat transaksi pengeluaran berdasarkan kategori, keterangan, jumlah, dan sumber (dompet/ATM)
- Menampilkan total pengeluaran bulan berjalan
- Menampilkan rekap pengeluaran mingguan
- Menambah saldo dompet dan ATM
- Menampilkan sisa saldo dompet dan ATM
- Menampilkan daftar command dengan perintah `!bantuan`
- Peringatan jika total pengeluaran bulan lebih dari Rp 500.000
- Semua data disimpan dalam satu sheet Google Sheets bernama **"Data"**

## Teknologi

- Google Apps Script (JavaScript)
- Google Sheets sebagai database
- Telegram Bot API

## Struktur Data di Google Sheets

Sheet bernama **Data** dengan kolom:

| Kolom        | Deskripsi                               |
|--------------|---------------------------------------|
| Tanggal      | Waktu transaksi/saldo dicatat          |
| Kategori     | Kategori pengeluaran atau 'saldo update' |
| Keterangan   | Keterangan transaksi                    |
| Jumlah (IDR) | Jumlah pengeluaran (angka) atau 0 untuk saldo update |
| Sumber       | Dompet atau ATM                        |
| Saldo Dompet | Saldo dompet setelah transaksi         |
| Saldo ATM    | Saldo ATM setelah transaksi             |

## Cara Pakai

### 1. Setup Google Sheets & Apps Script

- Buat Google Sheets baru
- Buka menu `Extensions` > `Apps Script`
- Salin dan tempel kode Apps Script utama (`Code.gs`)
- Simpan project

### 2. Deploy sebagai Web App

- Pilih menu `Deploy` > `New deployment`
- Pilih "Web app"
- Set akses ke "Anyone, even anonymous"
- Klik Deploy, dan salin URL Web App

### 3. Buat Telegram Bot & Set Webhook

- Buat bot Telegram menggunakan [BotFather](https://t.me/BotFather)
- Dapatkan token bot Telegram
- Masukkan token ke variable `TELEGRAM_TOKEN` di Apps Script
- Set webhook bot ke URL Web App dengan cara:

```bash
curl -F "url=<WEB_APP_URL>" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook

### 4. Ketik !bantuan untuk mengetahui commands yang tersedia