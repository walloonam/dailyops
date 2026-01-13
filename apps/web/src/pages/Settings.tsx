import { useNavigate } from "react-router-dom";
import { clearAuth, getEmail } from "../lib/auth";

export default function Settings() {
  const nav = useNavigate();
  return (
    <div className="card max-w-md">
      <h1 className="text-xl font-semibold mb-3">설정</h1>
      <div className="text-sm text-slate-500 mb-4">이메일: {getEmail() || "-"}</div>
      <button
        className="bg-ink text-white rounded-xl py-2 px-3"
        onClick={() => {
          clearAuth();
          nav("/login");
        }}
      >
        로그아웃
      </button>
    </div>
  );
}
