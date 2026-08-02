import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email, otpCode, posName } = await request.json();

    const targetEmail = email || "cheychon258@gmail.com";
    if (!otpCode) {
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
      );
    }

    const storeTitle = posName || "ផ្ទះកន្ត្រក ផ្លូវ១០ (POS Station)";

    // Dynamic Email HTML Body for Gmail
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
        <div style="background-color: #0F522B; color: #ffffff; padding: 20px; border-radius: 14px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800;">${storeTitle}</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">2-Step Authentication (2FA)</p>
        </div>
        <div style="padding: 28px 10px; text-align: center;">
          <p style="font-size: 14px; color: #475569; font-weight: 600; margin: 0 0 12px 0;">
            Your 2-Step Verification Code for <strong>${targetEmail}</strong> is:
          </p>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0F522B; background: #E8F5ED; padding: 16px 32px; border-radius: 16px; display: inline-block; border: 1.5px solid #86efac; margin: 8px 0;">
            ${otpCode}
          </div>
          <p style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 20px;">
            ⏰ Code expires in <strong>3 minutes</strong>. Please do not share this code with anyone.
          </p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; font-weight: 500;">
          Authorized POS System Access &bull; Sent to ${targetEmail}
        </div>
      </div>
    `;

    // Configure Gmail Transporter
    const gmailUser = process.env.GMAIL_USER || "cheychon258@gmail.com";
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || "xeqojdknwloxrrnz";

    if (gmailUser && gmailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `"${storeTitle}" <${gmailUser}>`,
        to: targetEmail,
        subject: `🔐 ${otpCode} - Your 2FA Verification Code`,
        html: htmlBody,
      });
      console.log(`[GMAIL SMTP SUCCESS] Sent 2FA OTP ${otpCode} to ${targetEmail}`);
    } else {
      console.log(`[REAL GMAIL 2FA READY] Target: ${targetEmail} | OTP: ${otpCode} (Configure GMAIL_APP_PASSWORD in env for live SMTP direct dispatch)`);
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      otpCode,
      message: `2FA OTP code ${otpCode} dispatched to ${targetEmail}`,
    });
  } catch (err) {
    console.error("Error sending OTP email:", err);
    return NextResponse.json(
      { error: "Failed to dispatch OTP email" },
      { status: 500 }
    );
  }
}
