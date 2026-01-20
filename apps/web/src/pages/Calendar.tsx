import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

type Task = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
};

type DayTask = {
  id: string;
  title: string;
  isStart: boolean;
  isEnd: boolean;
};

function toDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default function Calendar() {
  const { data } = useQuery({
    queryKey: ["tasks", "calendar"],
    queryFn: () => api<Task[]>("/api/v1/tasks?limit=200")
  });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = Array.from({ length: last.getDate() }, (_, i) => i + 1);
  const startDay = first.getDay();

  const tasksByDate = useMemo(() => {
    const map = new Map<string, DayTask[]>();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const sorted = [...(data || [])].sort((a, b) => {
      const aStart = a.start_date || a.end_date || "";
      const bStart = b.start_date || b.end_date || "";
      return aStart.localeCompare(bStart) || a.title.localeCompare(b.title);
    });

    for (const task of sorted) {
      const startStr = task.start_date || task.end_date;
      const endStr = task.end_date || task.start_date;
      if (!startStr || !endStr) continue;

      const start = toDate(startStr);
      const end = toDate(endStr);
      const rangeStart = start < monthStart ? monthStart : start;
      const rangeEnd = end > monthEnd ? monthEnd : end;

      for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
        const key = formatDate(d);
        const list = map.get(key) || [];
        list.push({
          id: task.id,
          title: task.title,
          isStart: formatDate(d) === startStr,
          isEnd: formatDate(d) === endStr
        });
        map.set(key, list);
      }
    }

    return map;
  }, [data, year, month]);

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
            <div key={d} className="border border-slate-200/70 rounded-xl p-2 min-h-[96px]">
              <div className="text-xs text-slate-500">{d}</div>
              <div className="mt-1 grid gap-1">
                {items.slice(0, 3).map((t) => (
                  <div
                    key={`${t.id}-${dateStr}`}
                    className={`text-xs text-white px-2 py-0.5 bg-slate-900/80 ${
                      t.isStart ? "rounded-l-md" : "rounded-l-none"
                    } ${t.isEnd ? "rounded-r-md" : "rounded-r-none"}`}
                    title={t.title}
                  >
                    {t.isStart ? t.title : ""}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
