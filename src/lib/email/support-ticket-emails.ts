import type { NextRequest } from "next/server";

import { APPLICATION_NAME } from "@/lib/constants";

export const SUPPORT_ALERT_RECIPIENTS = [
  "support@adalert.io",
  "info@webds.com",
  "mohit@webds.com",
];

export const SUPPORT_NO_REPLY_EMAIL =
  process.env.SENDGRID_SUPPORT_NO_REPLY_SENDER ?? "no-reply@adalert.io";

const BRAND_BLUE = "#015AFD";
const BRAND_NAVY = "#0B1426";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getAppBaseUrl(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "https://adalert.io";
}

export function buildConsumerTicketLink(
  request: NextRequest | undefined,
  ticketCode: string,
): string {
  return `${getAppBaseUrl(request)}/consumer/help/${encodeURIComponent(ticketCode)}`;
}

export function buildAdminSupportLink(request?: NextRequest): string {
  return `${getAppBaseUrl(request)}/administrator/support`;
}

interface EmailTemplateOptions {
  request?: NextRequest;
  preheader: string;
  headline: string;
  intro: string;
  rows?: Array<{ label: string; value: string }>;
  messageBlock?: { label: string; body: string };
  cta?: { label: string; href: string };
  footerNote?: string;
}

function buildSupportEmailHtml(options: EmailTemplateOptions): string {
  const appBaseUrl = getAppBaseUrl(options.request);
  const logoUrl = `${appBaseUrl}/images/adalert-logo.avif`;
  const rowsHtml =
    options.rows && options.rows.length > 0
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px; border-collapse: collapse;">
          ${options.rows
            .map(
              (row) => `
            <tr>
              <td style="padding: 6px 16px 6px 0; color: #64748b; font-size: 13px; vertical-align: top; width: 120px;">
                ${escapeHtml(row.label)}
              </td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">
                ${escapeHtml(row.value)}
              </td>
            </tr>`,
            )
            .join("")}
        </table>`
      : "";

  const messageHtml = options.messageBlock
    ? `
        <div style="margin: 0 0 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
          <div style="color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px;">
            ${escapeHtml(options.messageBlock.label)}
          </div>
          <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
            ${escapeHtml(options.messageBlock.body)}
          </div>
        </div>`
    : "";

  const ctaHtml = options.cta
    ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 8px;">
          <tr>
            <td style="border-radius: 10px; background: ${BRAND_BLUE};">
              <a href="${options.cta.href}" style="display: inline-block; padding: 12px 20px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">
                ${escapeHtml(options.cta.label)}
              </a>
            </td>
          </tr>
        </table>`
    : "";

  const footerNote =
    options.footerNote ??
    "This is a no-reply message. Please do not reply to this email.";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.headline)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #eef2ff;">
    <span style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
      ${escapeHtml(options.preheader)}
    </span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #eef2ff; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background: ${BRAND_NAVY}; padding: 24px 28px;">
                <img src="${logoUrl}" alt="${escapeHtml(APPLICATION_NAME)}" width="140" height="auto" style="display: block; max-width: 140px; height: auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 28px;">
                <h1 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; line-height: 1.3; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
                  ${escapeHtml(options.headline)}
                </h1>
                <p style="margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
                  ${escapeHtml(options.intro)}
                </p>
                ${rowsHtml}
                ${messageHtml}
                ${ctaHtml}
                <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
                  ${escapeHtml(footerNote)}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin: 16px 0 0; color: #94a3b8; font-size: 11px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            © ${new Date().getFullYear()} ${escapeHtml(APPLICATION_NAME)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildSupportEmailText(options: {
  headline: string;
  intro: string;
  rows?: Array<{ label: string; value: string }>;
  messageBlock?: { label: string; body: string };
  cta?: { label: string; href: string };
}): string {
  const lines = [options.headline, "", options.intro, ""];

  if (options.rows?.length) {
    for (const row of options.rows) {
      lines.push(`${row.label}: ${row.value.replace(/<[^>]+>/g, "")}`);
    }
    lines.push("");
  }

  if (options.messageBlock) {
    lines.push(`${options.messageBlock.label}:`, options.messageBlock.body, "");
  }

  if (options.cta) {
    lines.push(`${options.cta.label}: ${options.cta.href}`, "");
  }

  lines.push(
    "This is a no-reply message. Please do not reply to this email.",
    "",
    APPLICATION_NAME,
  );

  return lines.join("\n");
}

