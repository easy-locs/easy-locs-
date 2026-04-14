export const EMAIL_DELIVERABILITY_CONFIG = {
  domain: "easy-locs.com",
  sendingDomain: "agents@easy-locs.com",

  dns_records: {
    spf: {
      type: "TXT",
      host: "@",
      value: "v=spf1 include:sendgrid.net ~all",
      description: "Authorizes SendGrid to send email on behalf of easy-locs.com",
    },
    dkim: {
      type: "CNAME",
      host: "s1._domainkey",
      value: "s1.domainkey.u{SENDGRID_ACCOUNT_ID}.wl.sendgrid.net",
      description: "DKIM signing key via SendGrid. Replace {SENDGRID_ACCOUNT_ID} with actual account ID from SendGrid dashboard.",
    },
    dkim2: {
      type: "CNAME",
      host: "s2._domainkey",
      value: "s2.domainkey.u{SENDGRID_ACCOUNT_ID}.wl.sendgrid.net",
      description: "Secondary DKIM key for key rotation",
    },
    dmarc: {
      type: "TXT",
      host: "_dmarc",
      value: "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@easy-locs.com; pct=100; adkim=s; aspf=s",
      description: "DMARC policy: quarantine unauthorized emails, strict SPF/DKIM alignment",
    },
    returnPath: {
      type: "CNAME",
      host: "em",
      value: "u{SENDGRID_ACCOUNT_ID}.wl.sendgrid.net",
      description: "Return-Path alignment for SPF pass. Required for full domain authentication.",
    },
  },

  inbound_parse: {
    provider: "SendGrid",
    mx_record: {
      type: "MX",
      host: "agents",
      value: "mx.sendgrid.net",
      priority: 10,
      description: "Routes agents@easy-locs.com inbound email to SendGrid Inbound Parse",
    },
    webhook_url: "{SUPABASE_URL}/functions/v1/command-email-intake",
    authentication: "x-webhook-secret header with COMMAND_EMAIL_SECRET",
  },

  verification_steps: [
    "1. Add all DNS records above to your domain registrar",
    "2. In SendGrid dashboard: Settings > Sender Authentication > Authenticate Your Domain",
    "3. Verify domain in SendGrid (automatic after DNS propagation, ~24-48h)",
    "4. In SendGrid: Settings > Inbound Parse > Add Host & URL",
    "5. Set hostname to 'agents.easy-locs.com' and URL to the webhook",
    "6. Enable 'POST the raw, full MIME message' for the parse webhook",
    "7. Test by sending an email to agents@easy-locs.com and verifying intake",
  ],

  security_headers: {
    "List-Unsubscribe": "<mailto:unsubscribe@easy-locs.com>",
    "X-Mailer": "Easy-Locs Command & Control",
    "Precedence": "bulk",
  },
} as const;

export function validateDomainConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  const requiredEnvVars = [
    "SENDGRID_API_KEY",
    "OWNER_EMAIL",
    "COMMAND_EMAIL_SECRET",
  ];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env?.[`VITE_${envVar}`] && typeof process !== "undefined" && !process.env?.[envVar]) {
      missing.push(envVar);
    }
  }

  return { valid: missing.length === 0, missing };
}
