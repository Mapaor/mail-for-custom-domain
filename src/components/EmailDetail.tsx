'use client';

import { Email } from '@/lib/types';
import { format } from 'date-fns';
import { X, Paperclip } from 'lucide-react';

interface EmailDetailProps {
  email: Email;
  onClose: () => void;
}

export default function EmailDetail({ email, onClose }: EmailDetailProps) {
  const dateStr = email.received_at || email.sent_at || email.created_at;
  const hasAttachments = email.attachments && email.attachments.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{email.subject}</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">From:</span> {email.from_email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">To:</span> {email.to_email}
              </p>
              <p className="text-gray-500">
                {format(new Date(dateStr), 'PPpp')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasAttachments && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Paperclip className="w-4 h-4" />
              <span className="font-medium">{email.attachments?.length} attachment(s)</span>
            </div>
            <div className="mt-2 space-y-1">
              {email.attachments?.map((att, idx) => (
                <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                  <span>📎 {att.filename}</span>
                  <span className="text-gray-400">({(att.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {email.html_body ? (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: email.html_body }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800">
            {email.body}
          </div>
        )}
      </div>
    </div>
  );
}
