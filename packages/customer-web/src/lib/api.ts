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

export default api

// The salon subdomain - hardcoded for MVP, could be derived from hostname later
export const SALON_SUBDOMAIN = 'serenity'
