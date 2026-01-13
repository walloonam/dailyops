import { getToken } from "./auth";
import {
  createNote,
  createTask,
  deleteNote,
  deleteTask,
  getNote,
  getTask,
  listNotes,
  listTasks,
  aiReply,
  summary,
  updateNote,
  updateTask
} from "./mock";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MOCK = import.meta.env.VITE_MOCK === "true";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (MOCK) {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(String(options.body)) : null;
    const url = new URL(`http://local${path}`);

    if (path.startsWith("/api/v1/auth/")) {
      return { token: "mock-token" } as T;
    }
    if (path.startsWith("/api/v1/dashboard/summary")) {
      return summary() as T;
    }
    if (path.startsWith("/api/v1/ai/chat")) {
      return { reply: aiReply(body?.message || "") } as T;
    }
    if (path.startsWith("/api/v1/tasks")) {
      if (path === "/api/v1/tasks" && method === "GET") {
        return listTasks(url.searchParams) as T;
      }
      if (path === "/api/v1/tasks" && method === "POST") {
        return createTask(body || {}) as T;
      }
      const id = path.split("/").pop() || "";
      if (method === "GET") return getTask(id) as T;
      if (method === "PATCH") return updateTask(id, body || {}) as T;
      if (method === "DELETE") {
        deleteTask(id);
        return {} as T;
      }
    }
    if (path.startsWith("/api/v1/notes")) {
      if (path === "/api/v1/notes" && method === "GET") {
        return listNotes() as T;
      }
      if (path === "/api/v1/notes" && method === "POST") {
        return createNote(body || {}) as T;
      }
      const id = path.split("/").pop() || "";
      if (method === "GET") return getNote(id) as T;
      if (method === "PATCH") return updateNote(id, body || {}) as T;
      if (method === "DELETE") {
        deleteNote(id);
        return {} as T;
      }
    }

    return {} as T;
  }

  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}
