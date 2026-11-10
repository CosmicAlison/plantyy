/* Forget-Me-Nots: splash, accounts, plant page actions, scan and chat.
   Loaded after flower.js and app.js, which provide flowerSVG, plants, render, view, detail, save and friends. */
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
/* Plans: Basic is free and uses Google search links. AI scan and chat are Premium (not launched yet, so nobody has it). */
const PREMIUM_LAUNCHED = false;
const hasPremium = () => PREMIUM_LAUNCHED && !!user && user.plan === 'premium';
const openGoogle = q => window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener,noreferrer');
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = ms => new Promise(r => setTimeout(r, ms));
const lockApp = on => { $('.shell').inert = on; $('.sidebar').inert = on; };

/* ---------- splash ---------- */
function buildSplash() {
  const ring = (n, r, s, cls) => `<div class="ring ${cls}">${Array.from({ length: n }, (_, i) => `<span class="orb" style="--a:${i * 360 / n}deg;--r:${r}px;--s:${s}px">${flowerSVG()}</span>`).join('')}</div>`;
  $('#splash-stage').innerHTML = ring(8, 128, 30, 'ring-a') + ring(5, 80, 24, 'ring-b') + `<span class="orb center-flower">${flowerSVG()}</span>`;
}
function runSplash() {
  const splash = $('#splash'), still = reducedMotion();
  if (still) splash.classList.add('still');
  let finished = false, timer;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', finish);
    splash.classList.add('out');
    setTimeout(() => { splash.hidden = true; user ? startApp() : showAuth(); }, still ? 0 : 350);
  };
  timer = setTimeout(finish, still ? 600 : 3000);
  splash.addEventListener('pointerdown', finish);
  document.addEventListener('keydown', finish);
  splash.focus();
}

/* ---------- accounts (demo: stored on this device only; passwords are validated but never stored) ---------- */
let authMode = 'login';
function setAuthMode(m) {
  authMode = m;
  $('#seg-login').setAttribute('aria-pressed', m === 'login');
  $('#seg-create').setAttribute('aria-pressed', m === 'create');
  $('#name-field').hidden = m !== 'create';
  $('#auth-submit').textContent = m === 'create' ? 'Create account' : 'Log in';
  $('#auth-title').textContent = m === 'create' ? 'Start your garden' : 'Welcome back';
  $('#auth-password').autocomplete = m === 'create' ? 'new-password' : 'current-password';
  showAuthErrors([]);
}
function showAuth() {
  lockApp(true);
  $('#auth').hidden = false;
  setAuthMode('login');
  $('#auth-email').focus();
}
function showAuthErrors(errs) {
  $('#auth-errors').innerHTML = errs.map(([, msg]) => `<li>${esc(msg)}</li>`).join('');
  ['auth-name', 'auth-email', 'auth-password'].forEach(id => $('#' + id).setAttribute('aria-invalid', errs.some(e => e[0] === id)));
  if (errs.length) $('#' + errs[0][0]).focus();
}
function signIn(u) {
  LS.set('plantty-session', { id: u.id });
  user = u;
  $('#auth').hidden = true;
  $('#auth-form').reset();
  startApp();
}
$('#seg-login').addEventListener('click', () => setAuthMode('login'));
$('#seg-create').addEventListener('click', () => setAuthMode('create'));
$('#auth-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#auth-name').value.trim(), email = $('#auth-email').value.trim().toLowerCase(), pw = $('#auth-password').value, errs = [];
  if (authMode === 'create' && !name) errs.push(['auth-name', 'Enter your name.']);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push(['auth-email', 'Enter an email address like name@example.com.']);
  if (pw.length < 6) errs.push(['auth-password', 'Use a password with at least 6 characters.']);
  if (errs.length) return showAuthErrors(errs);
  const accounts = LS.get('plantty-accounts') || [];
  if (authMode === 'create') {
    if (accounts.some(a => a.email === email)) return showAuthErrors([['auth-email', 'An account with that email already exists on this device. Log in instead.']]);
    const u = { id: crypto.randomUUID(), name: name.slice(0, 40), email };
    accounts.push(u);
    if (!LS.set('plantty-accounts', accounts)) return showAuthErrors([['auth-email', 'This browser could not save your account. Check that storage is allowed.']]);
    signIn(u);
  } else {
    const u = accounts.find(a => a.email === email);
    if (!u) return showAuthErrors([['auth-email', 'No account with that email on this device. Create one first.']]);
    signIn(u);
  }
});
$('#auth-form').addEventListener('input', () => { if ($('#auth-errors').children.length) showAuthErrors([]); });
$('#guest-btn').addEventListener('click', () => {
  LS.set('plantty-session', { guest: true });
  user = { id: 'guest', name: 'Guest', guest: true };
  $('#auth').hidden = true;
  startApp();
});
function logout() {
  LS.del('plantty-session');
  user = null; plants = []; chat = [];
  stopCamera();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  showAuth();
}
function applyUser() {
  const n = user.guest ? 'Guest' : user.name, i = (n.trim()[0] || 'G').toUpperCase();
  $('#side-avatar').textContent = i; $('#head-avatar').textContent = i; $('#side-name').textContent = n;
  $('#side-sub').textContent = user.guest ? 'Browsing as a guest' : 'Your personal green space';
}
function openProfile() {
  const g = user.guest, n = g ? 'Guest' : user.name;
  $('#profile-body').innerHTML = `<div class="section-heading"><h2>${esc(n)}</h2><button type="button" class="icon-button" data-close aria-label="Close">×</button></div>
  <div class="profile-head"><div class="avatar big" aria-hidden="true">${esc((n.trim()[0] || 'G').toUpperCase())}</div><div><strong>${esc(n)}</strong><p class="muted">${g ? 'Browsing as a guest' : esc(user.email)}</p></div></div>
  <p class="muted"><strong>${plants.length}</strong> ${plants.length === 1 ? 'plant' : 'plants'} in your household</p>
  <p class="muted">Plan: <strong>Basic</strong>. Premium (AI plant guide chat and photo diagnosis) is coming soon.</p>
  ${g ? '<div class="tip"><strong>Keep your garden with you</strong><p>Create an account to save plants under your name on this device.</p></div><button class="primary full" data-create-account>Create an account</button>' : ''}
  <button class="secondary-btn full" data-logout>Log out</button>`;
  $('#profile-dialog').showModal();
}
function startApp() {
  applyUser(); loadPlants(); loadChat(); selDay = day();
  lockApp(false); render(); view('home'); maybeOnboard();
}

