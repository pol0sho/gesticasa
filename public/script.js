document.addEventListener('DOMContentLoaded', () => {
  const realEstateInput = document.getElementById('realEstateName');
  const subdomainPreview = document.getElementById('subdomainPreview');
  const message = document.getElementById('message');

  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');

  const registerPasswordInput = registerForm?.querySelector('input[name="password"]');
  const strengthBar = document.getElementById('strengthLevel');
  const strengthText = document.getElementById('strengthText');

  // 🔐 Password strength logic
  function getPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score - 1, 3);
  }

  registerPasswordInput?.addEventListener('input', () => {
    const value = registerPasswordInput.value;
    const score = getPasswordStrength(value);

    const colors = ['red', 'orange', '#ffc107', '#2ecc71'];
    const labels = ['Very Weak', 'Weak', 'Okay', 'Strong'];

    strengthBar.style.width = `${(score + 1) * 25}%`;
    strengthBar.style.background = colors[score];
    strengthText.textContent = labels[score];
  });

  // 🔄 Form toggle
  document.getElementById('showLogin')?.addEventListener('click', () => {
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
  });

  document.getElementById('showRegister')?.addEventListener('click', () => {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
  });

  // ✅ Enforce only A–Z letters for real estate name
  realEstateInput?.addEventListener('input', () => {
    // Remove any characters that are not A-Z or a-z
    realEstateInput.value = realEstateInput.value.replace(/[^a-zA-Z0-9]/g, '');

    const sanitized = realEstateInput.value.trim().toLowerCase();
    subdomainPreview.innerHTML = sanitized
      ? `CRM url preview: <strong>${sanitized}.gesticasa.com</strong>`
      : `CRM url preview: <strong>yourrealestate.gesticasa.com</strong>`;
  });

  // 📝 Register with password strength + stripe checkout
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const strength = getPasswordStrength(registerPasswordInput.value);
    if (strength < 2) {
      message.textContent = 'Password too weak. Use 8+ chars, uppercase, numbers, symbols.';
      message.style.color = 'red';
      return;
    }

    const formData = new FormData(e.target);
    const plainData = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plainData)
      });

      const result = await res.json();

      if (result.url) {
        window.location.href = result.url;
      } else {
        message.textContent = 'Failed to initiate payment.';
        message.style.color = 'red';
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      message.textContent = 'Something went wrong.';
      message.style.color = 'red';
    }
  });

  // 🔐 Login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new URLSearchParams(new FormData(e.target));
    const res = await fetch('/login', { method: 'POST', body: data });
    const text = await res.text();
    message.textContent = text;
    message.style.color = res.ok ? 'green' : 'red';

    if (res.ok) {
      document.getElementById('authForms').classList.add('hidden');
      document.getElementById('logoutSection').classList.remove('hidden');
    }
  });

  // 🔓 Logout
  logoutBtn?.addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    const text = await res.text();
    message.textContent = text;
    message.style.color = res.ok ? 'green' : 'red';

    document.getElementById('authForms').classList.remove('hidden');
    document.getElementById('logoutSection').classList.add('hidden');
  });
});
