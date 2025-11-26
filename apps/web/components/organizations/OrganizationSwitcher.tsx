'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { cn } from '@/lib/utils';

type Organization = {
  id: string;
  name: string;
  slug?: string;
};

export function OrganizationSwitcher({ collapsed }: { collapsed?: boolean }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    void fetchOrganizations();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const response = await res.json();
        if (response.ok && response.data) {
          setOrganizations(response.data.organizations || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations', error);
    }
  };

  return (
    <div className={cn("relative px-2 mb-4", collapsed && "px-1")} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-2 hover:border-indigo-500/40 hover:text-[color:var(--text-primary)] transition-colors",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-500">
            O
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-medium text-[color:var(--text-secondary)]">
              Организации
            </span>
          )}
        </div>
        {!collapsed && (
          <svg
            className="h-4 w-4 text-[color:var(--text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-popover)] p-1 shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            {organizations.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[color:var(--text-tertiary)]">
                Нет организаций
              </div>
            ) : (
              organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/org/${org.id}/settings`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex h-5 w-5 flex-none items-center justify-center rounded bg-indigo-500/10 text-[10px] font-bold text-indigo-500">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{org.name}</span>
                </Link>
              ))
            )}
          </div>
          <div className="border-t border-[color:var(--surface-border-subtle)] mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-500 hover:bg-indigo-500/10"
            >
              <span className="text-lg leading-none">+</span>
              Создать организацию
            </button>
          </div>
        </div>
      )}

      <CreateOrganizationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          void fetchOrganizations();
        }}
      />
    </div>
  );
}

