/* Lehem Interiors — follow-up feed
   ----------------------------------------------------------------------
   A notification panel in the bottom right. It answers one question for
   the person signed in: what do I have to chase before the week closes?

   Everything in it is derived, never authored. A task appears because
   its due date has passed, because nobody owns it, because the revision
   gate is shut on it, or because a work item has run out of estimate.
   That matters: a feed somebody curates becomes a feed somebody grooms,
   and the items that embarrass the firm quietly stop being added.

   Order is urgency, with one exception — the signed-in person's own work
   comes first, because a chase list that buries your own commitments is
   a list you learn to ignore.
*/
(function () {
  'use strict';

  if (!window.DESK || !window.PLAN) { return; }

  var DESK = window.DESK, PLAN = window.PLAN;
  var TICKETS = DESK.TICKETS, P = DESK.PEOPLE, PROJ = DESK.PROJECTS, WT = DESK.WORK_TYPES;

  /* The signed-in person, and the day the sample week is read from: Friday
     18 September 2026, the same "now" the collections aging already uses. */
  var ME = 'ev';
  var TODAY = new Date(2026, 8, 18);
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DONE = 'done';

  if (!PLAN.store.plans.length) { PLAN.seed(TICKETS); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function person(id) { return P.filter(function (x) { return x.id === id; })[0]; }
  function proj(id) { return PROJ.filter(function (x) { return x.id === id; })[0]; }
  function wt(id) { return WT.filter(function (x) { return x.id === id; })[0]; }
  function parseDay(s) {
    if (!s) { return null; }
    var b = String(s).trim().split(' ');
    var m = MONTHS.indexOf(b[1]), d = parseInt(b[0], 10);
    if (m === -1 || !d || d < 1 || d > 31) { return null; }
    return new Date(2026, m, d);
  }
  function daysPast(s) {
    var d = parseDay(s);
    return d ? Math.round((TODAY - d) / 86400000) : null;
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function where(t) {
    var pr = t.p ? proj(t.p) : null;
    if (!pr) { return 'Internal'; }
    return pr.name + ' · ' + DESK.PHASE_NAMES[t.ph];
  }
  function owner(t) {
    var w = t.who ? person(t.who) : null;
    return w ? w.name : 'nobody';
  }
  function progress(t) {
    var done = PLAN.loggedOnTicket(t.id);
    if (!t.est) { return 'no estimate yet'; }
    return PLAN.hrs(done) + ' of ' + PLAN.hrs(t.est) + ' logged';
  }

  /* The revision gate, as the Team Schedule reads it: a revision cannot be
     assigned once the phase has spent its allowance, so it sits in intake
     until a change order is agreed. */
  function gated(t) {
    var w = wt(t.type);
    if (!w || !w.revision || t.who || t.state !== 'intake' || !t.p || !t.ph) { return false; }
    var pr = proj(t.p);
    if (!pr) { return false; }
    var rec = pr.phases[t.ph];
    return rec && rec.used >= rec.allow;
  }

  /* ---------------------------------------------------------------- items

     Each rule claims tasks in turn and the claimed ones are struck off,
     so a task that is both overdue and waiting on a signature is listed
     once, under the more urgent heading, with the other fact in its body. */

  function build() {
    var items = [], claimed = {};
    var live = TICKETS.filter(function (t) { return t.state !== DONE; });

    function take(list, fn) {
      list.forEach(function (t) {
        if (claimed[t.id]) { return; }
        claimed[t.id] = true;
        items.push(fn(t));
      });
    }

    /* 1 — the signed-in person's own work, however urgent it is. */
    take(live.filter(function (t) { return t.who === ME; }), function (t) {
      var late = daysPast(t.due);
      var tone = late > 0 ? 'crit' : (late === 0 ? 'warn' : 'mine');
      var when = late > 0 ? plural(late, 'day') + ' past due'
        : late === 0 ? 'due today' : 'due ' + t.due;
      return {
        group: 'mine', tone: tone, tag: when, id: t.id, title: t.title,
        body: where(t) + ' · ' + progress(t), href: 'desk.html?who=' + ME
      };
    });

    /* 2 — anything whose date has gone, whoever owns it. */
    take(live.filter(function (t) { return daysPast(t.due) > 0; })
      .sort(function (a, b) { return daysPast(b.due) - daysPast(a.due); }), function (t) {
      var late = daysPast(t.due);
      var sitting = t.state === 'internal' ? ', and sitting with the lead for sign-off'
        : t.state === 'external' ? ', and sitting with the client' : '';
      /* If the estimate is gone as well as the date, say so here rather than
         listing the task twice — it is one conversation, not two. */
      var item = PLAN.itemFor(t.id);
      var spent = item && item.est && PLAN.loggedHours(item) >= item.est
        ? ' · its ' + PLAN.hrs(item.est) + ' estimate is spent' : '';
      return {
        tone: 'crit', tag: plural(late, 'day') + ' past due', id: t.id, title: t.title,
        body: where(t) + ' · with ' + owner(t) + sitting + spent,
        href: 'desk.html' + (t.who ? '?who=' + t.who : '')
      };
    });

    /* 3 — stopped, and waiting on somebody outside the firm. */
    take(live.filter(function (t) { return t.state === 'blocked'; }), function (t) {
      return {
        tone: 'warn', tag: 'Blocked', id: t.id, title: t.title,
        body: (t.blockNote || 'Blocked') + ' · ' + owner(t) + ' cannot move it',
        href: 'desk.html' + (t.who ? '?who=' + t.who : '')
      };
    });

    /* 4 — the revision gate. Grouped: the action is one conversation about
       a change order, not one click per task. */
    var atGate = live.filter(gated);
    if (atGate.length) {
      atGate.forEach(function (t) { claimed[t.id] = true; });
      items.push({
        tone: 'warn', tag: 'Held at the revision gate',
        title: plural(atGate.length, 'revision') + ' cannot be assigned',
        body: atGate.map(function (t) { return proj(t.p).name; }).join(' and ') +
          ' have spent the revisions their phase allows — these need a change ' +
          'order agreed before anyone picks them up',
        href: 'desk.html'
      });
    }

    /* 5 — in the tray with nobody on them. Also grouped. */
    var loose = live.filter(function (t) { return !claimed[t.id] && t.state === 'intake'; });
    if (loose.length) {
      loose.forEach(function (t) { claimed[t.id] = true; });
      items.push({
        tone: 'warn', tag: 'Waiting on you to distribute',
        title: plural(loose.length, 'task') + ' in intake with nobody on them',
        body: 'Each needs an owner, an estimate and a window before work can ' +
          'start · ' + loose.map(function (t) { return t.id; }).join(', '),
        href: 'desk.html'
      });
    }

    /* 6 — work items that have run out of estimate. The task may still be
       open and on track, but the hours it was given are gone, so somebody has
       to decide: more estimate, or a change order. */
    PLAN.store.plans.filter(function (p) { return !p.closed; }).forEach(function (pl) {
      PLAN.itemsOf(pl.id).forEach(function (w) {
        if (!w.est || PLAN.loggedHours(w) < w.est) { return; }
        /* A finished task that used its whole estimate did exactly what it
           was meant to. Only work still running needs a decision. */
        var t = w.ticket ? live.filter(function (x) { return x.id === w.ticket; })[0] : null;
        if (!t || claimed[t.id]) { return; }
        claimed[t.id] = true;
        var pr = proj(w.project);
        var over = PLAN.overBy(w);
        items.push({
          tone: 'crit', tag: over > 0 ? PLAN.hrs(over) + ' over estimate' : 'estimate spent',
          id: w.ticket || w.id, title: w.title,
          body: (pr ? pr.name : 'Internal') + ' · ' + DESK.PHASE_NAMES[w.phase] +
            ' · ' + PLAN.hrs(PLAN.loggedHours(w)) + ' logged against ' + PLAN.hrs(w.est) +
            ' planned on ' + pl.id,
          who: w.who, href: 'desk.html' + (w.who ? '?who=' + w.who : '')
        });
      });
    });

    /* 7 — due today, once the overdue and the stuck have had their turn. */
    take(live.filter(function (t) { return daysPast(t.due) === 0; }), function (t) {
      return {
        tone: 'warn', tag: 'Due today', id: t.id, title: t.title,
        body: where(t) + ' · with ' + owner(t) + ' · ' + progress(t),
        href: 'desk.html' + (t.who ? '?who=' + t.who : '')
      };
    });

    /* 8 — the standing one. Not urgent and never closed, but it is the
       only line on this page that costs money every week it is ignored. */
    var unpriced = TICKETS.filter(function (t) {
      return PLAN.derive(t).bucket === 'sourcing';
    }).reduce(function (a, t) { return a + PLAN.loggedOnTicket(t.id); }, 0);
    if (unpriced > 0) {
      items.push({
        tone: 'info', tag: 'For information',
        title: PLAN.hrs(unpriced) + ' of FF&E coordination nobody is paying for',
        body: 'No work item covers this · give a coordination line an owner and ' +
          'an estimate when you contract the next phase',
        href: 'desk.html'
      });
    }

    /* Within the chase band, severity reads top to bottom. The sort is
       stable, so the rule order above still breaks ties — overdue work
       before a spent estimate, both before anything merely due. */
    var RANK = { crit: 0, warn: 1, mine: 2, info: 3 };
    var mine = items.filter(function (i) { return i.group === 'mine'; });
    var chase = items.filter(function (i) { return i.group !== 'mine'; })
      .map(function (i, n) { return { i: i, n: n }; })
      .sort(function (a, b) { return (RANK[a.i.tone] - RANK[b.i.tone]) || (a.n - b.n); })
      .map(function (x) { return x.i; });
    return mine.concat(chase);
  }

  /* ----------------------------------------------------------- the panel */

  var TONES = {
    crit: { color: 'var(--crit)', cls: 'fd-crit' },
    warn: { color: 'var(--warn)', cls: 'fd-warn' },
    mine: { color: 'var(--b1)', cls: 'fd-mine' },
    info: { color: 'var(--ink-3)', cls: 'fd-info' }
  };

  var items = build();
  var chaseN = items.filter(function (i) { return i.tone !== 'info'; }).length;
  var me = person(ME);
  var shown = true;    /* open, rather than collapsed to the bell */
  var popping = false; /* first paint only, so the slide-in runs once */
  var root = null;

  /* Whether this browser tab has already been shown the panel. Storage is
     a convenience and nothing depends on it, so every access is guarded
     and a failure just means the panel opens again. */
  function seen(set) {
    try {
      if (set) { window.sessionStorage.setItem('lehem.feed', '1'); return true; }
      return window.sessionStorage.getItem('lehem.feed') === '1';
    } catch (e) { return false; }
  }

  /* Two bands: what is hers, then what she is chasing. Without the break
     her own task looks mis-sorted, because it is pinned above items that
     are more urgent than it is. */
  function listHtml(list) {
    var out = [], band = null;
    list.forEach(function (it) {
      var g = it.group === 'mine' ? 'mine' : 'chase';
      if (g !== band) {
        band = g;
        out.push('<div class="fd-sect">' +
          (g === 'mine' ? 'Assigned to you' : 'To chase') + '</div>');
      }
      out.push(rowHtml(it));
    });
    return out.join('');
  }

  function rowHtml(it) {
    var tone = TONES[it.tone] || TONES.info;
    return '<a class="fd-row ' + tone.cls + '" href="' + it.href + '">' +
      '<span class="fd-dot" style="background:' + tone.color + ';"></span>' +
      '<span class="fd-body">' +
        '<span class="fd-tag">' + esc(it.tag) + (it.id ? ' \u00b7 ' + esc(it.id) : '') + '</span>' +
        '<span class="fd-title">' + esc(it.title) + '</span>' +
        '<span class="fd-note">' + esc(it.body) + '</span>' +
      '</span>' +
      '<svg class="fd-go" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
      'stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>' +
    '</a>';
  }

  var ICON_BELL = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path>' +
    '<path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg>';
  var ICON_GO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
    'stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>';

  function render() {
    if (!root) { return; }
    root.className = 'feed' + (shown ? '' : ' shut') + (popping ? ' pop' : '');
    if (!shown) {
      root.innerHTML = '<button class="fd-bell" type="button" aria-label="' +
        plural(chaseN, 'thing') + ' to follow up">' + ICON_BELL +
        (chaseN ? '<span class="fd-count num">' + chaseN + '</span>' : '') +
        '</button>';
      root.querySelector('.fd-bell').onclick = function () {
        shown = true; popping = true; render();
        window.setTimeout(function () { popping = false; render(); }, 420);
      };
      return;
    }
    root.innerHTML =
      '<div class="fd-head">' +
        '<span class="fd-who">' +
          '<span class="fd-av">' + esc(me ? me.initials : '\u2014') + '</span>' +
          '<span class="fd-hs">' +
            '<span class="fd-h1">' + plural(chaseN, 'thing') + ' to follow up</span>' +
            '<span class="fd-h2">' + esc(me ? me.short : 'You') +
            ' \u00b7 Friday 18 September</span>' +
          '</span>' +
        '</span>' +
        '<button class="fd-x" type="button" aria-label="Collapse the feed">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="fd-list">' + listHtml(items) + '</div>' +
      '<a class="fd-foot" href="desk.html">Open the team schedule' + ICON_GO + '</a>';
    root.querySelector('.fd-x').onclick = function () { shown = false; render(); };
    watchScroll(root.querySelector('.fd-list'));
  }

  /* Nine items do not fit, and a list that is cut off without saying so
     reads as a list that ends there. The fade is only drawn while there is
     something under it. */
  var marked = false;
  function watchScroll(list) {
    if (!list) { return; }
    /* render() rebuilds the list element, so the scroll handler is bound
       fresh each time; the window handler is bound once and looks the list
       up again, or they would stack one per repaint. */
    var mark = function () {
      var el = root && root.querySelector('.fd-list');
      if (!el) { return; }
      root.classList.toggle('fd-more', el.scrollHeight - el.clientHeight - el.scrollTop > 4);
    };
    list.addEventListener('scroll', mark);
    if (!marked) { marked = true; window.addEventListener('resize', mark); }
    mark();
  }

  function mount() {
    if (!items.length) { return; }
    root = document.createElement('aside');
    document.body.appendChild(root);

    /* Coming back to a page mid-session should not throw the panel over the
       dashboard again — the bell holds the count until it is asked for. */
    shown = !seen(false);
    popping = shown;
    render();
    if (shown) {
      seen(true);
      window.setTimeout(function () { popping = false; render(); }, 650);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && shown) { shown = false; render(); }
    });

    /* The panel floats over the bottom right, so it can sit on top of a
       control — the plan filters end up under it once the ledger is
       short enough to scroll. The moment the person reaches for the page
       it gets out of the way. Capture phase, so the click it yields to
       still lands on whatever was underneath. */
    document.addEventListener('pointerdown', function (e) {
      if (!shown || !root) { return; }
      if (root.contains(e.target)) { return; }
      shown = false;
      render();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
