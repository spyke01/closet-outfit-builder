'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Audit Log' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        {LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-foreground border border-primary/30'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
