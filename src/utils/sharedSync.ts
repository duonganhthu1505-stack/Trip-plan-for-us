import type { AppData } from '../types';

const TOKEN_KEY = 'our_travel_planner_shared_session_v1';

export function getSharedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setSharedToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch {}
}
async function request(init?: RequestInit) {
  const response = await fetch('/api/sync', {
    ...init,
    headers: { 'content-type': 'application/json', ...(getSharedToken() ? { authorization: `Bearer ${getSharedToken()}` } : {}), ...(init?.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error || 'SYNC_ERROR') as Error & { state?: any };
    error.state = body?.state;
    throw error;
  }
  return body;
}
export async function loginSharedPassword(password: string) {
  const body = await request({ method: 'POST', body: JSON.stringify({ action: 'login', password }) });
  if (!body.token) return false;
  setSharedToken(body.token);
  return true;
}
export function logoutSharedSession() { setSharedToken(null); }
export async function fetchSharedState(): Promise<{ data: AppData; revision: number } | null> {
  const body = await request({ method: 'GET' });
  return body.state ?? null;
}
export async function saveSharedState(data: AppData, revision: number) {
  const body = await request({ method: 'PUT', body: JSON.stringify({ data, revision }) });
  return Number(body.revision || revision);
}
export async function changeSharedPassword(newPassword: string) {
  const body = await request({ method: 'POST', body: JSON.stringify({ action: 'change-password', newPassword }) });
  if (body.token) setSharedToken(body.token);
}
export function clearSharedSession() { setSharedToken(null); }
