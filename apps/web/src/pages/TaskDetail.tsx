import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import TaskForm, { TaskFormValues } from "../components/TaskForm";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  start_date?: string | null;
  end_date?: string | null;
  tags: string[];
};

const statusLabel: Record<string, string> = {
  todo: "대기",
  in_progress: "진행 중",
  done: "완료"
};

const priorityLabel: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음"
};

function formatRange(start?: string | null, end?: string | null) {
  if (start && end) {
    if (start === end) return start;
    return `${start} ~ ${end}`;
  }
  return start || end || "마감 없음";
}

export default function TaskDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["task", id],
    queryFn: () => api<Task>(`/api/v1/tasks/${id}`)
  });

  const update = useMutation({
    mutationFn: (payload: TaskFormValues) =>
      api(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          start_date: payload.start_date || payload.end_date || null,
          end_date: payload.end_date || payload.start_date || null,
          tags: payload.tags ? payload.tags.split(",").map((t) => t.trim()) : []
        })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", id] })
  });

  const del = useMutation({
    mutationFn: () => api(`/api/v1/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => nav("/tasks")
  });

  if (!data) return null;

  return (
    <div className="grid gap-6">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">업무 상세</h1>
        <TaskForm
          initial={{
            title: data.title,
            description: data.description || "",
            status: data.status as any,
            priority: data.priority as any,
            start_date: data.start_date || "",
            end_date: data.end_date || "",
            tags: data.tags.join(", ")
          }}
          onSubmit={(v) => update.mutate(v)}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="chip chip-muted">{statusLabel[data.status] || data.status}</span>
          <span className="chip chip-muted">{priorityLabel[data.priority] || data.priority}</span>
          <span className="chip chip-muted">{formatRange(data.start_date, data.end_date)}</span>
        </div>
        <button className="mt-4 text-red-600" onClick={() => del.mutate()}>
          삭제
        </button>
      </div>
    </div>
  );
}
