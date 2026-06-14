import axios from "axios";

const api = axios.create({
  baseURL: "https://task4-user-management-r7qo.onrender.com",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const message = error.response?.data?.message;

    if (
      message === "User is blocked" ||
      message === "User does not exist"
    ) {
      localStorage.removeItem("token");

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;