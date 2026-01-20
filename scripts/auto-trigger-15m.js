/**
 * Auto notify Telegram:
 * - ≤ 30 menit sebelum LIVE
 * - ATAU ≤ 10 menit setelah LIVE
 * Anti spam (1x per match)
 */

import fs from "fs";
import https from "https";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) process.exit(0);

const CLEAN_FILE = "events/clean.json";
const TRIGGER_FILE = "events/triggered.json";

if (!fs.existsSync(CLEAN_FILE)) process.exit(0);

const data = JSON.parse(fs.readFileSync(CLEAN_FILE, "utf8"));
if (!Array.isArray(data.events)) process.exit(0);

// anti-spam load
let sent = [];
if (fs.existsSync(TRIGGER_FILE)) {
  sent = JSON.parse(fs.readFileSync(TRIGGER_FILE, "utf8"));
}

const NOW = Math.floor(Date.now() / 1000);
const BEFORE = 30 * 60; // 30 menit sebelum
const AFTER  = 10 * 60; // 10 menit setelah LIVE

for (const m of data.events) {
  if (!m.time || !m.league || !m.home || !m.away) continue;

  const diff = m.time - NOW;

  // window longgar & realistis
  const inWindow =
    (diff > 0 && diff <= BEFORE) ||
    (diff <= 0 && diff >= -AFTER);

  if (!inWindow) continue;

  const key = `${m.league}|${m.home}|${m.away}|${m.time}`;
  if (sent.includes(key)) continue;

  const timeWIB = new Date(m.time * 1000).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta"
  });

  const statusText =
    diff > 0 ? "SEGERA LIVE" : "BARU SAJA LIVE";

  const text =
`🔴 *${statusText}*
🏆 *${m.league}*
⚽ ${m.home} vs ${m.away}
🕒 ${timeWIB} WIB

📺 Buka playlist IPTV kamu`;

  const payload = JSON.stringify({
    chat_id: CHAT_ID,
    text,
    parse_mode: "Markdown"
  });

  const req = https.request(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length
      }
    }
  );

  req.write(payload);
  req.end();

  sent.push(key);
  console.log("Telegram sent:", key);
}

// simpan marker anti-spam
fs.writeFileSync(TRIGGER_FILE, JSON.stringify(sent, null, 2));
