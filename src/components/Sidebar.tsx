'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Inbox, Send, Mail, Activity, Beaker, LogOut, Settings, Users } from 'lucide-react';
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
    { href: '/dashboard/users', icon: Users, label: 'User Management', adminOnly: true },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{APEX_DOMAIN}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mail Dashboard</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
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
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
          </div>
        ) : profile ? (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.email}</p>
            {isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium rounded">
                Admin
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Loading...</p>
        )}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
