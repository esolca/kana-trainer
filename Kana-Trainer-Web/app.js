/* Schutz gegen Einbetten in fremde Seiten (Clickjacking): GitHub Pages kann dafuer keinen Header setzen */
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) {}
}

var ROWS = [
  ['a',  [['a','あ','ア'],['i','い','イ'],['u','う','ウ'],['e','え','エ'],['o','お','オ']]],
  ['k',  [['ka','か','カ'],['ki','き','キ'],['ku','く','ク'],['ke','け','ケ'],['ko','こ','コ']]],
  ['s',  [['sa','さ','サ'],['shi','し','シ'],['su','す','ス'],['se','せ','セ'],['so','そ','ソ']]],
  ['t',  [['ta','た','タ'],['chi','ち','チ'],['tsu','つ','ツ'],['te','て','テ'],['to','と','ト']]],
  ['n',  [['na','な','ナ'],['ni','に','ニ'],['nu','ぬ','ヌ'],['ne','ね','ネ'],['no','の','ノ']]],
  ['h',  [['ha','は','ハ'],['hi','ひ','ヒ'],['fu','ふ','フ'],['he','へ','ヘ'],['ho','ほ','ホ']]],
  ['m',  [['ma','ま','マ'],['mi','み','ミ'],['mu','む','ム'],['me','め','メ'],['mo','も','モ']]],
  ['y',  [['ya','や','ヤ'],null,['yu','ゆ','ユ'],null,['yo','よ','ヨ']]],
  ['r',  [['ra','ら','ラ'],['ri','り','リ'],['ru','る','ル'],['re','れ','レ'],['ro','ろ','ロ']]],
  ['w',  [['wa','わ','ワ'],null,null,null,['wo','を','ヲ']]],
  ['n·', [['n','ん','ン'],null,null,null,null]]
];
var STORE = 'kana-trainer-v3', MAXW = 10, MAXCOUNT = 1000000000;  /* MAXCOUNT wie Stats.maxCount in der iOS-App */
/* alle gültigen Schlüssel ("h:ka", "k:ka", ...) – Grundlage für die Prüfung gespeicherter Daten */
var VALID = Object.create(null);  /* ohne Prototyp: Namen wie "constructor" gelten nicht als gueltig */
ROWS.forEach(function (r) { r[1].forEach(function (c) { if (c) { VALID['h:' + c[0]] = true; VALID['k:' + c[0]] = true; } }); });
var TOTAL = Object.keys(VALID).length;
var S;

