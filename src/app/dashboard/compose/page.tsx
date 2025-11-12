'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';

type MessageFormat = 'text' | 'html';

export default function ComposePage() {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [messageFormat, setMessageFormat] = useState<MessageFormat>('text');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentBody = messageFormat === 'html' ? htmlBody : body;
    
    if (!to || !subject || !currentBody) {
      setError('Please fill in all fields');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: {
        to: string;
        subject: string;
        body?: string;
        html_body?: string;
      } = {
        to,
        subject,
      };

      if (messageFormat === 'html') {
        payload.html_body = htmlBody;
      } else {
        payload.body = body;
      }

      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Reset form
        setTo('');
        setSubject('');
        setBody('');
        setHtmlBody('');
        
        // Redirect to sent folder after a brief delay
        setTimeout(() => {
          router.push('/dashboard/sent');
        }, 1500);
      } else {
        setError(data.error || 'Failed to send email');
      }
    } catch (err) {
      setError('An error occurred while sending the email');
      console.error('Send email error:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Compose Email" />
      
      <div className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* To Field */}
            <div>
              <label htmlFor="to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To
              </label>
              <input
                id="to"
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={isSending}
              />
              {/* <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Separate multiple recipients with commas (,) or semicolons (;)
              </p> */}
            </div>

            {/* Subject Field */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={isSending}
              />
            </div>

            {/* Body Field with Tabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setMessageFormat('text')}
                    disabled={isSending}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      messageFormat === 'text'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Plain Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageFormat('html')}
                    disabled={isSending}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      messageFormat === 'html'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              </div>
              
              {messageFormat === 'text' ? (
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={12}
                  className="w-full h-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={isSending}
                />
              ) : (
                <textarea
                  id="html-body"
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="Type your HTML message here..."
                  rows={12}
                  className="w-full h-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm"
                  disabled={isSending}
                />
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">Email sent successfully! Redirecting to sent folder...</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/dashboard/inbox')}
                className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
