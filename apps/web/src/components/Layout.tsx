import { NavLink, Outlet } from "react-router-dom";
import { getEmail } from "../lib/auth";

import { CalendarIcon, ChatIcon, NoteIcon, SettingsIcon, SparkleIcon, TaskIcon } from "./Icons";

const navItems = [
  { to: "/", label: "대시보드", icon: SparkleIcon },
  { to: "/assistant", label: "비서", icon: ChatIcon },
  { to: "/tasks", label: "업무", icon: TaskIcon },
  { to: "/calendar", label: "캘린더", icon: CalendarIcon },
  { to: "/notes", label: "노트", icon: NoteIcon },
  { to: "/settings", label: "설정", icon: SettingsIcon }
];

export default function Layout() {
  return (
    <div className="app-shell flex">
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-200/60 p-6 bg-white/85 backdrop-blur shadow-[0_10px_40px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight">DailyOps</div>
            <div className="text-xs text-slate-500 mt-1">개인 업무 대시보드</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-slate-900">
            Live
          </span>
        </div>
        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl transition flex items-center gap-2 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col relative z-10">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200/60 bg-white/80 backdrop-blur sticky top-0">
          <div className="font-semibold text-lg">오늘의 일정</div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="chip">온라인</span>
            <div className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
              {getEmail() || "user@local"}
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6 fade-in max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
        <div className="md:hidden flex border-t border-slate-200/60 bg-white/80 backdrop-blur">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 text-center py-3 text-sm ${
                  isActive ? "font-semibold text-slate-900" : "text-slate-500"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
