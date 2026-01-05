'use client';

import { useEffect, useState } from 'react';
import TemplateTaskItem from './TemplateTaskItem';
import type { ProjectTemplateTask } from '@collabverse/api';

type TemplateTaskTreeProps = {
  tasks: Array<ProjectTemplateTask & { children?: TemplateTaskTreeProps['tasks'] }>;
  onEdit: (task: ProjectTemplateTask) => void;
  onDelete: (taskId: string) => Promise<void>;
};

const collectTaskIds = (
  items: Array<ProjectTemplateTask & { children?: TemplateTaskTreeProps['tasks'] }>,
  ids: Set<string>
) => {
  for (const task of items) {
    ids.add(task.id);
    if (task.children) {
      collectTaskIds(task.children, ids);
    }
  }
};

export default function TemplateTaskTree({
  tasks,
  onEdit,
  onDelete
}: TemplateTaskTreeProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (tasks.length === 0 || expandedTasks.size > 0) {
      return;
    }
    const ids = new Set<string>();
    collectTaskIds(tasks, ids);
    setExpandedTasks(ids);
  }, [tasks, expandedTasks]);

  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40 p-8 text-center">
          <p className="text-sm text-neutral-400">Нет задач в шаблоне</p>
        </div>
      ) : (
        tasks.map((task) => (
          <TemplateTaskItem
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            expandedTasks={expandedTasks}
            onToggleExpand={toggleExpand}
          />
        ))
      )}
    </div>
  );
}
