import axios from "axios";

export const apiBackend = axios.create({
  baseURL: "http://localhost:3000",
});

export const apiBrain = axios.create({
  baseURL: "http://localhost:3001",
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