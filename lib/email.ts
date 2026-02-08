import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"UIXScore Support" <noreply@uixscore.com>';

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn("⚠️ SMTP credentials missing. Email not sent.");
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Content: ${html}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html,
        });
        console.log(`✅ Email sent to ${to}`);
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw new Error("Failed to send verification email");
    }
}


export async function sendPasswordResetEmail(email: string, token: string) {
    // Determine the base URL based on environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ? (process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`)
        : 'http://localhost:3000';

    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Reset Your Password</h2>
            <p>You requested a password reset for your UIXScore account.</p>
            <p>Click the button below to reset it. This link expires in 1 hour.</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
            <p style="margin-top: 10px; font-size: 11px; color: #999;">Or copy and paste this link: ${resetLink}</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: "Reset Your UIXScore Password",
        html
    });
}

export async function sendPaymentConfirmationEmail({ to, planName, expiryDate }: { to: string; planName: string; expiryDate: string }) {
    const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0;">Payment Confirmation</h1>
                <p style="color: #6b7280; font-size: 16px; margin-top: 8px;">Thank you for your purchase</p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0;">
                    Dear User,
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-top: 16px;">
                    We are pleased to confirm that your payment has been successfully processed. You have been upgraded to the <strong style="color: #4f46e5;">${planName}</strong> plan.
                </p>
                
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <h3 style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Subscription Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${planName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Expiration Date</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">${expiryDate}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://uixscore.com'}/dashboard" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Go to Dashboard</a>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Questions? Contact us at <a href="mailto:admin@uixscore.com" style="color: #4f46e5; text-decoration: none;">admin@uixscore.com</a>
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
                    &copy; ${new Date().getFullYear()} UIXScore. All rights reserved.
                </p>
            </div>
        </div>
    `;

    await sendEmail({
        to,
        subject: `Payment Confirmation - Welcome to ${planName}`,
        html
    });
}

