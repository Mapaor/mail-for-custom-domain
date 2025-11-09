'use client';

import { Email } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen } from 'lucide-react';

interface EmailListProps {
  emails: Email[];
  onEmailClick: (email: Email) => void;
  selectedEmailId?: string;
}

export default function EmailList({ emails, onEmailClick, selectedEmailId }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Mail className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">No emails yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {emails.map((email) => {
        const isSelected = email.id === selectedEmailId;
        const dateStr = email.received_at || email.sent_at || email.created_at;
        
        return (
          <div
            key={email.id}
            onClick={() => onEmailClick(email)}
            className={`p-4 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-50 border-l-4 border-blue-600'
                : 'hover:bg-gray-50 border-l-4 border-transparent'
            } ${!email.is_read ? 'bg-blue-50/30' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {email.is_read ? (
                  <MailOpen className="w-5 h-5 text-gray-400" />
                ) : (
                  <Mail className="w-5 h-5 text-blue-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`text-sm truncate ${!email.is_read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                    {email.type === 'incoming' ? email.from_email : `To: ${email.to_email}`}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(dateStr), { addSuffix: true })}
                  </span>
                </div>
                
                <p className={`text-sm truncate mb-1 ${!email.is_read ? 'font-semibold' : ''} text-gray-900`}>
                  {email.subject}
                </p>
                
                <p className="text-sm text-gray-600 truncate">
                  {email.body.substring(0, 100)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