/* ---------- plant page actions ---------- */
async function changePhoto(file) {
  const p = plants.find(x => x.id === detailId);
  if (!p || !file) return;
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { toast('Please choose an image smaller than 10 MB.'); return; }
  try { p.photo = await resizeImage(file); save(); render(); detail(p.id); toast('Photo updated.'); }
  catch { toast('That photo could not be read. Try a JPG or PNG.'); }
}
document.addEventListener('change', e => { if (e.target.id === 'detail-photo') changePhoto(e.target.files[0]); });
document.addEventListener('submit', e => {
  if (e.target.id !== 'rename-form') return;
  e.preventDefault();
  const p = plants.find(x => x.id === detailId), name = $('#rename-input').value.trim();
  if (!name) { $('#rename-error').textContent = 'Plant names can’t be empty.'; return; }
  if (name.length > 24) { $('#rename-error').textContent = 'Use 24 characters or fewer.'; return; }
  p.name = name; save(); render(); detail(p.id); toast(`Renamed to ${name}.`);
});

/* ---------- scan and diagnose ---------- */
const scanIntro = '<span class="pill">SCAN AND DIAGNOSE</span><h2>A little insight,<br>a little peace of mind.</h2><p>Open the camera or choose a photo. We’ll name the plant, check how it looks and suggest what to do next.</p><div class="scan-tip"><span aria-hidden="true">☀</span><div><strong>For a clearer picture</strong><p>Use natural light and include a close-up of the leaves.</p></div></div>';
let stream = null, scanImg = null, scanBusy = false, lastScan = null;
function setShutter() {
  $('#shutter').setAttribute('aria-label', stream ? 'Take photo' : 'Open camera');
  $('#vf-hint').textContent = stream ? 'Frame a leaf or the whole plant, then tap the shutter' : 'Tap the shutter to open the camera, or choose a photo';
}
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { $('#plant-capture').click(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const cam = $('#cam');
    cam.srcObject = stream; cam.hidden = false; $('#photo-preview').hidden = true;
    await cam.play().catch(() => {});
    setShutter();
  } catch { stream = null; toast('The camera isn’t available. Choose a photo instead.'); setShutter(); $('#plant-capture').click(); }
}
function stopCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null;
  const cam = $('#cam');
  if (cam) { cam.srcObject = null; cam.hidden = true; }
  if ($('#vf-hint')) setShutter();
}
function captureFrame() {
  const cam = $('#cam');
  if (!cam.videoWidth) { toast('The camera is still warming up. Try again in a moment.'); return; }
  const s = Math.min(1, 720 / Math.max(cam.videoWidth, cam.videoHeight)), c = document.createElement('canvas');
  c.width = Math.round(cam.videoWidth * s); c.height = Math.round(cam.videoHeight * s);
  c.getContext('2d').drawImage(cam, 0, 0, c.width, c.height);
  setScanImage(c.toDataURL('image/jpeg', 0.85));
}
function setScanImage(dataUrl) {
  stopCamera();
  scanImg = dataUrl;
  $('#photo-preview').src = dataUrl; $('#photo-preview').hidden = false;
  runScan();
}
function resetScan() {
  stopCamera(); scanImg = null; lastScan = null;
  $('#photo-preview').hidden = true; $('#photo-preview').removeAttribute('src');
  $('#assessment').innerHTML = scanIntro;
}
async function onScanFile(e) {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (!f.type.startsWith('image/') || f.size > 10 * 1024 * 1024) { toast('Please choose an image smaller than 10 MB.'); return; }
  try { setScanImage(await resizeImage(f)); } catch { toast('That photo could not be read. Try a JPG or PNG.'); }
}
const sampleScan = () => ({
  sample: true, commonName: 'Monstera', species: 'Monstera deliciosa', confidence: 'Medium', healthy: false,
  diagnosis: 'Could use brighter light',
  explanation: 'This is a sample result and does not describe your photo. Connect an API key to get a real analysis.',
  steps: ['Move it closer to a bright window, out of harsh midday sun.', 'Check the top 2 cm of soil before watering.', 'Wipe dusty leaves with a damp cloth.'],
  wateringIntervalDays: 7, light: 'Bright, indirect', humidity: 'Medium to high', soilMix: 'Chunky, well-draining aroid mix', soilCheckEveryDays: 3, sunEveryDays: 5, firstTask: 'sun'
});
function cleanScan(d) {
  const s = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  if (!d || typeof d !== 'object' || !Array.isArray(d.steps)) return null;
  const r = {
    commonName: s(d.commonName, 60), species: s(d.species, 80), confidence: ['High', 'Medium', 'Low'].includes(d.confidence) ? d.confidence : 'Low',
    healthy: d.healthy === true, diagnosis: s(d.diagnosis, 80), explanation: s(d.explanation, 500), steps: d.steps.map(x => s(x, 200)).filter(Boolean).slice(0, 6),
    wateringIntervalDays: Math.min(60, Math.max(1, Math.round(Number(d.wateringIntervalDays)) || 7)), light: s(d.light, 60), humidity: s(d.humidity, 60), soilMix: s(d.soilMix, 100),
    soilCheckEveryDays: Math.min(30, Math.max(1, Math.round(Number(d.soilCheckEveryDays)) || 4)), sunEveryDays: Math.min(30, Math.max(0, Math.round(Number(d.sunEveryDays)) || 0)),
    firstTask: ['soil', 'sun', 'none'].includes(d.firstTask) ? d.firstTask : 'none'
  };
  return r.commonName && r.diagnosis && r.explanation && r.steps.length ? r : null;
}
async function fetchScan() {
  const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: scanImg.split(',')[1], mediaType: 'image/jpeg' }) }).catch(() => null);
  if (!res) throw new Error('We couldn’t reach the scan service. Check your connection and try again.');
  if (res.status === 404 || res.status === 503) { await delay(1500); return sampleScan(); }
  if (res.status === 429) throw new Error('Too many scans in a short time. Wait a minute and try again.');
  if (!res.ok) throw new Error('The scan didn’t work this time. Try again, or use a clearer photo.');
  const r = cleanScan(await res.json().catch(() => null));
  if (!r) throw new Error('The scan result wasn’t readable. Try again.');
  return r;
}
function showBasicScan() {
  $('#assessment').innerHTML = '<span class="pill">BASIC PLAN</span><h2>Photo ready.</h2><p>Automatic plant identification and health checks are coming with Premium. For now, search Google for your plant, then add it with its details.</p><label for="basic-type">What plant is it?</label><input id="basic-type" maxlength="60" placeholder="e.g. Monstera"><p class="form-error" id="basic-err" role="alert"></p><button class="primary full" data-basic-search>Search Google for care tips ↗</button><button class="secondary-btn full" data-basic-add>Add it to my garden</button>';
}
async function runScan() {
  if (scanBusy || !scanImg) return;
  if (!hasPremium()) { showBasicScan(); return; }
  scanBusy = true;
  $('#viewfinder').classList.add('scanning');
  const msgs = ['Looking at the leaves…', 'Checking colour and texture…', 'Matching the species…', 'Working out what it needs…'];
  let i = 0;
  $('#assessment').innerHTML = `<span class="pill">SCANNING</span><h2 id="scan-msg">${msgs[0]}</h2><p>This usually takes a few seconds.</p>`;
  const t = setInterval(() => { i = (i + 1) % msgs.length; const el = $('#scan-msg'); if (el) el.textContent = msgs[i]; }, 1400);
  try { showScanResult(await fetchScan()); }
  catch (err) { $('#assessment').innerHTML = `<span class="pill">SCAN PROBLEM</span><h2>That didn’t work.</h2><p role="alert">${esc(err.message)}</p><button class="primary" data-scan-retry>Try again</button>`; }
  finally { clearInterval(t); scanBusy = false; $('#viewfinder').classList.remove('scanning'); }
}
function showScanResult(r) {
  lastScan = r;
  $('#assessment').innerHTML = `<span class="pill">${r.sample ? 'SAMPLE RESULT · NOT FROM YOUR PHOTO' : 'AI RESULT · DOUBLE-CHECK BEFORE ACTING'}</span><h2>${esc(r.commonName)}</h2><p class="sub-line"><em>${esc(r.species)}</em> · ${esc(r.confidence)} match</p><span class="chip ${r.healthy ? 'good' : 'warn'}">${esc(r.diagnosis)}</span><h3 class="sub-h">What I see</h3><p class="body">${esc(r.explanation)}</p><h3 class="sub-h">Recommended care</h3><div class="tiles"><div class="tile"><small>Water</small><b>Every ${r.wateringIntervalDays} days</b></div><div class="tile"><small>Soil</small><b>Check every ${r.soilCheckEveryDays} days</b><span>${esc(r.soilMix||'Well-draining potting mix')}</span></div><div class="tile"><small>Light</small><b>${esc(r.light||'Bright, indirect')}</b><span>${r.sunEveryDays?`Move to the sun every ${r.sunEveryDays} days`:'No moving needed'}</span></div></div><p class="note">Suggested starting schedule. Adjust it once you see how your plant responds.</p><h3 class="sub-h">What to do</h3><ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><label for="scan-name">Name your plant</label><input id="scan-name" maxlength="24" autocomplete="off" placeholder="e.g. Mona"><p class="form-error" id="scan-error" role="alert"></p><button class="primary full" data-add-scan>Add to my garden</button><a class="search-link" href="https://www.google.com/search?q=${encodeURIComponent((r.species||r.commonName)+' plant care')}" target="_blank" rel="noopener noreferrer">Search Google for ${esc(r.commonName)} care ↗</a>`;
}
function addScanned() {
  const name = $('#scan-name').value.trim().slice(0, 24);
  if (!name) { $('#scan-error').textContent = 'Give your plant a name first.'; $('#scan-name').focus(); return; }
  const r = lastScan, every = r.wateringIntervalDays || 7, first = r.healthy ? 'none' : (r.firstTask === 'none' ? 'soil' : r.firstTask);
  const p = {
    id: crypto.randomUUID(), name, species: r.species || r.commonName, photo: scanImg, room: 'Living room',
    interval: every, next: future(every),
    soilEvery: r.soilCheckEveryDays || 4, soilNext: first === 'soil' ? day() : future(r.soilCheckEveryDays || 4),
    sunEvery: r.sunEveryDays || (first === 'sun' ? 5 : null), sunNext: first === 'sun' ? day() : future(r.sunEveryDays || 5), soilMix: r.soilMix,
    health: r.healthy ? 'good' : 'warn', status: first === 'sun' ? 'Needs more light' : (r.healthy ? 'Healthy' : r.diagnosis),
    light: r.light, humidity: r.humidity, tip: r.steps[0]
  };
  ensureProfile(p); plants.push(p); save(); render(); resetScan(); view('plants');
  toast(`${name} added to your garden`);
}
$('#pick-photo').addEventListener('click', () => $('#plant-photo').click());
$('#shutter').addEventListener('click', () => { if (scanBusy) return; stream ? captureFrame() : startCamera(); });
$('#plant-photo').addEventListener('change', onScanFile);
$('#plant-capture').addEventListener('change', onScanFile);

