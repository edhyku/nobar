/**
 * Auto notify Telegram jika event LIVE ≤ 15 menit
 * Baca: events/clean.json
 * Tulis: events/triggered.json (anti spam)
 */

import fs from "fs";
import https from "https";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.log("Telegram env missing");
  process.exit(0);
}

const CLEAN_FILE = "events/clean.json";
const TRIGGER_FILE = "events/triggered.json";

if (!fs.existsSync(CLEAN_FILE)) {
  console.log("clean.json not found");
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(CLEAN_FILE, "utf8"));
if (!Array.isArray(data.events)) {
  console.log("No events array");
  process.exit(0);
}

// load triggered (anti spam)
let sent = [];
if (fs.existsSync(TRIGGER_FILE)) {
  sent = JSON.parse(fs.readFileSync(TRIGGER_FILE, "utf8"));
}

const NOW = Math.floor(Date.now() / 1000);
const WINDOW = 15 * 60; // 15 menit
const newlyTriggered = [];

for (const m of data.events) {
  if (!m.time || !m.league || !m.home || !m.away) continue;

  const diff = m.time - NOW;
  if (diff <= 0 || diff > WINDOW) continue;

  const key = `${m.league}|${m.home}|${m.away}|${m.time}`;
  if (sent.includes(key)) continue;

  const timeWIB = new Date(m.time * 1000).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta"
  });

  const text =
`⏰ *LIVE 15 MENIT LAGI*
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
  newlyTriggered.push(key);

  console.log(`Notified: ${key}`);
}

if (newlyTriggered.length > 0) {
  fs.writeFileSync(TRIGGER_FILE, JSON.stringify(sent, null, 2));
}
