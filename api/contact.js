// Vercel serverless function: POST /api/contact
// 1. Checks the form fields and the honeypot
// 2. Verifies the Cloudflare Turnstile captcha token
// 3. Sends the message by email through Resend
//
// Required environment variables (set them in Vercel → Project → Settings → Environment Variables):
//   TURNSTILE_SECRET_KEY  – Turnstile secret key from the Cloudflare dashboard
//   RESEND_API_KEY        – API key from resend.com
//   CONTACT_TO_EMAIL      – where messages are delivered
// Optional:
//   CONTACT_FROM_EMAIL    – sender, e.g. "Portfolio <contact@yourdomain.com>"
//                           (defaults to Resend's test sender, which only delivers
//                            to the email address you signed up to Resend with)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = { name: 100, email: 200, subject: 150, message: 5000 };

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Remove line breaks so values can't inject extra email headers
function oneLine(text) {
  return String(text).replace(/[\r\n]+/g, " ").trim();
}

async function verifyTurnstile(token, ip) {
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip) body.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = await res.json();
  return data.success === true;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { TURNSTILE_SECRET_KEY, RESEND_API_KEY, CONTACT_TO_EMAIL } = process.env;
  if (!TURNSTILE_SECRET_KEY || !RESEND_API_KEY || !CONTACT_TO_EMAIL) {
    console.error("Contact form is missing environment variables.");
    return res.status(500).json({ error: "The contact form isn't set up yet. Please try again later." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid request." });
    }
  }
  body = body || {};

  const name = oneLine(body.name || "");
  const email = oneLine(body.email || "");
  const subject = oneLine(body.subject || "");
  const message = String(body.message || "").trim();
  const token = String(body.token || "");

  // Honeypot filled in → almost certainly a bot. Pretend it worked so it doesn't retry.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill in your name, email and message." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return res.status(400).json({ error: "Your message is too long." });
  }
  if (!token) {
    return res.status(400).json({ error: "Please complete the captcha check." });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined;

  try {
    if (!(await verifyTurnstile(token, ip))) {
      return res.status(400).json({ error: "Captcha check failed. Please try again." });
    }
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return res.status(502).json({ error: "Couldn't verify the captcha. Please try again." });
  }

  const emailSubject = `Portfolio contact: ${subject || `message from ${name}`}`;
  const html = `
    <h2>New message from your portfolio</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;
  const text = `New message from your portfolio\n\nName: ${name}\nEmail: ${email}\n${
    subject ? `Subject: ${subject}\n` : ""
  }\n${message}`;

  try {
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>",
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject: emailSubject,
        html,
        text,
      }),
    });

    if (!sendRes.ok) {
      console.error("Resend error:", sendRes.status, await sendRes.text());
      return res.status(502).json({ error: "Your message couldn't be sent. Please try again later." });
    }
  } catch (err) {
    console.error("Resend request failed:", err);
    return res.status(502).json({ error: "Your message couldn't be sent. Please try again later." });
  }

  return res.status(200).json({ ok: true });
};
