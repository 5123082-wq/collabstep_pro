'use client';

import { useState, useEffect } from 'react';
// @ts-expect-error lucide-react icon types
import { RefreshCw, Save, Plus, Trash2, CheckCircle, FileText, AlertCircle } from 'lucide-react';

interface DocumentIndexConfig {
  path: string;
  enabled: boolean;
  priority?: number;
  description?: string;
  lastIndexed?: string;
}

interface IndexingConfig {
  documents: DocumentIndexConfig[];
  autoReindex: boolean;
  indexOnBuild: boolean;
  maxFileSize: number;
  excludePatterns: string[];
}

interface IndexStatus {
  indexed: boolean;
  totalChunks?: number;
  indexedAt?: string;
  message?: string;
}

export default function AIAssistantIndexingPage() {
  const [config, setConfig] = useState<IndexingConfig | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newDocPath, setNewDocPath] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');

  useEffect(() => {
    void loadConfig();
    void loadIndexStatus();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/ai-assistant/indexing-config');
      const data = await response.json();
      setConfig(data.config);
    } catch (err) {
      setError('Не удалось загрузить конфигурацию');
    } finally {
      setLoading(false);
    }
  };

  const loadIndexStatus = async () => {
    try {
      const response = await fetch('/api/admin/ai-assistant/reindex');
      const data = await response.json();
      setIndexStatus(data);
    } catch (err) {
      console.error('Failed to load index status:', err);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/ai-assistant/indexing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить конфигурацию');
      }

      setSuccessMessage('Конфигурация сохранена успешно');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const toggleDocument = async (path: string, enabled: boolean) => {
    if (!config) return;

    const updatedDocs = config.documents.map(doc =>
      doc.path === path ? { ...doc, enabled } : doc
    );

    setConfig({ ...config, documents: updatedDocs });
  };

  const removeDocument = async (path: string) => {
    if (!config) return;

    const updatedDocs = config.documents.filter(doc => doc.path !== path);
    setConfig({ ...config, documents: updatedDocs });
  };

  const addDocument = () => {
    if (!config || !newDocPath.trim()) return;

    const newDoc: DocumentIndexConfig = {
      path: newDocPath.trim(),
      enabled: true,
      priority: config.documents.length,
      ...(newDocDesc.trim() ? { description: newDocDesc.trim() } : {}),
    };

    setConfig({
      ...config,
      documents: [...config.documents, newDoc],
    });

    setNewDocPath('');
    setNewDocDesc('');
  };

  const startReindex = async () => {
    setIndexing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/ai-assistant/reindex', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Не удалось запустить индексацию');
      }

      const data = await response.json();
      setSuccessMessage(data.message || 'Индексация запущена');
      
      // Обновляем статус через 5 секунд
      setTimeout(() => {
        void loadIndexStatus();
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при индексации');
    } finally {
      setIndexing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-neutral-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Загрузка конфигурации...</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-red-400">Не удалось загрузить конфигурацию</p>
        </div>
      </div>
    );
  }

  const enabledCount = config.documents.filter(d => d.enabled).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Управление индексацией AI ассистента</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Настройте документы для индексации и управляйте базой знаний
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={startReindex}
            disabled={indexing || enabledCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${indexing ? 'animate-spin' : ''}`} />
            {indexing ? 'Индексация...' : 'Переиндексировать'}
          </button>
          
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <div className="text-sm text-neutral-400">Всего документов</div>
          <div className="mt-1 text-2xl font-bold text-white">{config.documents.length}</div>
        </div>
        
        <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <div className="text-sm text-neutral-400">Включено</div>
          <div className="mt-1 text-2xl font-bold text-green-400">{enabledCount}</div>
        </div>
        
        <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <div className="text-sm text-neutral-400">Проиндексировано чанков</div>
          <div className="mt-1 text-2xl font-bold text-blue-400">
            {indexStatus?.totalChunks || 0}
          </div>
        </div>
        
        <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <div className="text-sm text-neutral-400">Последняя индексация</div>
          <div className="mt-1 text-sm font-medium text-white">
            {indexStatus?.indexedAt
              ? new Date(indexStatus.indexedAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Нет данных'}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Настройки индексации</h2>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.indexOnBuild}
              onChange={(e) => setConfig({ ...config, indexOnBuild: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-neutral-900"
            />
            <span className="text-sm text-neutral-300">
              Индексировать при сборке (Vercel build)
            </span>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.autoReindex}
              onChange={(e) => setConfig({ ...config, autoReindex: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-neutral-900"
            />
            <span className="text-sm text-neutral-300">
              Автоматическая переиндексация при изменениях
            </span>
          </label>
        </div>
      </div>

      {/* Add Document */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Добавить документ</h2>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={newDocPath}
            onChange={(e) => setNewDocPath(e.target.value)}
            placeholder="Путь к файлу (напр. getting-started/quick-start.md)"
            className="flex-1 rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          
          <input
            type="text"
            value={newDocDesc}
            onChange={(e) => setNewDocDesc(e.target.value)}
            placeholder="Описание (опционально)"
            className="flex-1 rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          
          <button
            onClick={addDocument}
            disabled={!newDocPath.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Документы ({enabledCount} из {config.documents.length} включено)
        </h2>
        
        <div className="space-y-2">
          {config.documents
            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
            .map((doc) => (
              <div
                key={doc.path}
                className={`rounded-lg border p-4 transition-colors ${
                  doc.enabled
                    ? 'border-neutral-600 bg-neutral-700/50'
                    : 'border-neutral-700 bg-neutral-800/30 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={doc.enabled}
                    onChange={(e) => toggleDocument(doc.path, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-neutral-900"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <code className="text-sm font-medium text-white">{doc.path}</code>
                      {doc.lastIndexed && (
                        <span className="text-xs text-neutral-500">
                          (индексировано {new Date(doc.lastIndexed).toLocaleDateString('ru-RU')})
                        </span>
                      )}
                    </div>
                    
                    {doc.description && (
                      <p className="mt-1 text-sm text-neutral-400">{doc.description}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => removeDocument(doc.path)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-600 hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

