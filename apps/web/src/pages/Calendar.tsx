import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

type Task = {
  id: string;
  title: string;
  due_date?: string | null;
};

export default function Calendar() {
  const { data } = useQuery({
    queryKey: ["tasks", "calendar"],
    queryFn: () => api<Task[]>("/api/v1/tasks")
  });

  const tasksByDate = new Map<string, Task[]>();
  (data || []).forEach((t) => {
    if (!t.due_date) return;
    const list = tasksByDate.get(t.due_date) || [];
    list.push(t);
    tasksByDate.set(t.due_date, list);
  });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = Array.from({ length: last.getDate() }, (_, i) => i + 1);
  const startDay = first.getDay();

  return (
    <div className="card">
      <h1 className="text-xl font-semibold mb-4">캘린더</h1>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-slate-500">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mt-2">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((d) => {
          const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
          const items = tasksByDate.get(dateStr) || [];
          return (
            <div key={d} className="border border-slate-200/70 rounded-xl p-2 min-h-[80px]">
              <div className="text-xs text-slate-500">{d}</div>
              <div className="mt-1 grid gap-1">
                {items.slice(0, 3).map((t) => (
                  <div key={t.id} className="text-xs truncate">{t.title}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
