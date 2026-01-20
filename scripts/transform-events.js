const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("events/raw.json", "utf8"));

const output = {
  updated: Math.floor(Date.now() / 1000),
  events: []
};

if (!raw?.matches) {
  fs.writeFileSync("events/clean.json", JSON.stringify(output, null, 2));
  process.exit(0);
}

const isHttp = (url) =>
  typeof url === "string" && /^https?:\/\//i.test(url);

for (const league of Object.keys(raw.matches)) {
  for (const match of raw.matches[league]) {

    let stream = null;

    // ================= 1. walematchvideos =================
    const videos =
      match?.data?.walematch?.walematchvideos ||
      match?.walematchvideos ||
      [];

    stream =
      videos.find(v =>
        isHttp(v?.video_url) &&
        ["m3u8", "mpd"].includes(v?.v_type)
      ) ||
      videos.find(v =>
        isHttp(v?.video_url) &&
        v?.v_type === "flv"
      ) ||
      null;

    // ================= 2. anchors (fallback penting) =================
    if (!stream) {
      const anchors = match?.data?.anchors || [];
      for (const a of anchors) {
        const url = a?.live?.pull_url;
        if (isHttp(url)) {
          stream = {
            v_type: url.includes(".m3u8") ? "m3u8" : "flv",
            video_url: url
          };
          break;
        }
      }
    }

    // ================= TIME =================
    const time =
      match?.data?.live?.match_time ||
      match?.data?.time ||
      match?.time ||
      null;

    // ================= TEAMS =================
    const home =
      match?.home?.name_en ||
      match?.data?.hometeam?.name_en ||
      "HOME";

    const away =
      match?.away?.name_en ||
      match?.data?.awayteam?.name_en ||
      "AWAY";

    // ================= STATUS =================
    const status = stream ? "LIVE" : "UPCOMING";

    output.events.push({
      league,
      status,
      time,
      home,
      away,
      stream: stream
        ? { type: stream.v_type, url: stream.video_url }
        : { type: "upcoming", url: "http://127.0.0.1/upcoming" }
    });
  }
}

fs.writeFileSync("events/clean.json", JSON.stringify(output, null, 2));
console.log(`[OK] Events generated: ${output.events.length}`);
