// netlify/functions/enroll.js
//
// 課程報讀 intake form → MailerLite「課程報名」group
// 前端 POST { name, email, im_app, im_id, course, city, format, note?, language? } 過嚟，
// 用 MailerLite API 建立／更新 subscriber，寫入相關欄位，並加入「課程報名」group。
//
// 需要嘅 Netlify 環境變數（Site settings → Environment variables）：
//   MAILERLITE_API_KEY        MailerLite → Integrations → API
//   MAILERLITE_GROUP_ENROLL   「課程報名」group 的 ID（喺 MailerLite 開好 group 後填）
//
// 注意：呢個 function 只負責入 CRM。付款由 Stripe 連結處理，
//       email 通知由 Netlify Forms 負責（表單同時 POST 去「/」）。
//       即使呢個 function 失敗，前端都唔會阻到付款流程。
//
// 部署後 endpoint：https://soulcodeglobal.com/.netlify/functions/enroll

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const key = process.env.MAILERLITE_API_KEY;
  const group = process.env.MAILERLITE_GROUP_ENROLL;
  if (!key) { console.error("Missing MAILERLITE_API_KEY"); return resp(500, { error: "Not configured" }); }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return resp(400, { error: "Bad JSON" }); }

  const email = String(body.email || "").trim().toLowerCase();
  const name  = String(body.name || "").trim();
  const imApp = String(body.im_app || "").trim();
  const imId  = String(body.im_id || "").trim();
  const course= String(body.course || "").trim();
  const city  = String(body.city || "").trim();
  const format= String(body.format || "").trim();
  const note  = String(body.note || "").trim();
  const rawLang = String(body.language || "").trim().toLowerCase();
  const language = rawLang === "en" ? "en" : (rawLang ? "zh" : "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return resp(400, { error: "Invalid email" });

  const payload = { email, status: "active", fields: {} };
  if (name)   payload.fields.name = name;
  if (imApp)  payload.fields.im_app = imApp;
  if (imId)   payload.fields.im_id = imId;
  if (course) payload.fields.enroll_course = course;
  if (city)   payload.fields.enroll_city = city;
  if (format) payload.fields.enroll_format = format;
  if (note)   payload.fields.enroll_note = note;
  if (language) payload.fields.language = language;
  if (group)  payload.groups = [group];

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
      console.error("MailerLite enroll error", r.status, await r.text());
      return resp(502, { error: "Enroll failed" });
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
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(obj),
  };
}
