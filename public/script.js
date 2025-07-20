document.addEventListener('DOMContentLoaded', () => {
  const realEstateInput = document.getElementById('realEstateName');
  const subdomainPreview = document.getElementById('subdomainPreview');
  const message = document.getElementById('message');

  const registerPasswordInput = document.querySelector('#registerForm input[name="password"]');
  const strengthBar = document.getElementById('strengthLevel');
  const strengthText = document.getElementById('strengthText');

  // Password strength logic
  registerPasswordInput?.addEventListener('input', () => {
    const value = registerPasswordInput.value;
    const score = getPasswordStrength(value);

    const colors = ['red', 'orange', '#ffc107', '#2ecc71'];
    const labels = ['Very Weak', 'Weak', 'Okay', 'Strong'];

    strengthBar.style.width = `${(score + 1) * 25}%`;
    strengthBar.style.background = colors[score];
    strengthText.textContent = labels[score];
  });

  function getPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score - 1, 3); // Max out at "Strong"
  }

  // Toggle between login and register
  document.getElementById('showLogin')?.addEventListener('click', () => {
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
  });

  document.getElementById('showRegister')?.addEventListener('click', () => {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
  });

  realEstateInput?.addEventListener('input', () => {
    const value = realEstateInput.value.trim().toLowerCase().replace(/\s+/g, '');
    subdomainPreview.innerHTML = value
      ? `CRM url preview: <strong>${value}.gesticasa.com</strong>`
      : `CRM url preview: <strong>yourrealestate.gesticasa.com</strong>`;
  });

  // Register
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const strength = getPasswordStrength(registerPasswordInput.value);
    if (strength < 2) {
      message.textContent = 'Password too weak. Use 8+ characters, uppercase, numbers, and symbols.';
      message.style.color = 'red';
      return;
    }

    const data = new URLSearchParams(new FormData(e.target));
    const res = await fetch('/register', { method: 'POST', body: data });
    const text = await res.text();
    message.textContent = text;
    message.style.color = res.ok ? 'green' : 'red';

    if (res.ok) {
      e.target.reset();
      document.getElementById('registerSection').classList.add('hidden');
      document.getElementById('loginSection').classList.remove('hidden');
    }
  });

  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    const text = await res.text();
    message.textContent = text;
    message.style.color = res.ok ? 'green' : 'red';

    document.getElementById('authForms').classList.remove('hidden');
    document.getElementById('logoutSection').classList.add('hidden');
  });
});
