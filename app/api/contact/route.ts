import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { name, email, company, message, plan } = await req.json();

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const subject = `New Enterprise Inquiry: ${plan} Plan`;
        const html = `
            <h2>New Inquiry from UIXScore</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || "N/A"}</p>
            <p><strong>Proposed Plan:</strong> ${plan}</p>
            <br/>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
        `;

        // Send to the admin/sales email
        await sendEmail({
            to: "devgghyakulshrestha27@gmail.com",
            subject,
            html,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Contact API Error:", error);
        return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
    }
}
