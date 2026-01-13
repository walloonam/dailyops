import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { AlertIcon, CheckIcon, ClockIcon, SparkleIcon } from "../components/Icons";

type Task = {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
};

type Summary = {
  total_tasks: number;
  due_today: number;
  overdue: number;
  done_this_week: number;
  recent_tasks: Task[];
};

export default function Dashboard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["summary"],
    queryFn: () => api<Summary>("/api/v1/dashboard/summary")
  });

  const update = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      api(`/api/v1/tasks/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: input.status })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["summary"] })
  });

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "전체 업무", value: data?.total_tasks ?? 0, icon: SparkleIcon, tone: "bg-sky-50 text-sky-500" },
          { label: "오늘 마감", value: data?.due_today ?? 0, icon: ClockIcon, tone: "bg-emerald-50 text-emerald-500" },
          { label: "지연", value: data?.overdue ?? 0, icon: AlertIcon, tone: "bg-rose-50 text-rose-500" },
          { label: "이번 주 완료", value: data?.done_this_week ?? 0, icon: CheckIcon, tone: "bg-indigo-50 text-indigo-500" }
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">{k.label}</div>
                <div className="text-2xl font-semibold">{k.value}</div>
              </div>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${k.tone}`}>
                <Icon />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="text-lg font-semibold mb-3">오늘 할 일</h2>
          <div className="grid gap-2">
            {(data?.recent_tasks || []).slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between border border-slate-200/70 rounded-xl p-2">
                <div className="text-sm">{t.title}</div>
                <select
                  className="border rounded-lg text-sm"
                  value={t.status}
                  onChange={(e) => update.mutate({ id: t.id, status: e.target.value })}
                >
                  <option value="todo">할 일</option>
                  <option value="in_progress">진행 중</option>
                  <option value="done">완료</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold mb-3">최근 활동</h2>
          <div className="grid gap-2">
            {(data?.recent_tasks || []).map((t) => (
              <div key={t.id} className="text-sm border-b border-slate-200/70 pb-2 flex items-center justify-between">
                <span>{t.title}</span>
                <span className="chip chip-muted">수정됨</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
