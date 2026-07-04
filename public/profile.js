const ADMIN_ONLY_MESSAGE =
  'ADMIN role required. Run npm run seed and sign in as admin@securefin.test to manage users and roles.';

let currentProfile = null;

function setMessage(elementId, text, type) {
  const element = document.getElementById(elementId);
  element.textContent = text;
  element.className = `message ${type || ''}`.trim();
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    credentials: 'include',
    ...(options || {}),
  });

  const data = await response.json();
  return { response, data };
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function setText(elementId, text) {
  document.getElementById(elementId).textContent = text;
}

function notificationKey() {
  return currentProfile ? `securefin-notify-${currentProfile.id}` : 'securefin-notify-guest';
}

function loadNotificationPrefs() {
  const saved = localStorage.getItem(notificationKey());
  if (!saved) return;

  try {
    const prefs = JSON.parse(saved);
    const form = document.getElementById('notificationForm');
    form.loginAlerts.checked = Boolean(prefs.loginAlerts);
    form.securityAlerts.checked = Boolean(prefs.securityAlerts);
    form.productUpdates.checked = Boolean(prefs.productUpdates);
  } catch {
    // Ignore invalid saved preferences.
  }
}

function saveNotificationPrefs(event) {
  event.preventDefault();
  const form = event.target;
  const prefs = {
    loginAlerts: form.loginAlerts.checked,
    securityAlerts: form.securityAlerts.checked,
    productUpdates: form.productUpdates.checked,
  };
  localStorage.setItem(notificationKey(), JSON.stringify(prefs));
  setMessage('notificationMessage', 'Notification preferences saved.', 'success');
}

function updateHeader(profile) {
  const initial = profile.username ? profile.username.charAt(0).toUpperCase() : '?';
  setText('headerAvatar', initial);
  setText('headerTitle', `Welcome, ${profile.username}`);
  setText('headerEmail', profile.email);
  setText('headerRole', profile.role);
  setText('headerMfa', profile.mfaEnabled ? `2FA ON (${formatMfaMethod(profile.mfaMethod, true)})` : '2FA OFF');

  const mfaChip = document.getElementById('headerMfa');
  mfaChip.classList.toggle('mfa-on', Boolean(profile.mfaEnabled));
  mfaChip.classList.toggle('mfa-off', !profile.mfaEnabled);

  document.querySelectorAll('.admin-col').forEach((element) => {
    element.classList.toggle('hidden', profile.role !== 'ADMIN');
  });

  if (profile.role === 'ADMIN') {
    setText('auditDescription', 'Security events across all users (admin view).');
  }
}

function updatePersonalTab(profile) {
  setText('personalUsername', profile.username);
  setText('personalEmail', profile.email);
  setText('personalRole', profile.role);
  setText('personalJoined', formatDate(profile.createdAt));
  setText('personalLastLogin', formatDate(new Date()));
  setText('personalSession', `ACTIVE ${profile.role}`);
}

function formatMfaMethod(method, enabled = false) {
  if (method === 'TOTP') return 'Authenticator';
  if (method === 'EMAIL') return 'Email';
  return enabled ? 'Email' : 'Off';
}

function updateMfaUi(profile) {
  const setupPanel = document.getElementById('mfaSetupPanel');
  const authenticatorPanel = document.getElementById('authenticatorSetupPanel');
  const enabledPanel = document.getElementById('mfaEnabledPanel');
  const activeMethod = document.getElementById('mfaActiveMethod');
  const setupIntro = document.getElementById('mfaSetupIntro');
  const enableButton = document.getElementById('startMfaSetup');
  const disableButton = document.getElementById('disableMfa');
  const selectedMethod = getSelectedMfaMethod();

  authenticatorPanel.classList.add('hidden');
  setupPanel.classList.remove('hidden');

  if (profile.mfaEnabled) {
    enabledPanel.classList.remove('hidden');
    if (setupIntro) setupIntro.textContent = '2FA is on. You can switch method or disable it below.';
    activeMethod.textContent =
      profile.mfaMethod === 'TOTP' ? 'Microsoft Authenticator' : 'Email OTP';
    disableButton.classList.remove('hidden');

    document.querySelectorAll('input[name="mfaMethodChoice"]').forEach((input) => {
      input.checked = input.value === (profile.mfaMethod || 'EMAIL');
    });

    if (selectedMethod === profile.mfaMethod) {
      enableButton.textContent = '2FA Active';
      enableButton.disabled = true;
    } else {
      enableButton.textContent =
        selectedMethod === 'TOTP' ? 'Switch to Microsoft Authenticator' : 'Switch to Email OTP';
      enableButton.disabled = false;
    }
    return;
  }

  enabledPanel.classList.add('hidden');
  disableButton.classList.add('hidden');
  enableButton.textContent = 'Enable 2FA';
  enableButton.disabled = false;
  if (setupIntro) {
    setupIntro.textContent =
      '2FA is off by default. Choose email OTP or Microsoft Authenticator when you are ready.';
  }
}

