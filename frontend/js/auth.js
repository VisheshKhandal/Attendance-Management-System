/**
 * Auth — register, login (Phase 2)
 */

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authError = document.getElementById('authError');

  const showError = (msg) => {
    if (authError) {
      authError.textContent = msg;
      authError.hidden = false;
    } else {
      Toast.error(msg);
    }
  };

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError && (authError.hidden = true);

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const submitBtn = loginForm.querySelector('[type="submit"]');

    if (!email || !password) {
      showError('Email and password are required.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Signing in…');

    try {
      const res = await API.auth.login({ email, password });
      persistAuthFromResponse(res.data);
      Toast.success(res.message || 'Logged in successfully');
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError && (authError.hidden = true);

    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const submitBtn = registerForm.querySelector('[type="submit"]');

    if (!username || !email || !password) {
      showError('All fields are required.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Creating account…');

    try {
      const res = await API.auth.register({ username, email, password });
      persistAuthFromResponse(res.data);
      Toast.success(res.message || 'Account created');
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
});
