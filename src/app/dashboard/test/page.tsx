'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { Send, CheckCircle, XCircle, Info } from 'lucide-react';

export default function TestWebhookPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; email_id?: string } | null>(null);

  const sendTestEmail = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to send test email: ' + (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Test Webhook" />
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Webhook Testing Tool</h3>
                <p className="text-sm text-blue-800 mb-3">
                  This tool simulates ForwardEmail sending an email to your webhook endpoint.
                  Use it to verify your webhook is working correctly before configuring ForwardEmail.
                </p>
                <div className="bg-blue-100 rounded p-3 text-sm text-blue-900">
                  <p className="font-medium mb-1">What this does:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Sends a POST request to your webhook</li>
                    <li>Webhook stores the email in Supabase</li>
                    <li>Email appears in your Inbox</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Test Button */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Send Test Email to Webhook
            </h3>
            
            <button
              onClick={sendTestEmail}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
              {isLoading ? 'Sending Test Email...' : 'Send Test Email'}
            </button>

            {/* Result */}
            {result && (
              <div className={`mt-6 p-4 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium mb-1">
                      {result.success ? 'Success!' : 'Error'}
                    </p>
                    <p className="text-sm mb-2">{result.message}</p>
                    {result.email_id && (
                      <p className="text-xs font-mono bg-white bg-opacity-50 p-2 rounded">
                        Email ID: {result.email_id}
                      </p>
                    )}
                    {result.success && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm font-medium mb-2">Next steps:</p>
                        <ol className="text-sm space-y-1 list-decimal list-inside">
                          <li>Go to <a href="/dashboard/inbox" className="underline font-medium">Inbox</a> to see the test email</li>
                          <li>Check <a href="/dashboard/monitor" className="underline font-medium">Monitor</a> to verify webhook delivery</li>
                          <li>If it works, configure ForwardEmail with the same webhook URL</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Troubleshooting</h4>
            
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900">✅ Test email appears in inbox:</p>
                <p>Your webhook is working! Configure ForwardEmail to send POST requests to:</p>
                <code className="block bg-gray-100 text-gray-900 px-3 py-2 rounded mt-1 text-xs">
                  https://mail.fisica.cat/api/webhooks/incomingMail
                </code>
              </div>

              <div>
                <p className="font-medium text-gray-900">❌ Test email does NOT appear:</p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>Check Vercel logs for errors</li>
                  <li>Verify Supabase credentials in Vercel environment variables</li>
                  <li>Make sure the <code className="bg-gray-100 px-1 rounded">emails</code> table exists in Supabase</li>
                  <li>Run the SQL schema from <code className="bg-gray-100 px-1 rounded">database-setup.sql</code></li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-900">📊 Current Vercel logs show GET requests only:</p>
                <p>This is normal! GET requests are from the Monitor page. ForwardEmail needs to send POST requests for actual emails.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
