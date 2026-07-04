function setMessage(elementId, text, type) {
  const element = document.getElementById(elementId);
  element.textContent = text;
  element.className = `message ${type || ''}`.trim();
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showView(viewId) {
  ['loginView', 'registerView', 'registrationOtpView', 'otpView', 'forgotPasswordView'].forEach((id) => {
    document.getElementById(id).classList.toggle('hidden', id !== viewId);
  });
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { response, data };
}

document.getElementById('showRegister').addEventListener('click', () => {
  setMessage('loginMessage', '', '');
  showView('registerView');
});

document.getElementById('showLogin').addEventListener('click', () => {
  setMessage('registerMessage', '', '');
  showView('loginView');
});

document.getElementById('showForgotPassword').addEventListener('click', () => {
  document.getElementById('forgotEmail').value = document.getElementById('identifier').value;
  setMessage('loginMessage', '', '');
  showView('forgotPasswordView');
});

document.getElementById('backToLoginFromOtp').addEventListener('click', () => {
  setMessage('otpMessage', '', '');
  showView('loginView');
});

document.getElementById('backToLoginFromForgot').addEventListener('click', () => {
  setMessage('forgotPasswordMessage', '', '');
  setMessage('resetPasswordMessage', '', '');
  showView('loginView');
});

document.getElementById('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  setMessage('registerMessage', 'Registering customer...', '');

  try {
    const formData = readForm(event.target);
    const { response, data } = await postJson('/api/auth/register', formData);
    if (!response.ok) {
      setMessage('registerMessage', data.message || 'Registration failed', 'error');
      return;
    }

    document.getElementById('registrationId').value = data.data.registrationId;
    document.getElementById('identifier').value = formData.email;
    event.target.reset();
    showView('registrationOtpView');
    setMessage('registrationOtpMessage', 'Registration OTP sent to your email.', 'success');
  } catch {
    setMessage('registerMessage', 'Unable to register. Check that the server is running.', 'error');
  }
});

document.getElementById('registrationOtpForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  setMessage('registrationOtpMessage', 'Verifying registration OTP...', '');

  try {
    const { response, data } = await postJson('/api/auth/verify-registration', readForm(event.target));
    if (!response.ok) {
      setMessage('registrationOtpMessage', data.message || 'Registration verification failed', 'error');
      return;
    }

    event.target.reset();
    showView('loginView');
    setMessage('loginMessage', 'Registration verified. Sign in with your email.', 'success');
  } catch {
    setMessage('registrationOtpMessage', 'Unable to verify registration. Check the server.', 'error');
  }
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  setMessage('loginMessage', 'Verifying password and generating OTP...', '');

  try {
    const { response, data } = await postJson('/api/auth/login', readForm(event.target));
    if (!response.ok) {
      setMessage('loginMessage', data.message || 'Login failed', 'error');
      return;
    }

    document.getElementById('sessionId').value = data.data.sessionId;
    showView('otpView');
    setMessage('otpMessage', 'OTP generated. Check the server terminal for the OTP.', 'success');
  } catch {
    setMessage('loginMessage', 'Unable to log in. Check that the server is running.', 'error');
  }
});

document.getElementById('forgotPasswordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  setMessage('forgotPasswordMessage', 'Sending password reset OTP...', '');

  try {
    const { response, data } = await postJson('/api/auth/forgot-password', readForm(event.target));
    if (!response.ok) {
      setMessage('forgotPasswordMessage', data.message || 'Unable to start reset', 'error');
      return;
    }

    document.getElementById('resetPasswordForm').classList.remove('hidden');
    setMessage('forgotPasswordMessage', data.message, 'success');
  } catch {
    setMessage('forgotPasswordMessage', 'Unable to send reset OTP. Check that the server is running.', 'error');
  }
});

document.getElementById('resetPasswordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  setMessage('resetPasswordMessage', 'Resetting password...', '');

  try {
    const { response, data } = await postJson('/api/auth/reset-password', readForm(event.target));
    if (!response.ok) {
      setMessage('resetPasswordMessage', data.message || 'Password reset failed', 'error');
      return;
    }

    event.target.reset();
    showView('loginView');
    setMessage('loginMessage', 'Password reset successful. Sign in with your new password.', 'success');
  } catch {
    setMessage('resetPasswordMessage', 'Unable to reset password. Check that the server is running.', 'error');
  }
});

document.getElementById('otpForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  setMessage('otpMessage', 'Verifying OTP...', '');

  try {
    const { response, data } = await postJson('/api/auth/verify-otp', readForm(event.target));
    if (!response.ok) {
      setMessage('otpMessage', data.message || 'OTP verification failed', 'error');
      return;
    }

    setMessage('otpMessage', 'Authentication successful. Redirecting to profile...', 'success');
    window.location.href = '/profile.html';
  } catch {
    setMessage('otpMessage', 'Unable to verify OTP. Check that the server is running.', 'error');
  }
});
