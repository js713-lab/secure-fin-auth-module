const STORAGE_THEME = 'securefin-theme';
const STORAGE_LANG = 'securefin-lang';

const translations = {
  en: {
    'login.eyebrow': 'CUSTOMER PORTAL',
    'login.title': 'WELCOME BACK',
    'login.subtitle': 'Sign in to your account',
    'login.email': 'EMAIL',
    'login.password': 'PASSWORD',
    'login.forgot': 'FORGOT PASSWORD?',
    'login.placeholderEmail': 'Enter your email address',
    'login.placeholderPassword': 'Enter your password',
    'login.signIn': 'SIGN IN',
    'login.noAccount': "DON'T HAVE AN ACCOUNT?",
    'login.createDemo': 'Create demo customer',
    'register.hasAccount': 'ALREADY HAVE AN ACCOUNT?',
    'register.eyebrow': 'NEW CUSTOMER',
    'register.title': 'CREATE ACCOUNT',
    'register.subtitle': 'Register a demo CUSTOMER account',
    'register.username': 'USERNAME',
    'register.email': 'EMAIL',
    'register.password': 'PASSWORD',
    'register.placeholderUsername': 'Choose a username',
    'register.placeholderEmail': 'Enter your email address',
    'register.placeholderPassword': 'Example: Secure@12345',
    'register.passwordHint': 'Use 8+ chars with uppercase, lowercase, number, and special character.',
    'register.create': 'CREATE CUSTOMER',
    'regOtp.eyebrow': 'EMAIL VERIFICATION',
    'regOtp.title': 'VERIFY REGISTER',
    'regOtp.subtitle': 'Enter the OTP sent to your registration email.',
    'regOtp.otp': 'OTP CODE',
    'regOtp.placeholderOtp': 'Enter 6-digit OTP',
    'regOtp.verify': 'VERIFY REGISTRATION',
    'otp.eyebrow': 'MFA REQUIRED',
    'otp.title': 'VERIFY OTP',
    'otp.subtitleEmail': 'Enter the OTP sent to your email.',
    'otp.subtitleTotp': 'Enter the 6-digit code from Microsoft Authenticator.',
    'otp.verify': 'VERIFY OTP',
    'otp.wrongAccount': 'WRONG ACCOUNT?',
    'forgot.eyebrow': 'ACCOUNT RECOVERY',
    'forgot.title': 'RESET PASSWORD',
    'forgot.subtitle': 'We will email a reset OTP if the account exists.',
    'forgot.send': 'SEND RESET OTP',
    'forgot.resetId': 'RESET ID',
    'forgot.placeholderResetId': 'Paste reset ID from email',
    'forgot.newPassword': 'NEW PASSWORD',
    'forgot.reset': 'RESET PASSWORD',
    'forgot.remembered': 'REMEMBERED YOUR PASSWORD?',
    'common.backToSignIn': 'Back to sign in',
    'common.show': 'SHOW',
    'common.hide': 'HIDE',
    'strength.weak': 'WEAK',
    'strength.fair': 'FAIR',
    'strength.good': 'GOOD',
    'strength.strong': 'STRONG',
    'strength.strongOk': 'Strong password. Meets SecureFin policy.',
    'strength.missing': 'Missing',
  },
  bm: {
    'login.eyebrow': 'PORTAL PELANGGAN',
    'login.title': 'SELAMAT KEMBALI',
    'login.subtitle': 'Log masuk ke akaun anda',
    'login.email': 'E-MEL',
    'login.password': 'KATA LALUAN',
    'login.forgot': 'LUPA KATA LALUAN?',
    'login.placeholderEmail': 'Masukkan alamat e-mel anda',
    'login.placeholderPassword': 'Masukkan kata laluan anda',
    'login.signIn': 'LOG MASUK',
    'login.noAccount': 'BELUM MEMPUNYAI AKAUN?',
    'login.createDemo': 'Cipta akaun demo pelanggan',
    'register.hasAccount': 'SUDAH MEMPUNYAI AKAUN?',
    'register.eyebrow': 'PELANGGAN BARU',
    'register.title': 'CIPTA AKAUN',
    'register.subtitle': 'Daftar akaun demo PELANGGAN',
    'register.username': 'NAMA PENGGUNA',
    'register.email': 'E-MEL',
    'register.password': 'KATA LALUAN',
    'register.placeholderUsername': 'Pilih nama pengguna',
    'register.placeholderEmail': 'Masukkan alamat e-mel anda',
    'register.placeholderPassword': 'Contoh: Secure@12345',
    'register.passwordHint': 'Gunakan 8+ aksara dengan huruf besar, huruf kecil, nombor, dan aksara khas.',
    'register.create': 'CIPTA PELANGGAN',
    'regOtp.eyebrow': 'PENGESAHAN E-MEL',
    'regOtp.title': 'SAHKAN PENDAFTARAN',
    'regOtp.subtitle': 'Masukkan OTP yang dihantar ke e-mel pendaftaran anda.',
    'regOtp.otp': 'KOD OTP',
    'regOtp.placeholderOtp': 'Masukkan OTP 6 digit',
    'regOtp.verify': 'SAHKAN PENDAFTARAN',
    'otp.eyebrow': 'MFA DIPERLUKAN',
    'otp.title': 'SAHKAN OTP',
    'otp.subtitleEmail': 'Masukkan OTP yang dihantar ke e-mel anda.',
    'otp.subtitleTotp': 'Masukkan kod 6 digit daripada Microsoft Authenticator.',
    'otp.verify': 'SAHKAN OTP',
    'otp.wrongAccount': 'AKAUN SALAH?',
    'forgot.eyebrow': 'PEMULIHAN AKAUN',
    'forgot.title': 'SET SEMULA KATA LALUAN',
    'forgot.subtitle': 'Kami akan e-mel OTP set semula jika akaun wujud.',
    'forgot.send': 'HANTAR OTP SET SEMULA',
    'forgot.resetId': 'ID SET SEMULA',
    'forgot.placeholderResetId': 'Tampal ID set semula daripada e-mel',
    'forgot.newPassword': 'KATA LALUAN BARU',
    'forgot.reset': 'SET SEMULA KATA LALUAN',
    'forgot.remembered': 'INGAT KATA LALUAN ANDA?',
    'common.backToSignIn': 'Kembali ke log masuk',
    'common.show': 'TUNJUK',
    'common.hide': 'SEMBUNYI',
    'strength.weak': 'LEMAH',
    'strength.fair': 'SIHAT',
    'strength.good': 'BAIK',
    'strength.strong': 'KUAT',
    'strength.strongOk': 'Kata laluan kuat. Memenuhi polisi SecureFin.',
    'strength.missing': 'Tiada',
  },
};

