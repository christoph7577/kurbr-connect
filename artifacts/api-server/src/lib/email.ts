// Resend integration — transactional email for KURBR
import { Resend } from "resend";

interface ResendConnectionSettings {
  settings: {
    api_key: string;
    from_email?: string;
  };
}

interface ConnectorResponse {
  items?: unknown[];
}

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const raw: ConnectorResponse = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  ).then((res) => res.json() as Promise<ConnectorResponse>);

  const item = raw.items?.[0];
  if (!item || typeof item !== "object") {
    throw new Error("Resend not connected");
  }

  const conn = item as ResendConnectionSettings;
  if (!conn.settings?.api_key) {
    throw new Error("Resend not connected");
  }

  return {
    apiKey: conn.settings.api_key,
    fromEmail: conn.settings.from_email || "noreply@kurbr.com",
  };
}

// WARNING: Never cache this client — tokens expire.
async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "TBD";
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "TBD";
  try {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function resolveAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  throw new Error("Cannot determine APP_BASE_URL for email tracking links — set APP_BASE_URL env var");
}

export interface BookingEmailOptions {
  to: string;
  customerName: string | null | undefined;
  jobNumber: string;
  trackingToken: string;
  address: string;
  serviceType: string;
  scheduledDate: string | null | undefined;
  scheduledTime: string | null | undefined;
  priceCents: number | null | undefined;
}

