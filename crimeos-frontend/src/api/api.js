import axios from "axios";

export const apiBackend = axios.create({
  baseURL: "http://localhost:3000",
});

export const apiBrain = axios.create({
  baseURL: "http://localhost:3001",
});

export default apiBackend;