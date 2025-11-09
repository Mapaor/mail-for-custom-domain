'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Send, Mail, Activity, Beaker } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard/inbox', icon: Inbox, label: 'Inbox' },
    { href: '/dashboard/sent', icon: Send, label: 'Sent' },
    { href: '/dashboard/compose', icon: Mail, label: 'Compose' },
    { href: '/dashboard/monitor', icon: Activity, label: 'Webhook Monitor' },
    { href: '/dashboard/test', icon: Beaker, label: 'Test Webhook' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">fisica.cat</h1>
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

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          alias@fisica.cat
        </p>
      </div>
    </aside>
  );
}
