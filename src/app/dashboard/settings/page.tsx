'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ alias: string; email: string; forward_to: string | null } | null>(null);
  const [forwardTo, setForwardTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/forwarding');
      const data = await response.json();

      if (data.success) {
        setProfile({
          alias: data.alias,
          email: data.email,
          forward_to: data.forward_to,
        });
        setForwardTo(data.forward_to || '');
      } else {
        setMessage({ type: 'error', text: 'Failed to load profile' });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/forwarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forward_to: forwardTo || null }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.warning || data.message || 'Forwarding updated successfully' 
        });
        setProfile(prev => prev ? { ...prev, forward_to: forwardTo || null } : null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update forwarding' });
      }
    } catch (error) {
      console.error('Failed to update forwarding:', error);
      setMessage({ type: 'error', text: 'Failed to update forwarding' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Email Account</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Alias</label>
            <p className="text-lg">{profile?.alias}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Email Address</label>
            <p className="text-lg font-mono">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Forwarding Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Email Forwarding</h2>
        <p className="text-gray-600 mb-4">
          Forward incoming emails to an external email address. Leave blank to disable forwarding.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="forward_to" className="block text-sm font-medium text-gray-700 mb-2">
              Forward To
            </label>
            <input
              type="email"
              id="forward_to"
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
              placeholder="external@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {forwardTo && (
              <button
                type="button"
                onClick={() => setForwardTo('')}
                disabled={saving}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {profile?.forward_to && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Active:</strong> Emails sent to <span className="font-mono">{profile.email}</span> will be forwarded to{' '}
              <span className="font-mono">{profile.forward_to}</span>
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Emails sent to your fisica.cat address will be stored in your inbox</li>
          <li>If forwarding is enabled, emails will also be sent to your external address</li>
          <li>You can disable forwarding at any time by clearing the field</li>
          <li>Forwarding uses DNS configuration and may take a few minutes to propagate</li>
        </ul>
      </div>
    </div>
  );
}
