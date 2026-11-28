import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const sendEmail = async ({ to, subject, html }) => {
    if (!resend) throw new Error("Email service is not configured");

    const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Lets-do-it <onboarding@resend.dev>",
        to,
        subject,
        html,
    });

    if (error) throw new Error(error.message || "Could not send email");
};

export { sendEmail };
