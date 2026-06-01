// ================================================================
// MSME Sahay - Frontend API Client (connects SPA to live backend)
// ================================================================
const API = {
  base: '/api',
  token: () => localStorage.getItem('msme_token'),
  refresh: () => localStorage.getItem('msme_refresh'),

  async req(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (auth && this.token()) headers['Authorization'] = 'Bearer ' + this.token()
    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
    if (res.status === 401 && auth && this.refresh()) {
      // try refresh once
      const r = await fetch(this.base + '/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refresh() })
      })
      if (r.ok) {
        const { accessToken } = await r.json()
        localStorage.setItem('msme_token', accessToken)
        headers['Authorization'] = 'Bearer ' + accessToken
        const retry = await fetch(this.base + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
        return retry.json()
      }
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data })
    return data
  },

  saveSession(d) {
    if (d.accessToken) localStorage.setItem('msme_token', d.accessToken)
    if (d.refreshToken) localStorage.setItem('msme_refresh', d.refreshToken)
    if (d.user) localStorage.setItem('msme_user', JSON.stringify(d.user))
  },
  clearSession() {
    localStorage.removeItem('msme_token'); localStorage.removeItem('msme_refresh'); localStorage.removeItem('msme_user')
  },
  user() { try { return JSON.parse(localStorage.getItem('msme_user') || 'null') } catch { return null } },

  // Auth
  login: (email, password) => API.req('/auth/login', { method: 'POST', auth: false, body: { email, password } }),
  register: (body) => API.req('/auth/register', { method: 'POST', auth: false, body }),
  otpRequest: (identifier) => API.req('/auth/otp/request', { method: 'POST', auth: false, body: { identifier } }),
  otpVerify: (identifier, code) => API.req('/auth/otp/verify', { method: 'POST', auth: false, body: { identifier, code } }),
  oauth: (provider) => API.req('/auth/oauth/' + provider, { method: 'POST', auth: false, body: {} }),
  logout: () => API.req('/auth/logout', { method: 'POST', body: { refreshToken: API.refresh() } }).catch(() => {}),

  // Domain
  getProfile: () => API.req('/profile'),
  updateProfile: (body) => API.req('/profile', { method: 'PUT', body }),
  changePassword: (body) => API.req('/profile/change-password', { method: 'POST', body }),
  getDocuments: () => API.req('/documents'),
  uploadDocument: (body) => API.req('/documents', { method: 'POST', body }),
  getKycStatus: () => API.req('/kyc/status'),
  verifyKyc: (body) => API.req('/kyc/verify', { method: 'POST', body }),
  getSchemes: () => API.req('/schemes', { auth: false }),
  computeEligibility: () => API.req('/schemes/eligibility/compute', { method: 'POST' }),
  getEligibility: () => API.req('/schemes/eligibility/results'),
  getApplications: () => API.req('/applications'),
  createApplication: (body) => API.req('/applications', { method: 'POST', body }),
  submitApplication: (id) => API.req('/applications/' + id + '/submit', { method: 'POST' }),
  getFinance: () => API.req('/finance/overview'),
  getNotifications: () => API.req('/notifications'),
  readNotification: (id) => API.req('/notifications/' + id + '/read', { method: 'POST' }),
  readAllNotifications: () => API.req('/notifications/read-all', { method: 'POST' }),
  aiChat: (message) => API.req('/ai/chat', { method: 'POST', body: { message } }),
}
window.API = API