function blank() {
  return { tab:'hiragana', marked:{}, set:[], weights:{}, trained:{},
           stats:{ answered:0, correct:0, unknown:0 },
           phase:'select', current:null, revealed:false };
}
/* gespeicherte Daten nur übernehmen, wenn sie gültig sind */
function count(v) { return (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.min(Math.floor(v), MAXCOUNT) : 0; }
function keyMap(o) {
  var out = {};
  if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (VALID[k] && o[k] === true) out[k] = true; });
  return out;
}
S = blank();
try {
  var raw = localStorage.getItem(STORE);
  if (raw) {
    var d;
    try { d = JSON.parse(raw); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      /* unlesbar: Rohwert sichern, bevor das naechste Speichern ihn ueberschreibt */
      try { localStorage.setItem(STORE + '.bak', raw); } catch (e) {}
      d = {};
    }
    if (d.tab === 'katakana') S.tab = 'katakana';
    S.marked = keyMap(d.marked);
    S.trained = keyMap(d.trained);
    if (Array.isArray(d.set)) S.set = d.set.filter(function (k, i, a) { return VALID[k] && a.indexOf(k) === i; });
    if (d.weights && typeof d.weights === 'object') Object.keys(d.weights).forEach(function (k) {
      var w = d.weights[k];
      if (VALID[k] && typeof w === 'number' && isFinite(w)) S.weights[k] = Math.min(MAXW, Math.max(1, Math.round(w)));
    });
    var st = d.stats || {};
    S.stats.correct = count(st.correct);
    S.stats.unknown = count(st.unknown);
    S.stats.answered = S.stats.correct + S.stats.unknown;
    /* nach dem Neuladen mit dem gespeicherten Trainingssatz weitermachen */
    if ((d.phase === 'ready' || d.phase === 'training') && S.set.length) S.phase = 'ready';
  }
} catch (e) {}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify({
    tab:S.tab, marked:S.marked, set:S.set, weights:S.weights, trained:S.trained, stats:S.stats, phase:S.phase })); } catch (e) {}
}
function el(id) { return document.getElementById(id); }
function info(key) {
  var parts = key.split(':'), found = null;
  ROWS.forEach(function (r) { r[1].forEach(function (c) { if (c && c[0] === parts[1]) found = c; }); });
  if (!found) return { char:'', romaji:'' };
  return { char: parts[0] === 'h' ? found[1] : found[2], romaji: found[0] };
}
function markedKeys() { return Object.keys(S.marked).filter(function (k) { return S.marked[k]; }); }
function allKeys() {
  var p = S.tab[0] + ':', out = [];
  ROWS.forEach(function (r) { r[1].forEach(function (c) { if (c) out.push(p + c[0]); }); });
  return out;
}
function setMarks(keys, on) {
  keys.forEach(function (k) { if (on) S.marked[k] = true; else delete S.marked[k]; });
  el('warn').textContent = '';
  save(); render();
}
function pick(exclude) {
  var keys = S.set, pool = keys;
  if (keys.length > 1 && exclude) pool = keys.filter(function (k) { return k !== exclude; });
  var total = 0;
  pool.forEach(function (k) { total += Math.max(1, S.weights[k] || 3); });
  var r = Math.random() * total;
  for (var i = 0; i < pool.length; i++) {
    r -= Math.max(1, S.weights[pool[i]] || 3);
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
/* zeigt das nächste Zeichen */
function show(key) {
  S.current = key; S.revealed = false;
  save(); render();
}
function reveal() {
  if (S.phase !== 'training' || S.revealed) return;
  S.revealed = true; render();
}
/* erst eine Antwort zählt das Zeichen dauerhaft als trainiert */
function answer(correct) {
  if (S.phase !== 'training' || !S.revealed) return;
  var key = S.current, w = S.weights[key] || 3;
  S.weights[key] = correct ? Math.max(1, w - 1) : Math.min(MAXW, w + 2);
  S.trained[key] = true;
  S.stats.answered++;
  if (correct) S.stats.correct++; else S.stats.unknown++;
  show(pick(key));
}

function buildGrid() {
  var grid = el('grid'), p = S.tab[0] + ':';
  grid.innerHTML = '';
  ROWS.forEach(function (r) {
    var row = document.createElement('div');
    row.className = 'row';
    var lab = document.createElement('button');
    lab.className = 'rowlabel'; lab.textContent = r[0];
    lab.setAttribute('data-focus', 'row:' + r[0]);
    lab.setAttribute('aria-label', 'Toggle row ' + r[0]);
    lab.onclick = function () {
      var keys = r[1].filter(Boolean).map(function (c) { return p + c[0]; });
      setMarks(keys, !keys.every(function (k) { return S.marked[k]; }));
    };
    row.appendChild(lab);
    r[1].forEach(function (c) {
      if (!c) { var v = document.createElement('div'); v.className = 'cell void'; row.appendChild(v); return; }
      var key = p + c[0], on = !!S.marked[key], tr = !!S.trained[key];
      var b = document.createElement('button');
      b.className = 'cell' + (tr ? ' trained' : '') + (on ? ' sel' : '');
      b.setAttribute('data-focus', key);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (tr) b.title = on ? 'selected · already trained' : 'already trained';
      b.innerHTML = (tr ? '<span class="dot"></span>' : '') + '<span class="c jp"></span><span class="r"></span>';
      b.querySelector('.c').textContent = S.tab === 'hiragana' ? c[1] : c[2];
      b.querySelector('.r').textContent = c[0];
      b.onclick = function () { setMarks([key], !S.marked[key]); };
      row.appendChild(b);
    });
    grid.appendChild(row);
  });
}

function render() {
  var selecting = S.phase === 'select', ready = S.phase === 'ready', training = S.phase === 'training';

  el('pickCard').className = 'card pick' + (selecting ? '' : ' hide');
  if (selecting) {
    /* die Tabelle wird neu aufgebaut – Tastaturfokus auf dieselbe Zelle zurücksetzen */
    var a = document.activeElement, fk = a && a.getAttribute ? a.getAttribute('data-focus') : null;
    buildGrid();
    if (fk) {
      var f = el('grid').querySelector('[data-focus="' + fk + '"]');
      if (f) f.focus();
    }
  }

  el('eyebrow').textContent = training ? 'Training in progress' : (ready ? 'Training set ready' : 'Character selection');
  el('backBtn').className = 'link' + (selecting ? ' hide' : '');
  el('backBtn').textContent = training ? 'End training' : 'Change selection';

  el('selectView').className = selecting ? '' : 'hide';
  el('readyView').className = ready ? '' : 'hide';
  el('trainView').className = training ? '' : 'hide';
  el('trainActions').className = 'actions' + (training ? '' : ' hide');
  el('startBtn').className = 'btn start' + (ready ? '' : ' hide');

  if (ready) {
    el('setPrev').textContent = S.set.slice(0, 3).map(function (k) { return info(k).char; }).join(' ') || 'あ';
    el('readyText').textContent = (S.set.length === 1 ? '1 character' : S.set.length + ' characters') + ' in the training set.';
  }
  if (training && S.current) {
    var i = info(S.current);
    el('kana').textContent = i.char;
    el('solution').textContent = S.revealed ? i.romaji : '';
    el('revealBtn').disabled = S.revealed;
    el('unknownBtn').disabled = !S.revealed;
    el('rightBtn').disabled = !S.revealed;
  }

  var n = markedKeys().length;
  el('countText').textContent = (n === 1 ? '1 character selected' : n + ' characters selected');

  var st = S.stats;
  el('statsText').textContent = st.answered
    ? st.answered + ' answered · ' + st.correct + ' correct · ' + st.unknown + ' incorrect · '
      + Math.round(st.correct / st.answered * 100) + '%'
    : 'No answers yet';
  el('resetStatsBtn').disabled = !st.answered;

  var nt = Object.keys(S.trained).filter(function (k) { return S.trained[k]; }).length;
  el('historyText').textContent = nt + ' of ' + TOTAL + ' characters already trained';

  el('tabH').className = 'tab' + (S.tab === 'hiragana' ? ' on' : '');
  el('tabK').className = 'tab' + (S.tab === 'katakana' ? ' on' : '');
  el('tabH').setAttribute('aria-pressed', S.tab === 'hiragana' ? 'true' : 'false');
  el('tabK').setAttribute('aria-pressed', S.tab === 'katakana' ? 'true' : 'false');
}

/* Bestätigungsdialog für Master-Reset und Statistik-Reset */
var confirmAction = null, confirmReturn = null;
function confirmOpen() { return !/\bhide\b/.test(el('confirm').className); }
function openConfirm(title, text, label, action) {
  el('confirmTitle').textContent = title;
  el('confirmText').textContent = text;
  el('okBtn').textContent = label;
  confirmAction = action;
  confirmReturn = document.activeElement;
  el('confirm').className = 'overlay';
  el('cancelBtn').focus();
}
function closeConfirm() {
  el('confirm').className = 'overlay hide';
  confirmAction = null;
  if (confirmReturn && confirmReturn.focus) confirmReturn.focus();
  confirmReturn = null;
}
el('cancelBtn').onclick = closeConfirm;
el('okBtn').onclick = function () { var action = confirmAction; closeConfirm(); if (action) action(); };
el('confirm').onclick = function (e) { if (e.target === el('confirm')) closeConfirm(); };  /* Klick neben den Dialog */

el('tabH').onclick = function () { S.tab = 'hiragana'; save(); render(); };
el('tabK').onclick = function () { S.tab = 'katakana'; save(); render(); };
el('allBtn').onclick = function () { setMarks(allKeys(), true); };
el('resetSelBtn').onclick = function () {
  S.marked = {}; S.set = []; S.current = null; S.revealed = false; S.phase = 'select';
  el('warn').textContent = '';
  save(); render();
};
el('selectBtn').onclick = function () {
  var keys = markedKeys();
  if (!keys.length) { el('warn').textContent = 'Select at least one character first.'; return; }
  keys.forEach(function (k) { if (!S.weights[k]) S.weights[k] = 3; });
  S.set = keys; S.phase = 'ready'; S.current = null; S.revealed = false;
  el('warn').textContent = '';
  save(); render();
  el('startBtn').focus();
};
el('startBtn').onclick = function () {
  if (!S.set.length) { S.phase = 'select'; el('warn').textContent = 'Select at least one character first.'; save(); render(); return; }
  S.phase = 'training'; show(pick(null));
};
el('backBtn').onclick = function () { S.phase = 'select'; S.current = null; S.revealed = false; save(); render(); };
el('revealBtn').onclick = function () { reveal(); };
el('rightBtn').onclick = function () { answer(true); };
el('unknownBtn').onclick = function () { answer(false); };
el('resetStatsBtn').onclick = function () {
  if (!S.stats.answered) return;
  openConfirm('Reset statistics',
    'Delete your answer statistics? Weighting and already trained characters are kept.',
    'Delete statistics',
    function () { S.stats = { answered:0, correct:0, unknown:0 }; save(); render(); });
};
el('masterBtn').onclick = function () {
  openConfirm('Master reset',
    'Really delete all training data, selections and learning progress? This cannot be undone.',
    'Reset everything',
    function () {
      try { localStorage.removeItem(STORE); } catch (e) {}
      S = blank();
      el('warn').textContent = '';
      render();
    });
};
/* ältere Browser kennen :focus-visible nicht – dann wie bisher behandeln */
function focusVisible(t) { try { return t.matches(':focus-visible'); } catch (e) { return false; } }
document.addEventListener('keydown', function (e) {
  /* Dialog offen: Escape schliesst, Tab bleibt im Dialog, sonst normale Tastenbedienung */
  if (confirmOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); closeConfirm(); return; }
    if (e.key === 'Tab') {
      var first = el('cancelBtn'), last = el('okBtn'), f = document.activeElement;
      if (f !== first && f !== last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && f === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && f === last) { e.preventDefault(); first.focus(); }
    }
    return;
  }
  var isSpace = (e.key === ' ' || e.code === 'Space');
  var isEnter = (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter');
  if (!isSpace && !isEnter) return;
  if (S.phase !== 'training' || !S.current) return;  /* ausserhalb des Trainings bedienen die Tasten normal die Buttons */
  var t = e.target, tag = t && t.tagName ? t.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return;
  /* per Tastatur fokussierte Buttons ausserhalb der Antwortknöpfe (z. B. "Training beenden") normal auslösen */
  if (tag === 'button' && !/^(revealBtn|unknownBtn|rightBtn)$/.test(t.id) && focusVisible(t)) return;
  e.preventDefault();                                /* kein Scrollen, kein Klick auf fokussierten Button */
  if (e.repeat) return;                              /* gehaltene Taste = nur eine Aktion */
  if (isSpace) { reveal(); return; }                 /* Leertaste = ausschliesslich Show */
  if (S.revealed) answer(true);                      /* Return = Correct, nur nach Show */
});

render();

/* Browser bitten, den Lernstand nicht automatisch zu loeschen (z. B. Safari nach 7 Tagen ohne Besuch) */
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persisted().then(function (p) { if (!p) return navigator.storage.persist(); }).catch(function () {});
}

/* Offline-Betrieb (Home-Bildschirm); bei file:// nicht verfuegbar */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(el('appVersion').textContent.replace(/^v/, ''))).catch(function () {});
}
