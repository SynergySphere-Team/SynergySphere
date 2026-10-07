import nodemailer from 'nodemailer';

interface PasswordResetEmailOptions {
  to: string;
  resetToken: string;
  userName?: string;
}

interface SendEmailResult {
  success: boolean;
  simulated: boolean;
  resetUrl: string;
  previewUrl?: string;
  messageId?: string;
}

function getFrontendBaseUrl(): string {
  const envUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // Take first origin if comma-separated
  const firstUrl = envUrl.split(',')[0].trim();
  return firstUrl.replace(/\/$/, '');
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    (process.env.SMTP_HOST || process.env.SMTP_SERVICE) &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,
  );
}

function createTransporter() {
  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if ((!host && !service) || !user || !pass) {
    return null;
  }

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
  userName,
}: PasswordResetEmailOptions): Promise<SendEmailResult> {
  const baseUrl = getFrontendBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"SynergySphere" <noreply@synergysphere.com>';
  const recipientName = userName ? userName.trim() : 'there';

  const transporter = createTransporter();

  // If no SMTP credentials are configured, handle in dev/preview mode
  if (!transporter) {
    console.log('\n========================================================================');
    console.log('[SYNERGYSPHERE EMAIL DISPATCH - DEV SIMULATION]');
    console.log(`To: ${to}`);
    console.log(`Subject: Reset Your SynergySphere Password`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log('(To deliver real emails, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in backend/.env)');
    console.log('========================================================================\n');

    return {
      success: true,
      simulated: true,
      resetUrl,
    };
  }

  const textBody = `Hello ${recipientName},

We received a request to reset your password for your SynergySphere account.

Click the link below to choose a new password:
${resetUrl}

This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.

Best regards,
The SynergySphere Team
`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - SynergySphere</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050a0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050a0d; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #0a141b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: inline-block; padding: 10px 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; margin-bottom: 12px;">
                <span style="font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">SynergySphere</span>
              </div>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
                Hello <strong style="color: #ffffff;">${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">
                We received a request to reset the password for your SynergySphere account (<span style="color: #cbd5e1;">${to}</span>). Click the button below to choose a new, secure password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #022c22; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                  Reset Your Password
                </a>
              </div>

              <!-- Expiry & Security Notice -->
              <div style="background-color: rgba(255, 255, 255, 0.03); border-left: 3px solid #10b981; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                  ⏱️ <strong>Note:</strong> This link is only valid for <strong>1 hour</strong>. If you did not request this password reset, you can safely ignore this email — your account is completely safe.
                </p>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; word-break: break-all; font-size: 12px; line-height: 18px;">
                <a href="${resetUrl}" style="color: #10b981; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0, 0, 0, 0.25); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                &copy; ${new Date().getFullYear()} SynergySphere. Learn. Build. Thrive.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Reset your SynergySphere password',
      text: textBody,
      html: htmlBody,
    });

    console.log(`[EMAIL DISPATCH] Password reset email sent to ${to} (Message ID: ${info.messageId})`);

    return {
      success: true,
      simulated: false,
      resetUrl,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[EMAIL DISPATCH ERROR] Failed to send email to ${to}:`, error);
    // Even if remote SMTP fails in development or test, don't completely prevent testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL DISPATCH FALLBACK] Local reset link available: ${resetUrl}`);
      return {
        success: true,
        simulated: true,
        resetUrl,
      };
    }
    throw error;
  }
}
