document.addEventListener('DOMContentLoaded', () => {
  const realEstateInput = document.getElementById('realEstateName');
  const subdomainPreview = document.getElementById('subdomainPreview');
  const message = document.getElementById('message');

  const passwordInput = document.querySelector('input[name="password"]');
  const strengthBar = document.createElement('div');
  const strengthLevel = document.createElement('div');
  const strengthText = document.createElement('small');

  // Setup strength bar
  strengthBar.style.height = '6px';
  strengthBar.style.background = '#ddd';
  strengthBar.style.borderRadius = '3px';
  strengthBar.style.marginTop = '-10px';
  strengthBar.style.marginBottom = '10px';
  strengthBar.appendChild(strengthLevel);

  strengthLevel.style.height = '100%';
  strengthLevel.style.width = '0%';
  strengthLevel.style.background = 'red';
  strengthLevel.style.transition = 'width 0.3s';

  strengthText.style.display = 'block';
  strengthText.style.textAlign = 'center';
  strengthText.style.color = '#555';

  passwordInput.parentNode.insertBefore(strengthBar, passwordInput.nextSibling);
  strengthBar.parentNode.insertBefore(strengthText, strengthBar.nextSibling);

  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    const score = getPasswordStrength(val);
    const colors = ['red', 'orange', '#ffc107', '#2ecc71'];
    const labels = ['Very Weak', 'Weak', 'Okay', 'Strong'];

    strengthLevel.style.width = `${(score + 1) * 25}%`;
    strengthLevel.style.background = colors[score];
    strengthText.textContent = labels[score];
  });

  function getPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score - 1, 3);
  }

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

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const strength = getPasswordStrength(passwordInput.value);
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

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    const text = await res.text();
    message.textContent = text;
    message.style.color = res.ok ? 'green' : 'red';

    document.getElementById('authForms').classList.remove('hidden');
    document.getElementById('logoutSection').classList.add('hidden');
  });
});
