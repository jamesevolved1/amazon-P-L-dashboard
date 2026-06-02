import { CalendarCheck, CheckCircle2, Clock3, FileSpreadsheet, History, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { initialOptimizationScheduleState, logOptimizationTaskCompletion, normalizeOptimizationScheduleState, parseOptimizationScheduleFile, updateOptimizationTask } from "../lib/optimizationSchedule";
import type { OptimizationCadence, OptimizationScheduleState, OptimizationTask } from "../types/models";

const cadenceLabels: Record<OptimizationCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const cadenceDescriptions: Record<OptimizationCadence, string> = {
  daily: "Launch-sensitive checks and rank monitoring.",
  weekly: "Core account optimization rhythm.",
  monthly: "Structure, creative, and scale expansion work.",
  quarterly: "Strategic SEO and account growth initiatives.",
};

export function OptimizationCalendar({
  clientName,
  state,
  onChange,
}: {
  clientName: string;
  state: OptimizationScheduleState | undefined;
  onChange: (state: OptimizationScheduleState) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const schedule = normalizeOptimizationScheduleState(state);
  const completed = schedule.tasks.filter((task) => task.completed).length;
  const progress = schedule.tasks.length ? completed / schedule.tasks.length : 0;
  const completionEvents = useMemo(() => getCompletionEvents(schedule.tasks), [schedule.tasks]);
  const workLogByDay = useMemo(() => groupCompletionEventsByDay(completionEvents), [completionEvents]);
  const deepDiveTask = useMemo(() => schedule.tasks.find((task) => isDeepDiveTask(task.title)), [schedule.tasks]);
  const grouped = useMemo(
    () =>
      (Object.keys(cadenceLabels) as OptimizationCadence[]).map((cadence) => {
        const tasks = sortOptimizationTasks(schedule.tasks.filter((task) => task.cadence === cadence));
        const done = tasks.filter((task) => task.completed).length;
        return { cadence, tasks, done, progress: tasks.length ? done / tasks.length : 0 };
      }),
    [schedule],
  );

  const importSchedule = async (file: File) => {
    try {
      const parsed = await parseOptimizationScheduleFile(file);
      onChange(parsed);
      setMessage(`Imported ${parsed.tasks.length} optimization actions from ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import the optimization schedule.");
    }
  };

  return (
    <section className="grid gap-5">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        <div className="bg-[#102A3A] px-5 py-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Amazon Ads Operating Rhythm</div>
              <h2 className="mt-2 text-2xl font-extrabold">Optimization Calendar</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/75">
                Keep a client-specific optimization checklist for bid work, campaign structure, creatives, SEO, and quarterly growth plays.
              </p>
              <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/80">
                Active client: {clientName}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-white transition hover:bg-deep"
              >
                <UploadCloud className="h-4 w-4" />
                Upload Schedule
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(initialOptimizationScheduleState);
                  setMessage("Reset to the default optimization framework.");
                }}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-extrabold text-[#102A3A] transition hover:bg-white/90"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Framework
              </button>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importSchedule(file);
            event.currentTarget.value = "";
          }}
        />

        <div className="grid gap-4 bg-[#F1F4F8] p-5 md:grid-cols-4">
          <SummaryCard label="Total Actions" value={schedule.tasks.length.toLocaleString()} helper={schedule.sourceName ?? "Optimization framework"} />
          <SummaryCard label="Completed" value={completed.toLocaleString()} helper={`${Math.round(progress * 100)}% complete`} good={progress >= 0.75} />
          <SummaryCard label="Open" value={(schedule.tasks.length - completed).toLocaleString()} helper="Still needs attention" />
          <SummaryCard label="Last Imported" value={schedule.importedAt ? new Date(schedule.importedAt).toLocaleDateString() : "Default"} helper={schedule.sourceName ?? "Built-in schedule"} />
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]">
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
          <div className="border-b border-line bg-gradient-to-br from-[#102A3A] to-[#1D6680] px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
              <Sparkles className="h-4 w-4" />
              Priority Work
            </div>
            <h3 className="mt-2 text-xl font-extrabold">Ad Account Deep Dive</h3>
            <p className="mt-1 text-sm leading-6 text-white/75">
              Keep this at the top because it is the big weekly account review anchor.
            </p>
          </div>
          {deepDiveTask ? (
            <div className="p-5">
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="text-lg font-extrabold text-ink">{deepDiveTask.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">{deepDiveTask.category}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">Weekly</span>
                  {deepDiveTask.completedAt ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                      Last done {formatCompletedAt(deepDiveTask.completedAt)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onChange(logOptimizationTaskCompletion(schedule, deepDiveTask.id))}
                    className="rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-white transition hover:bg-deep"
                  >
                    Log Deep Dive Today
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(updateOptimizationTask(schedule, deepDiveTask.id, !deepDiveTask.completed))}
                    className="rounded-md border border-line bg-white px-4 py-2 text-sm font-extrabold text-ink transition hover:border-brand"
                  >
                    {deepDiveTask.completed ? "Reopen This Week" : "Mark Complete"}
                  </button>
                </div>
              </div>
              <div className="mt-4 text-xs font-bold leading-5 text-steel">
                Completion history: {(deepDiveTask.completionHistory ?? []).length ? `${deepDiveTask.completionHistory?.length} logged sessions` : "No sessions logged yet"}
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-extrabold text-ink">Completion Log</h3>
              </div>
              <p className="mt-1 text-sm text-steel">A dated record of exactly what was completed for this client.</p>
            </div>
            <div className="rounded-full bg-warm px-3 py-1 text-xs font-extrabold text-steel">
              {completionEvents.length} entries
            </div>
          </div>
          <div className="max-h-[340px] overflow-y-auto p-4">
            {workLogByDay.length ? (
              <div className="grid gap-4">
                {workLogByDay.map((group) => (
                  <div key={group.day}>
                    <div className="sticky top-0 z-10 rounded-md bg-white/95 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-steel backdrop-blur">
                      {group.day}
                    </div>
                    <div className="mt-2 grid gap-2">
                      {group.events.map((event) => (
                        <div key={`${event.task.id}-${event.completedAt}`} className="rounded-lg border border-line bg-warm/50 px-3 py-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-sm font-extrabold text-ink">{event.task.title}</div>
                              <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-steel">
                                {cadenceLabels[event.task.cadence]} / {event.task.category}
                              </div>
                            </div>
                            <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 ring-1 ring-emerald-200">
                              {formatCompletedAt(event.completedAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-warm/50 p-5 text-sm font-bold text-steel">
                Nothing logged yet. Click “Log Work” or check off a task to start building the client history.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {grouped.map(({ cadence, tasks, done, progress }) => (
          <div key={cadence} className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
            <div className="flex items-start justify-between gap-4 border-b border-line bg-[#FAFAFA] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-brand" />
                  <h3 className="text-lg font-extrabold text-ink">{cadenceLabels[cadence]}</h3>
                </div>
                <p className="mt-1 text-sm text-steel">{cadenceDescriptions[cadence]}</p>
              </div>
              <div className="rounded-full bg-warm px-3 py-1 text-xs font-extrabold text-steel">
                {done}/{tasks.length}
              </div>
            </div>
            <div className="border-b border-line bg-warm/60 px-5 py-3">
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <div className="max-h-[460px] divide-y divide-line overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className={`flex items-start gap-3 px-5 py-3 transition hover:bg-orange-50/45 ${isDeepDiveTask(task.title) ? "bg-orange-50/70" : ""}`}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(event) => onChange(updateOptimizationTask(schedule, task.id, event.target.checked))}
                    className="mt-1 h-4 w-4 rounded border-line accent-[#F47322]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-extrabold ${task.completed ? "text-steel line-through" : "text-ink"}`}>{task.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-warm px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-steel">{task.category}</span>
                      {task.timing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">
                          <Clock3 className="h-3 w-3" />
                          {task.timing}
                        </span>
                      ) : null}
                      {task.completedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {formatCompletedAt(task.completedAt)}
                        </span>
                      ) : null}
                      {(task.completionHistory ?? []).length ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">
                          {(task.completionHistory ?? []).length} logged
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(logOptimizationTaskCompletion(schedule, task.id))}
                    className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink transition hover:border-brand hover:text-brand"
                  >
                    Log Work
                  </button>
                  {task.completed ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-white p-4 text-sm leading-6 text-steel shadow-card">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <div className="font-extrabold text-ink">How this fits the client workflow</div>
            Upload the optimization template once per client, then use this page as the operating checklist before client calls. The schedule stays separate from reporting numbers, but lives with the same client workspace.
          </div>
        </div>
      </div>
    </section>
  );
}

function sortOptimizationTasks<T extends { title: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aDeepDive = isDeepDiveTask(a.title);
    const bDeepDive = isDeepDiveTask(b.title);
    if (aDeepDive !== bDeepDive) return aDeepDive ? -1 : 1;
    return 0;
  });
}

function isDeepDiveTask(title: string) {
  return title.trim().toLowerCase() === "complete ad account deep dive";
}

function formatCompletedAt(value?: string | null) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCompletionEvents(tasks: OptimizationTask[]) {
  return tasks
    .flatMap((task) => (task.completionHistory ?? []).map((completedAt) => ({ task, completedAt })))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function groupCompletionEventsByDay(events: Array<{ task: OptimizationTask; completedAt: string }>) {
  const groups = new Map<string, Array<{ task: OptimizationTask; completedAt: string }>>();
  events.forEach((event) => {
    const day = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(event.completedAt));
    groups.set(day, [...(groups.get(day) ?? []), event]);
  });
  return [...groups.entries()].map(([day, groupEvents]) => ({ day, events: groupEvents }));
}

function SummaryCard({ label, value, helper, good }: { label: string; value: string; helper: string; good?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${good ? "border-emerald-200" : "border-line"}`}>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-steel">{label}</div>
      <div className="mt-3 text-2xl font-extrabold text-ink">{value}</div>
      <div className={`mt-1 text-xs font-bold ${good ? "text-emerald-700" : "text-steel"}`}>{helper}</div>
    </div>
  );
}
