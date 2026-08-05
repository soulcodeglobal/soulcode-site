// netlify/functions/webinar-interest.js
//
// 開課通知（Register of Interest）→ MailerLite「課程資訊訂閱」group
// 前端 POST { email, region, source, language } 過嚟：
//   region  = 香港 / 台灣 / 澳門 / 新加坡 / 馬來西亞 / 澳洲 / 紐西蘭 / 日本 / 加拿大 / 美國 / 英國／歐洲 / 其他
//   source  = webinar（講座頁）或 course（課程頁）
// 全部落「課程資訊訂閱」group，用 region 欄做地區統計（例如 segment: region = 台灣）。
//
// 需要嘅 Netlify 環境變數：
//   MAILERLITE_API_KEY      （已有）
//   MAILERLITE_GROUP_NEWS   「課程資訊訂閱」group ID（已有：191075802309198930）
//
// MailerLite 要開兩個 custom field（Text）：region、source
//
// 部署後 endpoint：https://soulcodeglobal.com/.netlify/functions/webinar-interest

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const key = process.env.MAILERLITE_API_KEY;
  const group = process.env.MAILERLITE_GROUP_NEWS;
  if (!key) { console.error("Missing MAILERLITE_API_KEY"); return resp(500, { error: "Not configured" }); }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return resp(400, { error: "Bad JSON" }); }

  const email = String(body.email || "").trim().toLowerCase();
  const region = String(body.region || "").trim().slice(0, 30);
  const source = String(body.source || "").trim().slice(0, 20);
  const rawLang = String(body.language || "").trim().toLowerCase();
  const language = rawLang === "en" ? "en" : (rawLang ? "zh" : "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return resp(400, { error: "Invalid email" });

  const payload = { email, status: "active", fields: {} };
  if (region) payload.fields.region = region;
  if (source) payload.fields.source = source;
  if (language) payload.fields.language = language;
  if (group) payload.groups = [group];

  try {
    const r = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("MailerLite error", r.status, await r.text());
      return resp(502, { error: "Subscribe failed" });
    }
    return resp(200, { ok: true });
  } catch (e) {
    console.error(e);
    return resp(500, { error: "Server error" });
  }
};

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
