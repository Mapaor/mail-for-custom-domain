'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Inbox, Send, Mail, Activity, Beaker, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/auth';

const APEX_DOMAIN = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'example.com';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
    router.refresh();
  };

  const isAdmin = profile?.role === 'admin';

  const baseNavItems = [
    { href: '/dashboard/inbox', icon: Inbox, label: 'Inbox', adminOnly: false },
    { href: '/dashboard/sent', icon: Send, label: 'Sent', adminOnly: false },
    { href: '/dashboard/compose', icon: Mail, label: 'Compose', adminOnly: false },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', adminOnly: false },
  ];

  const adminNavItems = [
    { href: '/dashboard/monitor', icon: Activity, label: 'Webhook Monitor', adminOnly: true },
    { href: '/dashboard/test', icon: Beaker, label: 'Test Webhook', adminOnly: true },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">{APEX_DOMAIN}</h1>
        <p className="text-sm text-gray-500 mt-1">Mail Dashboard</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-3">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
          </div>
        ) : profile ? (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">{profile.email}</p>
            {isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Admin
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center">Loading...</p>
        )}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