let currentLang = 'en';
let currentTheme = 'light';
let currentOtpMethod = 'EMAIL';

function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted contexts.
  }
}

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

function applyTheme(theme) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = currentTheme === 'dark' ? 'dark' : '';
  savePreference(STORAGE_THEME, currentTheme);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = currentTheme === 'dark' ? 'DARK' : 'LIGHT';
    themeToggle.setAttribute(
      'aria-label',
      currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
  }
}

function applyLanguage(lang) {
  currentLang = lang === 'bm' ? 'bm' : 'en';
  document.documentElement.lang = currentLang === 'bm' ? 'ms' : 'en';
  savePreference(STORAGE_LANG, currentLang);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;
    button.textContent = input.type === 'password' ? t('common.show') : t('common.hide');
  });

  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.textContent = currentLang === 'bm' ? 'BM' : 'EN';
    langToggle.setAttribute(
      'aria-label',
      currentLang === 'bm' ? 'Switch to English' : 'Tukar ke Bahasa Malaysia'
    );
  }

  updateOtpSubtitle(currentOtpMethod);
  refreshPasswordStrength('registerPassword', 'registerPasswordStrength');
  refreshPasswordStrength('newPassword', 'resetPasswordStrength');
}

function updateOtpSubtitle(mfaMethod) {
  currentOtpMethod = mfaMethod === 'TOTP' ? 'TOTP' : 'EMAIL';
  const el = document.getElementById('otpSubtitle');
  if (!el) return;
  el.textContent =
    currentOtpMethod === 'TOTP' ? t('otp.subtitleTotp') : t('otp.subtitleEmail');
}

