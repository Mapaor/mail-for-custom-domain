export interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  html_body?: string;
  received_at?: string;
  sent_at?: string;
  created_at: string;
  is_read: boolean;
  type: 'incoming' | 'outgoing';
  message_id?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
  }>;
  metadata?: {
    raw_webhook?: unknown;
    received_timestamp?: string;
  };
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  from?: string; // Optional sender email, defaults to SMTP2GO_SENDER_EMAIL
}
