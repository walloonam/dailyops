import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import TaskForm, { TaskFormValues } from "../components/TaskForm";
import { FilterIcon, XIcon } from "../components/Icons";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date?: string | null;
  end_date?: string | null;
  tags?: string[];
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
  return start || end || "-";
}

export default function Tasks() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const limit = 10;

  const statusOptions = [
    { value: "", label: "전체" },
    { value: "todo", label: "대기" },
    { value: "in_progress", label: "진행 중" },
    { value: "done", label: "완료" }
  ];
  const priorityOptions = [
    { value: "", label: "전체" },
    { value: "low", label: "낮음" },
    { value: "medium", label: "보통" },
    { value: "high", label: "높음" }
  ];

  const { data } = useQuery({
    queryKey: ["tasks", q, status, priority, tag, sort, order, page],
    queryFn: () =>
      api<Task[]>(
        `/api/v1/tasks?q=${encodeURIComponent(q)}&status=${status}&priority=${priority}&tag=${encodeURIComponent(
          tag
        )}&sort=${sort}&order=${order}&page=${page}&limit=${limit}`
      )
  });

  const create = useMutation({
    mutationFn: (payload: TaskFormValues) =>
      api<Task>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          start_date: payload.start_date || payload.end_date || null,
          end_date: payload.end_date || payload.start_date || null,
          tags: payload.tags ? payload.tags.split(",").map((t) => t.trim()) : []
        })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] })
  });

  const handleCreate = (values: TaskFormValues) => {
    create.mutate(values, {
      onSuccess: () => setShowCreate(false)
    });
  };

  return (
    <div className="grid gap-6">
      <div className="card grid gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <FilterIcon className="h-4 w-4" />
            필터
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              className="border p-2 rounded-xl w-44"
              placeholder="검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <input
              className="border p-2 rounded-xl w-32"
              placeholder="태그"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <button className="btn-primary" onClick={() => setShowCreate(true)} type="button">
              + 업무 만들기
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 mr-1">상태</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${status === opt.value ? "border-sky-400 text-sky-600 bg-sky-50" : "chip-muted"}`}
              onClick={() => {
                setStatus(opt.value);
                setPage(1);
              }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 mr-1">우선순위</span>
          {priorityOptions.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${priority === opt.value ? "border-emerald-400 text-emerald-600 bg-emerald-50" : "chip-muted"}`}
              onClick={() => {
                setPriority(opt.value);
                setPage(1);
              }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="border p-2 rounded-xl" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created_at">정렬: 생성일</option>
            <option value="end_date">정렬: 기간</option>
          </select>
          <select className="border p-2 rounded-xl" value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">순서: 최신</option>
            <option value="asc">순서: 오래된</option>
          </select>
        </div>
      </div>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">업무 목록</h2>
          <button className="text-sm text-slate-500 hover:text-slate-800" onClick={() => setShowCreate(true)} type="button">
            + 업무
          </button>
        </div>
        <div className="hidden md:grid grid-cols-5 gap-2 text-xs text-slate-400 pb-2">
          <div>제목</div>
          <div>상태</div>
          <div>우선순위</div>
          <div>기간</div>
          <div>이동</div>
        </div>
        <div className="grid gap-2">
          {(data || []).map((t) => (
            <Link
              key={t.id}
              to={`/tasks/${t.id}`}
              className="border border-slate-200/70 rounded-xl p-3 hover:bg-white hover:shadow-sm transition"
            >
              <div className="grid md:grid-cols-5 gap-2 items-start">
                <div className="font-medium">{t.title}</div>
                <div className="text-sm text-slate-500">
                  <span className="chip chip-muted">{statusLabel[t.status] || t.status}</span>
                </div>
                <div className="text-sm text-slate-500">
                  <span className="chip chip-muted">{priorityLabel[t.priority] || t.priority}</span>
                </div>
                <div className="text-sm text-slate-500">{formatRange(t.start_date, t.end_date)}</div>
                <div className="text-sm text-slate-500 md:text-right">상세 보기</div>
              </div>
              <div className="md:hidden flex gap-2 mt-2 text-xs text-slate-500">
                <span className="chip chip-muted">{formatRange(t.start_date, t.end_date)}</span>
                {t.tags?.slice(0, 2).map((tg) => (
                  <span key={tg} className="chip chip-muted">
                    #{tg}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            className="border border-slate-200/70 rounded-lg px-3 py-1 text-sm disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </button>
          <div className="text-sm text-slate-500">페이지 {page}</div>
          <button
            className="border border-slate-200/70 rounded-lg px-3 py-1 text-sm"
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur">
          <div className="card w-full max-w-lg relative">
            <button
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              onClick={() => setShowCreate(false)}
              type="button"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold mb-3">업무 추가</h3>
            <TaskForm onSubmit={handleCreate} />
          </div>
        </div>
      )}
    </div>
  );
}
