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

async function loadProfile() {
  setMessage('profileMessage', 'Loading profile...', '');

  try {
    const { response, data } = await requestJson('/api/profile');
    if (!response.ok) {
      setText('profileName', 'NOT SIGNED IN');
      setText('profileEmail', 'No active session');
      setText('profileRole', '-');
      setText('profileStatus', 'LOCKED');
      setText('sessionStatus', 'INACTIVE');
      setMessage('profileMessage', 'Not authenticated. Please log in first.', 'error');
      return;
    }

    const profile = data.data;
    setText('profileName', profile.username);
    setText('profileEmail', profile.email);
    setText('profileRole', profile.role);
    setText('profileStatus', 'ACTIVE');
    setText('joinedDate', formatDate(profile.createdAt));
    setText('lastLogin', formatDate(new Date()));
    setText('sessionStatus', `ACTIVE ${profile.role}`);
    document.getElementById('enableMfaButton').textContent = profile.mfaEnabled ? '2FA ENABLED' : 'ENABLE 2FA';
    document.getElementById('enableMfaButton').disabled = Boolean(profile.mfaEnabled);
    setMessage('profileMessage', 'Authenticated profile loaded.', 'success');
  } catch {
    setMessage('profileMessage', 'Unable to load profile. Check that the server is running.', 'error');
  }
}

async function loadAdminUsers() {
  setMessage('adminMessage', 'Loading admin users...', '');
  const tableBody = document.getElementById('adminUsersBody');
  tableBody.replaceChildren();

  try {
    const { response, data } = await requestJson('/api/admin/users');
    if (!response.ok) {
      setMessage('adminMessage', data.message || 'Admin access denied', 'error');
      return;
    }

    data.data.forEach((user) => {
      const row = document.createElement('tr');
      [user.username, user.email, user.role, new Date(user.createdAt).toLocaleString()].forEach(
        (value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        }
      );

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
      button.textContent = 'UPDATE';
      button.addEventListener('click', () => updateUserRole(user.id, select.value));
      actionCell.append(select, button);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });

    setMessage('adminMessage', 'Admin users loaded.', 'success');
  } catch {
    setMessage('adminMessage', 'Unable to load admin users. Check that the server is running.', 'error');
  }
}

async function updateUserRole(userId, role) {
  setMessage('adminMessage', 'Updating user role...', '');

  try {
    const { response, data } = await requestJson(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setMessage('adminMessage', data.message || 'Unable to update role', 'error');
      return;
    }

    setMessage('adminMessage', 'Role updated.', 'success');
    loadAdminUsers();
  } catch {
    setMessage('adminMessage', 'Unable to update role. Check that the server is running.', 'error');
  }
}

async function enableMfa() {
  setMessage('profileMessage', 'Enabling two-factor authentication...', '');

  try {
    const { response, data } = await requestJson('/api/profile/mfa/enable', {
      method: 'POST',
    });

    if (!response.ok) {
      setMessage('profileMessage', data.message || 'Unable to enable 2FA', 'error');
      return;
    }

    setMessage('profileMessage', 'Two-factor authentication enabled.', 'success');
    loadProfile();
  } catch {
    setMessage('profileMessage', 'Unable to enable 2FA. Check that the server is running.', 'error');
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

document.getElementById('refreshProfile').addEventListener('click', loadProfile);
document.getElementById('loadAdminUsers').addEventListener('click', loadAdminUsers);
document.getElementById('enableMfaButton').addEventListener('click', enableMfa);
document.getElementById('logoutButton').addEventListener('click', logout);
document.getElementById('sidebarLogout').addEventListener('click', logout);
setText('todayBadge', new Date().toLocaleDateString());

loadProfile();
