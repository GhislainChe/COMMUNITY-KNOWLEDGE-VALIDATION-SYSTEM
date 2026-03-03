import axios from "axios";
import { getToken } from "../auth/token";

export const api = axios.create({
  baseURL: "https://ckvs-backend.onrender.com/api",
  withCredentials: true,
});

// Add token automatically to every request
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
