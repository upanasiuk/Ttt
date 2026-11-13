let token = localStorage.getItem("token");

export function getToken() { return token; }
export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

function buildHeaders(opts) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleAuthHeaders(res) {
  const newToken = res.headers.get("X-Refresh-Token");
  if (newToken) setToken(newToken);
}

function expireSession() {
  setToken(null);
  window.dispatchEvent(new CustomEvent("auth:expired"));
}

async function parseError(res) {
  let errMsg = await res.text();
  try {
    const errObj = JSON.parse(errMsg);
    if (errObj.detail) errMsg = errObj.detail;
  } catch (e) {}
  return errMsg || `Ошибка ${res.status}`;
}

export async function api(path, opts = {}) {
  const headers = buildHeaders(opts);

  try {
    const res = await fetch(path, { ...opts, headers });

    handleAuthHeaders(res);

    if (res.status === 401) {
      expireSession();
      throw new Error("Сессия истекла. Войдите заново.");
    }

    if (!res.ok) {
      throw new Error(await parseError(res));
    }
    return await res.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Нет соединения с сервером");
    }
    throw err;
  }
}

export async function apiDownload(path) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(path, { headers });

    handleAuthHeaders(res);

    if (res.status === 401) {
      expireSession();
      throw new Error("Сессия истекла. Войдите заново.");
    }
    if (!res.ok) {
      throw new Error(await parseError(res));
    }
    return await res.blob();
  } catch (err) {
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Нет соединения с сервером");
    }
    throw err;
  }
}