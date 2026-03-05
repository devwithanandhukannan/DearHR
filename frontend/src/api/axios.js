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

  createPersonalInfo: (data) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {}
    return API.post('/personal-info/', data, config)
  },

  updatePersonalInfo: (data) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {}
    return API.put('/personal-info/', data, config)
  },

  patchPersonalInfo: (data) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {}
    return API.patch('/personal-info/', data, config)
  },

  deleteProfileImage: () => API.delete('/personal-info/delete-image/'),

  // Generic CRUD
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

export const emailAPI = {
  generate: (data) => API.post('/email/generate/', data),
}

export const interviewAPI = {
  generate: (data) => API.post('/interview/generate/', data),
  checkAnswers: (data) => API.post('/interview/check-answers/', data),
}

export default API