document.addEventListener('DOMContentLoaded', () => {
  const realEstateInput = document.getElementById('realEstateName');
  const subdomainPreview = document.getElementById('subdomainPreview');
  const message = document.getElementById('message');

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