/* ---------- ask the plant guide ---------- */
let chat = [], chatBusy = false;
const chatKey = () => 'plantty-chat:' + (user && !user.guest ? user.id : 'guest');
function loadChat() { const c = LS.get(chatKey()); chat = Array.isArray(c) ? c.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string') : []; }
const saveChat = () => LS.set(chatKey(), chat.slice(-40));
function renderChat() {
  $('#chat-pro').hidden = !hasPremium(); $('#ask-basic').hidden = hasPremium();
  const log = $('#chat-log');
  const intro = '<div class="bubble bot">Hi, I’m your plant guide. Ask me about watering, light, pests or anything leafy.</div>';
  log.innerHTML = intro + chat.map(m => `<div class="bubble ${m.role === 'user' ? 'me' : 'bot'}${m.error ? ' err' : ''}">${esc(m.text)}${m.offline ? '<small>Offline guide · general tips, not tailored to your plants</small>' : ''}</div>`).join('')
    + (chatBusy ? '<div class="bubble bot typing" role="status" aria-label="The guide is typing"><i></i><i></i><i></i></div>' : '');
  log.scrollTop = log.scrollHeight;
  $('#chat-send').disabled = chatBusy;
}
const keywordReplies = [
  [/\b(pet|cat|dog|toxic|poison|child|kid)/i, 'I can’t give medical advice. If a pet or child may have eaten a plant, call your veterinarian or a poison helpline right away. A garden centre can help you identify the plant.'],
  [/yellow/i, 'Yellow leaves usually point to watering that’s off. Check the soil 2 cm down: soggy soil suggests overwatering, bone-dry soil suggests underwatering. A single old lower leaf yellowing now and then is normal.'],
  [/gnat|fungus|bug|pest|mite|insect/i, 'Small flies near the soil are usually fungus gnats. Let the top few centimetres dry out between waterings and add a yellow sticky trap. If you see webbing or sticky leaves, check under the leaves for mites or scale.'],
  [/light|sun|bright|dark|shade/i, 'Most houseplants like bright, indirect light: near a window but out of the hot midday sun. Stretching stems and small pale leaves suggest too little light; scorched, crispy patches suggest too much.'],
  [/water|soil|dry|thirst|drink/i, 'A reliable test is to push a finger 2 cm into the soil. If it feels dry, water thoroughly until it drains; if it’s damp, wait a day or two. Needs change with season, pot size and light.'],
  [/brown|crisp/i, 'Brown, crispy tips often come from dry air, irregular watering or too much direct sun. Trim the damaged tips and keep watering steady. Tell me which plant it is and I can be more specific.'],
  [/droop|wilt|limp/i, 'Drooping can mean thirst or too much water. Feel the soil: dry means it needs a drink, wet and heavy means let it dry and check that the pot drains.']
];
const keywordReply = text => (keywordReplies.find(([re]) => re.test(text)) || [0, 'Tell me a little more: which plant it is, what the leaves look like and how the soil feels. Then I can suggest something to try.'])[1];
async function fetchReply(text) {
  const messages = chat.filter(m => !m.error).slice(-10).map(m => ({ role: m.role, text: m.text }));
  const plantCtx = plants.slice(0, 20).map(p => ({ nickname: p.name, species: p.species, lastWatered: p.lastWatered || '', light: p.light || '' }));
  const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, plants: plantCtx }) }).catch(() => null);
  if (!res) throw new Error('I couldn’t reach the guide. Check your connection and send that again.');
  if (res.status === 404 || res.status === 503) { await delay(700); return { text: keywordReply(text), offline: true }; }
  if (res.status === 429) throw new Error('You’re asking quickly. Give me a minute and try again.');
  if (!res.ok) throw new Error('Something went wrong on my side. Please send that again.');
  const data = await res.json().catch(() => null);
  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('I didn’t get a usable answer. Please try again.');
  return { text: data.reply.trim() };
}
async function sendChat(text) {
  text = String(text).trim().slice(0, 500);
  if (!text || chatBusy) return;
  chat.push({ id: crypto.randomUUID(), userId: user.id, role: 'user', text, createdAt: Date.now() });
  chatBusy = true; saveChat(); renderChat();
  try { const r = await fetchReply(text); chat.push({ id: crypto.randomUUID(), userId: user.id, role: 'assistant', text: r.text, offline: r.offline, createdAt: Date.now() }); }
  catch (err) { chat.push({ id: crypto.randomUUID(), userId: user.id, role: 'assistant', text: err.message, error: true, createdAt: Date.now() }); }
  chatBusy = false; saveChat();
  if (currentView === 'ask') renderChat();
}
$('#google-form').addEventListener('submit', e => { e.preventDefault(); const q = $('#google-input').value.trim(); if (q) openGoogle(q); });
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); const t = $('#chat-input').value; $('#chat-input').value = ''; sendChat(t); });

