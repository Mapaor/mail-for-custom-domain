'use client';

import { Email } from '@/lib/types';
import { format } from 'date-fns';
import { X, Paperclip, Reply } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmailDetailProps {
  email: Email;
  onClose: () => void;
}

export default function EmailDetail({ email, onClose }: EmailDetailProps) {
  const router = useRouter();
  const dateStr = email.received_at || email.sent_at || email.created_at;
  const hasAttachments = email.attachments && email.attachments.length > 0;

  const handleReply = () => {
    // Create query params for the compose page
    const params = new URLSearchParams({
      replyTo: email.id,
      to: email.from_email,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      ...(email.message_id && { inReplyTo: email.message_id }),
      ...(email.references && { references: email.references }),
    });
    
    router.push(`/dashboard/compose?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words">{email.subject}</h3>
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="text-gray-700 dark:text-gray-300 truncate">
                <span className="font-medium">From:</span> {email.from_email}
              </p>
              <p className="text-gray-700 dark:text-gray-300 truncate">
                <span className="font-medium">To:</span> {email.to_email}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {format(new Date(dateStr), 'PPpp')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {email.type === 'incoming' && (
              <button
                onClick={handleReply}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Reply"
              >
                <Reply className=" ml-auto mr-auto w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="ml-auto mr-auto w-5 h-5" />
            </button>
          </div>
        </div>

        {hasAttachments && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Paperclip className="w-4 h-4" />
              <span className="font-medium">{email.attachments?.length} attachment(s)</span>
            </div>
            <div className="mt-2 space-y-1">
              {email.attachments?.map((att, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span>📎 {att.filename}</span>
                  <span className="text-gray-400 dark:text-gray-500">({(att.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-3 sm:py-4">
        {email.html_body ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert dark:text-gray-300!"
            dangerouslySetInnerHTML={{ __html: email.html_body }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {email.body}
          </div>
        )}
      </div>
    </div>
  );
}
