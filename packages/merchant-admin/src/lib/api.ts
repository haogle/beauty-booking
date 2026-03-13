import axios, { AxiosInstance } from 'axios'

function getBaseURL(): string {
  const url = import.meta.env.VITE_API_URL || ''
  if (url && !url.startsWith('http')) {
    return `https://${url}`
  }
  return url
}

const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
