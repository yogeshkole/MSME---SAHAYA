// ================================================================
// MSME Sahay - Frontend <-> Backend Integration Layer
// Overrides UI stubs with live API calls. Loaded after the inline script.
// ================================================================
(function () {
  let financeData = null

  function toast(msg, isErr) {
    let t = document.getElementById('msme-toast')
    if (!t) {
      t = document.createElement('div')
      t.id = 'msme-toast'
      t.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:14px 20px;border-radius:10px;color:#fff;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:.3s;max-width:340px'
      document.body.appendChild(t)
    }
    t.style.background = isErr ? '#EF4444' : '#10B981'
    t.textContent = msg
    t.style.opacity = '1'
    clearTimeout(t._timer)
    t._timer = setTimeout(() => (t.style.opacity = '0'), 3200)
  }
  window.toast = toast

  // ---------- AUTH ----------
  async function enterApp(d) {
    API.saveSession(d)
    document.getElementById('page-login').classList.remove('active')
    document.getElementById('page-login').style.display = 'none'
    document.getElementById('app-shell').style.display = 'flex'
    window.navigate('dashboard')
    await hydrateUser()
    await loadDashboard()
    await loadNotifications()
  }

  window.doLogin = async function () {
    const email = document.getElementById('login-email').value.trim()
    const pw = document.getElementById('pw-field').value
    const err = document.getElementById('login-error')
    err.style.display = 'none'
    try {
      const d = await API.login(email, pw)
      await enterApp(d)
      toast('Welcome back, ' + (d.user.full_name || 'user') + '!')
    } catch (e) {
      err.textContent = e.data?.error || 'Login failed'
      err.style.display = 'block'
    }
  }

  window.doRegister = async function () {
    const email = document.getElementById('login-email').value.trim()
    const pw = document.getElementById('pw-field').value
    const err = document.getElementById('login-error')
    err.style.display = 'none'
    if (!email || pw.length < 6) { err.textContent = 'Enter email and a 6+ char password to sign up'; err.style.display = 'block'; return }
    try {
      const d = await API.register({ email, password: pw, full_name: email.split('@')[0] })
      await enterApp(d)
      toast('Account created! Welcome to MSME Sahay.')
    } catch (e) {
      err.textContent = e.data?.error || 'Registration failed'
      err.style.display = 'block'
    }
  }

  window.doOtp = async function () {
    const id = document.getElementById('otp-mobile').value.trim()
    const codeGroup = document.getElementById('otp-code-group')
    const btn = document.getElementById('otp-btn')
    if (codeGroup.style.display === 'none') {
      try {
        const d = await API.otpRequest(id)
        codeGroup.style.display = 'block'
        if (d.dev_otp) document.getElementById('otp-code').value = d.dev_otp
        btn.innerHTML = 'Verify OTP <i class="fas fa-check" style="margin-left:8px"></i>'
        toast('OTP sent' + (d.dev_otp ? ' (demo: ' + d.dev_otp + ')' : ''))
      } catch (e) { toast(e.data?.error || 'Failed to send OTP', true) }
    } else {
      const code = document.getElementById('otp-code').value.trim()
      try {
        const d = await API.otpVerify(id, code)
        await enterApp(d)
        toast('Logged in via OTP')
      } catch (e) { toast(e.data?.error || 'Invalid OTP', true) }
    }
  }

  window.doOauth = async function (provider) {
    try {
      const d = await API.oauth(provider)
      await enterApp(d)
      toast('Logged in with ' + provider)
    } catch (e) { toast(e.data?.error || 'OAuth failed', true) }
  }

  // override logout
  const _gotoLogin = window.gotoLogin
  window.gotoLogin = async function () {
    await API.logout()
    API.clearSession()
    _gotoLogin()
  }

  // ---------- HYDRATE USER / SIDEBAR ----------
  async function hydrateUser() {
    try {
      const { user, profile } = await API.getProfile()
      const initials = (user.full_name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
      setText('side-name', user.full_name)
      setText('side-avatar', initials)
      setText('dash-name', (user.full_name || '').split(' ')[0])
      if (profile) setText('side-sub', (profile.business_category || '') + ' \u00b7 ' + (profile.business_size || ''))
    } catch (e) { /* ignore */ }
  }

  // ---------- DASHBOARD ----------
  async function loadDashboard() {
    try {
      const fin = await API.getFinance()
      financeData = fin
      setText('dash-health', fin.summary.health_score)
      const net = fin.summary.net_profit
      setText('dash-cashflow', '\u20b9' + (net / 100000).toFixed(1) + 'L')
    } catch (e) {}
    try {
      const elig = await API.getEligibility()
      const eligible = elig.results.filter((r) => r.eligible).length
      if (eligible) setText('dash-schemes', eligible)
    } catch (e) {}
    try {
      const apps = await API.getApplications()
      const active = apps.applications.filter((a) => a.status !== 'approved' && a.status !== 'rejected').length
      setText('dash-apps', active)
    } catch (e) {}
    try {
      const docs = await API.getDocuments()
      const verified = docs.documents.filter((d) => d.status === 'verified').length
      setText('dash-docs', verified + '/' + docs.documents.length)
    } catch (e) {}
  }

  // ---------- ELIGIBILITY ENGINE ----------
  window.runEligibility = async function () {
    window.nextStep(4)
    const cards = document.getElementById('elig-scheme-cards')
    cards.innerHTML = '<div style="color:#fff;opacity:.7">Analyzing your profile\u2026</div>'
    try {
      const d = await API.computeEligibility()
      setText('elig-score', d.readiness_score + '%')
      const eligible = d.results.filter((r) => r.eligible)
      document.getElementById('elig-sub').innerHTML =
        'Your business qualifies for <strong>' + eligible.length + ' government schemes</strong> \u2014 ranked by AI match score.'
      cards.innerHTML = d.results.map((r) => {
        const benefit = r.max_benefit ? '\u20b9' + fmtMoney(r.max_benefit) : '\u2014'
        const cls = r.eligible ? '' : 'opacity:.55'
        return '<div class="scheme-card" style="' + cls + '">' +
          '<h4>' + r.name + '</h4>' +
          '<p>' + (r.reasons[0] || r.category || '') + '</p>' +
          '<div class="scheme-match">' + (r.eligible ? '\u2713 ' : '\u2717 ') + r.score + '% Match \u00b7 Up to ' + benefit + '</div>' +
          '</div>'
      }).join('')
      await loadDashboard()
      toast('Eligibility computed: ' + eligible.length + ' schemes matched')
    } catch (e) {
      cards.innerHTML = '<div style="color:#fff">' + (e.data?.error || 'Failed') + '</div>'
    }
  }

  // ---------- NOTIFICATIONS ----------
  async function loadNotifications() {
    try {
      const { notifications } = await API.getNotifications()
      const list = document.getElementById('notif-list')
      if (!list || !notifications.length) return
      const icons = { success: ['fa-check-circle', '34,197,94'], warning: ['fa-exclamation-circle', '245,158,11'], alert: ['fa-bell', '239,68,68'], info: ['fa-robot', '37,99,235'] }
      list.innerHTML = notifications.map((n) => {
        const ic = icons[n.type] || icons.info
        return '<li class="notif-item ' + (n.read ? '' : 'unread') + '" onclick="markNotif(' + n.id + ')">' +
          (n.read ? '' : '<div class="notif-dot-mark"></div>') +
          '<div class="notif-icon" style="background:rgba(' + ic[1] + ',0.1)"><i class="fas ' + ic[0] + '" style="color:rgb(' + ic[1] + ')"></i></div>' +
          '<div class="notif-content"><h4>' + n.title + '</h4><p>' + (n.body || '') + '</p></div>' +
          '<div class="notif-time">' + timeAgo(n.created_at) + '</div></li>'
      }).join('')
    } catch (e) {}
  }
  window.markNotif = async function (id) { try { await API.readNotification(id); loadNotifications() } catch (e) {} }

  // ---------- DOCUMENTS ----------
  async function loadDocuments() {
    try {
      const { documents } = await API.getDocuments()
      const kyc = await API.getKycStatus().catch(() => ({ completion_pct: 0 }))
      const grid = document.getElementById('docs-grid')
      setText('doc-verif-score', (kyc.completion_pct || 0) + '%')
      if (!grid || !documents.length) return
      const labels = { aadhaar: ['Aadhaar Card', 'fa-id-card', 'blue'], pan: ['PAN Card', 'fa-address-card', 'orange'], gst: ['GST Certificate', 'fa-file-invoice', 'green'], udyam: ['Udyam Registration', 'fa-registered', 'purple'], bank_statement: ['Bank Statement', 'fa-university', 'blue'] }
      grid.innerHTML = documents.map((d) => {
        const l = labels[d.doc_type] || [d.doc_type, 'fa-file', 'blue']
        const badge = d.status === 'verified' ? '<span class="badge verified">Verified</span>' : '<span class="badge" style="background:rgba(245,158,11,.12);color:#F59E0B">' + d.status + '</span>'
        return '<div class="doc-card"><div class="doc-icon ' + l[2] + '"><i class="fas ' + l[1] + '"></i></div>' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px"><h4>' + l[0] + '</h4>' + badge + '</div>' +
          '<p>' + d.file_name + ' \u00b7 v' + d.version + '</p>' +
          '<div class="doc-progress"><div class="progress-text"><span>' + (d.file_size / 1000).toFixed(0) + ' KB</span><span style="color:var(--success)">' + (d.status === 'verified' ? '100%' : 'Pending') + '</span></div></div></div>'
      }).join('')
    } catch (e) {}
  }

  window.uploadDocPrompt = async function () {
    const type = prompt('Document type (aadhaar, pan, gst, udyam, bank_statement, financial_report, business_license, income_tax, loan_document, scheme_document):', 'udyam')
    if (!type) return
    const name = prompt('File name:', type + '_certificate.pdf')
    if (!name) return
    try {
      const d = await API.uploadDocument({ doc_type: type, file_name: name, file_size: 200000, mime_type: 'application/pdf' })
      toast('Uploaded ' + type.toUpperCase() + (d.ocr_result ? ' \u2014 OCR extracted ' + Object.keys(d.ocr_result.extracted || {}).length + ' fields' : ''))
      loadDocuments(); loadDashboard()
    } catch (e) { toast(e.data?.error || 'Upload failed', true) }
  }

  // ---------- FINANCE (override initCharts with live data) ----------
  window.initCharts = function () {
    const rCtx = document.getElementById('revenueChart')
    const f = financeData
    if (!f) return
    if (rCtx && !window.revenueChartInstance) {
      window.revenueChartInstance = new Chart(rCtx, {
        type: 'line',
        data: {
          labels: f.trend.labels.map((p) => p.slice(5)),
          datasets: [
            { label: 'Revenue', data: f.trend.revenue, borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4 },
            { label: 'Expenses', data: f.trend.expenses, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => '\u20b9' + (ctx.parsed.y / 100000).toFixed(1) + 'L' } } }, scales: { y: { ticks: { callback: (v) => '\u20b9' + (v / 100000).toFixed(0) + 'L' } } } }
      })
    }
    const eCtx = document.getElementById('expenseChart')
    if (eCtx && !window.expenseChartInstance) {
      const bd = f.expense_breakdown || {}
      const labels = Object.keys(bd), data = Object.values(bd)
      window.expenseChartInstance = new Chart(eCtx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'], borderWidth: 0 }] },
        options: { responsive: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + ctx.parsed + '%' } } }, cutout: '68%' }
      })
    }
  }

  // ---------- AI CHAT (override sendChat with real backend) ----------
  window.sendChat = async function () {
    const input = document.getElementById('chat-input')
    const msg = input.value.trim()
    if (!msg) return
    const messages = document.getElementById('chat-messages')
    messages.innerHTML += '<div class="msg user"><div class="msg-avatar user-av">YS</div><div class="msg-bubble">' + escapeHtml(msg) + '</div></div>'
    input.value = ''
    messages.scrollTop = messages.scrollHeight
    messages.innerHTML += '<div class="msg ai" id="ai-typing"><div class="msg-avatar ai"><i class="fas fa-robot"></i></div><div class="msg-bubble"><i class="fas fa-circle-notch fa-spin"></i></div></div>'
    messages.scrollTop = messages.scrollHeight
    try {
      const d = await API.aiChat(msg)
      const t = document.getElementById('ai-typing'); if (t) t.remove()
      messages.innerHTML += '<div class="msg ai"><div class="msg-avatar ai"><i class="fas fa-robot"></i></div><div class="msg-bubble">' + escapeHtml(d.reply) + '</div></div>'
    } catch (e) {
      const t = document.getElementById('ai-typing'); if (t) t.remove()
      messages.innerHTML += '<div class="msg ai"><div class="msg-avatar ai"><i class="fas fa-robot"></i></div><div class="msg-bubble">Sorry, I could not reach the assistant. Please log in again.</div></div>'
    }
    messages.scrollTop = messages.scrollHeight
  }

  // ---------- Hook navigation to lazy-load page data ----------
  const _navigate = window.navigate
  window.navigate = function (page) {
    _navigate(page)
    if (page === 'documents') loadDocuments()
    else if (page === 'notifications') loadNotifications()
    else if (page === 'dashboard') loadDashboard()
  }

  // ---------- helpers ----------
  function setText(id, v) { const el = document.getElementById(id); if (el != null && v != null) el.textContent = v }
  function fmtMoney(n) { if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr'; if (n >= 100000) return (n / 100000).toFixed(0) + 'L'; return n }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
  function timeAgo(ts) {
    const d = new Date(ts.replace(' ', 'T') + 'Z'); const s = (Date.now() - d.getTime()) / 1000
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago'
    if (s < 86400) return Math.round(s / 3600) + 'h ago'
    return Math.round(s / 86400) + 'd ago'
  }

  // Auto-login if token exists
  window.addEventListener('DOMContentLoaded', async () => {
    if (API.token()) {
      try { await API.getProfile(); await enterApp({}); } catch (e) { API.clearSession() }
    }
  })
})()
