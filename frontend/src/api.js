let token = localStorage.getItem("token");

export function getToken() { return token; }
export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, { headers, ...opts });

  const newToken = res.headers.get("X-Refresh-Token");
  if (newToken) setToken(newToken);

  if (res.status === 401) {
    setToken(null);
    window.location.reload(); // Перезагрузка для сброса сессии
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let errMsg = await res.text();
    try { const errObj = JSON.parse(errMsg); if (errObj.detail) errMsg = errObj.detail; } catch(e) {}
    throw new Error(errMsg);
  }
  return res.json();
}