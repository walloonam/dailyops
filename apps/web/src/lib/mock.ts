type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string | null;
  end_date?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

let taskSeed = 4;
let noteSeed = 3;

const nowIso = () => new Date().toISOString();
const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const today = new Date().toISOString().slice(0, 10);
const twoDaysLater = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

const tasks: Task[] = [
  {
    id: "t-1",
    title: "Inbox triage",
    description: "Sort quick wins and block tasks",
    status: "todo",
    priority: "medium",
    start_date: today,
    end_date: today,
    tags: ["inbox", "ops"],
    created_at: nowIso(),
    updated_at: nowIso()
  },
  {
    id: "t-2",
    title: "Weekly review",
    description: "Review outcomes and plan next steps",
    status: "in_progress",
    priority: "high",
    start_date: today,
    end_date: twoDaysLater,
    tags: ["planning"],
    created_at: nowIso(),
    updated_at: nowIso()
  },
  {
    id: "t-3",
    title: "Refactor dashboard cards",
    description: "Clean up KPI layout and spacing",
    status: "done",
    priority: "low",
    start_date: null,
    end_date: null,
    tags: ["ui"],
    created_at: nowIso(),
    updated_at: nowIso()
  }
];

const notes: Note[] = [
  {
    id: "n-1",
    title: "My day ideas",
    content: "- Focus on top 3 tasks\n- Keep meetings short",
    tags: ["personal"],
    created_at: nowIso(),
    updated_at: nowIso()
  },
  {
    id: "n-2",
    title: "Project notes",
    content: "Remember to update the task filters.",
    tags: ["work"],
    created_at: nowIso(),
    updated_at: nowIso()
  }
];

export function listTasks(params: URLSearchParams) {
  let result = [...tasks];
  const q = params.get("q");
  const status = params.get("status");
  const priority = params.get("priority");
  const tag = params.get("tag");
  const sort = params.get("sort") || "created_at";
  const order = params.get("order") || "desc";
  const page = Number(params.get("page") || "1");
  const limit = Number(params.get("limit") || "10");

  if (q) {
    const qq = q.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(qq) ||
        (t.description || "").toLowerCase().includes(qq)
    );
  }
  if (status) {
    result = result.filter((t) => t.status === status);
  }
  if (priority) {
    result = result.filter((t) => t.priority === priority);
  }
  if (tag) {
    result = result.filter((t) => t.tags.includes(tag));
  }

  result.sort((a, b) => {
    const aVal = sort === "end_date" ? a.end_date || "" : a.created_at;
    const bVal = sort === "end_date" ? b.end_date || "" : b.created_at;
    if (aVal === bVal) return 0;
    const cmp = aVal > bVal ? 1 : -1;
    return order === "asc" ? cmp : -cmp;
  });

  const start = (page - 1) * limit;
  return result.slice(start, start + limit);
}

export function getTask(id: string) {
  return tasks.find((t) => t.id === id) || null;
}

export function createTask(input: Partial<Task>) {
  const task: Task = {
    id: `t-${taskSeed++}-${makeId()}`,
    title: input.title || "Untitled",
    description: input.description || null,
    status: (input.status as TaskStatus) || "todo",
    priority: (input.priority as TaskPriority) || "medium",
    start_date: input.start_date || input.end_date || null,
    end_date: input.end_date || input.start_date || null,
    tags: input.tags || [],
    created_at: nowIso(),
    updated_at: nowIso()
  };
  tasks.unshift(task);
  return task;
}

export function updateTask(id: string, input: Partial<Task>) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  Object.assign(task, input, { updated_at: nowIso() });
  return task;
}

export function deleteTask(id: string) {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  return true;
}

export function listNotes() {
  return [...notes];
}

export function getNote(id: string) {
  return notes.find((n) => n.id === id) || null;
}

export function createNote(input: Partial<Note>) {
  const note: Note = {
    id: `n-${noteSeed++}-${makeId()}`,
    title: input.title || "Untitled",
    content: input.content || "",
    tags: input.tags || [],
    created_at: nowIso(),
    updated_at: nowIso()
  };
  notes.unshift(note);
  return note;
}

export function updateNote(id: string, input: Partial<Note>) {
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  Object.assign(note, input, { updated_at: nowIso() });
  return note;
}

export function deleteNote(id: string) {
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  notes.splice(idx, 1);
  return true;
}

export function summary() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const total_tasks = tasks.length;
  const due_today = tasks.filter((t) => {
    const start = t.start_date || t.end_date;
    const end = t.end_date || t.start_date;
    if (!start || !end) return false;
    return start <= todayStr && end >= todayStr;
  }).length;
  const overdue = tasks.filter((t) => {
    if (t.status === "done") return false;
    const end = t.end_date || t.start_date;
    return end ? end < todayStr : false;
  }).length;
  const done_this_week = tasks.filter((t) => {
    if (t.status !== "done") return false;
    return new Date(t.updated_at) >= sevenDaysAgo;
  }).length;

  const recent_tasks = [...tasks].sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1)).slice(0, 10);

  return { total_tasks, due_today, overdue, done_this_week, recent_tasks };
}

export function aiReply(input: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueToday = tasks.filter((t) => {
    const start = t.start_date || t.end_date;
    const end = t.end_date || t.start_date;
    if (!start || !end) return false;
    return start <= todayStr && end >= todayStr;
  });
  const topPriorities = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const prioRank = (p: TaskPriority) => (p === "high" ? 0 : p === "medium" ? 1 : 2);
      return prioRank(a.priority) - prioRank(b.priority);
    })
    .slice(0, 3);

  const noteTitles = notes.slice(0, 3).map((n) => n.title);

  const lines = [];
  lines.push(`질문: ${input}`);
  lines.push(`오늘(${todayStr}) 일정 ${dueToday.length}건`);
  dueToday.forEach((t) => lines.push(`- ${t.title} (${t.priority})`));
  lines.push(`우선순위 Top3: ${topPriorities.map((t) => `${t.title}(${t.priority})`).join(", ")}`);
  if (noteTitles.length) {
    lines.push(`최근 노트: ${noteTitles.join(", ")}`);
  }
  lines.push("모델 응답을 모킹했습니다.");
  return lines.join("\n");
}
