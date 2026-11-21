(function () {
  var viewport = document.getElementById('viewport');
  var stage = document.getElementById('stage');
  var pages = [stage, document.getElementById('moments'), document.getElementById('song'), document.getElementById('ask'), document.getElementById('answer')];
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dot'));
  var env = document.getElementById('env');
  var seal = document.getElementById('seal');
  var hint = document.getElementById('hint');
  var reading = document.getElementById('reading');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = null, cur = 0, unlocked = false, maxIdx = 3;

  function go(n) {
    if (!unlocked) return;
    cur = Math.max(0, Math.min(maxIdx, n));
    pages.forEach(function (p, i) { p.dataset.state = i < cur ? 'before' : i > cur ? 'after' : 'active'; });
    dots.forEach(function (d, i) { d.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
  }

  function openLetter() {
    if (env.classList.contains('open')) return;
    env.classList.add('open');
    hint.style.opacity = '0';
    seal.disabled = true;
    timer = setTimeout(function () {
      stage.classList.add('reading-on');
      unlocked = true;
      viewport.classList.add('unlocked');
      reading.scrollTop = 0;
      reading.focus({ preventScroll: true });
    }, reduce ? 0 : 2300);
  }

  function resetLetter() {
    clearTimeout(timer);
    stage.classList.remove('reading-on');
    setTimeout(function () {
      env.classList.remove('open');
      hint.style.opacity = '';
      seal.disabled = false;
      seal.focus({ preventScroll: true });
    }, reduce ? 0 : 500);
  }

  seal.addEventListener('click', openLetter);
  document.getElementById('again').addEventListener('click', resetLetter);
  document.getElementById('next1').addEventListener('click', function () { go(1); });
  document.getElementById('restart').addEventListener('click', function () { go(0); });
  dots.forEach(function (d) { d.addEventListener('click', function () { go(Number(d.getAttribute('data-go'))); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  });
  var sx = null;
  viewport.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx;
    sx = null;
    if (dx < -60) go(cur + 1);
    if (dx > 60) go(cur - 1);
  }, { passive: true });

  var cards = Array.prototype.slice.call(document.querySelectorAll('.polaroid'));
  var rots = [-2, 3, -5, 5];
  var order = cards.map(function (_, i) { return i; });
  var busy = false;
  function layout() {
    cards.forEach(function (c, i) {
      var p = order.indexOf(i);
      c.style.setProperty('--pos', p);
      c.style.setProperty('--rot', rots[p]);
      c.setAttribute('aria-hidden', p === 0 ? 'false' : 'true');
      c.tabIndex = p === 0 ? 0 : -1;
    });
  }
  cards.forEach(function (c, i) {
    c.addEventListener('click', function () {
      if (busy || order[0] !== i) return;
      busy = true;
      c.classList.add('fly');
      setTimeout(function () {
        order.push(order.shift());
        c.classList.remove('fly');
        layout();
        busy = false;
      }, reduce ? 0 : 420);
    });
  });
  layout();

  var vinyl = document.getElementById('vinyl');
  var play = document.getElementById('play');
  var icPlay = document.getElementById('ic-play');
  var icPause = document.getElementById('ic-pause');
  var fill = document.getElementById('fill');
  var tnow = document.getElementById('tnow');
  /* ===== SONG FILE: to use a real song, put the mp3 next to this page and write its name below, for example var SONG_FILE = 'song.mp3'; Leave it empty to keep the music-box tune. ===== */
  var SONG_FILE = 'Amr Diab - Bayen Habeit (Official Lyric Video) _ (كلمات) عمرو دياب - باين حبيت_320k.mp3';
  var songEl = SONG_FILE ? new Audio(SONG_FILE) : null;
  if (songEl) songEl.loop = true;
  var beat = 0.6;
  var melodyHz = [659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 587.33,
                  659.25, 783.99, 1046.5, 987.77, 880, 783.99, 659.25, 587.33,
                  523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 587.33,
                  659.25, 783.99, 880, 1046.5, 987.77, 880, 783.99, 1046.5];
  var bassHz = [130.81, 110, 87.31, 98, 130.81, 110, 87.31, 98];
  var loopLen = melodyHz.length * beat;
  var ac = null, master = null, loopStart = 0, nextLoop = 0, playing = false, schedTimer = null;

  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  document.getElementById('tall').textContent = fmt(loopLen);

  function note(f, t, dur, vol) {
    var o = ac.createOscillator(), g = ac.createGain();
    var o2 = ac.createOscillator(), g2 = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(vol * 0.28, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.45);
    o.connect(g); g.connect(master);
    o2.connect(g2); g2.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
    o2.start(t); o2.stop(t + dur + 0.05);
  }
  function scheduleLoop(t0) {
    melodyHz.forEach(function (f, i) { note(f, t0 + i * beat, 1.5, 0.16); });
    bassHz.forEach(function (f, i) { note(f, t0 + i * 4 * beat, 2.4, 0.13); });
  }
  function startAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!ac) {
      ac = new Ctx();
      master = ac.createGain();
      master.gain.value = 0.85;
      master.connect(ac.destination);
      loopStart = ac.currentTime + 0.12;
      scheduleLoop(loopStart);
      nextLoop = loopStart + loopLen;
      schedTimer = setInterval(function () {
        if (ac.currentTime > nextLoop - 2) { scheduleLoop(nextLoop); nextLoop += loopLen; }
      }, 500);
    } else {
      ac.resume();
    }
    return true;
  }
  function setPlaying(on) {
    playing = on;
    vinyl.classList.toggle('spin', on);
    icPlay.hidden = on;
    icPause.hidden = !on;
    play.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }
  play.addEventListener('click', function () {
    if (!playing) {
      if (songEl) { songEl.play().then(function () { setPlaying(true); }).catch(function () {}); return; }
      try { if (startAudio()) setPlaying(true); } catch (e) { setPlaying(true); }
    } else {
      if (songEl) { songEl.pause(); setPlaying(false); return; }
      try { if (ac) ac.suspend(); } catch (e) {}
      setPlaying(false);
    }
  });
  setInterval(function () {
    if (songEl) {
      if (songEl.duration) {
        fill.style.width = (songEl.currentTime / songEl.duration * 100) + '%';
        tnow.textContent = fmt(songEl.currentTime);
        document.getElementById('tall').textContent = fmt(songEl.duration);
      }
      return;
    }
    if (!ac) return;
    var p = ((ac.currentTime - loopStart) % loopLen + loopLen) % loopLen;
    fill.style.width = (p / loopLen * 100) + '%';
    tnow.textContent = fmt(p);
  }, 250);

  /* ===== START DATE: change it here. Format is (year, month, day) and the month starts from 0, so 0 = January and 4 = May. Now: 1 May 2021. ===== */
  var start = new Date(2021, 5, 1);
  function plural(n, w) { return n === 1 ? w : w + 's'; }
  function tick() {
    var now = new Date();
    var y = now.getFullYear() - start.getFullYear();
    var m = now.getMonth() - start.getMonth();
    var d = now.getDate() - start.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    document.getElementById('uy').textContent = y;
    document.getElementById('um').textContent = m;
    document.getElementById('ud').textContent = d;
    document.getElementById('ly').textContent = plural(y, 'year');
    document.getElementById('lm').textContent = plural(m, 'month');
    document.getElementById('ld').textContent = plural(d, 'day');
    var secs = Math.floor((now - start) / 1000);
    var days = Math.floor(secs / 86400);
    document.getElementById('sub').textContent = days.toLocaleString('en-US') + ' days, ' + secs.toLocaleString('en-US') + ' seconds and counting';
  }
  tick();
  setInterval(tick, 1000);

  var yes = document.getElementById('yes');
  var no = document.getElementById('no');
  var askmsg = document.getElementById('askmsg');
  var nos = 0;
  var lines = ['', 'Think about it again.', 'Are you sure?', 'Really?', 'Last chance.', 'The No button is giving up.'];
  no.addEventListener('click', function () {
    nos++;
    yes.style.setProperty('--s', Math.min(1 + nos * 0.3, 2.8));
    no.style.setProperty('--s', Math.max(1 - nos * 0.14, 0.3));
    askmsg.textContent = lines[Math.min(nos, lines.length - 1)];
  });
  var heartsBuilt = false;
  function buildHearts() {
    if (heartsBuilt) return;
    heartsBuilt = true;
    var box = document.getElementById('hearts');
    for (var i = 0; i < 16; i++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('class', 'heart');
      s.setAttribute('viewBox', '0 0 24 24');
      s.style.setProperty('--x', (Math.random() * 92 + 2) + '%');
      s.style.setProperty('--w', (14 + Math.random() * 22) + 'px');
      s.style.setProperty('--d', (6 + Math.random() * 5) + 's');
      s.style.setProperty('--dl', (Math.random() * 6) + 's');
      var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      u.setAttribute('href', '#heart');
      s.appendChild(u);
      box.appendChild(s);
    }
  }
  yes.addEventListener('click', function () {
    maxIdx = 4;
    dots[4].hidden = false;
    buildHearts();
    go(4);
  });
})();