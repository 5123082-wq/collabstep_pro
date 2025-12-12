'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalTitle, ModalDescription, ModalClose } from '@/components/ui/modal';
import { toast } from '@/lib/ui/toast';
import CreateTaskModal from './CreateTaskModal';

type ProjectOption = {
  id: string;
  name: string;
  key: string;
};

const toProjectOption = (project: unknown): ProjectOption | null => {
  if (!project || typeof project !== 'object') {
    return null;
  }
  const candidate = project as { id?: unknown; name?: unknown; title?: unknown; key?: unknown };
  if (typeof candidate.id !== 'string' || typeof candidate.key !== 'string') {
    return null;
  }
  const name =
    typeof candidate.name === 'string'
      ? candidate.name
      : typeof candidate.title === 'string'
        ? candidate.title
        : '';
  return { id: candidate.id, name, key: candidate.key };
};

type CreateTaskWithProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateTaskWithProjectModal({ isOpen, onClose }: CreateTaskWithProjectModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedProjectId('');
      setShowTaskModal(false);
      setSearchQuery('');
      setError(null);
      return;
    }

    // Загружаем список доступных проектов
    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/pm/projects?scope=all&pageSize=100');
        if (response.ok) {
          const data = await response.json();
          if (data.items && Array.isArray(data.items)) {
            const normalized = data.items
              .map(toProjectOption)
              .filter((project: ProjectOption | null): project is ProjectOption => project !== null);
            setProjects(normalized);
          } else {
            setError('Не удалось загрузить список проектов');
          }
        } else {
          setError('Ошибка при загрузке проектов');
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
        setError('Произошла ошибка при загрузке проектов');
        toast('Не удалось загрузить список проектов', 'warning');
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, [isOpen]);

  // Фильтрация проектов по поисковому запросу
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.key.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const handleProjectSelect = () => {
    if (selectedProjectId) {
      setShowTaskModal(true);
    }
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    onClose();
  };

  if (showTaskModal && selectedProjectId) {
    return (
      <CreateTaskModal
        projectId={selectedProjectId}
        isOpen={showTaskModal}
        onClose={handleTaskModalClose}
        onSuccess={handleTaskModalClose}
      />
    );
  }

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalClose />
        <ModalHeader>
          <ModalTitle>Создать задачу</ModalTitle>
          <ModalDescription>Выберите проект для новой задачи</ModalDescription>
        </ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-[color:var(--text-secondary)]">Загрузка проектов...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-sm text-rose-400">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Перезагружаем проекты
                  fetch('/api/pm/projects?scope=all&pageSize=100')
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.items && Array.isArray(data.items)) {
                        const normalized = data.items
                          .map(toProjectOption)
                          .filter((project: ProjectOption | null): project is ProjectOption => project !== null);
                        setProjects(normalized);
                        setError(null);
                      } else {
                        setError('Не удалось загрузить список проектов');
                      }
                    })
                    .catch(() => {
                      setError('Произошла ошибка при загрузке проектов');
                    })
                    .finally(() => setLoading(false));
                }}
                className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                Попробовать снова
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--text-secondary)]">
                У вас нет доступных проектов. Сначала создайте проект.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // Открываем модальное окно создания проекта через событие
                  window.dispatchEvent(
                    new CustomEvent<{ component: string }>('open-create-modal', {
                      detail: { component: 'createProject' }
                    })
                  );
                }}
                className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                Создать проект
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-2">
                  Выберите проект <span className="text-rose-400">*</span>
                </label>
                {projects.length > 5 && (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию или ключу..."
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3"
                  />
                )}
                <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
                  {filteredProjects.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[color:var(--text-tertiary)]">
                      Проекты не найдены
                    </div>
                  ) : (
                    filteredProjects.map((project: ProjectOption) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => setSelectedProjectId(project.id)}
                        className={`w-full px-4 py-3 text-left text-sm transition ${
                          selectedProjectId === project.id
                            ? 'bg-indigo-500/20 text-indigo-100'
                            : 'text-[color:var(--text-primary)] hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                          {project.key}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleProjectSelect}
                disabled={!selectedProjectId}
                className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Продолжить
              </button>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
