import * as XLSX from "xlsx";
import type { OptimizationCadence, OptimizationScheduleState, OptimizationTask } from "../types/models";

const defaultTasks: Array<Omit<OptimizationTask, "id" | "completed">> = [
  { cadence: "daily", category: "Bid Optimization", title: "Adjusting keyword/ASIN bids and placements during product launch" },
  { cadence: "daily", category: "Bid Optimization", title: "Tracking keyword rankings during product launch" },
  { cadence: "weekly", category: "Bid Optimization", timing: "Start of Week - Monday", title: "Adjusting bids for keywords/ASINs with low ACOS" },
  { cadence: "weekly", category: "Bid Optimization", title: "Adjusting bids for keywords/ASINs with high ACOS" },
  { cadence: "weekly", category: "Bid Optimization", title: "Adjusting bids for keywords/ASINs with low Impressions" },
  { cadence: "weekly", category: "Bid Optimization", title: "Adjusting bids for keywords/ASINs with high clicks, but no sales" },
  { cadence: "weekly", category: "Bid Optimization", timing: "Mid Week - Thursday", title: "Reviewing bid changes made at the beginning of the week" },
  { cadence: "weekly", category: "Bid Optimization", title: "Making additional bid changes only if something goes out of line" },
  { cadence: "weekly", category: "Campaign Optimization", title: "Adding negative keywords/ASINs" },
  { cadence: "weekly", category: "Campaign Optimization", title: "Adjusting search placement, business placement & audience modifiers" },
  { cadence: "weekly", category: "Campaign Optimization", title: "Graduating well performing keywords" },
  { cadence: "weekly", category: "Campaign Optimization", title: "Isolating high-sales keywords" },
  { cadence: "weekly", category: "Campaign Optimization", title: "Adjusting campaign budgets" },
  { cadence: "weekly", category: "Campaign Optimization", title: "Complete Ad Account Deep Dive" },
  { cadence: "monthly", category: "Campaign Optimization", title: "Expanding campaign structure by adding new match types (i.e. phrase, broad, etc.)" },
  { cadence: "monthly", category: "Campaign Optimization", title: "Expanding campaign structure by adding new campaign types (i.e. SB, SD)" },
  { cadence: "monthly", category: "Campaign Optimization", title: "Expanding campaign structure by adding new creatives (video, custom images)" },
  { cadence: "monthly", category: "Campaign Optimization", title: "Expanding campaign structure by adding additional lookback periods" },
  { cadence: "monthly", category: "Campaign Optimization", title: "Expanding campaign structure by adding new keywords groups (same word stem)" },
  { cadence: "monthly", category: "Creatives Optimization", title: "Split testing and adjusting video creatives" },
  { cadence: "monthly", category: "Creatives Optimization", title: "Split testing and adjusting custom image creatives" },
  { cadence: "monthly", category: "SEO Optimization", title: "(Possibly Done Monthly) Adjusting title, bullet points and A+ content" },
  { cadence: "quarterly", category: "SEO Optimization", title: "Adjusting title, bullet points and A+ content based on best converting keywords" },
  { cadence: "quarterly", category: "SEO Optimization", title: "Adjusting backend keywords based on best converting keywords" },
  { cadence: "quarterly", category: "SEO Optimization", title: "Adjusting images & graphics on product page to better match the customer avatar" },
  { cadence: "quarterly", category: "Additional Optimizations", title: "Implementing additional campaign optimization tactics such as dayparting" },
  { cadence: "quarterly", category: "Additional Optimizations", title: "Expanding keyword base by running a Reverse ASIN search on top 3 competitors" },
];

export const initialOptimizationScheduleState: OptimizationScheduleState = {
  tasks: defaultTasks.map((task) => ({ ...task, id: taskId(task.cadence, task.category, task.timing, task.title), completed: false, completedAt: null, completionHistory: [] })),
  importedAt: null,
  sourceName: "Default optimization framework",
};

