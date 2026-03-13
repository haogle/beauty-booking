import axios from 'axios'

function getBaseURL(): string {
  const url = import.meta.env.VITE_API_URL || ''
  if (url && !url.startsWith('http')) {
    return `https://${url}`
  }
  return url
}

const api = axios.create({
  baseURL: getBaseURL(),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('platform_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('platform_token')
      localStorage.removeItem('platform_refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
