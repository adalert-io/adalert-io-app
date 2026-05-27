import sgMail from "@sendgrid/mail";

export interface SendEmailArgs {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailArgs) {
  const fromEmail = process.env.SENDGRID_VERIFIED_SENDER;
  if (!fromEmail) {
    throw new Error("SENDGRID_VERIFIED_SENDER is not configured");
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  sgMail.setApiKey(apiKey);

  await sgMail.send({
    to,
    from: fromEmail,
    subject,
    text,
    html,
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
    },
  });
}
