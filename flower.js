/* Forget-me-not flower: five blue petals, yellow centre. One component, reused in the logo, splash and login. */
function flowerSVG(cls = '') {
  const petals = [0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="27" rx="13" ry="19" transform="rotate(${a} 50 50)" fill="#6d9bd8"/>`).join('');
  return `<svg class="flower ${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${petals}<circle cx="50" cy="50" r="9" fill="#f4c542" stroke="#d9a21b" stroke-width="1.5"/></svg>`;
}
