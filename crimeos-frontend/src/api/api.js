import axios from "axios";

export const apiBackend = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

export const apiBrain = axios.create({
  baseURL: import.meta.env.VITE_BRAIN_URL,
});

// Attach the stored session token (if any) to every backend request.
// Login/Register set localStorage['trinetra_token']; logout clears it.
apiBackend.interceptors.request.use((config) => {
  const token = localStorage.getItem("trinetra_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiBackend;