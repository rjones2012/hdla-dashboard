'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/executive', label: 'Executive Summary', page: 'executive' },
  { href: '/pipeline', label: 'Pipeline', page: 'pipeline' },
  { href: '/marketing', label: 'Marketing', page: 'marketing' },
  { href: '/marketing/nashville', label: 'Marketing Nashville', page: 'marketing-nashville' },
  { href: '/marketing/dallas', label: 'Marketing Dallas', page: 'marketing-dallas' },
  { href: '/trends', label: 'Trends', page: 'trends' },
  { href: '/capacity', label: 'Capacity', page: 'capacity' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role, logout, canAccess } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="font-flecha text-xl font-semibold text-hdla-text">HDLA</h1>
        <p className="text-xs text-hdla-muted">Executive Dashboard</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const hasAccess = canAccess(item.page);

            if (!hasAccess) return null;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    block px-3 py-2 rounded-lg text-sm transition-colors
                    ${isActive 
                      ? 'bg-hdla-magenta/10 text-hdla-magenta font-medium' 
                      : 'text-hdla-text hover:bg-gray-50'
                    }
                  `}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="text-xs text-hdla-muted mb-2">
          Logged in as <span className="font-medium capitalize">{role}</span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-hdla-magenta hover:underline"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="font-flecha text-4xl font-black text-hdla-text tracking-tight">{title}</h1>
      {subtitle && <p className="text-base text-hdla-muted mt-2">{subtitle}</p>}
    </div>
  );
}
