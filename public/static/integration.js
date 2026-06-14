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
      window.financeData = fin
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

  // ---------- FINANCE DASHBOARD ----------
  function inrFull(n) { return '\u20b9' + (Number(n) || 0).toLocaleString('en-IN') }

  async function loadFinance() {
    // KPIs from overview
    try {
      const fin = await API.getFinance()
      financeData = fin
      window.financeData = fin
      const s = fin.summary || {}
      setText('fin-income', inrFull(s.total_revenue))
      setText('fin-expenses', inrFull(s.total_expenses))
      setText('fin-net', inrFull(s.net_profit))
      setText('fin-health', s.health_score != null ? s.health_score : '\u2014')
      const fr = document.getElementById('fin-health-sub')
      if (fr) fr.textContent = 'Funding readiness ' + (s.funding_readiness != null ? s.funding_readiness + '%' : '')
      const im = document.getElementById('fin-income-sub')
      if (im) im.innerHTML = s.margin != null ? ('<i class="fas fa-percentage"></i> ' + s.margin + '% margin') : ''
    } catch (e) {}
    // Transactions table
    try {
      const { transactions } = await API.getTransactions()
      const body = document.getElementById('fin-txn-body')
      if (body) {
        if (!transactions || !transactions.length) {
          body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:20px">No transactions yet \u2014 click "Add Transaction" to record one.</td></tr>'
        } else {
          body.innerHTML = transactions.map((t) => {
            const income = t.type === 'income'
            const sign = income ? '+' : '-'
            const color = income ? 'var(--success)' : 'var(--red)'
            const badge = income ? '<span class="badge approved">Income</span>' : '<span class="badge rejected">Expense</span>'
            return '<tr><td><strong>' + esc(t.description || (income ? 'Income' : 'Expense')) + '</strong></td>' +
              '<td><span class="tag">' + esc(t.category || '\u2014') + '</span></td>' +
              '<td>' + esc(t.txn_date || '') + '</td>' +
              '<td style="color:' + color + ';font-weight:700">' + sign + inrFull(t.amount) + '</td>' +
              '<td>' + badge + '</td></tr>'
          }).join('')
        }
      }
    } catch (e) {}
    // Rebuild charts with live finance data (destroy stale demo instances first)
    try {
      if (window.revenueChartInstance) { window.revenueChartInstance.destroy(); window.revenueChartInstance = null }
      if (window.expenseChartInstance) { window.expenseChartInstance.destroy(); window.expenseChartInstance = null }
      if (typeof window.initCharts === 'function') window.initCharts()
    } catch (e) {}
  }
  window._loadFinance = loadFinance

  // ----- Add Transaction modal -----
  window.openTxnModal = function () {
    const m = document.getElementById('txn-modal'); if (!m) return
    const dt = document.getElementById('txn-date'); if (dt && !dt.value) dt.value = new Date().toISOString().slice(0, 10)
    const err = document.getElementById('txn-error'); if (err) err.style.display = 'none'
    m.style.display = 'flex'
  }
  window.closeTxnModal = function () { const m = document.getElementById('txn-modal'); if (m) m.style.display = 'none' }

  window.submitTxn = async function (ev) {
    ev.preventDefault()
    const err = document.getElementById('txn-error')
    const typeBtn = document.querySelector('#txn-type .toggle-btn.active')
    const body = {
      type: typeBtn ? typeBtn.getAttribute('data-val') : 'income',
      amount: Number(val('txn-amount') || 0),
      txn_date: val('txn-date'),
      category: val('txn-category'),
      description: val('txn-desc')
    }
    if (!body.amount || body.amount <= 0) { showTxnErr('Please enter a valid amount.'); return false }
    if (!body.txn_date) { showTxnErr('Please choose a date.'); return false }
    const btn = document.getElementById('txn-submit'); const orig = btn.innerHTML
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'
    try {
      await API.addTransaction(body)
      window.closeTxnModal()
      document.getElementById('txn-form').reset()
      await loadFinance()
      await loadDashboard()
      toast('Transaction recorded successfully')
    } catch (e) {
      showTxnErr(e.data?.error || 'Failed to save transaction')
    } finally {
      btn.disabled = false; btn.innerHTML = orig
    }
    return false
  }
  function showTxnErr(msg) { const err = document.getElementById('txn-error'); if (err) { err.textContent = msg; err.style.display = 'block' } }

  // ----- Export transactions to CSV -----
  window.exportTransactions = async function () {
    try {
      const { transactions } = await API.getTransactions()
      if (!transactions || !transactions.length) { toast('No transactions to export'); return }
      const rows = [['Date', 'Type', 'Category', 'Description', 'Amount']]
      transactions.forEach((t) => rows.push([t.txn_date || '', t.type || '', t.category || '', (t.description || '').replace(/"/g, "'"), t.amount || 0]))
      const csv = rows.map((r) => r.map((c) => '"' + String(c) + '"').join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click()
      URL.revokeObjectURL(a.href)
      toast('Transactions exported')
    } catch (e) { toast('Export failed') }
  }

  // ---------- PROFILE ----------
  let profileData = null
  function inrShort(n) {
    n = Number(n) || 0
    if (n >= 1e7) return '\u20b9' + (n / 1e7).toFixed(2).replace(/\.00$/, '') + ' Crore'
    if (n >= 1e5) return '\u20b9' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' Lakh'
    return '\u20b9' + n.toLocaleString('en-IN')
  }
  function classifySizeLabel(size) {
    if (!size) return '\u2014'
    const s = String(size).toLowerCase()
    if (s.indexOf('micro') >= 0) return 'Micro Enterprise'
    if (s.indexOf('small') >= 0) return 'Small Enterprise'
    if (s.indexOf('medium') >= 0) return 'Medium Enterprise'
    return size
  }
  async function loadProfile() {
    try {
      const { user, profile } = await API.getProfile()
      profileData = { user: user || {}, profile: profile || {} }
      const u = profileData.user, p = profileData.profile
      const name = u.full_name || 'User'
      setText('prof-name', name)
      const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
      setText('prof-avatar', initials)
      setText('prof-subtitle', (p.business_name || '\u2014') + (p.gst_number ? ' \u00b7 GSTIN: ' + p.gst_number : ''))
      // Business info
      setText('prof-business-name', p.business_name || '\u2014')
      setText('prof-business-type', p.business_category || '\u2014')
      setText('prof-msme-category', classifySizeLabel(p.business_size))
      setText('prof-udyam', p.udyam_number || 'Not registered')
      setText('prof-state', p.state || '\u2014')
      setText('prof-year', p.year_established || '\u2014')
      // Contact
      setText('prof-email', u.email || '\u2014')
      setText('prof-phone', u.phone || '\u2014')
      setText('prof-gst', p.gst_number || '\u2014')
      setText('prof-pan', p.pan_number || '\u2014')
      // Financial
      setText('prof-turnover', p.annual_turnover ? inrShort(p.annual_turnover) : '\u2014')
      setText('prof-employees', p.employee_count != null ? p.employee_count : '\u2014')
      setText('prof-size', p.business_size || '\u2014')
      setText('prof-city', p.city || '\u2014')
      // Udyam badge
      const badge = document.getElementById('prof-udyam-badge')
      if (badge) badge.style.display = p.udyam_number ? '' : 'none'
    } catch (e) {}
  }
  window._loadProfile = loadProfile

  window.openProfileModal = function () {
    const m = document.getElementById('profile-modal'); if (!m) return
    const u = (profileData && profileData.user) || {}, p = (profileData && profileData.profile) || {}
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v == null ? '' : v) }
    set('pf-full-name', u.full_name)
    set('pf-phone', u.phone)
    set('pf-business-name', p.business_name)
    set('pf-business-category', p.business_category || 'Manufacturing')
    set('pf-business-size', p.business_size || 'Micro')
    set('pf-year', p.year_established)
    set('pf-turnover', p.annual_turnover)
    set('pf-employees', p.employee_count)
    set('pf-udyam', p.udyam_number)
    set('pf-gst', p.gst_number)
    set('pf-pan', p.pan_number)
    set('pf-city', p.city)
    set('pf-state', p.state)
    set('pf-pincode', p.pincode)
    set('pf-address', p.address_line)
    const err = document.getElementById('profile-error'); if (err) err.style.display = 'none'
    m.style.display = 'flex'
  }
  window.closeProfileModal = function () { const m = document.getElementById('profile-modal'); if (m) m.style.display = 'none' }

  function showProfileErr(msg) { const err = document.getElementById('profile-error'); if (err) { err.textContent = msg; err.style.display = 'block' } }

  window.saveProfile = async function (ev) {
    ev.preventDefault()
    const body = {
      full_name: val('pf-full-name').trim(),
      phone: val('pf-phone').trim(),
      business_name: val('pf-business-name').trim(),
      business_category: val('pf-business-category'),
      business_size: val('pf-business-size'),
      year_established: val('pf-year') ? Number(val('pf-year')) : undefined,
      annual_turnover: val('pf-turnover') ? Number(val('pf-turnover')) : undefined,
      employee_count: val('pf-employees') ? Number(val('pf-employees')) : undefined,
      udyam_number: val('pf-udyam').trim(),
      gst_number: val('pf-gst').trim().toUpperCase(),
      pan_number: val('pf-pan').trim().toUpperCase(),
      city: val('pf-city').trim(),
      state: val('pf-state').trim(),
      pincode: val('pf-pincode').trim(),
      address_line: val('pf-address').trim()
    }
    if (!body.full_name) { showProfileErr('Full name is required.'); return false }
    if (body.gst_number && body.gst_number.length !== 15) { showProfileErr('GSTIN must be 15 characters (or leave blank).'); return false }
    if (body.pan_number && body.pan_number.length !== 10) { showProfileErr('PAN must be 10 characters (or leave blank).'); return false }
    if (body.pincode && !/^\d{6}$/.test(body.pincode)) { showProfileErr('Pincode must be 6 digits (or leave blank).'); return false }
    const btn = document.getElementById('profile-submit'); const orig = btn.innerHTML
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'
    try {
      await API.updateProfile(body)
      window.closeProfileModal()
      await loadProfile()
      // Refresh sidebar identity too
      try {
        const sn = document.getElementById('side-sub')
        if (sn) sn.textContent = (body.business_category || '') + ' \u00b7 ' + (body.business_size || '')
      } catch (e) {}
      toast('Profile updated successfully')
    } catch (e) {
      showProfileErr(e.data && e.data.error ? e.data.error : 'Failed to update profile')
    } finally {
      btn.disabled = false; btn.innerHTML = orig
    }
    return false
  }

  // ---------- BRANCH LOCATOR ----------
  // 28 real MSME offices (DI / TC / DFO) from the official MSME directory.
  var TYPE_META = {
    DI:  { code: 'DI',  full: 'Development Institute',  badgeBg: '#fdedcf', badgeText: '#a8650a', iconBg: 'linear-gradient(135deg,#ffe39e,#ffb347)', icon: '\uD83C\uDFDB\uFE0F', dot: 'var(--gold)' },
    DFO: { code: 'DFO', full: 'Facilitation Office',     badgeBg: '#dbe8ff', badgeText: '#1f4a99', iconBg: 'linear-gradient(135deg,#bcd4ff,#7fa9f0)', icon: '\uD83C\uDFE2', dot: '#3b7de9' },
    TC:  { code: 'TC',  full: 'Technology Centre',       badgeBg: '#d6f2e3', badgeText: '#16633f', iconBg: 'linear-gradient(135deg,#bff0d6,#6fd1a4)', icon: '\u2699\uFE0F', dot: 'var(--emerald)' }
  }
  function svc() { return Array.prototype.slice.call(arguments) }
  var BRANCHES = [
    { id: 1,  type: 'DI',  name: 'MSME-DI Hyderabad', state: 'Telangana', stateCode: 'TG', address: 'Narsapur Cross Roads, Balanagar Main Rd, IDA, Balanagar, Hyderabad \u2013 500037', phone: '+91 40 2307 8131', hours: 'Mon\u2013Fri: 10:00 AM \u2013 5:00 PM', rating: 4.3, reviews: 72, status: 'open', services: svc('EDP Training','Scheme Guidance','UDYAM Registration','CGTMSE'), lat: 17.4675, lng: 78.4455 },
    { id: 2,  type: 'DI',  name: 'MSME-DI Kalaburagi', state: 'Karnataka', stateCode: 'KA', address: 'Industrial Area, Kapnoor, Kalaburagi (Gulbarga) \u2013 585104', phone: '1800-180-6763', hours: 'Mon\u2013Fri: 10:00 AM \u2013 5:00 PM', rating: 4.8, reviews: 41, status: 'open', services: svc('Scheme Guidance','Cluster Development','Entrepreneurship Training','Vendor Development'), lat: 17.3460, lng: 76.8343 },
    { id: 5,  type: 'DI',  name: 'MSME-DI Chennai', state: 'Tamil Nadu', stateCode: 'TN', address: '65/1, GST Road, Guindy, Chennai \u2013 600032', phone: '+91 44 2250 1011', hours: 'Mon\u2013Fri: 9:15 AM \u2013 5:45 PM', rating: 4.6, reviews: 128, status: 'open', services: svc('Scheme Guidance','Export Facilitation','Skill Training','UDYAM Registration'), lat: 13.0067, lng: 80.2206 },
    { id: 6,  type: 'DI',  name: 'MSME-DI Kolkata', state: 'West Bengal', stateCode: 'WB', address: '111/112, B.T. Road, Kolkata \u2013 700035', phone: '+91 89100 52893', hours: 'Mon\u2013Fri: 10:00 AM \u2013 6:00 PM', rating: 4.5, reviews: 96, status: 'open', services: svc('Scheme Guidance','Cluster Development','EDP Training','Credit Linkage'), lat: 22.6427, lng: 88.3766 },
    { id: 7,  type: 'DI',  name: 'MSME-DI Ahmedabad', state: 'Gujarat', stateCode: 'GJ', address: 'Harsiddh Chambers, Ashram Road, Ahmedabad \u2013 380014', phone: '1800-180-6763', hours: 'Mon\u2013Fri: 10:00 AM \u2013 6:00 PM', rating: 4.7, reviews: 154, status: 'open', services: svc('Scheme Guidance','Export Promotion','UDYAM Registration','CGTMSE'), lat: 23.0395, lng: 72.5660 },
    { id: 8,  type: 'DI',  name: 'MSME-DI Bengaluru', state: 'Karnataka', stateCode: 'KA', address: 'Rajaji Nagar Industrial Estate, Bengaluru \u2013 560044', phone: '+91 80 2315 1581', hours: 'Mon\u2013Fri: 9:30 AM \u2013 6:00 PM', rating: 4.0, reviews: 88, status: 'open', services: svc('Scheme Guidance','Skill Training','Vendor Development','UDYAM Registration'), lat: 12.9916, lng: 77.5546 },
    { id: 10, type: 'DI',  name: 'MSME-DI Jaipur', state: 'Rajasthan', stateCode: 'RJ', address: 'Industrial Area, Jhalana Doongri, Jaipur \u2013 302004', phone: '+91 141 221 0553', hours: 'Mon\u2013Fri: 10:00 AM \u2013 6:00 PM', rating: 4.3, reviews: 67, status: 'open', services: svc('Scheme Guidance','EDP Training','Cluster Development','Credit Linkage'), lat: 26.8930, lng: 75.8230 },
    { id: 12, type: 'DI',  name: 'MSME-DI Lucknow', state: 'Uttar Pradesh', stateCode: 'UP', address: '107, Industrial Estate, Kalpi Road, Lucknow \u2013 226008', phone: '+91 74087 33333', hours: 'Mon\u2013Sat: 10:00 AM \u2013 6:30 PM', rating: 4.6, reviews: 112, status: 'open', services: svc('Scheme Guidance','Skill Training','UDYAM Registration','Export Facilitation'), lat: 26.8467, lng: 80.9462 },
    { id: 14, type: 'DI',  name: 'MSME-DI Kanpur', state: 'Uttar Pradesh', stateCode: 'UP', address: '10, Industrial Estate, Fazalganj, Kanpur \u2013 208012', phone: '+91 512 229 5070', hours: 'Mon\u2013Fri: 9:30 AM \u2013 6:00 PM', rating: 3.7, reviews: 54, status: 'open', services: svc('Scheme Guidance','EDP Training','Vendor Development'), lat: 26.4499, lng: 80.3319 },
    { id: 15, type: 'DI',  name: 'MSME-DI Nagpur', state: 'Maharashtra', stateCode: 'MH', address: 'C-46, MIDC Industrial Area, Hingna Road, Nagpur \u2013 440016', phone: '+91 712 251 0352', hours: 'Mon\u2013Fri: 10:00 AM \u2013 5:30 PM', rating: 3.8, reviews: 49, status: 'open', services: svc('Scheme Guidance','Cluster Development','Skill Training'), lat: 21.1147, lng: 79.0070 },
    { id: 16, type: 'DI',  name: 'MSME-DI Indore', state: 'Madhya Pradesh', stateCode: 'MP', address: 'Polo Ground Industrial Estate, Indore \u2013 452015', phone: '+91 731 242 0723', hours: 'Mon\u2013Fri: 9:45 AM \u2013 6:00 PM', rating: 4.2, reviews: 73, status: 'open', services: svc('Scheme Guidance','EDP Training','UDYAM Registration','CGTMSE'), lat: 22.7196, lng: 75.8577 },
    { id: 19, type: 'DI',  name: 'MSME-DI Patna', state: 'Bihar', stateCode: 'BR', address: 'Patliputra Industrial Area, Patna \u2013 800013', phone: '+91 612 226 2208', hours: 'Mon\u2013Fri: 9:30 AM \u2013 6:00 PM', rating: 4.5, reviews: 81, status: 'open', services: svc('Scheme Guidance','Skill Training','Credit Linkage','UDYAM Registration'), lat: 25.6093, lng: 85.1376 },
    { id: 21, type: 'DI',  name: 'MSME-DI Cuttack', state: 'Odisha', stateCode: 'OD', address: 'College Square, Cuttack \u2013 753003', phone: '+91 671 254 8049', hours: 'Mon\u2013Fri: 10:00 AM \u2013 5:30 PM', rating: 4.3, reviews: 58, status: 'open', services: svc('Scheme Guidance','Cluster Development','EDP Training'), lat: 20.4625, lng: 85.8828 },
    { id: 22, type: 'DI',  name: 'MSME-DI Guwahati', state: 'Assam', stateCode: 'AS', address: 'Industrial Estate, Bamunimaidam, Guwahati \u2013 781021', phone: '+91 361 255 0052', hours: 'Mon\u2013Fri: 9:00 AM \u2013 6:30 PM', rating: 3.5, reviews: 44, status: 'open', services: svc('Scheme Guidance','Skill Training','Vendor Development'), lat: 26.1820, lng: 91.7860 },
    { id: 23, type: 'DI',  name: 'MSME-DI Ludhiana', state: 'Punjab', stateCode: 'PB', address: 'Industrial Area-A, Ludhiana \u2013 141003', phone: '+91 161 253 1733', hours: 'Mon\u2013Fri: 9:00 AM \u2013 5:30 PM', rating: 3.7, reviews: 62, status: 'open', services: svc('Scheme Guidance','Export Facilitation','Cluster Development'), lat: 30.9010, lng: 75.8573 },
    { id: 25, type: 'DI',  name: 'MSME-DI Ranchi', state: 'Jharkhand', stateCode: 'JH', address: 'Industrial Area, Tupudana, Ranchi \u2013 834003', phone: '+91 651 254 6133', hours: 'Mon\u2013Fri: 9:00 AM \u2013 5:30 PM', rating: 3.5, reviews: 39, status: 'open', services: svc('Scheme Guidance','EDP Training','UDYAM Registration'), lat: 23.3441, lng: 85.3096 },
    { id: 26, type: 'DI',  name: 'MSME-DI Jammu', state: 'J&K', stateCode: 'JK', address: 'Industrial Estate, Gangyal, Jammu \u2013 180010', phone: '+91 191 243 1077', hours: 'Mon\u2013Fri: 10:00 AM \u2013 5:00 PM', rating: 4.0, reviews: 35, status: 'open', services: svc('Scheme Guidance','Skill Training','Credit Linkage'), lat: 32.7266, lng: 74.8570 },
    { id: 28, type: 'DI',  name: 'MSME-DI Muzaffarpur', state: 'Bihar', stateCode: 'BR', address: 'Bela Industrial Estate, Muzaffarpur \u2013 842005', phone: '+91 621 228 4425', hours: 'Mon\u2013Fri: 9:30 AM \u2013 6:00 PM', rating: 4.6, reviews: 47, status: 'open', services: svc('Scheme Guidance','Cluster Development','EDP Training','UDYAM Registration'), lat: 26.1209, lng: 85.3647 },
    { id: 9,  type: 'TC',  name: 'MSME-TC Bengaluru', state: 'Karnataka', stateCode: 'KA', address: 'CTR Campus, Tumkur Road, Bengaluru \u2013 560022', phone: '+91 93532 75370', hours: 'Mon\u2013Fri: 9:00 AM \u2013 6:00 PM', rating: 4.3, reviews: 91, status: 'open', services: svc('Tool Room','Skill Training','Precision Machining','Prototyping'), lat: 13.0280, lng: 77.5180 },
    { id: 11, type: 'TC',  name: 'MSME-TC Bhopal (Acharpura)', state: 'Madhya Pradesh', stateCode: 'MP', address: 'Acharpura Industrial Area, Bhopal \u2013 462038', phone: '+91 93731 61257', hours: 'Mon\u2013Sat: 9:00 AM \u2013 5:30 PM', rating: 4.4, reviews: 66, status: 'open', services: svc('Tool Room','CAD/CAM','Skill Training','Testing Lab'), lat: 23.1500, lng: 77.5400 },
    { id: 13, type: 'TC',  name: 'MSME-TC Agra (PPDC)', state: 'Uttar Pradesh', stateCode: 'UP', address: 'Foundry Nagar, Agra \u2013 282006', phone: '+91 562 234 4673', hours: 'Mon\u2013Sat: 9:30 AM \u2013 5:30 PM', rating: 4.2, reviews: 58, status: 'open', services: svc('Process Development','Skill Training','Testing','Tool Room'), lat: 27.1767, lng: 78.0081 },
    { id: 18, type: 'TC',  name: 'MSME-TC Visakhapatnam', state: 'Andhra Pradesh', stateCode: 'AP', address: 'Autonagar, Visakhapatnam \u2013 530012', phone: '+91 79955 31372', hours: 'Mon\u2013Sat: 9:30 AM \u2013 6:00 PM', rating: 4.5, reviews: 77, status: 'open', services: svc('Tool Room','Precision Machining','Skill Training','Prototyping'), lat: 17.7305, lng: 83.2400 },
    { id: 20, type: 'TC',  name: 'MSME-TC Bhopal City', state: 'Madhya Pradesh', stateCode: 'MP', address: 'Govindpura Industrial Area, Bhopal \u2013 462023', phone: '+91 755 258 6075', hours: 'Mon\u2013Sat: 7:00 AM \u2013 10:00 PM', rating: 4.5, reviews: 102, status: 'open', services: svc('Tool Room','CAD/CAM','Testing Lab','Skill Training'), lat: 23.2599, lng: 77.4880 },
    { id: 24, type: 'TC',  name: 'MSME-TC Durg', state: 'Chhattisgarh', stateCode: 'CG', address: 'Industrial Area, Durg \u2013 491001', phone: '+91 788 261 7200', hours: 'Mon\u2013Sat: 9:00 AM \u2013 5:30 PM', rating: 4.2, reviews: 48, status: 'open', services: svc('Tool Room','Skill Training','Prototyping'), lat: 21.1904, lng: 81.2849 },
    { id: 3,  type: 'DFO', name: 'MSME-DFO Mumbai', state: 'Maharashtra', stateCode: 'MH', address: 'Kurla Andheri Road, Saki Naka, Mumbai \u2013 400072', phone: '+91 22 2857 3091', hours: 'Mon\u2013Fri: 9:30 AM \u2013 5:30 PM', rating: 4.0, reviews: 64, status: 'open', services: svc('Grievance Redressal','Scheme Applications','Export Facilitation','Credit Linkage'), lat: 19.1075, lng: 72.8890 },
    { id: 4,  type: 'DFO', name: 'MSME-DFO New Delhi', state: 'Delhi', stateCode: 'DL', address: 'Okhla Industrial Estate, Phase-III, New Delhi \u2013 110020', phone: '+91 11 2683 8068', hours: 'Mon\u2013Fri: 9:00 AM \u2013 5:30 PM', rating: 4.1, reviews: 88, status: 'open', services: svc('Policy Support','Scheme Applications','MSME Champions','Procurement Help'), lat: 28.5450, lng: 77.2730 },
    { id: 17, type: 'DFO', name: 'MSME-DFO Coimbatore', state: 'Tamil Nadu', stateCode: 'TN', address: 'Trichy Road, Singanallur, Coimbatore \u2013 641005', phone: '+91 422 299 3949', hours: 'Mon\u2013Fri: 9:30 AM \u2013 5:30 PM', rating: 4.9, reviews: 143, status: 'open', services: svc('Grievance Redressal','Scheme Applications','Export Facilitation','Cluster Support'), lat: 11.0018, lng: 77.0285 },
    { id: 27, type: 'DFO', name: 'DIC Thiruvananthapuram', state: 'Kerala', stateCode: 'KL', address: 'Vikas Bhavan, Thiruvananthapuram \u2013 695033', phone: '+91 471 232 6756', hours: 'Mon\u2013Sat: 10:00 AM \u2013 5:00 PM', rating: 4.5, reviews: 59, status: 'open', services: svc('District Facilitation','Scheme Applications','UDYAM Registration','Credit Linkage'), lat: 8.5074, lng: 76.9570 }
  ]
  var _brTypeFilter = 'all'
  var _brState = 'All States'
  var _brSearch = ''
  var _brSelected = 3   // default selected branch id (Mumbai)
  var _brInit = false

  function brStars(rating) {
    const full = Math.floor(rating), half = rating - full >= 0.5
    let s = ''
    for (let i = 0; i < full; i++) s += '<i class="fas fa-star"></i>'
    if (half) s += '<i class="fas fa-star-half-alt"></i>'
    for (let i = full + (half ? 1 : 0); i < 5; i++) s += '<i class="far fa-star"></i>'
    return s
  }
  function brMapsUrl(b) { return 'https://maps.google.com/?q=' + b.lat + ',' + b.lng }
  function brEmbedUrl(b) { return 'https://maps.google.com/maps?q=' + b.lat + ',' + b.lng + '&z=14&output=embed' }
  function brFiltered() {
    const q = _brSearch.trim().toLowerCase()
    return BRANCHES.filter((b) => {
      if (_brTypeFilter !== 'all' && b.type !== _brTypeFilter) return false
      if (_brState !== 'All States' && b.state !== _brState) return false
      if (q) {
        const hay = (b.name + ' ' + b.state + ' ' + b.address + ' ' + b.services.join(' ')).toLowerCase()
        if (hay.indexOf(q) < 0) return false
      }
      return true
    })
  }

  function renderBranchStats() {
    setText('bstat-total', String(BRANCHES.length))
    const states = {}; BRANCHES.forEach((b) => { states[b.state] = 1 })
    setText('bstat-states', String(Object.keys(states).length))
    setText('bstat-di', String(BRANCHES.filter((b) => b.type === 'DI').length))
    setText('bstat-tc', String(BRANCHES.filter((b) => b.type === 'TC').length))
    setText('bstat-dfo', String(BRANCHES.filter((b) => b.type === 'DFO').length))
  }

  function renderStateDropdown() {
    const sel = document.getElementById('branch-state-select'); if (!sel || sel.dataset.filled) return
    const states = {}; BRANCHES.forEach((b) => { states[b.state] = 1 })
    const opts = ['All States'].concat(Object.keys(states).sort())
    sel.innerHTML = opts.map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('')
    sel.dataset.filled = '1'
  }

  function renderBranchMapAndDetail() {
    const b = BRANCHES.find((x) => x.id === _brSelected) || BRANCHES[0]
    if (!b) return
    // Map
    const frame = document.getElementById('branch-map-frame')
    if (frame && frame.getAttribute('data-bid') !== String(b.id)) {
      frame.src = brEmbedUrl(b)
      frame.setAttribute('data-bid', String(b.id))
    }
    setText('branch-map-active', b.name + ' \u00b7 ' + b.state)
    const openBtn = document.getElementById('branch-open-maps'); if (openBtn) openBtn.href = brMapsUrl(b)
    // Detail card
    const tm = TYPE_META[b.type]
    const detail = document.getElementById('branch-detail'); if (!detail) return
    const isOpen = b.status === 'open'
    detail.innerHTML =
      '<div class="branch-detail-band">' +
        '<div class="branch-detail-icon" style="background:' + tm.iconBg + '">' + tm.icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="branch-detail-name">' + esc(b.name) + '</div>' +
          '<div class="branch-detail-meta"><span class="branch-type-badge" style="background:' + tm.badgeBg + ';color:' + tm.badgeText + '">' + tm.code + '</span> ' + esc(tm.full) + ' \u00b7 ' + esc(b.state) + '</div>' +
        '</div>' +
        '<div class="branch-detail-rating"><div class="stars">' + brStars(b.rating) + '</div><div class="rnum">' + b.rating.toFixed(1) + '</div><div class="rrev">' + b.reviews + ' reviews</div></div>' +
      '</div>' +
      '<div class="branch-detail-grid">' +
        '<div class="bd-field"><div class="bd-label"><i class="fas fa-map-marker-alt"></i> Address</div><div class="bd-value">' + esc(b.address) + '</div></div>' +
        '<div class="bd-field"><div class="bd-label"><i class="fas fa-phone"></i> Phone</div><div class="bd-value"><a href="tel:' + esc(b.phone.replace(/[^+0-9]/g, '')) + '">' + esc(b.phone) + '</a></div></div>' +
        '<div class="bd-field"><div class="bd-label"><i class="fas fa-clock"></i> Hours</div><div class="bd-value">' + esc(b.hours) + '</div></div>' +
        '<div class="bd-field"><div class="bd-label"><i class="fas fa-circle-check"></i> Status</div><div class="bd-value">' + (isOpen ? '<span style="color:var(--emerald);font-weight:700">Open Now</span>' : '<span style="color:var(--red);font-weight:700">Closed</span>') + '</div></div>' +
      '</div>' +
      '<div class="branch-detail-services"><div class="bd-label">Services Available</div><div class="branch-services">' + b.services.map((s) => '<span class="branch-service-tag">' + esc(s) + '</span>').join('') + '</div></div>' +
      '<div class="branch-detail-actions">' +
        '<button class="btn btn-orange" onclick="branchDirections(' + b.id + ')"><i class="fas fa-compass"></i> Get Directions</button>' +
        '<button class="btn btn-navy" onclick="branchAppointment(' + b.id + ')"><i class="fas fa-calendar-check"></i> Book Appointment</button>' +
        '<button class="btn btn-outline-navy" onclick="branchCall(' + b.id + ')"><i class="fas fa-phone"></i> Call Branch</button>' +
      '</div>'
  }

  function renderBranchList() {
    const list = brFiltered()
    const cont = document.getElementById('branch-list'); if (!cont) return
    setText('branch-list-count', String(list.length))
    setText('branch-result-count', list.length + ' of ' + BRANCHES.length + ' branches')
    // Clear button visibility
    const clearBtn = document.getElementById('branch-clear-btn')
    const active = _brSearch !== '' || _brState !== 'All States' || _brTypeFilter !== 'all'
    if (clearBtn) clearBtn.style.display = active ? '' : 'none'
    if (!list.length) {
      cont.innerHTML = '<div class="branch-empty"><div class="be-emoji">\uD83D\uDD0D</div><div class="be-title">No branches found</div><div class="be-sub">Try adjusting your search or filters</div></div>'
      return
    }
    cont.innerHTML = list.map((b) => {
      const tm = TYPE_META[b.type]
      const isActive = b.id === _brSelected
      const isOpen = b.status === 'open'
      const statusPill = isOpen
        ? '<span class="bl-status open">Open</span>'
        : '<span class="bl-status closed">Closed</span>'
      const servicesExp = isActive
        ? '<div class="branch-services" style="margin-top:9px">' + b.services.map((s) => '<span class="branch-service-tag sm">' + esc(s) + '</span>').join('') + '</div>'
        : ''
      return '<div class="branch-list-card blc-' + b.type.toLowerCase() + (isActive ? ' active' : '') + '" onclick="selectBranch(' + b.id + ')">' +
        '<div class="blc-head">' +
          '<div class="blc-icon" style="background:' + tm.iconBg + '">' + tm.icon + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="blc-name">' + esc(b.name) + '</div>' +
            '<div class="blc-sub"><span class="branch-type-badge sm" style="background:' + tm.badgeBg + ';color:' + tm.badgeText + '">' + tm.code + '</span> ' + esc(b.state) + '</div>' +
          '</div>' +
          statusPill +
        '</div>' +
        '<div class="blc-rows">' +
          '<div class="blc-row clamp2"><i class="fas fa-map-marker-alt"></i> ' + esc(b.address) + '</div>' +
          '<div class="blc-row"><i class="fas fa-phone"></i> ' + esc(b.phone) + '</div>' +
          '<div class="blc-row"><i class="fas fa-clock"></i> ' + esc(b.hours) + '</div>' +
          '<div class="blc-row"><span class="stars sm">' + brStars(b.rating) + '</span> ' + b.rating.toFixed(1) + ' \u00b7 ' + b.reviews + ' reviews</div>' +
        '</div>' +
        servicesExp +
        '<div class="blc-actions">' +
          '<button class="btn-sm ' + (isActive ? 'gold' : 'navy') + '" onclick="event.stopPropagation();branchDirections(' + b.id + ')"><i class="fas fa-compass"></i> Directions</button>' +
          '<button class="btn-sm outline" onclick="event.stopPropagation();branchAppointment(' + b.id + ')"><i class="fas fa-calendar-check"></i> Appointment</button>' +
        '</div>' +
        '</div>'
    }).join('')
  }

  function renderBranchAll() {
    renderBranchStats()
    renderStateDropdown()
    renderBranchMapAndDetail()
    renderBranchList()
  }
  function loadBranches() {
    if (!_brInit) { _brInit = true }
    renderBranchAll()
  }
  window._loadBranches = loadBranches

  window.selectBranch = function (id) {
    _brSelected = id
    renderBranchMapAndDetail()
    renderBranchList()
    // scroll detail into view on small screens
    const d = document.getElementById('branch-map-panel')
    if (d && window.innerWidth <= 1100) d.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  window.filterBranchesType = function (type, btn) {
    _brTypeFilter = type
    document.querySelectorAll('#branch-type-pills .branch-filter-btn').forEach((b) => b.classList.remove('active'))
    if (btn) btn.classList.add('active')
    renderBranchList()
  }
  window.filterBranchesState = function (v) { _brState = v || 'All States'; renderBranchList() }
  window.searchBranches = function (v) {
    _brSearch = v || ''
    const clr = document.getElementById('branch-search-clear'); if (clr) clr.style.display = _brSearch ? '' : 'none'
    renderBranchList()
  }
  window.clearBranchSearch = function () {
    _brSearch = ''
    const inp = document.getElementById('branch-search-input'); if (inp) inp.value = ''
    const clr = document.getElementById('branch-search-clear'); if (clr) clr.style.display = 'none'
    renderBranchList()
  }
  window.clearBranchFilters = function () {
    _brTypeFilter = 'all'; _brState = 'All States'; _brSearch = ''
    const inp = document.getElementById('branch-search-input'); if (inp) inp.value = ''
    const sel = document.getElementById('branch-state-select'); if (sel) sel.value = 'All States'
    const clr = document.getElementById('branch-search-clear'); if (clr) clr.style.display = 'none'
    document.querySelectorAll('#branch-type-pills .branch-filter-btn').forEach((b) => b.classList.remove('active'))
    const allBtn = document.querySelector('#branch-type-pills .branch-filter-btn[data-filter="all"]'); if (allBtn) allBtn.classList.add('active')
    renderBranchList()
  }
  window.branchDirections = function (id) {
    const b = BRANCHES.find((x) => x.id === id); if (!b) return
    window.open('https://www.google.com/maps/dir/?api=1&destination=' + b.lat + ',' + b.lng, '_blank', 'noopener')
  }
  window.branchAppointment = function (id) {
    const b = BRANCHES.find((x) => x.id === id); if (!b) return
    toast('Appointment request sent to ' + b.name + '. They will contact your registered number.')
  }
  window.branchCall = function (id) {
    const b = BRANCHES.find((x) => x.id === id); if (!b) return
    window.location.href = 'tel:' + b.phone.replace(/[^+0-9]/g, '')
  }
  window.exportBranches = function () {
    const rows = [['Name', 'Type', 'State', 'Address', 'Phone', 'Hours', 'Rating', 'Reviews', 'Status']]
    BRANCHES.forEach((b) => rows.push([b.name, TYPE_META[b.type].full, b.state, b.address.replace(/"/g, "'"), b.phone, b.hours, b.rating, b.reviews, b.status]))
    const csv = rows.map((r) => r.map((c) => '"' + String(c) + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'msme-branches.csv'; a.click(); URL.revokeObjectURL(a.href)
    toast('Branch list exported')
  }

  // ---------- ELIGIBILITY ENGINE ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
  function val(id) { const el = document.getElementById(id); return el ? el.value : '' }
  function toggleVal(id) { const g = document.getElementById(id); if (!g) return ''; const b = g.querySelector('.toggle-btn.active'); return b ? b.getAttribute('data-val') : '' }

  // Gather all wizard inputs into the engine's expected shape
  function collectEligibilityInputs() {
    return {
      sector: val('ef-sector') || undefined,
      social_category: val('ef-social') || 'General',
      gender: val('ef-gender') || 'Male',
      is_rural: Number(toggleVal('ef-rural') || 0),
      state: val('ef-state') || undefined,
      business_age: Number(val('ef-age') || 0),
      investment: Number(val('ef-investment') || 0),
      turnover: Number(val('ef-turnover') || 0),
      udyam_registered: Number(val('ef-udyam') || 0)
    }
  }

  // Live MSME classification badge (Step 2 / Step 3)
  let _classifyTimer = null
  window.updateClassification = function () {
    const inv = Number(val('ef-investment') || 0)
    const to = Number(val('ef-turnover') || 0)
    const elText = document.getElementById('ef-class-text')
    if (!elText) return
    if (!inv && !to) { elText.textContent = 'Enter investment & turnover\u2026'; return }
    clearTimeout(_classifyTimer)
    _classifyTimer = setTimeout(async () => {
      try {
        const r = await API.classifyMSME(inv, to)
        if (r.classification) {
          elText.innerHTML = 'Your enterprise is <span style="color:var(--royal-blue)">' + r.classification + '</span>'
        } else {
          elText.innerHTML = '<span style="color:#ef4444">Exceeds MSME limits</span> (Investment > \u20b9125cr or Turnover > \u20b9500cr)'
        }
      } catch (e) {}
    }, 350)
  }

  function fmtINR(n) { n = Number(n) || 0; if (n >= 1e7) return '\u20b9' + (n / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr'; if (n >= 1e5) return '\u20b9' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' L'; return '\u20b9' + n.toLocaleString('en-IN') }

  function renderSchemeCard(r) {
    const blocked = !r.eligible
    const statusClass = blocked ? 'no' : 'ok'
    const statusText = blocked ? '\u2717 Not Eligible' : '\u2713 Eligible'
    const newTag = r.is_new ? '<span class="es-tag-new">NEW</span>' : ''
    const benefit = r.max_benefit ? fmtINR(r.max_benefit) : (r.subsidy_pct ? r.subsidy_pct + '% subsidy' : '\u2014')

    // Why qualify / why not
    const blockerList = (r.blockers || []).map((b) => '<li><i class="fas fa-ban" style="color:#f87171"></i>' + esc(b) + '</li>').join('')
    const reasonList = (r.reasons || []).slice(0, 5).map((rs) => {
      const warn = rs.indexOf('\u26a0') === 0 || /Missing|required/i.test(rs)
      return '<li><i class="fas ' + (warn ? 'fa-exclamation-triangle" style="color:#fbbf24' : 'fa-check" style="color:#4ade80') + '"></i>' + esc(rs) + '</li>'
    }).join('')

    const benefitsHtml = (r.benefits || []).length ? '<h5>Benefits</h5><ul>' + r.benefits.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>' : ''
    const docsHtml = (r.required_docs || []).length ? '<h5>Documents Required</h5><div>' + r.required_docs.map((d) => '<span class="es-chip">' + esc(d) + '</span>').join('') + '</div>' : ''
    const procHtml = r.application_process ? '<h5>How to Apply</h5><p>' + esc(r.application_process) + '</p>' : ''
    const tipsHtml = (r.success_tips || []).length ? '<h5>Success Tips</h5><ul>' + r.success_tips.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : ''
    const deadlineHtml = r.deadline ? '<h5>Deadline</h5><p>' + esc(r.deadline) + '</p>' : ''
    const applyBtn = r.application_link ? '<a class="es-apply" href="' + esc(r.application_link) + '" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Apply on official portal</a>' : ''

    return '<div class="es-card ' + (blocked ? 'blocked' : '') + '">' +
      '<div class="es-head"><div><h4>' + esc(r.name) + newTag + '</h4>' +
      '<div class="es-meta">' + esc(r.category || '') + (r.ministry ? ' \u00b7 ' + esc(r.ministry) : '') + ' \u00b7 Up to ' + benefit + '</div></div>' +
      '<span class="es-status ' + statusClass + '">' + statusText + '</span></div>' +
      '<div class="es-bar ' + statusClass + '"><div style="width:' + r.score + '%"></div></div>' +
      '<ul class="es-reasons">' + (blocked ? blockerList : reasonList) + '</ul>' +
      '<button class="es-toggle" onclick="this.closest(\'.es-card\').classList.toggle(\'open\'); this.textContent = this.closest(\'.es-card\').classList.contains(\'open\') ? \'\u2212 Hide details\' : \'+ View benefits, documents & how to apply\'">+ View benefits, documents &amp; how to apply</button>' +
      '<div class="es-detail">' + benefitsHtml + docsHtml + procHtml + deadlineHtml + tipsHtml + applyBtn + '</div>' +
      '</div>'
  }

  window.runEligibility = async function () {
    const inputs = collectEligibilityInputs()
    // Input validation
    if (!inputs.sector) { toast('Please select a Business Type (Step 1)'); window.nextStep(1); return }
    if (!inputs.investment || inputs.investment <= 0) { toast('Please enter a valid Investment amount (Step 2)'); window.nextStep(2); return }
    if (!inputs.turnover || inputs.turnover <= 0) { toast('Please enter a valid Annual Turnover (Step 3)'); return }

    window.nextStep(4)
    const cards = document.getElementById('elig-scheme-cards')
    cards.innerHTML = '<div style="color:#fff;opacity:.7;grid-column:1/-1;text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> Analyzing your profile against latest govt criteria\u2026</div>'
    try {
      const d = await API.computeEligibility(inputs)
      setText('elig-score', (d.readiness_score || 0) + '%')
      const eligible = d.results.filter((r) => r.eligible)
      const clsNote = d.classification ? ('Classified as <strong>' + d.classification + '</strong> \u2014 ') : ''
      document.getElementById('elig-sub').innerHTML =
        clsNote + 'your business qualifies for <strong>' + eligible.length + ' of ' + d.results.length + ' schemes</strong>, ranked by match score.'
      cards.innerHTML = d.results.map(renderSchemeCard).join('')
      await loadDashboard()
      toast('Eligibility computed: ' + eligible.length + ' schemes matched')
    } catch (e) {
      cards.innerHTML = '<div style="color:#fff;grid-column:1/-1">' + esc(e.data?.error || 'Failed to compute eligibility') + '</div>'
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

  // NOTE: Chart rendering (Van Gogh palette + live data) is handled by the
  // single authoritative initCharts() defined inline in index.html, which reads
  // window.financeData and tracks window.revenueChartInstance/expenseChartInstance.

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

  // ---------- WHAT'S NEW ----------
  let _whatsNewLoaded = false
  async function loadWhatsNew() {
    const list = document.getElementById('whats-new-list')
    if (!list) return
    try {
      const { updates } = await API.whatsNew()
      if (!updates || !updates.length) { list.innerHTML = '<div class="text-xs text-gray">No recent updates.</div>'; return }
      const tagColors = { new: ['NEW', '16,185,129'], updated: ['UPDATED', '37,99,235'], budget: ['BUDGET', '139,92,246'], deadline: ['DEADLINE', '239,68,68'] }
      list.innerHTML = updates.map((u) => {
        const t = tagColors[u.tag] || ['INFO', '107,114,128']
        return '<div style="border:1px solid var(--gray-200);border-radius:10px;padding:14px;background:#fff">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<span style="font-size:9px;font-weight:800;letter-spacing:.04em;color:rgb(' + t[1] + ');background:rgba(' + t[1] + ',.1);padding:2px 8px;border-radius:999px">' + t[0] + '</span>' +
          (u.effective_date ? '<span class="text-xs text-gray">' + esc(u.effective_date) + '</span>' : '') + '</div>' +
          '<h4 style="font-size:13px;font-weight:700;color:var(--navy);margin:0 0 4px">' + esc(u.title) + '</h4>' +
          '<p style="font-size:11px;color:var(--gray-500);line-height:1.5;margin:0">' + esc(u.summary || '') + '</p>' +
          (u.source ? '<div class="text-xs text-gray" style="margin-top:6px"><i class="fas fa-link" style="font-size:9px"></i> ' + esc(u.source) + '</div>' : '') +
          '</div>'
      }).join('')
      _whatsNewLoaded = true
    } catch (e) {
      list.innerHTML = '<div class="text-xs text-gray">Could not load updates.</div>'
    }
  }

  // ---------- Hook navigation to lazy-load page data ----------
  const _navigate = window.navigate
  window.navigate = function (page) {
    _navigate(page)
    if (page === 'documents') loadDocuments()
    else if (page === 'notifications') loadNotifications()
    else if (page === 'dashboard') loadDashboard()
    else if (page === 'eligibility' && !_whatsNewLoaded) loadWhatsNew()
    else if (page === 'finance') loadFinance()
    else if (page === 'profile') loadProfile()
    else if (page === 'branches') loadBranches()
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
