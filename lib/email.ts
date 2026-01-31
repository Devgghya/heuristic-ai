import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Heuristo" <noreply@heuristo.ai>';

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
