'use strict';
const settings = window.ATHAR_COACH_CONFIG;
const params = new URLSearchParams(location.search);
const storageKey = 'athar-coach-consent-pkce';
let inviteToken = params.get('invite') ?? '';
let accessToken = '';
let busy = false;
const el = id => document.getElementById(id);
const labels = {
  nutrition: 'التغذية والوجبات وأهدافها',
  training: 'خطط التمارين والجلسات والمجموعات',
  progress: 'الوزن والقياسات والتطور',
  activity: 'الخطوات المتزامنة وهدفها',
  fasting: 'حالة الصيام الحالية',
};
for (const [key, label] of Object.entries(labels)) {
  const row = document.createElement('label');
  row.className = 'option';
  const input = document.createElement('input');
  input.type = 'checkbox'; input.id = key;
  row.append(input, document.createTextNode(label));
  el('options').append(row);
}
el('manage').href = location.origin + location.pathname + '?sharing=1';
const permissions = () => Object.fromEntries(Object.keys(labels).map(k => [k, el(k).checked]));
const apiHeaders = authenticated => ({
  apikey: settings.anonKey,
  Authorization: 'Bearer ' + (authenticated ? accessToken : settings.anonKey),
  'Content-Type': 'application/json',
});
async function rpc(name, payload, authenticated = false) {
  const response = await fetch(settings.supabaseUrl + '/rest/v1/rpc/' + name, {
    method: 'POST', headers: apiHeaders(authenticated), body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.message ?? 'REQUEST_FAILED');
  return result;
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button,input').forEach(control => { control.disabled = value; });
}
async function action(task) {
  if (busy) return;
  setBusy(true); el('status').textContent = 'جاري الإكمال…';
  try { await task(); } catch (error) {
    el('status').textContent = error.message.includes('INVITATION_NOT_AVAILABLE')
      ? 'الدعوة غير متاحة أو تم قبولها. افتح رابط إدارة المشاركة إذا وافقت سابقًا.'
      : 'تعذر إكمال الطلب. راجع الاتصال وحاول مجددًا.';
  } finally { setBusy(false); }
}
async function signedIn() {
  const response = await fetch(settings.supabaseUrl + '/auth/v1/user', { headers: apiHeaders(true) });
  const user = await response.json();
  if (!response.ok || !user.id) throw Error('AUTH_REQUIRED');
  el('signedIn').textContent = 'الحساب: ' + (user.email ?? user.user_metadata?.full_name ?? 'حساب أثر');
  el('auth').hidden = true;
  el('sharing').hidden = false;
  if (!inviteToken) {
    const current = await rpc('coach_pilot_sharing', {}, true);
    if (!current.permissions) {
      el('sharing').hidden = true;
      el('auth').hidden = false;
      el('status').textContent = 'لا توجد مشاركة جارية لهذا الحساب.';
      return;
    }
    for (const key of Object.keys(labels)) el(key).checked = current.permissions[key] === true;
    el('intro').textContent = 'المشاركة مع ' + (current.coach_name || 'المدرب');
    el('stop').hidden = false;
    el('accept').textContent = 'حفظ خيارات المشاركة';
  }
  el('status').textContent = 'اختر فقط البيانات التي توافق على مشاركتها.';
}
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
async function authorize(provider) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  sessionStorage.setItem(storageKey, JSON.stringify({ verifier, token: inviteToken, time: Date.now() }));
  const auth = new URL(settings.supabaseUrl + '/auth/v1/authorize');
  auth.search = new URLSearchParams({
    provider, redirect_to: location.origin + location.pathname,
    code_challenge: base64url(new Uint8Array(digest)), code_challenge_method: 's256',
  }).toString();
  if (provider === 'google') auth.searchParams.set('prompt', 'select_account');
  location.assign(auth.href);
}
el('google').onclick = () => action(() => authorize('google'));
el('apple').onclick = () => action(() => authorize('apple'));
el('signout').onclick = () => {
  accessToken = ''; sessionStorage.removeItem(storageKey);
  for (const key of Object.keys(labels)) el(key).checked = false;
  el('sharing').hidden = true; el('auth').hidden = false;
  el('status').textContent = 'اختر حساب أثر الذي تريد مشاركة سجلاته.';
};
el('accept').onclick = () => action(async () => {
  const selected = permissions();
  if (inviteToken) {
    await rpc('coach_accept_pilot_invitation', {p_token: inviteToken, p_permissions: selected}, true);
    inviteToken = '';
    history.replaceState({}, '', location.pathname + '?sharing=1');
  } else {
    await rpc('coach_pilot_sharing', {p_permissions: selected}, true);
  }
  el('stop').hidden = false; el('accept').textContent = 'حفظ خيارات المشاركة';
  el('status').textContent = 'تم حفظ المشاركة. يمكنك متابعة استخدام أثر كالمعتاد.';
});
el('stop').onclick = () => action(async () => {
  await rpc('coach_pilot_sharing', {p_end: true}, true);
  for (const key of Object.keys(labels)) el(key).checked = false;
  el('sharing').hidden = true; accessToken = '';
  el('status').textContent = 'تم إيقاف المشاركة. لا يستطيع المدرب قراءة سجلاتك بعد الآن.';
});
async function start() {
  if (params.get('error') || new URLSearchParams(location.hash.slice(1)).get('error')) {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    inviteToken = stored?.token ?? inviteToken;
    sessionStorage.removeItem(storageKey);
    history.replaceState({}, '', location.pathname + (inviteToken ? '?invite=' + inviteToken : '?sharing=1'));
    el('intro').textContent = 'لم يكتمل تسجيل الدخول. يمكنك المحاولة مجددًا.';
    el('auth').hidden = false;
    return;
  }
  if (params.has('code')) {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    sessionStorage.removeItem(storageKey);
    const code = params.get('code');
    history.replaceState({}, '', location.pathname);
    if (!stored?.verifier || Date.now() - stored.time > 10 * 60 * 1000) throw Error('AUTH_EXPIRED');
    inviteToken = stored.token;
    const response = await fetch(settings.supabaseUrl + '/auth/v1/token?grant_type=pkce', {
      method: 'POST', headers: apiHeaders(false),
      body: JSON.stringify({auth_code: code, code_verifier: stored.verifier}),
    });
    const session = await response.json();
    if (!response.ok || !session.access_token) throw Error('AUTH_REQUIRED');
    accessToken = session.access_token;
  }
  if (inviteToken) {
    if (!/^[a-f0-9]{32}$/.test(inviteToken)) throw Error('INVITATION_NOT_AVAILABLE');
    const invite = await rpc('coach_invitation', {p_token: inviteToken});
    if (!invite?.observer_only) throw Error('INVITATION_NOT_AVAILABLE');
    el('intro').textContent = 'دعوة متابعة خاصة من ' + invite.coach;
  } else {
    el('intro').textContent = 'سجل الدخول لإدارة المشاركة الحالية أو إيقافها.';
  }
  if (accessToken) await signedIn(); else el('auth').hidden = false;
}
action(start);
