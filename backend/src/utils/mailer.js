const nodemailer = require("nodemailer");

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function sendVerificationEmail(to, name, code, minutes) {
  await getTransporter().sendMail({
    from: `"Virtual Stock" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your Virtual Stock verification code: ${code}`,
    text: `Hi ${name},\n\nYour verification code is ${code}.\nIt expires in ${minutes} minutes.\n\nIf you did not try to sign up, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
        <h2 style="margin:0 0 12px">Verify your email</h2>
        <p>Hi ${escapeHtml(name)}, use this code to finish creating your Virtual Stock account:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:20px 0">${code}</p>
        <p style="color:#666">This code expires in ${minutes} minutes. If you did not try to sign up, you can ignore this email.</p>
      </div>`,
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = { sendVerificationEmail };
