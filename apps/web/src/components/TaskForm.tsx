import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  tags: z.string().optional()
});

export type TaskFormValues = z.infer<typeof schema>;

export default function TaskForm({
  initial,
  onSubmit
}: {
  initial?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => void;
}) {
  const { register, handleSubmit } = useForm<TaskFormValues>({
    defaultValues: {
      status: "todo",
      priority: "medium",
      ...initial
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <input className="border p-2 rounded-xl" placeholder="제목" {...register("title")} />
      <textarea className="border p-2 rounded-xl" placeholder="설명" {...register("description")} />
      <div className="grid grid-cols-2 gap-2">
        <select className="border p-2 rounded-xl" {...register("status")}>
          <option value="todo">대기</option>
          <option value="in_progress">진행 중</option>
          <option value="done">완료</option>
        </select>
        <select className="border p-2 rounded-xl" {...register("priority")}>
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="border p-2 rounded-xl" type="date" {...register("start_date")} />
        <input className="border p-2 rounded-xl" type="date" {...register("end_date")} />
      </div>
      <input className="border p-2 rounded-xl" placeholder="태그 (쉼표 구분)" {...register("tags")} />
      <button className="btn-primary justify-center" type="submit">
        저장
      </button>
    </form>
  );
}
