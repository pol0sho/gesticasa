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

  const agentSection = document.getElementById('agentSection');
  const inviteAgentForm = document.getElementById('inviteAgentForm');
  const agentList = document.getElementById('agentList');

  let agents = JSON.parse(localStorage.getItem('agents') || '[]');

  function renderAgents() {
    agentList.innerHTML = '';
    agents.forEach((agent, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${agent.email}</span>
        <span class="${agent.status === 'pending' ? 'agent-status-pending' : 'agent-status-active'}">
          ${agent.status === 'pending' ? 'Email sent, waiting for activation' : 'Agent active'}
        </span>
        <span class="agent-remove">✖</span>
      `;
      li.querySelector('.agent-remove')?.addEventListener('click', () => {
        const sure = confirm('Are you sure you want to remove this agent?');
        if (!sure) return;
        agents.splice(index, 1);
        localStorage.setItem('agents', JSON.stringify(agents));
        renderAgents();
      });
      agentList.appendChild(li);
    });
  }

  inviteAgentForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = inviteAgentForm.agentEmail.value.trim();

    if (!isValidEmail(email)) {
      alert('Please enter a valid email.');
      return;
    }

    if (agents.length >= 20) {
      alert('You can only invite up to 20 agents.');
      return;
    }

    if (agents.find(a => a.email === email)) {
      alert('Agent already invited.');
      return;
    }

    agents.push({ email, status: 'pending' });
    localStorage.setItem('agents', JSON.stringify(agents));
    inviteAgentForm.reset();
    renderAgents();

    console.log(`📧 Invitation sent to ${email}`);
  });

  window.activateAgent = function (email) {
    if (!email || !isValidEmail(email)) return;
    const agent = agents.find(a => a.email === email && a.status === 'pending');
    if (agent) {
      agent.status = 'active';
      localStorage.setItem('agents', JSON.stringify(agents));
    }
  };

  function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }

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

  document.getElementById('showLogin')?.addEventListener('click', () => {
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
  });

  document.getElementById('showRegister')?.addEventListener('click', () => {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
  });

  realEstateInput?.addEventListener('input', () => {
    const userInput = realEstateInput.value;
    const sanitized = userInput.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();

    subdomainPreview.innerHTML = sanitized
      ? `CRM url preview: <strong>${sanitized}.gesticasa.com</strong>`
      : `CRM url preview: <strong>yourrealestate.gesticasa.com</strong>`;
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = registerForm.querySelector('input[name="email"]');
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      message.textContent = 'Invalid email format.';
      message.style.color = 'red';
      return;
    }

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
      agentSection.classList.remove('hidden');
      renderAgents();
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    const text = await res.text();
    message.textContent = text;
    message.style.color = res.ok ? 'green' : 'red';

    document.getElementById('authForms').classList.remove('hidden');
    document.getElementById('logoutSection').classList.add('hidden');
    agentSection.classList.add('hidden');
  });
});
