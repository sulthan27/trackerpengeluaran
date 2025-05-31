const TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // Ganti dengan token bot Telegram kamu
const CATEGORIES = ['transport', 'food', 'groceries', 'shopping', 'entertainment', 'snacking', 'others', 'investment'];
const SOURCES = ['dompet', 'atm'];

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const text = contents.message.text.trim();
    const chatId = contents.message.chat.id;

    if (text === '!bantuan') {
      sendTelegramMessage(chatId, getHelp());
      return;
    } else if (text === '/total') {
      sendTelegramMessage(chatId, `📊 Total pengeluaran bulan ini: Rp ${getTotal().toLocaleString('id-ID')}`);
      return;
    } else if (text === '/rekapmingguan') {
      sendTelegramMessage(chatId, getWeeklySummary());
      return;
    } else if (text.startsWith('/tambahsaldo')) {
      tambahSaldoHandler(chatId, text);
      return;
    } else if (text === '/sisaatm') {
      sendTelegramMessage(chatId, `💳 Saldo ATM saat ini: Rp ${getSaldo('atm').toLocaleString('id-ID')}`);
      return;
    } else if (text === '/sisadompet') {
      sendTelegramMessage(chatId, `👛 Saldo Dompet saat ini: Rp ${getSaldo('dompet').toLocaleString('id-ID')}`);
      return;
    }

    // Input transaksi dengan format: kategori, keterangan, jumlah, sumber
    const parts = text.split(',').map(s => s.trim());
    if (parts.length !== 4) {
      sendTelegramMessage(chatId, '⚠️ Format salah.\nGunakan:\nkategori, keterangan, jumlah, sumber\nContoh:\nfood, makan siang, 25000, dompet');
      return;
    }

    let [kategori, keterangan, jumlahStr, sumber] = parts;
    kategori = kategori.toLowerCase();
    sumber = sumber.toLowerCase();

    if (!CATEGORIES.includes(kategori)) {
      sendTelegramMessage(chatId, `⚠️ Kategori tidak dikenal.\nPakai salah satu:\n${CATEGORIES.join(', ')}`);
      return;
    }

    if (!SOURCES.includes(sumber)) {
      sendTelegramMessage(chatId, `⚠️ Sumber tidak dikenal.\nPakai salah satu:\n${SOURCES.join(', ')}`);
      return;
    }

    const jumlah = parseInt(jumlahStr.replace(/[^0-9]/g, ''));
    if (isNaN(jumlah) || jumlah <= 0) {
      sendTelegramMessage(chatId, '⚠️ Jumlah tidak valid.\nGunakan angka positif.');
      return;
    }

    // Cek saldo cukup
    const currentSaldo = getSaldo(sumber);
    if (jumlah > currentSaldo) {
      sendTelegramMessage(chatId, `⚠️ Saldo ${sumber} tidak cukup.\nSaldo sekarang: Rp ${currentSaldo.toLocaleString('id-ID')}`);
      return;
    }

    // Simpan transaksi dan update saldo
    const tanggal = new Date();
    const sheet = getOrCreateSheet('Data');

    const newSaldoDompet = sumber === 'dompet' ? currentSaldo - jumlah : getSaldo('dompet');
    const newSaldoATM = sumber === 'atm' ? currentSaldo - jumlah : getSaldo('atm');

    sheet.appendRow([tanggal, kategori, keterangan, jumlah, sumber, newSaldoDompet, newSaldoATM]);

    const formattedDate = Utilities.formatDate(tanggal, "GMT+7", "d MMMM yyyy HH:mm");
    const response =
      `✅ Transaksi dicatat:\n` +
      `📅 ${formattedDate}\n` +
      `🏷️ ${kategori}\n` +
      `📝 ${keterangan}\n` +
      `💰 Rp ${jumlah.toLocaleString('id-ID')}\n` +
      `👛 Saldo Dompet: Rp ${newSaldoDompet.toLocaleString('id-ID')}\n` +
      `💳 Saldo ATM: Rp ${newSaldoATM.toLocaleString('id-ID')}`;

    sendTelegramMessage(chatId, response);

    // Peringatan jika total bulan ini > 500.000
    if (getTotal() > 500000) {
      sendTelegramMessage(chatId, '⚠️ Peringatan: Total pengeluaran bulan ini sudah melebihi Rp 500.000!');
    }

  } catch (err) {
    Logger.log('ERROR: ' + err);
    sendTelegramMessage(chatId, '❌ Terjadi kesalahan saat memproses data.');
  }
}

