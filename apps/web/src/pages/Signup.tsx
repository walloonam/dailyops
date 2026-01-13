import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth";

export default function Signup() {
  const nav = useNavigate();
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    try {
      const res = await api<{ token: string }>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setAuth(res.token, email);
      nav("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={onSubmit} className="bg-white/90 p-8 rounded-2xl border border-slate-200/70 w-[360px] grid gap-3 shadow-sm">
        <h1 className="text-2xl font-semibold">회원가입</h1>
        <div className="text-sm text-slate-500">오늘부터 정리해볼까요?</div>
        <input name="email" type="email" className="border p-2 rounded-xl" placeholder="이메일" />
        <input name="password" type="password" className="border p-2 rounded-xl" placeholder="비밀번호" />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button className="bg-ink text-white rounded-xl py-2">계정 만들기</button>
        <Link to="/login" className="text-sm text-slate-500">이미 계정이 있나요?</Link>
      </form>
    </div>
  );
}
