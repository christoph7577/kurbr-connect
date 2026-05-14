// Twilio integration — SMS notifications for KURBR
// Credentials are fetched fresh on every send (tokens expire)

interface TwilioConnectionSettings {
  settings: {
    account_sid: string;
    auth_token: string;
    phone_number: string;
  };
}

interface ConnectorResponse {
  items?: unknown[];
}

async function getTwilioCredentials(): Promise<{
  accountSid: string;
  authToken: string;
  fromNumber: string;
}> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not available for Twilio credentials");
  }

  const raw: ConnectorResponse = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=twilio",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  ).then((res) => res.json() as Promise<ConnectorResponse>);

  const item = raw.items?.[0];
  if (!item || typeof item !== "object") {
    throw new Error("Twilio not connected");
  }

  const conn = item as TwilioConnectionSettings;
  if (!conn.settings?.account_sid || !conn.settings?.auth_token || !conn.settings?.phone_number) {
    throw new Error("Twilio credentials incomplete");
  }

  return {
    accountSid: conn.settings.account_sid,
    authToken: conn.settings.auth_token,
    fromNumber: conn.settings.phone_number,
  };
}

export interface StatusSmsOptions {
  to: string;
  jobNumber: string;
  trackingToken: string;
  status: string;
}

function resolveAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  throw new Error("Cannot determine APP_BASE_URL for SMS tracking link");
}

const SMS_COPY: Record<string, string> = {
  dispatched: "Your KURBR hauler has been dispatched and is heading your way.",
  en_route: "Your KURBR hauler is en route and almost there!",
};

export async function sendStatusSms(opts: StatusSmsOptions): Promise<void> {
  const { to, jobNumber, trackingToken, status } = opts;

  const copy = SMS_COPY[status];
  if (!copy) return;

  const appBaseUrl = resolveAppBaseUrl();
  const trackingUrl = `${appBaseUrl}/tracking?token=${encodeURIComponent(trackingToken)}`;

  const body = `${copy} Job ${jobNumber}. Track live: ${trackingUrl}`;

  const { accountSid, authToken, fromNumber } = await getTwilioCredentials();

  const params = new URLSearchParams({
    From: fromNumber,
    To: to,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio error ${response.status}: ${text}`);
  }
}