document.querySelectorAll('input[name="mfaMethodChoice"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (currentProfile) updateMfaUi(currentProfile);
  });
});

function getSelectedMfaMethod() {
  const selected = document.querySelector('input[name="mfaMethodChoice"]:checked');
  return selected ? selected.value : 'EMAIL';
}

async function startMfaSetup() {
  const method = getSelectedMfaMethod();

  if (currentProfile?.mfaEnabled && method === currentProfile.mfaMethod) {
    return;
  }

  if (currentProfile?.mfaEnabled && method !== currentProfile.mfaMethod) {
    setMessage('mfaMessage', 'Switching 2FA method...', '');
    try {
      const { response, data } = await requestJson('/api/profile/mfa/disable', { method: 'POST' });
      if (!response.ok) {
        setMessage('mfaMessage', data.message || 'Unable to switch 2FA method', 'error');
        return;
      }
      currentProfile = data.data;
    } catch {
      setMessage('mfaMessage', 'Unable to switch 2FA method. Check that the server is running.', 'error');
      return;
    }
  }

  setMessage('mfaMessage', method === 'EMAIL' ? 'Enabling email OTP...' : 'Preparing authenticator setup...', '');

  try {
    if (method === 'EMAIL') {
      const { response, data } = await requestJson('/api/profile/mfa/email', { method: 'POST' });
      if (!response.ok) {
        setMessage('mfaMessage', data.message || 'Unable to enable email OTP', 'error');
        return;
      }

      currentProfile = data.data;
      updateHeader(currentProfile);
      updateMfaUi(currentProfile);
      setMessage('mfaMessage', 'Email OTP two-factor authentication enabled.', 'success');
      loadAuditTrails();
      return;
    }

    const { response, data } = await requestJson('/api/profile/mfa/authenticator/setup', { method: 'POST' });
    if (!response.ok) {
      setMessage('mfaMessage', data.message || 'Unable to start authenticator setup', 'error');
      return;
    }

    document.getElementById('mfaSetupPanel').classList.add('hidden');
    document.getElementById('mfaEnabledPanel').classList.add('hidden');
    document.getElementById('authenticatorSetupPanel').classList.remove('hidden');
    document.getElementById('authenticatorQr').src = data.data.qrCodeDataUrl;
    document.getElementById('authenticatorSecret').textContent = data.data.manualSecret;
    setMessage('mfaMessage', 'Scan the QR code, then verify with a 6-digit code.', 'success');
  } catch {
    setMessage('mfaMessage', 'Unable to configure 2FA. Check that the server is running.', 'error');
  }
}

function cancelAuthenticatorSetup() {
  document.getElementById('authenticatorSetupPanel').classList.add('hidden');
  document.getElementById('authenticatorCode').value = '';
  document.getElementById('authenticatorQr').removeAttribute('src');
  document.getElementById('authenticatorSecret').textContent = '';
  if (currentProfile) {
    updateMfaUi(currentProfile);
  } else {
    document.getElementById('mfaSetupPanel').classList.remove('hidden');
  }
  setMessage('mfaMessage', '', '');
}

