const nodemailer = require('nodemailer');

const isPlaceholder = (v) => !v || v.includes('yourprovider') || v.includes('your@email') || v === 'yourpassword';

const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (isPlaceholder(SMTP_HOST) || isPlaceholder(SMTP_USER) || isPlaceholder(SMTP_PASS)) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

/**
 * Send password reset email.
 * Falls back to console logging the reset URL when SMTP is not configured
 * (useful during development).
 */
const sendPasswordResetEmail = async ({ to, resetUrl, firstName }) => {
  const transporter = createTransporter();

  const subject = 'IMEP Portal — Password Reset Request';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#1d4ed8">Password Reset</h2>
      <p>Hi ${firstName},</p>
      <p>We received a request to reset the password for your IMEP Portal account.</p>
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p style="text-align:center;margin:32px 0">
        <a href="${resetUrl}"
           style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
      <p style="font-size:12px;color:#6b7280">
        Or copy this link into your browser:<br>${resetUrl}
      </p>
    </div>
  `;

  if (!transporter) {
    console.log('\n=== PASSWORD RESET (SMTP not configured — dev mode) ===');
    console.log(`To: ${to}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('=======================================================\n');
    return;
  }

  await transporter.sendMail({
    from: `"IMEP Portal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendPasswordResetEmail };
