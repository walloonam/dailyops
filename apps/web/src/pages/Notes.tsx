import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import NoteForm, { NoteFormValues } from "../components/NoteForm";
import { XIcon } from "../components/Icons";

type Note = {
  id: string;
  title: string;
  created_at: string;
  tags?: string[];
};

export default function Notes() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api<Note[]>("/api/v1/notes")
  });

  const create = useMutation({
    mutationFn: (payload: NoteFormValues) =>
      api<Note>("/api/v1/notes", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          tags: payload.tags ? payload.tags.split(",").map((t) => t.trim()) : []
        })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] })
  });

  const handleCreate = (values: NoteFormValues) => {
    create.mutate(values, {
      onSuccess: () => setShowCreate(false)
    });
  };

  return (
    <div className="grid gap-6">
      <div className="card flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">노트</h2>
          <p className="text-sm text-slate-500">생성 버튼을 누르면 중앙 오버레이로 열립니다.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)} type="button">
          새 노트 만들기
        </button>
      </div>

      <section className="card">
        <h3 className="text-lg font-semibold mb-3">노트 목록</h3>
        <div className="grid gap-2">
          {(data || []).map((n) => (
            <Link
              key={n.id}
              to={`/notes/${n.id}`}
              className="border border-slate-200/70 rounded-xl p-3 hover:bg-white hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(n.created_at).toLocaleDateString()} 작성
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {n.tags?.slice(0, 3).map((tg) => (
                    <span key={tg} className="chip chip-muted">
                      #{tg}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-sm text-slate-500 mt-2">노트를 눌러 상세를 확인하세요.</div>
            </Link>
          ))}
          {data?.length === 0 && <div className="text-sm text-slate-500">노트가 없습니다.</div>}
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
            <h3 className="text-lg font-semibold mb-3">노트 추가</h3>
            <NoteForm onSubmit={handleCreate} />
          </div>
        </div>
      )}
    </div>
  );
}