// Ambil sheet data, buat jika belum ada
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['Tanggal', 'Kategori', 'Keterangan', 'Jumlah (IDR)', 'Sumber', 'Saldo Dompet', 'Saldo ATM']);
  }
  return sheet;
}

// Ambil saldo terakhir dompet/atm
function getSaldo(sumber) {
  const sheet = getOrCreateSheet('Data');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const saldoDompet = sheet.getRange(lastRow, 6).getValue();
  const saldoATM = sheet.getRange(lastRow, 7).getValue();

  if (sumber === 'dompet') return saldoDompet || 0;
  if (sumber === 'atm') return saldoATM || 0;
  return 0;
}

// Fungsi tambah saldo
function tambahSaldoHandler(chatId, text) {
  // Format: /tambahsaldo sumber, jumlah
  const params = text.replace('/tambahsaldo', '').trim().split(',');
  if (params.length !== 2) {
    sendTelegramMessage(chatId, '⚠️ Format salah.\nGunakan:\n/tambahsaldo <dompet|atm>, <jumlah>');
    return;
  }

  let sumber = params[0].trim().toLowerCase();
  let jumlah = parseInt(params[1].trim().replace(/[^0-9]/g, ''));

  if (!SOURCES.includes(sumber)) {
    sendTelegramMessage(chatId, `⚠️ Sumber salah.\nPakai salah satu:\n${SOURCES.join(', ')}`);
    return;
  }
  if (isNaN(jumlah) || jumlah <= 0) {
    sendTelegramMessage(chatId, '⚠️ Jumlah tidak valid. Gunakan angka positif.');
    return;
  }

  const sheet = getOrCreateSheet('Data');
  const lastRow = sheet.getLastRow();
  let saldoDompet = 0, saldoATM = 0;
  if (lastRow >= 2) {
    saldoDompet = sheet.getRange(lastRow, 6).getValue();
    saldoATM = sheet.getRange(lastRow, 7).getValue();
  }

  if (sumber === 'dompet') saldoDompet += jumlah;
  else if (sumber === 'atm') saldoATM += jumlah;

  const tanggal = new Date();
  sheet.appendRow([tanggal, 'saldo update', '-', 0, sumber, saldoDompet, saldoATM]);

  sendTelegramMessage(chatId, `✅ Saldo ${sumber} bertambah Rp ${jumlah.toLocaleString('id-ID')}.\nSaldo sekarang: Rp ${(sumber === 'dompet' ? saldoDompet : saldoATM).toLocaleString('id-ID')}`);
}

// Hitung total pengeluaran bulan ini
function getTotal() {
  const sheet = getOrCreateSheet('Data');
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  let total = 0;

  for (let i = 1; i < data.length; i++) {
    let rowDate = new Date(data[i][0]);
    if (rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear()) {
      total += Number(data[i][3]);
    }
  }
  return total;
}

// Rekap pengeluaran minggu ini
function getWeeklySummary() {
  const sheet = getOrCreateSheet('Data');
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const dayOfWeek = now.getDay(); // Minggu=0, Senin=1, ...
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  let total = 0;

  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][0]);
    if (rowDate >= monday && rowDate <= now) {
      total += Number(data[i][3]);
    }
  }
  return `📅 Rekap pengeluaran minggu ini:\nTotal: Rp ${total.toLocaleString('id-ID')}`;
}

function getHelp() {
  return (
    "📌 *Daftar Command Yang Tersedia* 📌\n\n" +
    "/total - Menampilkan total pengeluaran bulan ini\n" +
    "/rekapmingguan - Menampilkan rekap pengeluaran minggu ini\n" +
    "/tambahsaldo <dompet|atm>, <jumlah> - Menambahkan saldo ke dompet atau ATM\n" +
    "/sisaatm - Menampilkan sisa saldo ATM\n" +
    "/sisadompet - Menampilkan sisa saldo dompet\n" +
    "Format input transaksi:\n" +
    "kategori, keterangan, jumlah, sumber\n" +
    "Contoh:\nfood, makan siang, 25000, dompet"
  );
}

function sendTelegramMessage(chatId, message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const payload = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    }),
  };
  UrlFetchApp.fetch(url, payload);
}
