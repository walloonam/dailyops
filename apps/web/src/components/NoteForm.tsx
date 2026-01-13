import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.string().optional()
});

export type NoteFormValues = z.infer<typeof schema>;

export default function NoteForm({
  initial,
  onSubmit
}: {
  initial?: Partial<NoteFormValues>;
  onSubmit: (values: NoteFormValues) => void;
}) {
  const { register, handleSubmit } = useForm<NoteFormValues>({
    defaultValues: initial
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <input className="border p-2 rounded-xl" placeholder="제목" {...register("title")} />
      <textarea className="border p-2 rounded-xl min-h-[180px]" placeholder="내용" {...register("content")} />
      <input className="border p-2 rounded-xl" placeholder="태그 (쉼표로 구분)" {...register("tags")} />
      <button className="btn-primary justify-center" type="submit">
        저장
      </button>
    </form>
  );
}
