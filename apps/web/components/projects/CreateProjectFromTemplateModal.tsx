"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// @ts-expect-error lucide-react icon types
import { ArrowLeft, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import clsx from "clsx";
import LargeContentModal from "@/components/ui/large-content-modal";
import ProjectTemplateSelectorModal, {
  type ProjectTemplate
} from "@/components/pm/ProjectTemplateSelectorModal";
import TemplateTaskSelector from "@/components/projects/TemplateTaskSelector";
import { toast } from "@/lib/ui/toast";
import type { ProjectTemplateTask } from "@collabverse/api";

type TemplateTaskNode = ProjectTemplateTask & { children?: TemplateTaskNode[] };

type WizardStep = "template" | "details" | "tasks" | "confirm";

type CreateProjectFromTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "template", label: "Шаблон" },
  { id: "details", label: "Настройки" },
  { id: "tasks", label: "Задачи" },
  { id: "confirm", label: "Подтверждение" }
];

function collectTaskIds(tasks: TemplateTaskNode[], ids: string[] = []) {
  for (const task of tasks) {
    ids.push(task.id);
    if (task.children) {
      collectTaskIds(task.children, ids);
    }
  }
  return ids;
}

function flattenTaskTitles(tasks: TemplateTaskNode[], titles: string[] = []) {
  for (const task of tasks) {
    titles.push(task.title);
    if (task.children) {
      flattenTaskTitles(task.children, titles);
    }
  }
  return titles;
}

