const TOKEN_KEY = "dailyops_token";
const EMAIL_KEY = "dailyops_email";
const MOCK = import.meta.env.VITE_MOCK === "true";

export function setAuth(token: string, email: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function getToken() {
  if (MOCK) return "mock-token";
  return localStorage.getItem(TOKEN_KEY);
}

export function getEmail() {
  if (MOCK) return "mock@local";
  return localStorage.getItem(EMAIL_KEY);
}

export function isAuthed() {
  if (MOCK) return true;
  return Boolean(getToken());
}
