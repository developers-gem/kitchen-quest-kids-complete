const env = require("../config/env");

/**
 * Abstracted transactional email sender. In production this would call
 * a real provider (SES, Postmark, SendGrid, ...) -- swap the body of
 * `sendEmail` for a real provider call and nothing else in this file (or
 * any caller) needs to change, since `sendVerificationEmail`/
 * `sendPasswordResetEmail` already build the correct, complete message;
 * `sendEmail` is the only seam that needs a real integration.
 *
 * FIXED (production readiness audit, finding B1): both links used to
 * point at raw `/api/v1/...` API paths -- and the password-reset one
 * pointed at an endpoint that only accepts POST, so clicking it did
 * nothing even before this was fixed. Both now point at the actual web
 * app pages (via FRONTEND_URL) that render a form and call the API
 * themselves, matching how ResetPasswordPage.tsx already works.
 */
async function sendEmail({ to, subject, text }) {
  if (env.NODE_ENV === "test") return; // keep test output clean
  // eslint-disable-next-line no-console
  console.log(`\n📧 [email:${env.NODE_ENV}] To: ${to}\nSubject: ${subject}\n${text}\n`);
}

async function sendVerificationEmail(to, token) {
  const link = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Verify your Kitchen Quest Kids account",
    text: `Welcome to Kitchen Quest Kids! Verify your email: ${link}`,
  });
}

async function sendPasswordResetEmail(to, token) {
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Reset your Kitchen Quest Kids password",
    text: `Reset your password: ${link}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
