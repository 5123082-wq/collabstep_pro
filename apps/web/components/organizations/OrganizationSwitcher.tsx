'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useOrganization } from './OrganizationContext';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { UpgradeToCreateOrgModal } from './UpgradeToCreateOrgModal';
import { Star, ChevronDown, Check, Plus, Building2 } from 'lucide-react';

export function OrganizationSwitcher({ collapsed }: { collapsed?: boolean }) {
  const {
    currentOrganization,
    organizations,
    ownedOrganizations,
    memberOrganizations,
    canCreateNewOrganization,
    isLoading,
    switchOrganization,
    refreshOrganizations,
  } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Update menu position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + 4,
            left: collapsed ? rect.left : rect.left + 8,
            width: collapsed ? 240 : rect.width - 16
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, collapsed]);

  const handleOrgClick = (orgId: string) => {
    switchOrganization(orgId);
    setIsOpen(false);
  };

  const handleCreateClick = () => {
    setIsOpen(false);
    if (canCreateNewOrganization) {
      setShowCreateModal(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const displayName = currentOrganization?.name ?? 'Организации';
  const displayInitial = currentOrganization?.name?.charAt(0).toUpperCase() ?? 'O';

  return (
    <div className={cn("relative px-2 mb-4", collapsed && "px-1")} ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-2 hover:border-indigo-500/40 hover:text-[color:var(--text-primary)] transition-colors",
          collapsed ? "justify-center" : "justify-between"
        )}
        disabled={isLoading}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-500">
            {isLoading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            ) : (
              displayInitial
            )}
            {/* Primary indicator */}
            {currentOrganization?.isPrimary && !collapsed && (
              <Star className="absolute -top-1 -right-1 h-3 w-3 fill-amber-400 text-amber-400" />
            )}
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {displayName}
            </span>
          )}
        </div>
        {!collapsed && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[color:var(--text-tertiary)] transition-transform",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed z-[9999] rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-popover)] p-1 shadow-lg"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            minWidth: collapsed ? '260px' : undefined
          }}
        >
          <div className="max-h-64 overflow-y-auto">
            {organizations.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <Building2 className="mx-auto h-8 w-8 text-[color:var(--text-tertiary)] mb-2" />
                <div className="text-sm text-[color:var(--text-tertiary)]">
                  Нет организаций
                </div>
                <div className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  Создайте первую организацию
                </div>
              </div>
            ) : (
              <>
                {/* Owned Organizations */}
                {ownedOrganizations.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                      Мои организации
                    </div>
                    {ownedOrganizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgClick(org.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          currentOrganization?.id === org.id
                            ? "bg-indigo-500/10 text-[color:var(--text-primary)]"
                            : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]"
                        )}
                      >
                        <div className="relative flex h-5 w-5 flex-none items-center justify-center rounded bg-indigo-500/10 text-[10px] font-bold text-indigo-500">
                          {org.name.charAt(0).toUpperCase()}
                          {org.isPrimary && (
                            <Star className="absolute -top-1 -right-1 h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        <span className="flex-1 truncate text-left">{org.name}</span>
                        {currentOrganization?.id === org.id && (
                          <Check className="h-4 w-4 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Member Organizations */}
                {memberOrganizations.length > 0 && (
                  <>
                    <div className={cn(
                      "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]",
                      ownedOrganizations.length > 0 && "mt-2 border-t border-[color:var(--surface-border-subtle)] pt-2"
                    )}>
                      Участник в
                    </div>
                    {memberOrganizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgClick(org.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          currentOrganization?.id === org.id
                            ? "bg-indigo-500/10 text-[color:var(--text-primary)]"
                            : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]"
                        )}
                      >
                        <div className="flex h-5 w-5 flex-none items-center justify-center rounded bg-neutral-500/10 text-[10px] font-bold text-neutral-400">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 truncate text-left">{org.name}</span>
                        <span className="text-[10px] text-[color:var(--text-tertiary)]">
                          {org.userRole === 'admin' ? 'админ' : org.userRole === 'viewer' ? 'просмотр' : 'участник'}
                        </span>
                        {currentOrganization?.id === org.id && (
                          <Check className="h-4 w-4 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Create button */}
          <div className="border-t border-[color:var(--surface-border-subtle)] mt-1 pt-1">
            <button
              onClick={handleCreateClick}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                canCreateNewOrganization
                  ? "text-indigo-500 hover:bg-indigo-500/10"
                  : "text-[color:var(--text-tertiary)] hover:bg-[color:var(--surface-muted)]"
              )}
            >
              <Plus className="h-4 w-4" />
              <span>Создать организацию</span>
              {!canCreateNewOrganization && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                  Pro
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          void refreshOrganizations();
        }}
      />

      {/* Upgrade Modal */}
      <UpgradeToCreateOrgModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
}
