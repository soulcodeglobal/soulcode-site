// netlify/functions/subscribe.js
//
// 計算器 / 訂閱框 email 擷取 → MailerLite（課程資訊訂閱）
// 前端 POST { email, soul_core?, language? } 過嚟，
// 用 MailerLite API 建立／更新 subscriber，寫入 soul_core / language 欄，
// 並加入「課程資訊訂閱」group。
//
// 需要嘅 Netlify 環境變數（Site settings → Environment variables）：
//   MAILERLITE_API_KEY     MailerLite → Integrations → API（付費方案 API 先可用）
//   MAILERLITE_GROUP_NEWS  「課程資訊訂閱」group 的 ID（191075802309198930）
//
// 部署後 endpoint：https://soulcodeglobal.com/.netlify/functions/subscribe

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const key = process.env.MAILERLITE_API_KEY;
  const group = process.env.MAILERLITE_GROUP_NEWS;
  if (!key) { console.error("Missing MAILERLITE_API_KEY"); return resp(500, { error: "Not configured" }); }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return resp(400, { error: "Bad JSON" }); }

  const email = String(body.email || "").trim().toLowerCase();
  const soul = String(body.soul_core || "").trim();
  const language = String(body.language || "").trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return resp(400, { error: "Invalid email" });

  const payload = { email, fields: {}, status: "active" };
  if (soul) payload.fields.soul_core = soul;
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
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(obj),
  };
}
