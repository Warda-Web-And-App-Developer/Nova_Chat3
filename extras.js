/* NOVA CHAT — extras.js : status stories + simulated real-time calls */
(function () {
  'use strict';
  const N = window.Nova, { S, B, U, $, $$, esc, el, ic, toast, modal, ask } = N;

  /* ================================================================ STATUS (STORIES) */
  const active = () => S.statuses.filter(s => s.ts > Date.now() - 864e5);
  const byUser = uid => active().filter(s => s.uid === uid).sort((a, b) => a.ts - b.ts);
  const unseen = uid => byUser(uid).some(s => !(s.views || []).includes(S.me.uid));
  N.statusOrder = function () {
    const contacts = new Set(); S.chats.forEach(c => c.members.forEach(m => { if (m !== S.me.uid) contacts.add(m); }));
    return [...contacts].filter(u => byUser(u).length && S.users[u]).sort((a, b) => (unseen(b) - unseen(a)) || (byUser(b).slice(-1)[0].ts - byUser(a).slice(-1)[0].ts));
  };
  function thumb(u, size = 'w-12 h-12') { return `<div class="story-ring ${unseen(u.uid) || u.uid === S.me.uid ? '' : 'seen'}"><img class="${size} rounded-full object-cover" src="${esc(N.avatar(u))}"></div>`; }

  /* ---- stories panel (small icon in the header) ---- */
  let panel = null;
  N.updateStoryDot = function () { const b = $('#storyBtn'); if (b && S.me) b.classList.toggle('has-dot', N.statusOrder().some(unseen)); };
  N.refreshStories = () => { if (panel) panel.draw(); };
  N.openStoriesPanel = function () {
    const md = modal(`<div class="p-5"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold">Stories</h3><button class="icon-btn" data-x>${ic('x')}</button></div><div id="spBody"></div></div>`, { onClose: () => { panel = null; } });
    const draw = () => {
      const mine = byUser(S.me.uid), order = N.statusOrder();
      $('#spBody', md.box).innerHTML = `
        <div class="grid grid-cols-3 gap-2 mb-4">
          <button class="story-add" data-new="text">${ic('type', 'w-6 h-6')}<span>Text</span></button>
          <button class="story-add" data-new="photo">${ic('image', 'w-6 h-6')}<span>Photo</span></button>
          <button class="story-add" data-new="video">${ic('video', 'w-6 h-6')}<span>Video</span></button></div>
        <button class="row" ${mine.length ? `data-story="${esc(S.me.uid)}"` : 'data-new="text"'}>
          ${mine.length ? thumb(S.me) : `<img class="w-12 h-12 rounded-full object-cover" src="${esc(N.avatar(S.me))}">`}
          <div class="flex-1 min-w-0 text-left"><div class="font-semibold">My status</div><div class="text-sm text-[var(--muted)]">${mine.length ? mine.length + ' update' + (mine.length > 1 ? 's' : '') + ' · ' + N.ago(mine[mine.length - 1].ts) : 'Tap a button above to add your first status'}</div></div>
          ${mine.length ? `<span class="text-xs text-[var(--muted)] flex items-center gap-1">${ic('eye', 'w-4 h-4')} ${mine.reduce((n, st) => n + (st.views || []).length, 0)}</span>` : ''}</button>
        ${order.length ? '<div class="px-1 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Recent updates</div>' + order.map(uid => { const u = S.users[uid], l = byUser(uid); return `<button class="row" data-story="${esc(uid)}">${thumb(u)}<div class="flex-1 min-w-0 text-left"><div class="font-semibold truncate">${esc(u.username)}</div><div class="text-sm text-[var(--muted)]">${N.ago(l[l.length - 1].ts)}${unseen(uid) ? ' · new' : ''}</div></div></button>`; }).join('') : '<div class="p-6 text-center text-sm text-[var(--muted)]">No recent updates from your contacts yet.</div>'}`;
    };
    md.box.addEventListener('click', e => {
      const n = e.target.closest('[data-new]'); if (n) return N.createStatusModal(n.dataset.new);
      const st = e.target.closest('[data-story]'); if (st) N.openStatusViewer(st.dataset.story);
    });
    $('[data-x]', md.box).onclick = md.close;
    panel = { draw, close: md.close }; draw();
  };

  const BGS = [
    { bg: '#7851A9', fg: '#fff' }, { bg: '#6a92b5', fg: '#fff' }, { bg: '#FFBF00', fg: '#000' },
    { bg: 'linear-gradient(135deg,#7851A9,#6a92b5)', fg: '#fff' }, { bg: 'linear-gradient(135deg,#FFBF00,#7851A9)', fg: '#fff' }, { bg: 'linear-gradient(160deg,#6a92b5,#FFBF00)', fg: '#000' }
  ];
  N.createStatusModal = function (start) {
    let kind = (start === 'photo' || start === 'video') ? 'media' : 'text';
    const accept = start === 'photo' ? 'image/*' : start === 'video' ? 'video/*' : 'image/*,video/*';
    let bgi = 3, wall = null, wallPrev = '', text = '', file = null, prev = '', caption = '';
    const md = modal(`<div class="p-5"><div class="flex items-center justify-between mb-3"><h3 class="text-lg font-bold">New status</h3><button class="icon-btn" data-x>${ic('x')}</button></div>
      <div class="flex gap-2 mb-3"><button class="btn flex-1 !py-2" data-k="text">${ic('type', 'w-4 h-4')} Text</button><button class="btn flex-1 !py-2" data-k="media">${ic('image', 'w-4 h-4')} Photo / Video</button></div>
      <div id="stBody"></div><button id="stPost" class="btn btn-gold w-full mt-3">Post status</button><p class="text-xs text-[var(--muted)] text-center mt-2">Disappears after 24 hours</p></div>`);
    const draw = () => {
      $$('[data-k]', md.box).forEach(b => { const on = b.dataset.k === kind; b.classList.toggle('btn-royal', on); b.classList.toggle('btn-ghost', !on); });
      const body = $('#stBody', md.box);
      if (kind === 'text') {
        const cur = BGS[bgi], style = wallPrev ? `background:#000 url(${wallPrev}) center/cover` : `background:${cur.bg}`, fg = wallPrev ? '#fff' : cur.fg;
        body.innerHTML = `<div class="relative rounded-2xl h-60 flex items-center justify-center p-4 overflow-hidden" style="${style}">${wallPrev ? '<div class="absolute inset-0 bg-black/35"></div>' : ''}<textarea id="stText" rows="3" maxlength="220" class="relative w-full bg-transparent text-center text-2xl font-bold outline-none resize-none" style="color:${fg};field-sizing:content;max-height:100%" placeholder="Type a status">${esc(text)}</textarea></div>
          <div class="flex items-center justify-center gap-2 mt-3 flex-wrap">${BGS.map((b, i) => `<button data-bgi="${i}" class="w-9 h-9 rounded-full border-4 ${!wallPrev && i === bgi ? 'border-[var(--text)]' : 'border-transparent'}" style="background:${b.bg}"></button>`).join('')}
            <label class="w-9 h-9 rounded-full border-4 ${wallPrev ? 'border-[var(--text)]' : 'border-transparent'} bg-[var(--panel2)] flex items-center justify-center cursor-pointer" title="Use a photo as wallpaper">${ic('image', 'w-4 h-4')}<input id="stWall" type="file" accept="image/*" class="hidden"></label></div>
          <p class="text-xs text-center text-[var(--muted)] mt-2">Pick a colour, a gradient, or use your own photo as the wallpaper</p>`;
        $('#stText', md.box).oninput = e => text = e.target.value;
        $('#stWall', md.box).onchange = e => { const f = e.target.files[0]; if (!f) return; if (!f.type.startsWith('image/')) return toast('Please choose an image'); if (wallPrev) URL.revokeObjectURL(wallPrev); wall = f; wallPrev = URL.createObjectURL(f); draw(); };
      } else {
        body.innerHTML = `<label class="block rounded-2xl border-2 border-dashed border-[var(--border)] min-h-[14rem] flex items-center justify-center cursor-pointer overflow-hidden bg-[var(--input)]">
          ${prev ? (file.type.startsWith('video') ? `<video src="${prev}" class="max-h-64 w-full" controls muted playsinline></video>` : `<img src="${prev}" class="max-h-64 w-full object-contain">`) : `<div class="text-center text-[var(--muted)]">${ic('image', 'w-10 h-10 mx-auto mb-2')}Choose a ${start === 'photo' ? 'photo' : start === 'video' ? 'video' : 'photo or video'}</div>`}
          <input id="stFile" type="file" accept="${accept}" class="hidden"></label><input id="stCap" class="field mt-3" placeholder="Add a caption (optional)" value="${esc(caption)}" maxlength="120">`;
        $('#stFile', md.box).onchange = e => { const f = e.target.files[0]; if (!f) return; if (prev) URL.revokeObjectURL(prev); file = f; prev = URL.createObjectURL(f); draw(); };
        $('#stCap', md.box).oninput = e => caption = e.target.value;
      }
    };
    md.box.addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) { kind = k.dataset.k; draw(); } const c = e.target.closest('[data-bgi]'); if (c) { bgi = +c.dataset.bgi; wall = null; if (wallPrev) URL.revokeObjectURL(wallPrev); wallPrev = ''; draw(); } });
    $('[data-x]', md.box).onclick = md.close; draw();
    $('#stPost', md.box).onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true; const old = btn.textContent; btn.textContent = 'Posting…';
      try {
        if (kind === 'text') {
          if (!text.trim()) throw new Error('Type something first');
          const cur = BGS[bgi], doc = { uid: S.me.uid, type: 'text', content: text.trim(), bg: cur.bg, fg: cur.fg };
          if (wall) { const c = await N.compressImage(wall, 1080, .7); doc.bgImage = await B.uploadMedia(c.blob); doc.fg = '#fff'; }
          await B.addStatus(doc);
        } else {
          if (!file) throw new Error('Choose a photo or video first');
          if (file.type.startsWith('video')) {
            const max = B.maxUpload || 10 * 1048576; if (file.size > max) throw new Error(`Video is too large (max ${Math.round(max / 1048576)} MB)`);
            await B.addStatus({ uid: S.me.uid, type: 'video', content: await B.uploadMedia(file), caption: caption.trim() });
          } else { const c = await N.compressImage(file, 1080, .72); await B.addStatus({ uid: S.me.uid, type: 'image', content: await B.uploadMedia(c.blob), caption: caption.trim() }); }
        }
        md.close(); toast('Status posted'); N.updateStoryDot(); if (panel) panel.draw();
      } catch (er) { toast(N.friendly(er), 4500); btn.disabled = false; btn.textContent = old; }
    };
  };

  N.openStatusViewer = function (uid) {
    const order = N.statusOrder(); const queue = uid === S.me.uid ? [uid] : order.slice(Math.max(0, order.indexOf(uid)));
    if (!queue.length || !byUser(queue[0]).length) return;
    let ui = 0, si = 0, list = [], elapsed = 0, dur = 5000, paused = false, raf = 0, last = 0, vid = null, held = false, downT = 0, modalOpen = false;
    const ov = el(`<div class="fixed inset-0 z-[95] bg-black flex items-center justify-center fade-in"><div id="svBox" class="relative w-full h-full sm:max-w-md sm:h-[96dvh] sm:rounded-2xl overflow-hidden bg-black select-none">
      <div id="svBars" class="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 pt-[max(.5rem,env(safe-area-inset-top))]"></div>
      <div class="absolute top-4 left-0 right-0 z-10 flex items-center gap-2 px-3 pt-[env(safe-area-inset-top)] mt-3 text-white"><img id="svAv" class="w-10 h-10 rounded-full object-cover"><div class="flex-1 min-w-0"><div id="svName" class="font-bold truncate"></div><div id="svTime" class="text-xs opacity-80"></div></div><button id="svDel" class="icon-btn hidden">${ic('trash')}</button><button id="svX" class="icon-btn">${ic('x')}</button></div>
      <div id="svContent" class="absolute inset-0"></div>
      <div id="svFoot" class="absolute bottom-0 left-0 right-0 z-10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-white bg-gradient-to-t from-black/70 to-transparent"></div></div></div>`);
    document.body.append(ov);
    const close = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); if (vid) { vid.pause(); vid = null; } ov.remove(); N.renderList(); N.updateStoryDot(); if (panel) panel.draw(); };
    function loadUser(startAtEnd) {
      list = byUser(queue[ui]); if (!list.length) return advanceUser();
      si = startAtEnd ? list.length - 1 : (queue[ui] === S.me.uid ? 0 : Math.max(0, list.findIndex(s => !(s.views || []).includes(S.me.uid)))); show();
    }
    function advanceUser() { ui++; if (ui >= queue.length) return close(); loadUser(); }
    function next() { if (si < list.length - 1) { si++; show(); } else advanceUser(); }
    function prev() { if (si > 0) { si--; show(); } else if (ui > 0) { ui--; loadUser(true); } else show(); }
    function show() {
      const s = list[si], u = S.users[s.uid] || S.me, own = s.uid === S.me.uid; elapsed = 0; dur = 5000; vid = null;
      $('#svAv', ov).src = N.avatar(u); $('#svName', ov).textContent = own ? 'My status' : u.username; $('#svTime', ov).textContent = N.ago(s.ts);
      $('#svDel', ov).classList.toggle('hidden', !own);
      $('#svBars', ov).innerHTML = list.map((_, i) => `<div class="flex-1 h-1 rounded bg-white/30 overflow-hidden"><div class="h-full bg-gold" style="width:${i < si ? 100 : 0}%"></div></div>`).join('');
      const c = $('#svContent', ov);
      if (s.type === 'text') { c.innerHTML = `<div class="relative w-full h-full flex items-center justify-center p-8 text-center" style="background:${s.bg || '#7851A9'}">${s.bgImage ? '<img class="absolute inset-0 w-full h-full object-cover" data-media="' + esc(s.bgImage) + '"><div class="absolute inset-0 bg-black/40"></div>' : ''}<div class="relative text-3xl font-bold whitespace-pre-wrap break-words" style="color:${s.fg || N.textOn(s.bg || '#7851A9')};${s.bgImage ? 'text-shadow:0 2px 12px #000a' : ''}">${esc(s.content)}</div></div>`; N.hydrate(c); }
      else if (s.type === 'image') { c.innerHTML = '<img class="w-full h-full object-contain" data-media="' + esc(s.content) + '">'; N.hydrate(c); }
      else { c.innerHTML = '<video class="w-full h-full object-contain" playsinline autoplay></video>'; vid = c.firstChild; U.mediaURL(s.content).then(url => { vid.src = url; vid.play().catch(() => { vid.muted = true; vid.play().catch(() => { }); }); }); }
      $('#svFoot', ov).innerHTML = (s.caption ? `<div class="mb-2 text-base">${esc(s.caption)}</div>` : '') + (own ? `<button id="svViews" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm">${ic('eye', 'w-4 h-4')} ${(s.views || []).length} view${(s.views || []).length === 1 ? '' : 's'}</button>` : '');
      if (!own) B.viewStatus(s.id, S.me.uid).catch(() => { });
      last = performance.now();
    }
    function tick(t) {
      const dt = t - last; last = t; const s = list[si];
      if (s && !paused && !held && !modalOpen) {
        if (vid && vid.duration && isFinite(vid.duration)) { dur = Math.min(vid.duration, 60) * 1000; elapsed = vid.currentTime * 1000; if (vid.ended) elapsed = dur; } else if (!vid) elapsed += dt;
        const bar = $('#svBars', ov).children[si]; if (bar) bar.firstElementChild.style.width = Math.min(100, elapsed / dur * 100) + '%';
        if (elapsed >= dur) next();
      }
      raf = requestAnimationFrame(tick);
    }
    const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); };
    document.addEventListener('keydown', onKey);
    $('#svX', ov).onclick = close;
    $('#svDel', ov).onclick = async () => { modalOpen = true; const ok = await ask('Delete status?', 'This status will be removed for everyone.', 'Delete'); modalOpen = false; if (!ok) return; await B.deleteStatus(list[si].id); list.splice(si, 1); if (!list.length) close(); else { if (si >= list.length) si = list.length - 1; show(); } };
    const box = $('#svBox', ov);
    box.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; downT = Date.now(); held = true; if (vid) vid.pause(); });
    box.addEventListener('pointerup', e => {
      if (e.target.closest('button')) return; const quick = Date.now() - downT < 250; held = false; if (vid) vid.play().catch(() => { });
      if (quick) { const r = box.getBoundingClientRect(); (e.clientX - r.left) < r.width / 3 ? prev() : next(); }
    });
    box.addEventListener('pointerleave', () => { if (held) { held = false; if (vid) vid.play().catch(() => { }); } });
    ov.addEventListener('click', e => {
      if (e.target.closest('#svViews')) {
        const s = list[si]; modalOpen = true; if (vid) vid.pause();
        const viewers = (s.views || []).map(v => S.users[v]).filter(Boolean);
        const m = modal(`<div class="p-5"><div class="flex items-center justify-between mb-2"><h3 class="font-bold text-lg">Viewed by ${viewers.length}</h3><button class="icon-btn" data-x>${ic('x')}</button></div>${viewers.map(v => `<div class="flex items-center gap-3 py-2"><img class="w-10 h-10 rounded-full object-cover" src="${esc(N.avatar(v))}"><span class="font-semibold">${esc(v.username)}</span></div>`).join('') || '<div class="py-4 text-center text-[var(--muted)]">No views yet</div>'}</div>`, { onClose: () => { modalOpen = false; if (vid) vid.play().catch(() => { }); } });
        m.m.style.zIndex = 120; $('[data-x]', m.box).onclick = m.close;
      }
    });
    loadUser(); raf = requestAnimationFrame(tick);
  };

  /* ================================================================ CALLS (simulated, real-time signalling) */
  const Ring = {
    ctx: null, iv: null,
    start() {
      this.stop();
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume();
        const beep = () => { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 480; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.12, c.currentTime + .05); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .7); o.start(); o.stop(c.currentTime + .75); };
        beep(); this.iv = setInterval(beep, 1800);
      } catch (e) { }
    },
    stop() { clearInterval(this.iv); this.iv = null; }
  };
  let C = null, incomingId = null, incomingEl = null; const dismissed = new Set();
  const fmt = s => { s = Math.floor(s); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

  async function getLocal(kind) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Camera / microphone are not available in this browser'); return null; }
    try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false }); }
    catch (e) {
      if (kind === 'video') { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); toast('Camera unavailable — continuing with audio only'); return s; } catch (e2) { } }
      toast('Permission denied — the call continues with simulated audio only'); return null;
    }
  }

  N.startCall = async function (kind, target) {
    if (C) return toast('You are already in a call');
    let chatId, peers, title;
    if (target) ({ chatId, peers, title } = target);
    else { const chat = S.chats.find(c => c.id === S.activeId); if (!chat) return; chatId = chat.id; peers = chat.members.filter(m => m !== S.me.uid); title = N.chatInfo(chat).name; }
    if (!peers || !peers.length) return toast('Nobody else is in this chat yet');
    try {
      const id = await B.startCall({ from: S.me.uid, to: peers, chatId, kind });
      C = { id, kind, chatId, peers, role: 'caller', phase: 'ringing', title };
      await openCallUI(); Ring.start();
      C.timeout = setTimeout(() => { if (C && C.id === id && C.phase === 'ringing') B.updateCall(id, { status: 'missed' }); }, 35000);
    } catch (e) { toast(N.friendly(e)); C = null; }
  };

  async function openCallUI() {
    const peers = C.peers.map(p => S.users[p]).filter(Boolean), group = peers.length > 1, cols = peers.length <= 1 ? 'grid-cols-1' : peers.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
    const ui = C.ui = el(`<div class="fixed inset-0 z-[100] call-bg text-white flex flex-col fade-in">
      <div class="text-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2"><div class="text-xl font-bold truncate">${esc(C.title || (peers[0] && peers[0].username) || 'Call')}</div><div id="cStatus" class="text-sm opacity-85">Calling…</div></div>
      <div id="cTiles" class="flex-1 min-h-0 p-3 grid ${cols} gap-3 auto-rows-fr">${peers.map(p => `<div class="relative rounded-3xl overflow-hidden bg-black/40 border border-white/10" data-peer="${esc(p.uid)}">
        ${C.kind === 'video' ? '<canvas class="absolute inset-0 w-full h-full"></canvas>' : ''}<div class="absolute inset-0 flex flex-col items-center justify-center"><div class="relative rounded-full" data-av><img class="${group ? 'w-16 h-16' : 'w-28 h-28 sm:w-36 sm:h-36'} rounded-full object-cover border-4 border-gold" src="${esc(N.avatar(p))}"></div>
        <div class="mt-3 font-semibold drop-shadow">${esc(p.username)}</div><div class="text-xs opacity-80" data-ps>${C.phase === 'ringing' ? 'Ringing…' : 'Connected'}</div></div></div>`).join('')}</div>
      <video id="cLocal" class="${C.kind === 'video' ? '' : 'hidden'} absolute right-3 top-20 w-28 sm:w-40 aspect-[3/4] rounded-2xl object-cover mirror border-2 border-gold shadow-xl bg-black" muted playsinline autoplay></video>
      <div class="flex justify-center items-end gap-1 h-6 lvl" id="cLvl">${'<i></i>'.repeat(12)}</div>
      <div class="flex justify-center gap-5 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button id="cMic" class="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center" title="Mute">${ic('mic', 'w-6 h-6')}</button>
        ${C.kind === 'video' ? `<button id="cCam" class="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center" title="Camera">${ic('video', 'w-6 h-6')}</button>` : ''}
        <button id="cEnd" class="w-16 h-14 rounded-full bg-royal border-2 border-gold flex items-center justify-center" title="End call"><span class="rotate-[135deg]">${ic('phone', 'w-6 h-6')}</span></button></div></div>`);
    document.body.append(ui);
    $('#cEnd', ui).onclick = () => hangup();
    $('#cMic', ui).onclick = e => { const t = C.stream && C.stream.getAudioTracks()[0]; if (t) t.enabled = !t.enabled; const on = !t || t.enabled; C.muted = !on; e.currentTarget.innerHTML = ic(on ? 'mic' : 'micoff', 'w-6 h-6'); e.currentTarget.classList.toggle('bg-gold', !on); e.currentTarget.classList.toggle('text-black', !on); };
    const cam = $('#cCam', ui); if (cam) cam.onclick = e => { const t = C.stream && C.stream.getVideoTracks()[0]; if (!t) return toast('No camera available'); t.enabled = !t.enabled; e.currentTarget.innerHTML = ic(t.enabled ? 'video' : 'videooff', 'w-6 h-6'); e.currentTarget.classList.toggle('bg-gold', !t.enabled); e.currentTarget.classList.toggle('text-black', !t.enabled); $('#cLocal', ui).style.opacity = t.enabled ? 1 : .15; };
    const myCall = C; const stream = await getLocal(C.kind);
    if (C !== myCall) { if (stream) stream.getTracks().forEach(t => t.stop()); return; }
    C.stream = stream;
    if (stream) {
      const lv = $('#cLocal', ui); if (stream.getVideoTracks().length) { lv.srcObject = stream; lv.classList.remove('hidden'); } else lv.classList.add('hidden');
      try { C.ac = new (window.AudioContext || window.webkitAudioContext)(); C.an = C.ac.createAnalyser(); C.an.fftSize = 64; C.ac.createMediaStreamSource(stream).connect(C.an); } catch (e) { C.an = null; }
    }
    C.speakIv = setInterval(() => {
      if (!C || C.phase !== 'active') return; const tiles = $$('[data-av]', ui); tiles.forEach(t => t.classList.remove('speak')); if (Math.random() < .75 && tiles.length) tiles[Math.floor(Math.random() * tiles.length)].classList.add('speak');
    }, 1600);
    const buf = new Uint8Array(32);
    const loop = t => {
      if (!C || C.ui !== ui) return;
      if (C.an) { C.an.getByteFrequencyData(buf); $$('#cLvl i', ui).forEach((b, i) => b.style.height = (C.muted ? 4 : 4 + buf[i] / 255 * 22) + 'px'); }
      if (C.kind === 'video') $$('canvas', ui).forEach((cv, i) => drawSim(cv, t, i));
      if (C.phase === 'active' && C.t0) $('#cStatus', ui).textContent = fmt((Date.now() - C.t0) / 1000);
      C.raf = requestAnimationFrame(loop);
    };
    C.raf = requestAnimationFrame(loop);
  }

  function drawSim(cv, t, i) {
    const w = cv.clientWidth >> 1, h = cv.clientHeight >> 1; if (!w || !h) return; if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
    const g = cv.getContext('2d'); g.fillStyle = '#0b0714'; g.fillRect(0, 0, w, h);
    U.PAL.forEach((col, k) => {
      const x = w * (.5 + .38 * Math.sin(t / 1700 + k * 2.1 + i)), y = h * (.5 + .32 * Math.cos(t / 2100 + k * 1.7 + i)), r = Math.max(w, h) * .6;
      const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col + 'bb'); rg.addColorStop(1, col + '00'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    });
  }

  function connected() {
    if (!C || C.phase === 'active') return; C.phase = 'active'; C.t0 = Date.now(); Ring.stop(); clearTimeout(C.timeout);
    if (C.ui) { $$('[data-ps]', C.ui).forEach(n => n.textContent = 'Connected'); }
    toast('Call connected');
  }

  async function hangup() { if (!C) return; const id = C.id; await B.updateCall(id, { status: 'ended', endedAt: Date.now() }).catch(() => { }); endLocal('ended'); }

  function endLocal(reason) {
    if (!C) return; const c = C; C = null;
    cancelAnimationFrame(c.raf); clearInterval(c.speakIv); clearTimeout(c.timeout); Ring.stop();
    if (c.stream) c.stream.getTracks().forEach(t => t.stop()); if (c.ac) { try { c.ac.close(); } catch (e) { } }
    if (c.ui) c.ui.remove();
    const kindLbl = c.kind === 'video' ? 'video' : 'voice';
    if (c.role === 'caller') {
      const text = c.t0 ? `${kindLbl[0].toUpperCase() + kindLbl.slice(1)} call · ${fmt((Date.now() - c.t0) / 1000)}` : reason === 'declined' ? `Declined ${kindLbl} call` : `Missed ${kindLbl} call`;
      B.sendMessage(c.chatId, { from: S.me.uid, type: 'call', text }).catch(() => { });
    }
    toast(c.t0 ? 'Call ended' : reason === 'declined' ? 'Call declined' : reason === 'missed' ? 'No answer' : 'Call cancelled');
  }

  function showIncoming(d) {
    incomingId = d.id; const from = S.users[d.from] || { username: 'Someone' }, chat = S.chats.find(c => c.id === d.chatId), grp = chat && chat.type === 'group';
    incomingEl = el(`<div class="fixed inset-0 z-[110] call-bg text-white flex flex-col items-center justify-center p-6 fade-in">
      <div class="relative"><img class="w-36 h-36 rounded-full object-cover border-4 border-gold" src="${esc(N.avatar(from))}"><div class="absolute inset-0 rounded-full speak"></div></div>
      <div class="text-3xl font-bold mt-6 text-center">${esc(grp ? chat.name : from.username)}</div><div class="opacity-85 mt-1">${grp ? esc(from.username) + ' is ' : ''}Incoming ${d.kind === 'video' ? 'video' : 'voice'} call…</div>
      <div class="flex gap-12 mt-14"><button id="inDec" class="w-16 h-16 rounded-full bg-royal border-2 border-gold flex items-center justify-center" title="Decline"><span class="rotate-[135deg]">${ic('phone', 'w-7 h-7')}</span></button>
      <button id="inAcc" class="w-16 h-16 rounded-full bg-gold text-black flex items-center justify-center ringing" title="Accept">${ic(d.kind === 'video' ? 'video' : 'phone', 'w-7 h-7')}</button></div></div>`);
    document.body.append(incomingEl); Ring.start();
    $('#inDec', incomingEl).onclick = () => { dismissed.add(d.id); closeIncoming(); B.updateCall(d.id, { status: 'declined' }).catch(() => { }); };
    $('#inAcc', incomingEl).onclick = async () => {
      dismissed.add(d.id); closeIncoming();
      try { await B.updateCall(d.id, { status: 'active', answeredBy: S.me.uid, answeredAt: Date.now() }); } catch (e) { return toast(N.friendly(e)); }
      C = { id: d.id, kind: d.kind, chatId: d.chatId, peers: d.parties.filter(p => p !== S.me.uid), role: 'callee', phase: 'ringing', title: grp ? chat.name : from.username };
      await openCallUI(); connected();
    };
  }
  function closeIncoming() { Ring.stop(); if (incomingEl) incomingEl.remove(); incomingEl = null; incomingId = null; }

  N.onCalls = function (list) {
    S.calls = list; if (S.tab === 'calls' && N.renderList) N.renderList();
    if (incomingId) { const d = list.find(x => x.id === incomingId); if (!d || d.status !== 'ringing' || d.ts < Date.now() - 40000) closeIncoming(); }
    if (C) {
      const d = list.find(x => x.id === C.id); if (!d) return;
      if (d.status === 'active' && C.phase !== 'active') connected();
      else if (['ended', 'declined', 'missed'].includes(d.status)) endLocal(d.status);
      return;
    }
    if (incomingEl) return;
    const inc = list.find(x => x.status === 'ringing' && x.from !== S.me.uid && x.to.includes(S.me.uid) && x.ts > Date.now() - 40000 && !dismissed.has(x.id));
    if (inc) showIncoming(inc);
  };
  N.resetCalls = function () { if (C) { const id = C.id; B.updateCall(id, { status: 'ended', endedAt: Date.now() }).catch(() => { }); endLocal('ended'); } closeIncoming(); };

  /* ================================================================ CALL HISTORY (Calls tab) */
  function callWho(c) {
    const chat = S.chats.find(x => x.id === c.chatId), peers = c.parties.filter(p => p !== S.me.uid);
    if (chat) { const i = N.chatInfo(chat); return { name: i.name, photo: i.photo, peers, chatId: c.chatId }; }
    const u = S.users[peers[0]] || {}; return { name: u.username || 'Unknown', photo: N.avatar(u), peers, chatId: c.chatId };
  }
  function callState(c) {
    const out = c.from === S.me.uid, answered = !!c.answeredAt || c.status === 'active';
    if (c.status === 'ringing' && c.ts > Date.now() - 60000) return { out, missed: false, label: 'Ringing…' };
    if (answered) return { out, missed: false, label: out ? 'Outgoing' : 'Incoming' };
    if (c.status === 'declined') return { out, missed: false, label: 'Declined' };
    return { out, missed: !out, label: out ? 'No answer' : 'Missed' };
  }
  N.renderCallList = function (box) {
    const q = S.q.trim().toLowerCase();
    const rows = S.calls.slice().sort((a, b) => b.ts - a.ts).slice(0, 100).map(c => ({ c, w: callWho(c), st: callState(c) })).filter(r => !q || r.w.name.toLowerCase().includes(q));
    let html = `<button class="row" data-newcall><span class="call-new">${ic('phone', 'w-5 h-5')}</span><div class="text-left"><div class="font-semibold">New call</div><div class="text-sm text-[var(--muted)]">Call a contact or a group</div></div></button>`;
    html += rows.length ? '<div class="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Recent</div>' + rows.map(({ c, w, st }) => {
      const icon = st.missed ? 'phonemiss' : st.out ? 'phoneout' : 'phonein', dur = c.answeredAt && c.endedAt ? ' · ' + fmt((c.endedAt - c.answeredAt) / 1000) : '';
      return `<div class="row"><img class="w-[52px] h-[52px] rounded-[18px] object-cover" src="${esc(w.photo)}"><div class="flex-1 min-w-0"><div class="font-bold truncate ${st.missed ? 'text-royal dark:text-gold' : ''}">${esc(w.name)}</div>
        <div class="text-sm text-[var(--muted)] flex items-center gap-1.5 truncate"><span class="shrink-0 ${st.missed ? 'text-royal dark:text-gold' : ''}">${ic(icon, 'w-4 h-4')}</span><span class="truncate">${st.label} · ${N.dayLabel(c.ts)}, ${N.timeStr(c.ts)}${dur}${c.kind === 'video' ? ' · video' : ''}</span></div></div>
        <button class="icon-btn soft" data-cb="${c.kind}" data-cid="${esc(c.id)}" title="Call back">${ic(c.kind === 'video' ? 'video' : 'phone')}</button></div>`;
    }).join('') : `<div class="p-8 text-center text-[var(--muted)]"><div class="mx-auto w-14 h-14 rounded-full bg-[var(--panel2)] flex items-center justify-center mb-3">${ic('phone', 'w-7 h-7')}</div>${q ? 'No calls match “' + esc(S.q) + '”.' : 'No calls yet.<br>Tap New call to ring someone.'}</div>`;
    box.innerHTML = html;
  };
  N.callBack = function (id, kind) {
    const c = S.calls.find(x => x.id === id); if (!c) return; const w = callWho(c);
    N.startCall(kind, { chatId: w.chatId, peers: w.peers, title: w.name });
  };
  N.newCallPicker = function () {
    const md = modal(`<div class="p-5"><div class="flex items-center justify-between mb-3"><h3 class="text-lg font-bold">New call</h3><button class="icon-btn" data-x>${ic('x')}</button></div>
      <input id="ncq2" class="field mb-3" placeholder="Search contacts or groups…" autocomplete="off"><div id="ncl2" class="max-h-[55dvh] overflow-y-auto -mx-2"></div></div>`);
    const draw = () => {
      const q = $('#ncq2', md.box).value.trim().toLowerCase();
      const groups = S.chats.filter(c => c.type === 'group' && (c.name || '').toLowerCase().includes(q)).map(c => ({ key: 'g:' + c.id, name: c.name, photo: N.chatInfo(c).photo, sub: c.members.length + ' members' }));
      const people = Object.values(S.users).filter(u => u.uid !== S.me.uid && u.username && u.username.toLowerCase().includes(q)).sort((a, b) => a.username.localeCompare(b.username)).map(u => ({ key: 'u:' + u.uid, name: u.username, photo: N.avatar(u), sub: N.presence(u) }));
      $('#ncl2', md.box).innerHTML = [...groups, ...people].map(r => `<div class="row"><img class="w-11 h-11 rounded-2xl object-cover" src="${esc(r.photo)}"><div class="flex-1 min-w-0"><div class="font-semibold truncate">${esc(r.name)}</div><div class="text-xs text-[var(--muted)]">${esc(r.sub)}</div></div>
        <button class="icon-btn soft" data-k="audio" data-t="${esc(r.key)}" title="Voice call">${ic('phone')}</button><button class="icon-btn soft" data-k="video" data-t="${esc(r.key)}" title="Video call">${ic('video')}</button></div>`).join('') || '<div class="p-6 text-center text-[var(--muted)]">No contacts found</div>';
    };
    $('#ncq2', md.box).oninput = draw; draw(); $('[data-x]', md.box).onclick = md.close; setTimeout(() => $('#ncq2', md.box).focus(), 50);
    md.box.addEventListener('click', async e => {
      const b = e.target.closest('[data-k]'); if (!b) return; const kind = b.dataset.k, t = b.dataset.t.slice(0, 1), id = b.dataset.t.slice(2); md.close();
      try {
        if (t === 'g') { const c = S.chats.find(z => z.id === id); if (c) N.startCall(kind, { chatId: c.id, peers: c.members.filter(m => m !== S.me.uid), title: c.name }); }
        else { const cid = await B.ensureDM(S.me.uid, id); N.startCall(kind, { chatId: cid, peers: [id], title: (S.users[id] || {}).username }); }
      } catch (er) { toast(N.friendly(er)); }
    });
  };
})();
