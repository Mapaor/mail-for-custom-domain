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
  to: string | string[]; // Support single email or array of emails
  subject: string;
  body?: string; // Optional - required if html_body is not provided
  html_body?: string; // Optional - required if body is not provided
  from?: string; // Optional sender email
}
