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
 */
export function unwrap(axiosResponse: any): any {
  let result = axiosResponse.data // axios unwrap
  // Unwrap TransformInterceptor layer(s): { data: X, timestamp: ... }
  while (
    result &&
    typeof result === 'object' &&
    !Array.isArray(result) &&
    'data' in result &&
    'timestamp' in result
  ) {
    result = result.data
  }
  return result
}