function initPreferences() {
  applyTheme(readPreference(STORAGE_THEME, 'light'));
  applyLanguage(readPreference(STORAGE_LANG, 'en'));

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    applyLanguage(currentLang === 'bm' ? 'en' : 'bm');
  });
}

initPreferences();

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

function evaluatePasswordStrength(password) {
  const checks = [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /[A-Z]/.test(password), label: 'uppercase letter' },
    { ok: /[a-z]/.test(password), label: 'lowercase letter' },
    { ok: /[0-9]/.test(password), label: 'number' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'special character' },
  ];
  const passed = checks.filter((check) => check.ok).length;
  const missing = checks.filter((check) => !check.ok).map((check) => check.label);
  const label = passed <= 2 ? 'weak' : passed === 3 ? 'fair' : passed === 4 ? 'good' : 'strong';

  return {
    label,
    isStrong: passed === checks.length,
    message:
      passed === checks.length
        ? t('strength.strongOk')
        : `${t('strength.missing')}: ${missing.join(', ')}.`,
  };
}

function refreshPasswordStrength(inputId, meterId) {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  if (!input || !meter) return;
  updatePasswordStrength(inputId, meterId);
}

function updatePasswordStrength(inputId, meterId) {
  const password = document.getElementById(inputId).value;
  const meter = document.getElementById(meterId);
  const text = meter.querySelector('p');
  const result = evaluatePasswordStrength(password);
  meter.className = `password-strength ${password ? result.label : ''}`.trim();
  text.textContent = password
    ? `${t(`strength.${result.label}`)}: ${result.message}`
    : t('register.passwordHint');
  return result;
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

document.getElementById('registerPassword').addEventListener('input', () => {
  updatePasswordStrength('registerPassword', 'registerPasswordStrength');
});

document.getElementById('newPassword').addEventListener('input', () => {
  updatePasswordStrength('newPassword', 'resetPasswordStrength');
});

document.querySelectorAll('[data-toggle-password]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    button.textContent = isHidden ? t('common.hide') : t('common.show');
  });
});

document.getElementById('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  const strength = updatePasswordStrength('registerPassword', 'registerPasswordStrength');
  if (!strength.isStrong) {
    setMessage('registerMessage', 'Password must meet the strong password policy.', 'error');
    return;
  }
  setMessage('registerMessage', 'Registering customer...', '');

  try {
    const formData = readForm(event.target);
    const { response, data } = await postJson('/api/auth/register', formData);
    if (!response.ok) {
      setMessage('registerMessage', data.message || 'Registration failed', 'error');
      return;
    }

    document.getElementById('registrationUsername').value = data.data.username;
    document.getElementById('registrationEmail').value = data.data.email;
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

    const formData = readForm(event.target);
    if (data.data.authenticated) {
      setMessage('loginMessage', 'Signed in successfully. Redirecting...', 'success');
      window.location.href = '/profile.html';
      return;
    }

    document.getElementById('loginOtpEmail').value = data.data.email || formData.email;
    updateOtpSubtitle(data.data.mfaMethod);
    showView('otpView');
    setMessage(
      'otpMessage',
      data.data.mfaMethod === 'TOTP'
        ? 'Enter your authenticator code to continue.'
        : 'OTP sent to your registered email.',
      'success'
    );
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
  const strength = updatePasswordStrength('newPassword', 'resetPasswordStrength');
  if (!strength.isStrong) {
    setMessage('resetPasswordMessage', 'New password must meet the strong password policy.', 'error');
    return;
  }
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