/** Consumer: ticket submitted confirmation (consumer only). */
export function buildConsumerTicketSubmittedEmail({
  request,
  ticketCode,
  subject,
}: {
  request: NextRequest;
  ticketCode: string;
  subject: string;
}) {
  const portalLink = buildConsumerTicketLink(request, ticketCode);
  const template = {
    preheader: `We received your support ticket ${ticketCode}.`,
    headline: "Your support ticket was submitted",
    intro:
      "Thanks for reaching out to adAlert Support. Our team has received your request and will review it shortly. You can track updates anytime from your support portal.",
    rows: [
      { label: "Ticket", value: ticketCode },
      { label: "Subject", value: subject },
    ],
    cta: { label: "View your ticket", href: portalLink },
  };

  return {
    subject: `[adAlert Support] Ticket received — ${ticketCode}`,
    text: buildSupportEmailText({ ...template, cta: template.cta }),
    html: buildSupportEmailHtml({ request, ...template }),
  };
}

/** Admin: new ticket alert (admin inboxes only). */
export function buildAdminNewTicketEmail({
  request,
  ticketCode,
  subject,
  category,
  priority,
  requesterLabel,
  description,
}: {
  request: NextRequest;
  ticketCode: string;
  subject: string;
  category: string;
  priority: string;
  requesterLabel: string;
  description: string;
}) {
  const adminLink = buildAdminSupportLink(request);
  const template = {
    preheader: `New support ticket ${ticketCode} from ${requesterLabel}.`,
    headline: "New support ticket submitted",
    intro:
      "A customer submitted a new support ticket. Please review the details below and respond from the admin support dashboard.",
    rows: [
      { label: "Ticket", value: ticketCode },
      { label: "Subject", value: subject },
      { label: "Category", value: category },
      { label: "Priority", value: priority },
      { label: "Customer", value: requesterLabel },
    ],
    messageBlock: { label: "Customer message", body: description },
    cta: { label: "Open support dashboard", href: adminLink },
    footerNote:
      "This is a no-reply notification for the adAlert admin team. Reply to the customer from the support dashboard.",
  };

  return {
    subject: `[adAlert Support] New ticket — ${ticketCode}`,
    text: buildSupportEmailText({
      headline: template.headline,
      intro: template.intro,
      rows: template.rows,
      messageBlock: template.messageBlock,
      cta: template.cta,
    }),
    html: buildSupportEmailHtml({ request, ...template }),
  };
}

/** Admin: customer posted a reply (admin inboxes only). */
export function buildAdminCustomerReplyEmail({
  request,
  ticketCode,
  subject,
  customerName,
  customerEmail,
  replyBody,
}: {
  request: NextRequest;
  ticketCode: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  replyBody: string;
}) {
  const adminLink = buildAdminSupportLink(request);
  const template = {
    preheader: `Customer reply on ticket ${ticketCode}.`,
    headline: "Customer replied to a ticket",
    intro:
      "A customer added a new message to an existing support ticket. Please review and respond when ready.",
    rows: [
      { label: "Ticket", value: ticketCode },
      { label: "Subject", value: subject },
      { label: "Customer", value: customerName },
      { label: "Email", value: customerEmail },
    ],
    messageBlock: { label: "Customer reply", body: replyBody },
    cta: { label: "Open support dashboard", href: adminLink },
    footerNote:
      "This is a no-reply notification for the adAlert admin team. Reply to the customer from the support dashboard.",
  };

  return {
    subject: `[adAlert Support] Customer reply — ${ticketCode}`,
    text: buildSupportEmailText({
      headline: template.headline,
      intro: template.intro,
      rows: template.rows,
      messageBlock: template.messageBlock,
      cta: template.cta,
    }),
    html: buildSupportEmailHtml({ request, ...template }),
  };
}

/** Consumer: admin posted a public reply (consumer only). */
export function buildConsumerAdminReplyEmail({
  request,
  ticketCode,
  subject,
  replyBody,
}: {
  request: NextRequest;
  ticketCode: string;
  subject: string;
  replyBody: string;
}) {
  const portalLink = buildConsumerTicketLink(request, ticketCode);
  const template = {
    preheader: `adAlert Support replied on ticket ${ticketCode}.`,
    headline: "You have a new support reply",
    intro:
      "Our support team has replied to your ticket. You can read the full message and continue the conversation from your support portal.",
    rows: [
      { label: "Ticket", value: ticketCode },
      { label: "Subject", value: subject },
    ],
    messageBlock: { label: "Support team reply", body: replyBody },
    cta: { label: "View reply in portal", href: portalLink },
  };

  return {
    subject: `[adAlert Support] New reply — ${ticketCode}`,
    text: buildSupportEmailText({ ...template, cta: template.cta }),
    html: buildSupportEmailHtml({ request, ...template }),
  };
}
