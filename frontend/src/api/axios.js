import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

function getCSRFToken() {
  const name = 'csrftoken'
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1)
    }
  }
  return ''
}

API.interceptors.request.use((config) => {
  const method = config.method.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.headers['X-CSRFToken'] = getCSRFToken()
  }
  return config
})

export const authAPI = {
  signup: (data) => API.post('/auth/signup/', data),
  login: (data) => API.post('/auth/login/', data),
  logout: () => API.post('/auth/logout/'),
  me: () => API.get('/auth/me/'),
  changePassword: (data) => API.post('/auth/change-password/', data),
  forgotPassword: (data) => API.post('/auth/forgot-password/', data),
  resetPassword: (data) => API.post('/auth/reset-password/', data),
}

export const profileAPI = {
  dashboard: () => API.get('/dashboard/'),
  getPersonalInfo: () => API.get('/personal-info/'),
  createPersonalInfo: (data) => API.post('/personal-info/', data),
  updatePersonalInfo: (data) => API.put('/personal-info/', data),
  patchPersonalInfo: (data) => API.patch('/personal-info/', data),
  list: (resource) => API.get(`/${resource}/`),
  create: (resource, data) => API.post(`/${resource}/`, data),
  get: (resource, id) => API.get(`/${resource}/${id}/`),
  update: (resource, id, data) => API.put(`/${resource}/${id}/`, data),
  patch: (resource, id, data) => API.patch(`/${resource}/${id}/`, data),
  remove: (resource, id) => API.delete(`/${resource}/${id}/`),
}

export const resumeAPI = {
  generate: (data) => API.post('/resume/generate/', data),
  preview: () => API.get('/resume/preview/'),
}

export default API