async function verifyAuthenticatorSetup() {
  const code = document.getElementById('authenticatorCode').value.trim();
  if (!/^\d{6}$/.test(code)) {
    setMessage('mfaMessage', 'Enter a valid 6-digit authenticator code.', 'error');
    return;
  }

  setMessage('mfaMessage', 'Verifying authenticator code...', '');

  try {
    const { response, data } = await requestJson('/api/profile/mfa/authenticator/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      setMessage('mfaMessage', data.message || 'Unable to verify authenticator code', 'error');
      return;
    }

    currentProfile = data.data;
    document.getElementById('authenticatorSetupPanel').classList.add('hidden');
    document.getElementById('authenticatorCode').value = '';
    updateHeader(currentProfile);
    updateMfaUi(currentProfile);
    setMessage('mfaMessage', 'Microsoft Authenticator two-factor authentication enabled.', 'success');
    loadAuditTrails();
  } catch {
    setMessage('mfaMessage', 'Unable to verify authenticator code. Check that the server is running.', 'error');
  }
}

async function loadProfile() {
  setMessage('profileMessage', 'Loading profile...', '');

  try {
    const { response, data } = await requestJson('/api/profile');
    if (!response.ok) {
      setText('headerTitle', 'Not signed in');
      setText('headerEmail', 'No active session');
      setMessage('profileMessage', 'Not authenticated. Please log in first.', 'error');
      return;
    }

    currentProfile = data.data;
    updateHeader(currentProfile);
    updatePersonalTab(currentProfile);
    updateMfaUi(currentProfile);
    loadNotificationPrefs();
    setMessage('profileMessage', '', '');
  } catch {
    setMessage('profileMessage', 'Unable to load profile. Check that the server is running.', 'error');
  }
}

function showPanel(panelId) {
  document.querySelectorAll('.dashboard-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== panelId);
  });
  document.querySelectorAll('.side-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.panel === panelId);
  });
}

function showTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabId);
  });
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });
}

function renderAuditRows(entries, tableBody, isAdmin) {
  tableBody.replaceChildren();
  entries.forEach((entry) => {
    const row = document.createElement('tr');
    const cells = [
      formatDate(entry.createdAt),
      entry.action,
      entry.resource || '-',
      entry.outcome,
    ];

    if (isAdmin) {
      cells.push(entry.user ? entry.user.username : '-');
      cells.push(entry.actor ? entry.actor.username : '-');
    }

    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

async function loadAuditTrails() {
  setMessage('auditMessage', 'Loading audit trails...', '');

  try {
    const isAdmin = currentProfile?.role === 'ADMIN';
    const url = isAdmin ? '/api/admin/audit-trails' : '/api/profile/audit-trails';
    const { response, data } = await requestJson(url);

    if (!response.ok) {
      setMessage('auditMessage', data.message || 'Unable to load audit trails', 'error');
      return;
    }

    renderAuditRows(data.data, document.getElementById('auditBody'), isAdmin);
    const message =
      data.data.length === 0
        ? 'No audit entries yet. Sign out and sign in again to generate login events.'
        : `${data.data.length} audit entries loaded.`;
    setMessage('auditMessage', message, data.data.length === 0 ? '' : 'success');
  } catch {
    setMessage('auditMessage', 'Unable to load audit trails. Check that the server is running.', 'error');
  }
}

function renderUsersTable(users, tableBody, includeRoleControls) {
  tableBody.replaceChildren();

  users.forEach((user) => {
    const row = document.createElement('tr');

    if (includeRoleControls) {
      [user.username, user.email, user.role, formatDate(user.createdAt)].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });

      const actionCell = document.createElement('td');
      const select = document.createElement('select');
      ['CUSTOMER', 'ADMIN'].forEach((role) => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        option.selected = user.role === role;
        select.appendChild(option);
      });

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mini-button';
      button.textContent = 'Update';
      button.addEventListener('click', () => updateUserRole(user.id, select.value));
      actionCell.append(select, button);
      row.appendChild(actionCell);
    } else {
      [user.username, user.email, user.role, user.mfaEnabled ? formatMfaMethod(user.mfaMethod) : 'Disabled', formatDate(user.createdAt)].forEach(
        (value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        }
      );
    }

    tableBody.appendChild(row);
  });
}

