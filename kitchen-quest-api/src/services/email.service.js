const nodemailer = require("nodemailer");
const env = require("../config/env");

/**
 * Configure Nodemailer transport.
 * If SMTP environment variables are missing, fallback to mock mode.
 */
let transporter = null;

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587,
    secure: Number(env.SMTP_PORT) === 465, // true for 465, false for 587/other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Low-level transactional sender.
 * Keeps test output silent, logs to console in development when SMTP is unset,
 * and sends via SMTP in production.
 */
async function sendEmail({ to, subject, text, html }) {
  if (env.NODE_ENV === "test") return; // keep test output clean

  if (!transporter) {
    // eslint-disable-next-line no-console
    console.log(`\n📧 [email:${env.NODE_ENV}:mock] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { mock: true };
  }

  try {
    const fromAddress = env.EMAIL_FROM || '"Kitchen Quest Kids" <noreply@kitchenquestkids.com>';
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || text,
    });
    return info;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[email:error] Failed sending email to ${to}:`, error.message);
    // Return error without rethrowing so auth flow does not fail catastrophically
    return { error };
  }
}

async function sendVerificationEmail(to, token) {
  const link = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Verify your Kitchen Quest Kids account";
  const text = `Welcome to Kitchen Quest Kids! Verify your email: ${link}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #f97316;">Welcome to Kitchen Quest Kids! 🧑‍🍳</h2>
      <p>Thanks for creating a parent account. Tap below to verify your email address and get your chefs started:</p>
      <div style="margin: 24px 0;">
        <a href="${link}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:<br /><a href="${link}">${link}</a></p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
}

async function sendPasswordResetEmail(to, token) {
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Reset your Kitchen Quest Kids password";
  const text = `Reset your password: ${link}\n\nIf you didn't request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #f97316;">Kitchen Quest Kids</h2>
      <p>We received a request to reset your account password. Tap below to choose a new one:</p>
      <div style="margin: 24px 0;">
        <a href="${link}" style="background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:<br /><a href="${link}">${link}</a></p>
      <p style="font-size: 12px; color: #999; margin-top: 32px;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };