import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getEmail } from "../lib/auth";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  reply: string;
};

const QUICK_PROMPTS = [
  "오늘 브리핑",
  "이번 주 우선순위 정리",
  "노트 요약",
  "업무 등록: 회의 준비 2024-12-01"
];

const HISTORY_KEY = "dailyops_assistant_history";

function loadHistory(): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  const email = getEmail() || "anon";
  const raw = localStorage.getItem(`${HISTORY_KEY}:${email}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ChatMessage[];
  } catch {
    return null;
  }
  return null;
}

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return (
      loadHistory() || [
        {
          role: "assistant",
          content: "질문하거나 브리핑을 요청하거나 업무를 등록해 보세요."
        }
      ]
    );
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (content: string) =>
      api<ChatResponse>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: content })
      }),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (err) => {
      setMessages((prev) => [...prev, { role: "assistant", content: `에러: ${String(err)}` }]);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const email = getEmail() || "anon";
    const trimmed = messages.slice(-50);
    localStorage.setItem(`${HISTORY_KEY}:${email}`, JSON.stringify(trimmed));
  }, [messages]);

  const isSending = mutation.isPending;

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isSending) return;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    mutation.mutate(content);
  };

  const placeholder = useMemo(
    () =>
      isSending
        ? "답변 생성 중..."
        : "예: 오늘 브리핑 / 업무 등록: 회의 준비 2024-12-01",
    [isSending]
  );

  return (
    <div className="grid gap-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AI 비서</h1>
          <p className="text-sm text-slate-500">
            업무/노트를 기반으로 브리핑과 업무 등록을 도와줍니다.
          </p>
        </div>
        <div className="flex gap-2">
          {QUICK_PROMPTS.map((q) => (
            <button key={q} className="chip chip-muted hover:border-slate-300" onClick={() => sendMessage(q)} type="button">
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="card grid gap-4">
        <div ref={scrollRef} className="max-h-[60vh] overflow-auto pr-1">
          <div className="grid gap-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl ${
                  m.role === "assistant"
                    ? "bg-slate-50 border border-slate-200/70"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white ml-auto max-w-[80%]"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">{m.role === "assistant" ? "비서" : "나"}</div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 border border-slate-200/70 rounded-xl px-3 py-2"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isSending}
          />
          <button className="btn-primary" onClick={() => sendMessage()} disabled={isSending} type="button">
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
