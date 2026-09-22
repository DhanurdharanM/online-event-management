import nodemailer from 'nodemailer';

let transporter;
const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
};

export const sendMail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[email not sent - SMTP not configured] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || 'Convene <no-reply@convene.local>', to, subject, html });
  } catch (e) {
    console.error('Email failed:', e.message);
  }
};

export const sendBulk = (messages) => Promise.allSettled(messages.map(sendMail));

export const wrap = (title, body) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#14282E">
  <div style="background:#14282E;color:#F5B82E;padding:18px 24px;font-size:20px;font-weight:bold">Convene</div>
  <div style="padding:24px;border:1px solid #DCE3E0;border-top:0">
    <h2 style="margin-top:0">${title}</h2>${body}
  </div>
</div>`;
