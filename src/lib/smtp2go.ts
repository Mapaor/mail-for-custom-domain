import { SendEmailRequest } from './types';

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';
const APEX_DOMAIN = process.env.APEX_DOMAIN || 'example.com';

export async function sendEmailViaSMTP2GO(email: SendEmailRequest) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  const defaultSenderEmail = `default@${APEX_DOMAIN}`;
  const senderEmail = email.from || defaultSenderEmail; // Use provided sender or default

  if (!apiKey) {
    throw new Error('SMTP2GO_API_KEY is not configured');
  }

  // Ensure 'to' is always an array
  const recipients = Array.isArray(email.to) ? email.to : [email.to];

  const payload = {
    api_key: apiKey,
    to: recipients,
    sender: senderEmail,
    subject: email.subject,
    text_body: email.body,
    html_body: email.html_body || email.body.replace(/\n/g, '<br>'),
  };

  const response = await fetch(SMTP2GO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`SMTP2GO API error: ${errorData.message || response.statusText}`);
  }

  const data = await response.json();
  return data;
}
