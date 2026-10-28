import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send the http-only auth cookie on every request
  headers: { "Content-Type": "application/json" },
});

// Normalize error messages so components can just read err.message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || err.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