/* ---------- clicks for the new controls ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-profile')) openProfile();
  if (b.hasAttribute('data-logout')) logout();
  if (b.hasAttribute('data-create-account')) { logout(); setAuthMode('create'); }
  if (b.hasAttribute('data-rename')) detail(detailId, true);
  if (b.hasAttribute('data-cancel-rename')) detail(detailId);
  if (b.hasAttribute('data-change-photo')) $('#detail-photo').click();
  if (b.hasAttribute('data-add-scan')) addScanned();
  if (b.hasAttribute('data-scan-retry')) runScan();
  if (b.dataset.chip) sendChat(b.dataset.chip);
  if (b.dataset.gsearch) openGoogle(b.dataset.gsearch);
  if (b.hasAttribute('data-basic-search')) { const t = $('#basic-type').value.trim(); if (!t) { $('#basic-err').textContent = 'Enter the plant’s name or type first.'; $('#basic-type').focus(); } else openGoogle(t + ' plant care'); }
  if (b.hasAttribute('data-basic-add')) { const t = $('#basic-type').value.trim(); add(); newPhoto = scanImg || ''; if (newPhoto) { $('#new-photo-preview').src = newPhoto; $('#new-photo-preview').hidden = false; } $('#species').value = t; }
  if (b.dataset.movedLight) {
    const p = plants.find(x => x.id === b.dataset.movedLight);
    if (p) { p.health = 'good'; p.status = 'Recovering'; save(); render(); detail(p.id); toast(`${p.name} is in brighter light. Marked as recovering.`); }
  }
  if (b.dataset.askPlant) {
    const p = plants.find(x => x.id === b.dataset.askPlant);
    if (p && !hasPremium()) { openGoogle(p.species + ' plant care'); }
    else if (p) { $('#detail-dialog').close(); view('ask'); sendChat(`How should I look after ${p.name}, my ${p.species}? Is there anything I should check this week?`); }
  }
});

/* ---------- start ---------- */
function boot() {
  document.querySelectorAll('.brand-mark').forEach(el => { el.innerHTML = flowerSVG('logo-flower'); });
  const ob = $('.onboard-top .logo');
  if (ob) ob.innerHTML = flowerSVG('logo-flower') + ' forget me nots.';
  $('#auth-flower').innerHTML = flowerSVG();
  lockApp(true);
  const s = LS.get('plantty-session');
  if (s && s.guest) user = { id: 'guest', name: 'Guest', guest: true };
  else if (s && s.id) user = (LS.get('plantty-accounts') || []).find(a => a.id === s.id) || null;
  buildSplash();
  runSplash();
}
boot();
