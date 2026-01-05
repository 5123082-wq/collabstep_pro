"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { ProjectTemplateTask } from "@collabverse/api";

type TaskWithChildren = ProjectTemplateTask & { children?: TaskWithChildren[] };

export type TemplateTaskSelectorProps = {
  tasks: TaskWithChildren[];
  selectedTaskIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  loading?: boolean;
};

type TaskMaps = {
  parentMap: Map<string, string | null>;
  childrenMap: Map<string, string[]>;
  allIds: string[];
};

function buildTaskMaps(tasks: TaskWithChildren[]): TaskMaps {
  const parentMap = new Map<string, string | null>();
  const childrenMap = new Map<string, string[]>();
  const allIds: string[] = [];

  const walk = (nodes: TaskWithChildren[], parentId: string | null) => {
    for (const node of nodes) {
      allIds.push(node.id);
      parentMap.set(node.id, parentId);
      if (parentId) {
        const children = childrenMap.get(parentId) ?? [];
        children.push(node.id);
        childrenMap.set(parentId, children);
      }
      if (node.children && node.children.length > 0) {
        walk(node.children, node.id);
      }
    }
  };

  walk(tasks, null);
  return { parentMap, childrenMap, allIds };
}

function collectDescendants(taskId: string, childrenMap: Map<string, string[]>): string[] {
  const result: string[] = [];
  const stack = [...(childrenMap.get(taskId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    result.push(current);
    const children = childrenMap.get(current);
    if (children) {
      stack.push(...children);
    }
  }
  return result;
}

export default function TemplateTaskSelector({
  tasks,
  selectedTaskIds,
  onSelectionChange,
  loading
}: TemplateTaskSelectorProps) {
  const { parentMap, childrenMap, allIds } = useMemo(() => buildTaskMaps(tasks), [tasks]);

  const handleToggle = (taskId: string) => {
    const next = new Set(selectedTaskIds);
    const isSelected = next.has(taskId);

    if (isSelected) {
      const descendants = collectDescendants(taskId, childrenMap);
      const hasSelectedDescendants = descendants.some((id) => next.has(id));
      if (hasSelectedDescendants) {
        const confirmed = window.confirm(
          `Эта задача имеет ${descendants.length} подзадач(и). Снять выбор со всех дочерних задач?`
        );
        if (!confirmed) {
          return;
        }
      }
      next.delete(taskId);
      for (const id of descendants) {
        next.delete(id);
      }
    } else {
      let current: string | null | undefined = taskId;
      while (current) {
        next.add(current);
        current = parentMap.get(current) ?? null;
      }
    }

    onSelectionChange(next);
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(allIds));
  };

  const handleClearAll = () => {
    onSelectionChange(new Set());
  };

  const renderTask = (task: TaskWithChildren, level = 0) => {
    const isSelected = selectedTaskIds.has(task.id);
    return (
      <div key={task.id} className="space-y-2">
        <div
          className={clsx(
            "flex items-start gap-3 rounded-xl border border-neutral-900 bg-neutral-950/60 px-4 py-3",
            level > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${16 + level * 20}px` }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggle(task.id)}
            className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-indigo-500/40"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-white">{task.title}</h4>
              {task.defaultPriority && (
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-300">
                  {task.defaultPriority}
                </span>
              )}
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {task.defaultStatus}
              </span>
            </div>
            {task.description && (
              <p className="mt-1 text-xs text-neutral-400">{task.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
              <span>Смещения: {task.offsetStartDays} → {task.offsetDueDays ?? "—"} дней</span>
              {task.defaultLabels && task.defaultLabels.length > 0 && (
                <span>Метки: {task.defaultLabels.join(", ")}</span>
              )}
            </div>
          </div>
        </div>
        {task.children && task.children.length > 0 && (
          <div className="space-y-2">{task.children.map((child) => renderTask(child, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
        <div>Выбрано задач: {selectedTaskIds.size}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
          >
            Выбрать все
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-rose-500/40 hover:text-white"
          >
            Снять все
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 px-6 py-8 text-center text-sm text-neutral-400">
          Загрузка задач...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 px-6 py-8 text-center text-sm text-neutral-400">
          В шаблоне нет задач.
        </div>
      ) : (
        <div className="space-y-3">{tasks.map((task) => renderTask(task))}</div>
      )}
    </div>
  );
}
