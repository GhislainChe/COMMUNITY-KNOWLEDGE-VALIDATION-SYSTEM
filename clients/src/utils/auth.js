import { getToken as getAuthToken, clearToken } from "../auth/token";

export const getToken = () => {
  return getAuthToken();
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = () => {
  clearToken();
};