export default function CreateProjectFromTemplateModal({
  isOpen,
  onClose
}: CreateProjectFromTemplateModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("template");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [tasks, setTasks] = useState<TemplateTaskNode[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [tasksLoading, setTasksLoading] = useState(false);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setStep("template");
    setSelectedTemplate(null);
    setTasks([]);
    setSelectedTaskIds(new Set());
    setOrganizationId("");
    setProjectTitle("");
    setProjectDescription("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/organizations")
      .then((res) => res.json())
      .then((data) => {
        const orgs = data?.ok ? data.data?.organizations || [] : [];
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    if (!selectedTemplate) {
      setTasks([]);
      setSelectedTaskIds(new Set());
      return;
    }

    setTasksLoading(true);
    fetch(`/api/templates/${selectedTemplate.id}/tasks`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Не удалось загрузить задачи шаблона");
        }
        return res.json();
      })
      .then((data) => {
        const items = (data?.items ?? []) as TemplateTaskNode[];
        setTasks(items);
        setSelectedTaskIds(new Set(collectTaskIds(items)));
      })
      .catch((error) => {
        console.error(error);
        toast("Не удалось загрузить задачи шаблона", "warning");
        setTasks([]);
        setSelectedTaskIds(new Set());
      })
      .finally(() => setTasksLoading(false));
  }, [selectedTemplate]);

  const totalTaskIds = useMemo(() => collectTaskIds(tasks), [tasks]);
  const selectedCount = selectedTaskIds.size;

  const handleTemplateSelect = (template: ProjectTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      if (!projectTitle.trim()) setProjectTitle(template.title);
      if (!projectDescription.trim()) setProjectDescription(template.summary);
    }
  };

  const canProceedFromTemplate = !!selectedTemplate;
  const canProceedFromDetails = projectTitle.trim().length >= 3 && organizationId.trim().length > 0;

  const handleNext = () => {
    if (step === "template") {
      if (!canProceedFromTemplate) {
        toast("Выберите шаблон проекта", "warning");
        return;
      }
      setStep("details");
      return;
    }
    if (step === "details") {
      if (!canProceedFromDetails) {
        toast("Заполните название проекта и организацию", "warning");
        return;
      }
      setStep("tasks");
      return;
    }
    if (step === "tasks") {
      setStep("confirm");
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("tasks");
      return;
    }
    if (step === "tasks") {
      setStep("details");
      return;
    }
    if (step === "details") {
      setStep("template");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/projects/from-template", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          projectTitle: projectTitle.trim() || undefined,
          projectDescription: projectDescription.trim() || undefined,
          organizationId,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          selectedTaskIds: Array.from(selectedTaskIds)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Не удалось создать проект");
      }

      const payload = await response.json();
      const projectId = payload?.data?.project?.id;
      toast("Проект создан", "success");
      onClose();
      if (projectId) {
        router.push(`/pm/projects/${projectId}`);
      } else {
        router.push("/pm/projects");
      }
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : "Не удалось создать проект", "warning");
      setSubmitting(false);
    }
  };

  const selectionSummary = useMemo(() => {
    if (tasks.length === 0) return [];
    const titles = flattenTaskTitles(tasks);
    return titles.slice(0, 8);
  }, [tasks]);

  return (
    <>
      <LargeContentModal isOpen={isOpen} onClose={onClose} contentClassName="max-w-5xl">
        <div className="p-8">
          <header className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-wide text-indigo-300">Мастер создания</p>
            <h1 className="text-xl font-semibold text-white">Проект из шаблона</h1>
            <p className="text-sm text-neutral-400">
              Выберите шаблон, настройте проект и отметьте задачи, которые нужно создать.
            </p>
          </header>

          <div className="mb-8 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            {STEPS.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className={clsx(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold",
                    step === item.id
                      ? "border-indigo-500/60 text-indigo-100"
                      : "border-neutral-800 text-neutral-400"
                  )}
                >
                  {index + 1}
                </span>
                <span className={step === item.id ? "text-indigo-200" : "text-neutral-500"}>{item.label}</span>
              </div>
            ))}
          </div>

          {step === "template" && (
            <section className="space-y-6">
              <button
                type="button"
                onClick={() => setTemplatePickerOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-neutral-900 bg-neutral-950/60 px-5 py-4 text-left transition hover:border-indigo-500/40 hover:bg-neutral-950/80"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Выбрать шаблон</div>
                  <div className="text-xs text-neutral-400">
                    Найдите подходящий шаблон и посмотрите структуру задач.
                  </div>
                </div>
              </button>

              {selectedTemplate && (
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                    Выбран шаблон
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{selectedTemplate.title}</div>
                  <p className="mt-1 text-sm text-neutral-400">{selectedTemplate.summary}</p>
                </div>
              )}
            </section>
          )}

          {step === "details" && (
            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Организация
                  <select
                    value={organizationId}
                    onChange={(event) => setOrganizationId(event.target.value)}
                    className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Дата старта проекта
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Название проекта
                <input
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  placeholder="Например, Запуск бренда"
                  className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Краткое описание
                <textarea
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="Цели, этапы, ожидаемый результат…"
                  className="min-h-[120px] w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
            </section>
          )}

          {step === "tasks" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 px-5 py-4 text-sm text-neutral-300">
                <div className="font-semibold text-white">Выбор задач</div>
                <p className="mt-1 text-xs text-neutral-400">
                  Снимите выбор задач, которые не нужны. Родительские задачи выбираются автоматически.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                  <span>Всего задач: {totalTaskIds.length}</span>
                  <span>Выбрано: {selectedCount}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds(new Set())}
                    className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-rose-500/40 hover:text-white"
                  >
                    Создать без задач
                  </button>
                </div>
              </div>

              <TemplateTaskSelector
                tasks={tasks}
                selectedTaskIds={selectedTaskIds}
                onSelectionChange={setSelectedTaskIds}
                loading={tasksLoading}
              />
            </section>
          )}

          {step === "confirm" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-6 text-sm text-neutral-200">
                <h2 className="text-lg font-semibold text-white">Проверьте данные</h2>
                <ul className="mt-4 space-y-3">
                  <li>
                    <span className="text-neutral-500">Проект:</span>{" "}
                    <strong className="text-white">{projectTitle.trim()}</strong>
                  </li>
                  <li>
                    <span className="text-neutral-500">Организация:</span>{" "}
                    <strong className="text-white">
                      {organizations.find((org) => org.id === organizationId)?.name || "—"}
                    </strong>
                  </li>
                  <li>
                    <span className="text-neutral-500">Дата старта:</span>{" "}
                    <strong className="text-white">{startDate || "Сегодня"}</strong>
                  </li>
                  <li>
                    <span className="text-neutral-500">Задач выбрано:</span>{" "}
                    <strong className="text-white">{selectedCount}</strong>
                  </li>
                </ul>
              </div>

              {selectionSummary.length > 0 && (
                <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-6 text-sm text-neutral-300">
                  <div className="flex items-center gap-2 text-white">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold">Пример выбранных задач</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-neutral-400">
                    {selectionSummary.map((title) => (
                      <li key={title}>• {title}</li>
                    ))}
                    {selectionSummary.length < selectedCount ? (
                      <li>…ещё {selectedCount - selectionSummary.length}</li>
                    ) : null}
                  </ul>
                </div>
              )}
            </section>
          )}

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === "template"}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-900 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            {step !== "confirm" ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                Далее
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl border px-5 py-2 text-xs font-semibold uppercase tracking-wide transition",
                  submitting
                    ? "border-neutral-800 bg-neutral-950/60 text-neutral-500"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20"
                )}
              >
                {submitting ? "Создание..." : "Создать проект"}
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
          </footer>
        </div>
      </LargeContentModal>

      <ProjectTemplateSelectorModal
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleTemplateSelect}
      />
    </>
  );
}