async function loadUsersList() {
  setMessage('usersMessage', 'Loading users...', '');
  const tableBody = document.getElementById('usersBody');
  tableBody.replaceChildren();

  if (currentProfile?.role !== 'ADMIN') {
    setMessage('usersMessage', ADMIN_ONLY_MESSAGE, 'error');
    return;
  }

  try {
    const { response, data } = await requestJson('/api/admin/users');
    if (!response.ok) {
      setMessage('usersMessage', data.message || 'Unable to load users', 'error');
      return;
    }

    renderUsersTable(data.data, tableBody, false);
    setMessage('usersMessage', `${data.data.length} users loaded.`, 'success');
  } catch {
    setMessage('usersMessage', 'Unable to load users. Check that the server is running.', 'error');
  }
}

async function loadRolesList() {
  setMessage('rolesMessage', 'Loading roles...', '');
  const tableBody = document.getElementById('rolesBody');
  tableBody.replaceChildren();

  if (currentProfile?.role !== 'ADMIN') {
    setMessage('rolesMessage', ADMIN_ONLY_MESSAGE, 'error');
    return;
  }

  try {
    const { response, data } = await requestJson('/api/admin/users');
    if (!response.ok) {
      setMessage('rolesMessage', data.message || 'Unable to load roles', 'error');
      return;
    }

    renderUsersTable(data.data, tableBody, true);
    setMessage('rolesMessage', `${data.data.length} users ready for role updates.`, 'success');
  } catch {
    setMessage('rolesMessage', 'Unable to load roles. Check that the server is running.', 'error');
  }
}

async function updateUserRole(userId, role) {
  setMessage('rolesMessage', 'Updating user role...', '');

  try {
    const { response, data } = await requestJson(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setMessage('rolesMessage', data.message || 'Unable to update role', 'error');
      return;
    }

    setMessage('rolesMessage', 'Role updated successfully.', 'success');
    loadRolesList();
    loadAuditTrails();
  } catch {
    setMessage('rolesMessage', 'Unable to update role. Check that the server is running.', 'error');
  }
}

async function disableMfaSetup() {
  setMessage('mfaMessage', 'Disabling two-factor authentication...', '');

  try {
    const { response, data } = await requestJson('/api/profile/mfa/disable', { method: 'POST' });
    if (!response.ok) {
      setMessage('mfaMessage', data.message || 'Unable to disable 2FA', 'error');
      return;
    }

    currentProfile = data.data;
    updateHeader(currentProfile);
    updateMfaUi(currentProfile);
    setMessage('mfaMessage', '2FA disabled. Choose Email OTP or Microsoft Authenticator to enable again.', 'success');
    loadAuditTrails();
  } catch {
    setMessage('mfaMessage', 'Unable to disable 2FA. Check that the server is running.', 'error');
  }
}

async function logout() {
  setMessage('profileMessage', 'Logging out...', '');

  try {
    await requestJson('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch {
    setMessage('profileMessage', 'Unable to logout. Check that the server is running.', 'error');
  }
}

document.querySelectorAll('.side-link').forEach((link) => {
  link.addEventListener('click', () => {
    showPanel(link.dataset.panel);
    if (link.dataset.panel === 'auditPanel') loadAuditTrails();
    if (link.dataset.panel === 'usersPanel') loadUsersList();
    if (link.dataset.panel === 'rolesPanel') loadRolesList();
  });
});

document.querySelectorAll('.tab-button').forEach((button) => {
  button.addEventListener('click', () => showTab(button.dataset.tab));
});

document.getElementById('notificationForm').addEventListener('submit', saveNotificationPrefs);
document.getElementById('loadAuditTrails').addEventListener('click', loadAuditTrails);
document.getElementById('loadUsers').addEventListener('click', loadUsersList);
document.getElementById('loadRoles').addEventListener('click', loadRolesList);
document.getElementById('disableMfa').addEventListener('click', disableMfaSetup);
document.getElementById('cancelAuthenticatorSetup').addEventListener('click', cancelAuthenticatorSetup);
document.getElementById('startMfaSetup').addEventListener('click', startMfaSetup);
document.getElementById('verifyAuthenticator').addEventListener('click', verifyAuthenticatorSetup);
document.getElementById('logoutButton').addEventListener('click', logout);
setText('todayBadge', new Date().toLocaleDateString());

loadProfile();
