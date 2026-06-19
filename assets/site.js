const root = document.documentElement;
const button = document.querySelector('[data-action="toggle-theme"]');

if (button) {
  button.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('site-theme', next);
  });
}

const stored = localStorage.getItem('site-theme');
if (stored) {
  document.documentElement.setAttribute('data-theme', stored);
}