const cadenceColumns: Record<OptimizationCadence, { done: number; timing?: number; title: number }> = {
  daily: { done: 2, title: 3 },
  weekly: { done: 8, timing: 9, title: 10 },
  monthly: { done: 14, timing: 15, title: 15 },
  quarterly: { done: 20, timing: 21, title: 21 },
};

export function normalizeOptimizationScheduleState(state?: Partial<OptimizationScheduleState> | null): OptimizationScheduleState {
  if (!state?.tasks?.length) return initialOptimizationScheduleState;
  return {
    importedAt: state.importedAt ?? null,
    sourceName: state.sourceName ?? "Optimization schedule",
    tasks: state.tasks
      .filter((task) => task.title?.trim())
      .map((task) => {
        const completionHistory = Array.from(new Set([...(task.completionHistory ?? []), ...(task.completedAt ? [task.completedAt] : [])])).sort();
        const completedAt = task.completed ? task.completedAt ?? completionHistory[completionHistory.length - 1] ?? null : null;
        return {
          id: task.id || taskId(task.cadence, task.category, task.timing, task.title),
          cadence: task.cadence,
          category: task.category || "Optimization",
          timing: task.timing || undefined,
          title: task.title,
          completed: Boolean(task.completed),
          completedAt,
          completionHistory,
        };
      }),
  };
}

export async function parseOptimizationScheduleFile(file: File): Promise<OptimizationScheduleState> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const tasks: OptimizationTask[] = [];
  let category = "Optimization";
  const importedAt = new Date().toISOString();

  rows.forEach((row) => {
    const maybeCategory = text(row[1]);
    if (maybeCategory && !["client", "optimization schedule"].includes(maybeCategory.toLowerCase())) {
      category = maybeCategory;
    }

    (Object.keys(cadenceColumns) as OptimizationCadence[]).forEach((cadence) => {
      const columns = cadenceColumns[cadence];
      const title = text(row[columns.title]);
      if (!title || title.toLowerCase().includes("actions performed")) return;
      const timing = columns.timing && columns.timing !== columns.title ? text(row[columns.timing]) : "";
      const completed = text(row[columns.done]).toLowerCase() === "true";
      tasks.push({
        id: taskId(cadence, category, timing, title),
        cadence,
        category,
        timing: timing || undefined,
        title,
        completed,
        completedAt: completed ? importedAt : null,
        completionHistory: completed ? [importedAt] : [],
      });
    });
  });

  return normalizeOptimizationScheduleState({
    tasks: tasks.length ? dedupeTasks(tasks) : initialOptimizationScheduleState.tasks,
    importedAt: new Date().toISOString(),
    sourceName: file.name,
  });
}

export function updateOptimizationTask(state: OptimizationScheduleState, taskIdToUpdate: string, completed: boolean, completedAtOverride?: string): OptimizationScheduleState {
  const completedAt = completedAtOverride ?? new Date().toISOString();
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskIdToUpdate
        ? {
            ...task,
            completed,
            completedAt: completed ? completedAt : null,
            completionHistory: completed && !task.completed ? [...(task.completionHistory ?? []), completedAt] : task.completionHistory ?? [],
          }
        : task,
    ),
  };
}

export function logOptimizationTaskCompletion(state: OptimizationScheduleState, taskIdToUpdate: string, completedAtOverride?: string): OptimizationScheduleState {
  const completedAt = completedAtOverride ?? new Date().toISOString();
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskIdToUpdate
        ? {
            ...task,
            completed: true,
            completedAt,
            completionHistory: [...(task.completionHistory ?? []), completedAt],
          }
        : task,
    ),
  };
}

function dedupeTasks(tasks: OptimizationTask[]) {
  return [...new Map(tasks.map((task) => [task.id, task])).values()];
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function taskId(cadence: string, category: string, timing: string | undefined, title: string) {
  return `${cadence}-${category}-${timing ?? ""}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