export async function sendBookingConfirmationEmail(opts: BookingEmailOptions): Promise<void> {
  const {
    to,
    customerName,
    jobNumber,
    trackingToken,
    address,
    serviceType,
    scheduledDate,
    scheduledTime,
    priceCents,
  } = opts;

  const appBaseUrl = resolveAppBaseUrl();
  const trackingUrl = `${appBaseUrl}/track/${encodeURIComponent(trackingToken)}`;
  const displayName = escapeHtml(customerName || "there");
  const serviceLabel = escapeHtml(
    serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
  const safeAddress = escapeHtml(address);
  const safeJobNumber = escapeHtml(jobNumber);
  const safeDate = escapeHtml(formatDate(scheduledDate));
  const safeTime = escapeHtml(scheduledTime || "TBD");
  const safePrice = escapeHtml(formatPrice(priceCents));
  const safeTrackingUrl = escapeHtml(trackingUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KURBR Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Courier New',Courier,monospace;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border:1px solid #1f1f1f;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#111111;padding:32px 40px 24px;border-bottom:2px solid #f97316;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:700;color:#f97316;letter-spacing:4px;">KURBR</div>
                    <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-top:2px;">ON-DEMAND JUNK HAULING</div>
                  </td>
                  <td align="right">
                    <div style="font-size:11px;color:#6b7280;letter-spacing:1px;">BOOKING CONFIRMED</div>
                    <div style="font-size:18px;color:#f97316;font-weight:700;margin-top:4px;">${safeJobNumber}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <p style="margin:0;font-size:16px;color:#e5e5e5;">Hey ${displayName},</p>
              <p style="margin:12px 0 0;font-size:14px;color:#9ca3af;line-height:1.6;">
                Your junk removal has been booked. Here&apos;s a summary of what to expect.
              </p>
            </td>
          </tr>

          <!-- Job Details -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:10px;color:#f97316;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Job Details</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:12px;color:#6b7280;width:40%;">SERVICE</td>
                        <td style="padding:6px 0;font-size:13px;color:#e5e5e5;">${serviceLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:12px;color:#6b7280;">PICKUP ADDRESS</td>
                        <td style="padding:6px 0;font-size:13px;color:#e5e5e5;">${safeAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:12px;color:#6b7280;">DATE</td>
                        <td style="padding:6px 0;font-size:13px;color:#e5e5e5;">${safeDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:12px;color:#6b7280;">TIME</td>
                        <td style="padding:6px 0;font-size:13px;color:#e5e5e5;">${safeTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:12px;color:#6b7280;">ESTIMATED PRICE</td>
                        <td style="padding:6px 0;font-size:13px;color:#f97316;font-weight:700;">${safePrice}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tracking CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a0e00;border:1px solid #f97316;border-radius:6px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:10px;color:#f97316;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Track Your Job</div>
                    <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;line-height:1.5;">
                      Follow your hauler in real-time and get live status updates via your tracking page.
                    </p>
                    <a href="${safeTrackingUrl}" style="display:inline-block;background-color:#f97316;color:#000000;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:2px;text-decoration:none;padding:12px 24px;border-radius:4px;text-transform:uppercase;">Track Job ${safeJobNumber}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="font-size:10px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">What Happens Next</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                    <span style="color:#f97316;margin-right:8px;">01.</span> Our team will review and confirm your booking shortly.
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                    <span style="color:#f97316;margin-right:8px;">02.</span> A hauler will be assigned and dispatched on your scheduled date.
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                    <span style="color:#f97316;margin-right:8px;">03.</span> Track your hauler live on the tracking page above.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:11px;color:#4b5563;line-height:1.6;">
                Questions? Reply to this email or visit your tracking page. Your job number is <strong style="color:#f97316;">${safeJobNumber}</strong>.
              </p>
              <p style="margin:8px 0 0;font-size:10px;color:#374151;">
                &copy; ${new Date().getFullYear()} KURBR &mdash; On-Demand Junk Hauling
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `KURBR — Booking Confirmed: ${jobNumber}

Hey ${customerName || "there"},

Your junk removal booking is confirmed.

JOB NUMBER:  ${jobNumber}
SERVICE:     ${serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
ADDRESS:     ${address}
DATE:        ${formatDate(scheduledDate)}
TIME:        ${scheduledTime || "TBD"}
PRICE:       ${formatPrice(priceCents)}

Track your job:
${trackingUrl}

Questions? Reply to this email.

© ${new Date().getFullYear()} KURBR — On-Demand Junk Hauling
`;

  const { client, fromEmail } = await getUncachableResendClient();
  const result = await client.emails.send({
    from: `KURBR <${fromEmail}>`,
    to,
    subject: `Booking Confirmed — ${jobNumber}`,
    html,
    text,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}

export interface StatusEmailOptions {
  to: string;
  customerName: string | null | undefined;
  jobNumber: string;
  trackingToken: string;
  status: string;
}

const STATUS_COPY: Record<string, { subject: string; headline: string; body: string }> = {
  dispatched: {
    subject: "Your hauler has been dispatched",
    headline: "Hauler Dispatched",
    body: "Great news — a hauler has been assigned and is on their way. Track their progress in real-time using your tracking link.",
  },
  completed: {
    subject: "Your job is complete!",
    headline: "Job Completed",
    body: "Your junk removal is done. Thanks for choosing KURBR — we hope everything went smoothly. Feel free to book again anytime.",
  },
};

export async function sendStatusUpdateEmail(opts: StatusEmailOptions): Promise<void> {
  const { to, customerName, jobNumber, trackingToken, status } = opts;

  const copy = STATUS_COPY[status];
  if (!copy) return;

  const appBaseUrl = resolveAppBaseUrl();
  const trackingUrl = `${appBaseUrl}/track/${encodeURIComponent(trackingToken)}`;
  const displayName = escapeHtml(customerName || "there");
  const safeJobNumber = escapeHtml(jobNumber);
  const safeTrackingUrl = escapeHtml(trackingUrl);
  const safeHeadline = escapeHtml(copy.headline);
  const safeBody = escapeHtml(copy.body);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Courier New',Courier,monospace;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border:1px solid #1f1f1f;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#111111;padding:32px 40px 24px;border-bottom:2px solid #f97316;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:700;color:#f97316;letter-spacing:4px;">KURBR</div>
                    <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-top:2px;">ON-DEMAND JUNK HAULING</div>
                  </td>
                  <td align="right">
                    <div style="font-size:11px;color:#6b7280;letter-spacing:1px;">JOB UPDATE</div>
                    <div style="font-size:18px;color:#f97316;font-weight:700;margin-top:4px;">${safeJobNumber}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0;font-size:16px;color:#e5e5e5;">Hey ${displayName},</p>
              <p style="margin:12px 0 0;font-size:22px;color:#f97316;font-weight:700;">${safeHeadline}</p>
              <p style="margin:16px 0 0;font-size:14px;color:#9ca3af;line-height:1.6;">${safeBody}</p>
            </td>
          </tr>
          ${
            status !== "completed"
              ? `<tr>
            <td style="padding:0 40px 32px;">
              <a href="${safeTrackingUrl}" style="display:inline-block;background-color:#f97316;color:#000000;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:2px;text-decoration:none;padding:12px 24px;border-radius:4px;text-transform:uppercase;">Track Job ${safeJobNumber}</a>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:11px;color:#4b5563;">Your job number: <strong style="color:#f97316;">${safeJobNumber}</strong></p>
              <p style="margin:8px 0 0;font-size:10px;color:#374151;">&copy; ${new Date().getFullYear()} KURBR &mdash; On-Demand Junk Hauling</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `KURBR — ${copy.subject}

Hey ${customerName || "there"},

${copy.headline} — Job ${jobNumber}

${copy.body}

${status !== "completed" ? `Track your job:\n${trackingUrl}\n` : ""}
© ${new Date().getFullYear()} KURBR — On-Demand Junk Hauling
`;

  const { client, fromEmail } = await getUncachableResendClient();
  const result = await client.emails.send({
    from: `KURBR <${fromEmail}>`,
    to,
    subject: `${copy.subject} — ${jobNumber}`,
    html,
    text,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}
