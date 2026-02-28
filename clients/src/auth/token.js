const KEY = "ckvs_token";

export function setToken(token) {
  localStorage.setItem(KEY, token);
  // Keep legacy key in sync for existing code paths/session data.
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem(KEY) || localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("token");
}

export function isLoggedIn() {
  return !!getToken();
}
