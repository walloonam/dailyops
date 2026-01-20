ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE tasks
SET start_date = COALESCE(start_date, due_date),
    end_date = COALESCE(end_date, due_date)
WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
