import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";
import NoteForm, { NoteFormValues } from "../components/NoteForm";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

export default function NoteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["note", id],
    queryFn: () => api<Note>(`/api/v1/notes/${id}`)
  });

  const update = useMutation({
    mutationFn: (payload: NoteFormValues) =>
      api(`/api/v1/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          tags: payload.tags ? payload.tags.split(",").map((t) => t.trim()) : []
        })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note", id] })
  });

  const del = useMutation({
    mutationFn: () => api(`/api/v1/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => nav("/notes")
  });

  if (!data) return null;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="card">
        <h1 className="text-xl font-semibold mb-3">노트 수정</h1>
        <NoteForm
          initial={{
            title: data.title,
            content: data.content,
            tags: data.tags.join(", ")
          }}
          onSubmit={(v) => update.mutate(v)}
        />
        <button className="mt-4 text-red-600" onClick={() => del.mutate()}>
          삭제
        </button>
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold mb-3">미리보기</h2>
        <div className="prose max-w-none">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
