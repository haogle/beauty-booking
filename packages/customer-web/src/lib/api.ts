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

/**
 * Extract the actual data from the API response.
 * The API wraps responses with TransformInterceptor: { data: result, timestamp }
 * Axios also wraps in .data, so we get response.data = { data: result, timestamp }
 * For nested objects (salon), result itself may have been wrapped again.
 */
export function unwrap(axiosResponse: any): any {
  const body = axiosResponse.data // axios unwrap
  if (body && body.data !== undefined) {
    // TransformInterceptor wrap: { data: actualData, timestamp }
    return body.data
  }
  return body
}
