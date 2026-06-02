import { CalendarCheck, CheckCircle2, ChevronDown, Clock3, FileSpreadsheet, History, ListChecks, RotateCcw, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  initialOptimizationScheduleState,
  logOptimizationTaskCompletion,
  normalizeOptimizationScheduleState,
  parseOptimizationScheduleFile,
  removeOptimizationTaskCompletion,
  updateOptimizationTask,
} from "../lib/optimizationSchedule";
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
  const [workDate, setWorkDate] = useState(() => toDateInputValue(new Date()));
  const [completionLogOpen, setCompletionLogOpen] = useState(false);
  const schedule = normalizeOptimizationScheduleState(state);
  const workDateTimestamp = toWorkDateTimestamp(workDate);
  const completed = schedule.tasks.filter((task) => task.completed).length;
  const progress = schedule.tasks.length ? completed / schedule.tasks.length : 0;
  const completionEvents = useMemo(() => getCompletionEvents(schedule.tasks), [schedule.tasks]);
  const workLogByDay = useMemo(() => groupCompletionEventsByDay(completionEvents), [completionEvents]);
  const deepDiveTask = useMemo(() => schedule.tasks.find((task) => isDeepDiveTask(task.title)), [schedule.tasks]);
  const dueWork = useMemo(() => getWorkDueForDate(schedule.tasks, workDate), [schedule.tasks, workDate]);
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
            <div className="flex flex-wrap items-end gap-2">
              <label className="rounded-md bg-white/10 px-3 py-2">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">Work Date</span>
                <input
                  type="date"
                  value={workDate}
                  onChange={(event) => setWorkDate(event.target.value)}
                  className="mt-1 bg-transparent text-sm font-extrabold text-white outline-none [color-scheme:dark]"
                />
              </label>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
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
                    onClick={() => onChange(logOptimizationTaskCompletion(schedule, deepDiveTask.id, workDateTimestamp))}
                    className="rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-white transition hover:bg-deep"
                  >
                    Log Deep Dive
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(updateOptimizationTask(schedule, deepDiveTask.id, !deepDiveTask.completed, workDateTimestamp))}
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
                <ListChecks className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-extrabold text-ink">Work Due For {formatDateLabel(workDate)}</h3>
              </div>
              <p className="mt-1 text-sm text-steel">This is the work that still needs attention for the selected date and cadence window.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-extrabold ${dueWork.length ? "bg-orange-100 text-orange-900" : "bg-emerald-100 text-emerald-800"}`}>
              {dueWork.length ? `${dueWork.length} due` : "Clear"}
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-4">
            {dueWork.length ? (
              <div className="grid gap-2">
                {dueWork.map((task) => (
                  <div key={task.id} className={`rounded-lg border px-3 py-3 ${isDeepDiveTask(task.title) ? "border-orange-200 bg-orange-50" : "border-line bg-warm/50"}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-ink">{task.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">
                            {cadenceLabels[task.cadence]}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">
                            {task.category}
                          </span>
                          {task.timing ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-steel ring-1 ring-line">
                              {task.timing}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChange(logOptimizationTaskCompletion(schedule, task.id, workDateTimestamp))}
                        className="shrink-0 rounded-md bg-brand px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-deep"
                      >
                        Log Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
                Nothing due for {formatDateLabel(workDate)}. This account is clear for the selected date.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        <button
          type="button"
          onClick={() => setCompletionLogOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-warm/50"
        >
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand" />
              <h3 className="text-lg font-extrabold text-ink">Completion Log</h3>
            </div>
            <p className="mt-1 text-sm text-steel">
              {completionLogOpen ? "A dated audit trail of exactly what was completed for this client." : "Collapsed audit trail. Open it when you need the full history."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-warm px-3 py-1 text-xs font-extrabold text-steel">{completionEvents.length} entries</span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink">
              <ChevronDown className={`h-4 w-4 transition ${completionLogOpen ? "rotate-180" : ""}`} />
            </span>
          </div>
        </button>
        {completionLogOpen ? (
          <div className="max-h-[380px] overflow-y-auto border-t border-line p-4">
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
                            <div className="flex shrink-0 items-center gap-2">
                              <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 ring-1 ring-emerald-200">
                                {formatCompletedAt(event.completedAt)}
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove completion for ${event.task.title}`}
                                onClick={() => onChange(removeOptimizationTaskCompletion(schedule, event.task.id, event.completedAt))}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
                Nothing logged yet. Click Log Work or check off a task to start building the client history.
              </div>
            )}
          </div>
        ) : null}
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
                    onChange={(event) => onChange(updateOptimizationTask(schedule, task.id, event.target.checked, workDateTimestamp))}
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
                    onClick={() => onChange(logOptimizationTaskCompletion(schedule, task.id, workDateTimestamp))}
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

function getWorkDueForDate(tasks: OptimizationTask[], dateValue: string) {
  const date = parseDateInput(dateValue);
  return sortOptimizationTasks(tasks.filter((task) => isTaskDueForDate(task, date))).sort((a, b) => cadenceRank(a.cadence) - cadenceRank(b.cadence));
}

function isTaskDueForDate(task: OptimizationTask, date: Date) {
  const history = task.completionHistory ?? [];
  if (task.cadence === "daily") return !history.some((completedAt) => isSameDay(new Date(completedAt), date));
  if (task.cadence === "weekly") {
    const timingDay = getTimingDay(task.timing);
    if (timingDay !== null && date.getDay() < timingDay) return false;
    return !history.some((completedAt) => isSameWeek(new Date(completedAt), date));
  }
  if (task.cadence === "monthly") return isFirstHalfOfMonth(date) && !history.some((completedAt) => isSameMonth(new Date(completedAt), date));
  if (task.cadence === "quarterly") return isFirstHalfOfQuarter(date) && !history.some((completedAt) => isSameQuarter(new Date(completedAt), date));
  return false;
}

function getTimingDay(timing?: string) {
  const normalized = timing?.toLowerCase() ?? "";
  if (normalized.includes("monday")) return 1;
  if (normalized.includes("tuesday")) return 2;
  if (normalized.includes("wednesday")) return 3;
  if (normalized.includes("thursday")) return 4;
  if (normalized.includes("friday")) return 5;
  return null;
}

function cadenceRank(cadence: OptimizationCadence) {
  return { daily: 0, weekly: 1, monthly: 2, quarterly: 3 }[cadence];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameWeek(a: Date, b: Date) {
  const startA = startOfWeek(a);
  const startB = startOfWeek(b);
  return isSameDay(startA, startB);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameQuarter(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && Math.floor(a.getMonth() / 3) === Math.floor(b.getMonth() / 3);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isFirstHalfOfMonth(date: Date) {
  return date.getDate() <= 15;
}

function isFirstHalfOfQuarter(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  const quarterStart = new Date(date.getFullYear(), quarterStartMonth, 1);
  const daysSinceQuarterStart = Math.floor((date.getTime() - quarterStart.getTime()) / 86400000);
  return daysSinceQuarterStart <= 45;
}

function parseDateInput(dateValue: string) {
  if (!dateValue) return new Date();
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseDateInput(dateValue));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toWorkDateTimestamp(dateValue: string) {
  if (!dateValue) return new Date().toISOString();
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0).toISOString();
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
