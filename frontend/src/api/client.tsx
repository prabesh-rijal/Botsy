// src/api/client.ts
import axios from "axios"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000", // backend
  withCredentials: true,
})

// Add request interceptor to include auth token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('supabase_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default client
