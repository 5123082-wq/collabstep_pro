'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Modal, ModalContent, ModalHeader } from '@/components/ui/modal';

type PlatformSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type SettingsSection = {
  id: string;
  label: string;
  icon: string;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'interface', label: 'Интерфейс', icon: '⚙️' },
  { id: 'notifications', label: 'Уведомления', icon: '🔔' },
  { id: 'accessibility', label: 'Доступность', icon: '♿' },
  { id: 'security', label: 'Безопасность', icon: '🛡️' }
];

export default function PlatformSettingsModal({ open, onClose }: PlatformSettingsModalProps) {
  const [activeSection, setActiveSection] = useState<string>('interface');

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="h-[90vh] max-w-[95vw] flex flex-col p-0">
        <ModalHeader className="px-6 py-5 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Настройки платформы</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Персонализируйте внешний вид разделов для лучшей ориентации
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
              aria-label="Закрыть настройки"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </ModalHeader>

        <div className="flex flex-1 min-h-0">
          {/* Боковая навигация */}
          <aside className="w-64 flex-shrink-0 border-r border-neutral-800 overflow-y-auto bg-neutral-950/50">
            <nav className="p-4 space-y-1">
              {SETTINGS_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2',
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/40'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    )}
                  >
                    <span>{section.icon}</span>
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Контент */}
          <div className="flex-1 overflow-y-auto bg-neutral-950">
            <div className="p-6 max-w-5xl mx-auto">
              {activeSection === 'interface' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Интерфейс</h3>
                    <p className="mt-1 text-sm text-neutral-400">Настройки интерфейса скоро будут доступны</p>
                  </div>
                </div>
              )}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Уведомления</h3>
                    <p className="mt-1 text-sm text-neutral-400">Настройки уведомлений скоро будут доступны</p>
                  </div>
                </div>
              )}
              {activeSection === 'accessibility' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Доступность</h3>
                    <p className="mt-1 text-sm text-neutral-400">Настройки доступности скоро будут доступны</p>
                  </div>
                </div>
              )}
              {activeSection === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Безопасность</h3>
                    <p className="mt-1 text-sm text-neutral-400">Настройки безопасности скоро будут доступны</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

