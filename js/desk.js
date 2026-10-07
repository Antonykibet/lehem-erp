/* Lehem Interiors — service desk.
   Board and queue over one ticket set, with the four rules from the data
   ingestion spec enforced rather than decorated:
     §5.1 the estimate and window are required on the assign transition
     §5.2 every project ticket belongs to a phase
     §5.3 opening a phase spawns its standard ticket set
     §5.4 the revision gate blocks assignment at the phase allowance
     §1   the time bucket is derived from work type + phase fee type, never picked
*/
(function () {
  'use strict';

  var P = DESK.PEOPLE, WT = DESK.WORK_TYPES, PROJ = DESK.PROJECTS;
  var STATES = DESK.STATES, FEE = DESK.FEE_TYPES, BUCKETS = DESK.BUCKETS;
  var PHASE_NAMES = DESK.PHASE_NAMES, PHASE_KEYS = DESK.PHASE_KEYS;
  var TICKETS = DESK.TICKETS.slice();

  /* Billing is the spine: an invoice line was priced at contracting, and this
     screen reads from it rather than deciding anything about money itself. */
  BILL.seed(TICKETS);
  var money = BILL.money;

  var REASONS = ['Scope never priced', 'Goodwill', 'Reselection', 'Quoting error'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* The sample week: Monday 14 to Friday 18 September 2026. */
  var WEEK_START = new Date(2026, 8, 14);
  var WEEK_END = new Date(2026, 8, 18);

  /* ---------------------------------------------------------------- lookups */

  function wt(id) { return WT.filter(function (w) { return w.id === id; })[0]; }
  function person(id) { return P.filter(function (p) { return p.id === id; })[0]; }
  function proj(id) { return PROJ.filter(function (p) { return p.id === id; })[0]; }
  function phaseRec(t) {
    var pr = proj(t.p);
    return pr && t.ph ? pr.phases[t.ph] : null;
  }

  /* ------------------------------------------------ §1 the bucket derivation
     Lives in billing.js now, because the answer comes from the ticket's
     invoice line — which was priced once, at contracting. The person logging
     hours still chooses nothing. */
  function derive(t) { return BILL.derive(t); }

  /* --------------------------------------------------- §5.4 the revision gate
     A revision ticket on a phase that has used its allowance cannot be
     assigned until a decision is recorded against it. */

  function gate(t) {
    var w = wt(t.type);
    if (!w.revision || t.state === 'done') { return null; }
    var rec = phaseRec(t);
    if (!rec) { return null; }
    /* §5.4 blocks the assign transition, so the gate is only open on a ticket
       nobody is working yet. One already in progress is past that point. */
    var unassigned = !t.who && t.state === 'intake';
    var open = unassigned && rec.used >= rec.allow && !t.decision;
    return {
      used: rec.used, allow: rec.allow, open: open,
      decision: t.decision || null
    };
  }

  /* --------------------------------------------------------- dates and load */

  function parseDay(s) {
    if (!s) { return null; }
    var b = String(s).trim().split(' ');
    var m = MONTHS.indexOf(b[1]);
    var d = parseInt(b[0], 10);
    /* new Date(2026, -1, NaN) is an Invalid Date, and an Invalid Date is
       truthy — so the month and day are checked here instead. */
    if (m === -1 || !d || d < 1 || d > 31) { return null; }
    return new Date(2026, m, d);
  }
  function bizDays(a, b) {
    var n = 0, d = new Date(a.getTime());
    while (d <= b) {
      if (d.getDay() !== 0 && d.getDay() !== 6) { n++; }
      d.setDate(d.getDate() + 1);
    }
    return n;
  }
  /* The estimate spread evenly across its window, then the part of it that
     lands inside the sample week. This is the forward capacity allocation
     §5.1 is protecting — a ticket with no estimate contributes nothing. */
  function weekHours(t) {
    if (!t.est || !t.start || !t.due) { return 0; }
    var a = parseDay(t.start), b = parseDay(t.due);
    var total = bizDays(a, b);
    if (!total) { return 0; }
    var lo = a > WEEK_START ? a : WEEK_START;
    var hi = b < WEEK_END ? b : WEEK_END;
    if (lo > hi) { return 0; }
    return t.est / total * bizDays(lo, hi);
  }

  var OPEN_STATES = ['assigned', 'progress', 'blocked', 'review'];
  function isOpen(t) { return OPEN_STATES.indexOf(t.state) !== -1; }

  function load(pid) {
    var avail = 40 - (DESK.LEAVE[pid] || 0);
    var hrs = TICKETS.filter(function (t) {
      return t.who === pid && isOpen(t);
    }).reduce(function (a, t) { return a + weekHours(t); }, 0);
    return { hours: Math.round(hrs * 10) / 10, avail: avail, ratio: avail ? hrs / avail : 0 };
  }

  /* -------------------------------------------------------------- formatting */

  function hrs(n) {
    if (n === null || n === undefined) { return '—'; }
    return (Math.round(n * 10) / 10) + 'h';
  }
  /* The ticket does not hold a running total — the time entries do. */
  function logged(t) { return BILL.loggedOnTicket(t.id); }
  /* "a, b and c" rather than "a and b and c". */
  function listOf(a) {
    if (a.length < 3) { return a.join(' and '); }
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function avatar(pid, cls) {
    var p = person(pid);
    if (!p) { return '<span class="avatar-sm dk-unassigned" title="Unassigned">—</span>'; }
    return '<span class="avatar-sm ' + (cls || '') + '" title="' + esc(p.name) + '">' +
      p.initials + '</span>';
  }
  function bucketTag(b) {
    return '<span class="bk bk-' + b + '">' + b + '</span>';
  }

  /* ------------------------------------------------------------------ state */

  /* The Overview's team chips link here with ?who=, so arriving from one
     lands on that person's tickets rather than on everybody's. */
  function whoFromUrl() {
    var m = /[?&]who=([a-z]{2})\b/.exec(window.location.search);
    if (!m) { return 'all'; }
    return P.some(function (p) { return p.id === m[1]; }) ? m[1] : 'all';
  }

  var state = {
    project: 'all',
    who: whoFromUrl(),
    open: '',          /* ticket id whose detail panel is showing */
    gate: null,        /* { id, choice, reason, error } */
    log: null,         /* { id, hours, error } */
    flash: '',
    sort: 'due'
  };

  var seq = 500;
  function nextId() { seq += 1; return 'LEH-' + seq; }

  /* ----------------------------------------------------------------- filters */

  function shown() {
    return TICKETS.filter(function (t) {
      if (state.project !== 'all' && t.p !== state.project) { return false; }
      if (state.who !== 'all' && t.who !== state.who) { return false; }
      return true;
    });
  }

  /* ------------------------------------------------------------------- cards */

  /* ------------------------------------------------------------- the queue
     One listing, with the assignee and the estimate editable in the row.
     Editing them does not bypass §5.1: a ticket only leaves intake once an
     assignee, an estimate AND a window are all present. */

  var SORTS = {
    due: function (a, b) {
      var x = parseDay(a.due), y = parseDay(b.due);
      if (!x && !y) { return 0; }
      if (!x) { return 1; }
      if (!y) { return -1; }
      return x - y;
    },
    est: function (a, b) { return (b.est || 0) - (a.est || 0); },
    project: function (a, b) { return String(a.p).localeCompare(String(b.p)); },
    state: function (a, b) {
      return STATES.map(function (s) { return s.id; }).indexOf(a.state) -
             STATES.map(function (s) { return s.id; }).indexOf(b.state);
    },
    title: function (a, b) { return a.title.localeCompare(b.title); }
  };

  function whoCell(t) {
    var p = person(t.who);
    if (!p) { return '<span class="dk-sub">Unassigned</span>'; }
    return '<span class="lead-cell">' + avatar(t.who) +
      '<span class="dk-who-name">' + esc(p.short) + '</span></span>';
  }

  function estCell(t) {
    if (!t.est) { return '<span class="dk-warn-text">no estimate</span>'; }
    return '<span class="est-cell">' +
      '<span class="est-fig">' + hrs(logged(t)) + ' of ' + hrs(t.est) + '</span>' +
      '<span class="est-logged">' + hrs(weekHours(t)) + ' this week</span>' +
    '</span>';
  }

  function stateCell(t, locked) {
    return '<select class="inp inp-cell state-sel st-' + t.state + '" ' +
      'data-act="set-state" data-val="' + t.id + '"' + (locked ? ' disabled' : '') + '>' +
      STATES.map(function (s) {
        return '<option value="' + s.id + '"' + (t.state === s.id ? ' selected' : '') + '>' +
          s.name + '</option>';
      }).join('') +
    '</select>';
  }

  function queue(list) {
    var rows = list.slice().sort(SORTS[state.sort]);
    function th(key, label, cls) {
      return '<th' + (cls ? ' class="' + cls + '"' : '') + '>' +
        '<button type="button" class="th-sort' + (state.sort === key ? ' on' : '') +
        '" data-act="sort" data-val="' + key + '">' + label + '</button></th>';
    }
    return '<table class="data-table dk-queue"><thead><tr>' +
      th('title', 'Ticket') + th('project', 'Project · phase') +
      '<th>Work type</th><th>Bucket</th>' +
      '<th>Assignee</th>' + th('est', 'Estimate', 'num') +
      th('due', 'Window') + th('state', 'State') +
    '</tr></thead><tbody>' +
      rows.map(function (t) {
        var pr = proj(t.p), w = wt(t.type), g = gate(t), d = derive(t);
        var isOpenRow = state.open === t.id;
        var locked = !!(g && g.open);
        var over = t.est && logged(t) > t.est;
        return '<tr class="dk-row' + (isOpenRow ? ' open' : '') + (locked ? ' gated' : '') + '">' +
          '<td><button type="button" class="dk-row-btn" aria-expanded="' + isOpenRow +
            '" data-act="open" data-val="' + t.id + '">' +
            '<span class="dk-id">' + t.id +
              (locked ? '<span class="dk-gate-badge">Gate</span>' : '') + '</span>' +
            '<span class="dk-row-title">' + esc(t.title) + '</span>' +
          '</button></td>' +
          '<td>' + (pr ? esc(pr.name) + '<span class="dk-sub">' + PHASE_NAMES[t.ph] + '</span>'
            : '<span class="dk-sub">Business</span>') + '</td>' +
          '<td><span class="dk-sub">' + esc(w.name) + '</span></td>' +
          '<td>' + bucketTag(d.bucket) + '</td>' +
          '<td>' + whoCell(t) + '</td>' +
          '<td class="num' + (over ? ' est-over' : '') + '">' + estCell(t) + '</td>' +
          '<td>' + (t.start
            ? '<span class="dk-sub">' + t.start + ' – ' + t.due + '</span>'
            : '<button type="button" class="dk-need" data-act="open" data-val="' + t.id +
              '">Not set</button>') + '</td>' +
          '<td>' + stateCell(t, locked) + '</td>' +
        '</tr>' +
        (isOpenRow ? '<tr class="dk-det-row"><td colspan="8">' + detail(t) + '</td></tr>' : '');
      }).join('') +
    '</tbody></table>';
  }

  function detail(t) {
    var w = wt(t.type), pr = proj(t.p), g = gate(t), d = derive(t);
    var rec = phaseRec(t);
    var p = person(t.who);

    var line = BILL.lineFor(t.id);
    var inv = line ? BILL.invoiceOf(line.id) : null;
    var facts = [
      ['Work type', w.name],
      ['Group', w.group],
      ['Project', pr ? pr.name : 'None — business work'],
      ['Phase', t.ph ? PHASE_NAMES[t.ph] + (DESK.PHASE_SERIES[t.ph] ? ' · ' + DESK.PHASE_SERIES[t.ph] : '') : '—'],
      ['Invoice line', line ? line.id + ' on ' + line.invoice : 'none — not contracted'],
      ['Charged', line ? (line.basis === 'rate' ? money(line.rate) + ' an hour'
        : 'flat fee of ' + money(line.flat)) : 'nothing'],
      ['Assignee', p ? p.name : 'Unassigned'],
      ['Estimate', t.est ? hrs(t.est) : 'Not set'],
      ['Logged', hrs(logged(t))],
      ['Window', t.start ? t.start + ' – ' + t.due : 'Not set'],
      ['This week', t.est ? hrs(weekHours(t)) + ' of capacity' : 'Invisible to the heatmap']
    ].map(function (f) {
      return '<div class="fact"><span class="fact-key">' + f[0] + '</span>' +
        '<span class="fact-val">' + esc(f[1]) + '</span></div>';
    }).join('');

    var why = d.steps.map(function (s, i) {
      return '<div class="why-row' + (i === d.steps.length - 1 ? ' last' : '') + '">' +
        '<span class="why-n">' + (i + 1) + '</span><span class="why-t">' + esc(s) + '</span></div>';
    }).join('');

    /* --- the action column changes with what the ticket needs next --- */
    var action = '';

    if (g && g.open) {
      action = gatePanel(t, g);
    } else if (state.log && state.log.id === t.id) {
      action = logPanel(t, d);
    } else {
      var missing = [];
      if (!t.who) { missing.push('an assignee'); }
      if (!t.est) { missing.push('an estimate'); }
      if (!t.start || !t.due) { missing.push('a window'); }

      action = '<div class="caps">What happens next</div>' +
        (g && g.decision
          ? '<div class="gate-done">Revision ' + (g.used + 1) + ' of an allowance of ' + g.allow +
            '. ' + (g.decision.choice === 'co'
              ? 'A change order was raised, so this round is chargeable.'
              : 'Absorbed — ' + esc(g.decision.reason) + '.') + '</div>'
          : '') +

        /* §5.1 — assignee, estimate and window. The estimate is the capacity
           allocation, so a ticket without one never reaches the heatmap. */
        '<div class="form">' +
          '<label class="fld"><span class="fld-l">Assignee</span>' +
            '<select class="inp" data-act="set-who" data-val="' + t.id + '">' +
              '<option value=""' + (t.who ? '' : ' selected') + '>Unassigned</option>' +
              P.map(function (p) {
                return '<option value="' + p.id + '"' + (t.who === p.id ? ' selected' : '') + '>' +
                  esc(p.name) + ' — ' + Math.round(load(p.id).ratio * 100) + '% booked</option>';
              }).join('') +
            '</select></label>' +
          '<label class="fld"><span class="fld-l">Estimate (hours)</span>' +
            '<input class="inp" type="number" min="0" step="0.5" value="' + (t.est || '') + '" ' +
            'placeholder="required" data-act="set-est" data-val="' + t.id + '"></label>' +
          '<div class="fld-row">' +
            '<label class="fld"><span class="fld-l">Start</span>' +
              '<input class="inp" value="' + (t.start || '') + '" placeholder="e.g. 22 Sep" ' +
              'data-act="set-start" data-val="' + t.id + '"></label>' +
            '<label class="fld"><span class="fld-l">Due</span>' +
              '<input class="inp" value="' + (t.due || '') + '" placeholder="e.g. 26 Sep" ' +
              'data-act="set-due" data-val="' + t.id + '"></label>' +
          '</div>' +
        '</div>' +

        (missing.length
          ? '<div class="dk-need-note">Still needs ' + listOf(missing) +
            ' before it can leave intake — the estimate is the capacity allocation.</div>'
          : '') +

        (t.who && t.state !== 'done'
          ? '<div class="dk-actions">' +
              '<button type="button" class="btn btn-go" data-act="log-open" data-val="' + t.id +
                '">Log hours</button>' +
            '</div>' +
            '<div class="dk-note">Move it between states with the State column in the row.</div>'
          : '') +

        (t.blockNote ? '<div class="dk-blocknote">' + esc(t.blockNote) + '</div>' : '') +
        (t.leadId ? '<div class="dk-note">Tagged to the ' + esc(t.leadId) +
          ' lead, so these hours can be read back as cost per win.</div>' : '');
    }

    /* What this ticket is worth, read straight off its invoice line. */
    var worth;
    if (!line) {
      worth = '<div class="worth none">' +
        '<div class="worth-fig">' + (w.bucket === 'sourcing' ? 'Unpriced' : 'Not contracted') + '</div>' +
        '<div class="worth-sub">' + (w.bucket === 'sourcing'
          ? 'FF&amp;E coordination with no invoice line. The hours are real; nobody is paying for them.'
          : 'No invoice line covers this work, so the hours land in overhead.') + '</div>' +
      '</div>';
    } else if (line.basis === 'rate') {
      var lh = BILL.loggedHours(line);
      worth = '<div class="worth">' +
        '<div class="worth-fig">' + money(BILL.value(line)) + '</div>' +
        '<div class="worth-sub">' + hrs(lh) + ' logged at ' + money(line.rate) + ' an hour · ' +
          money(BILL.forecast(line)) + ' forecast at ' + hrs(line.est) + '</div>' +
        '<div class="worth-track"><span class="worth-fill' +
          (line.est && lh > line.est ? ' over' : '') + '" style="width:' +
          Math.min(100, line.est ? lh / line.est * 100 : 0) + '%;"></span></div>' +
        '<div class="worth-note">' + (line.est && lh > line.est
          ? hrs(lh - line.est) + ' past the estimate, and still billing'
          : 'Every hour logged adds to it') + '</div>' +
      '</div>';
    } else {
      worth = '<div class="worth">' +
        '<div class="worth-fig">' + money(line.flat) + '</div>' +
        '<div class="worth-sub">A flat fee, drawn from the ' + PHASE_NAMES[t.ph] +
          ' fee on this contract</div>' +
        '<div class="worth-note">Hours do not change it. They decide whether it was worth taking.</div>' +
      '</div>';
    }

    return '<div class="dk-detail dk-detail-4">' +
      '<div>' +
        '<div class="caps">The ticket</div>' +
        '<div class="facts">' + facts + '</div>' +
      '</div>' +
      '<div>' +
        '<div class="caps">What it is worth</div>' +
        (inv ? '<p class="why-sub">Priced at contracting on ' + inv.id + ', before this ticket existed.</p>' : '') +
        worth +
      '</div>' +
      '<div>' +
        '<div class="caps">How the bucket was decided</div>' +
        '<p class="why-sub">Derived at write time from the work type and the phase. Nobody picks it, so the utilization figure cannot be talked up.</p>' +
        '<div class="why">' + why + '</div>' +
        '<div class="why-out">' + bucketTag(d.bucket) +
          '<span class="why-out-t">' + BUCKETS[d.bucket].name + ' · paid for by ' +
          BUCKETS[d.bucket].paid.toLowerCase() + '</span></div>' +
      '</div>' +
      '<div>' + action + '</div>' +
    '</div>';
  }

  /* -------------------------------------------------- §5.4 the gate panel */

  function gatePanel(t, g) {
    var d = state.gate && state.gate.id === t.id ? state.gate : { choice: '', reason: '' };
    return '<div class="caps gate-caps">Revision allowance used</div>' +
      '<p class="gate-lead">' + PHASE_NAMES[t.ph] + ' on ' + esc(proj(t.p).name) +
        ' allowed ' + g.allow + ' revision' + (g.allow === 1 ? '' : 's') + ' and has used ' +
        g.used + '. This one cannot be assigned until somebody says who pays for it.</p>' +
      '<div class="gate-choices">' +
        '<button type="button" class="gate-choice' + (d.choice === 'co' ? ' on' : '') +
          '" data-act="gf" data-val="co">' +
          '<span class="gate-choice-t">Raise a change order</span>' +
          '<span class="gate-choice-s">The client is asked to pay for this round</span></button>' +
        '<button type="button" class="gate-choice' + (d.choice === 'absorb' ? ' on' : '') +
          '" data-act="gf" data-val="absorb">' +
          '<span class="gate-choice-t">Absorb it</span>' +
          '<span class="gate-choice-s">Lehem carries the cost — pick a reason</span></button>' +
      '</div>' +
      (d.choice === 'absorb'
        ? '<div class="gate-reasons">' +
            REASONS.map(function (r) {
              return '<button type="button" class="chip' + (d.reason === r ? ' active' : '') +
                '" data-act="gr" data-val="' + esc(r) + '">' + esc(r) + '</button>';
            }).join('') +
          '</div>'
        : '') +
      (d.error ? '<div class="form-err">' + esc(d.error) + '</div>' : '') +
      '<div class="dk-actions">' +
        '<button type="button" class="btn btn-go" data-act="gate-do" data-val="' + t.id + '">Record the decision</button>' +
      '</div>' +
      '<p class="gate-foot">Firms do not lose money by refusing to charge for changes. They lose it because the change was never written down.</p>';
  }

  /* --------------------------------------------------- §1 the time log panel */

  function logPanel(t, d) {
    var l = state.log;
    return '<div class="caps">Log hours</div>' +
      '<p class="why-sub">You enter hours and nothing else. The ticket already knows the project, the phase and the bucket.</p>' +
      '<div class="form">' +
        '<label class="fld"><span class="fld-l">Hours</span>' +
          '<input class="inp" type="number" min="0" step="0.5" value="' + (l.hours || '') +
          '" data-act="lf" data-val="hours" placeholder="required"></label>' +
        '<div class="fld"><span class="fld-l">Bucket</span>' +
          '<div class="inp inp-locked">' + d.bucket + ' — derived, not editable</div></div>' +
        (l.error ? '<div class="form-err">' + esc(l.error) + '</div>' : '') +
        '<div class="dk-actions">' +
          '<button type="button" class="btn btn-go" data-act="log-do">Log it</button>' +
          '<button type="button" class="btn" data-act="cancel">Cancel</button>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------- §5.3 the phase template panel */

  /* ---------------------------------------------------------- capacity rail */

  function capacity() {
    var rows = P.map(function (p) {
      var l = load(p.id);
      return { p: p, l: l };
    }).sort(function (a, b) { return b.l.ratio - a.l.ratio; });

    var free = rows.filter(function (r) { return r.l.ratio < 0.85; });

    return '<div class="cap">' +
      '<div class="cap-head">' +
        '<div><div class="caps">Who has room this week</div>' +
        '<p class="why-sub">Assigned estimates spread across their windows, against available hours. ' +
          free.length + ' of ' + rows.length + ' have space for more.</p></div>' +
      '</div>' +
      '<div class="cap-grid">' +
        rows.map(function (r) {
          var pct = Math.round(r.l.ratio * 100);
          var cls = pct > 100 ? 'crit' : (pct > 90 ? 'warn' : (pct < 60 ? 'free' : 'ok'));
          var word = pct > 100 ? 'Over' : (pct > 90 ? 'Full' : (pct < 60 ? 'Room' : 'Fine'));
          return '<button type="button" class="cap-cell' +
            (state.who === r.p.id ? ' on' : '') + '" data-act="who" data-val="' + r.p.id + '">' +
            '<span class="cap-who">' + avatar(r.p.id) +
              '<span class="cap-name">' + esc(r.p.short) + '<span class="cap-role">' +
              esc(r.p.role) + '</span></span></span>' +
            '<span class="cap-track"><span class="cap-fill ' + cls +
              '" style="width:' + Math.min(100, pct) + '%;"></span></span>' +
            '<span class="cap-meta"><b>' + r.l.hours + 'h of ' + r.l.avail + 'h</b>' +
              '<span class="cap-word ' + cls + '"><span class="cap-dot"></span>' + word + '</span></span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------------- view */

  function view() {
    var list = shown();
    var all = TICKETS;
    var intake = all.filter(function (t) { return t.state === 'intake'; });
    var gated = all.filter(function (t) { var g = gate(t); return g && g.open; });
    /* Intake carries no capacity by definition: nothing there has an estimate,
       so none of it reaches the forward forecast until it is assigned (§5.1). */
    var unplanned = intake.reduce(function (a, t) { return a + (t.suggested || 0); }, 0);
    var committed = P.reduce(function (a, p) { return a + load(p.id).hours; }, 0);
    var available = P.reduce(function (a, p) { return a + (40 - (DESK.LEAVE[p.id] || 0)); }, 0);
    var sourcing = all.filter(function (t) { return derive(t).bucket === 'sourcing'; })
      .reduce(function (a, t) { return a + (logged(t)); }, 0);

    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Work in hand</div>' +
        '<h1 class="page-title">Service desk</h1>' +
        '<p class="page-sub">' + all.length + ' tickets across ' + PROJ.length +
          ' running projects · week of 14 September 2026</p>' +
      '</div>' +
    '</div>');

    h.push('<div class="rule-top metrics">' +
      '<div class="metric">' +
        '<div class="caps">Waiting in intake</div>' +
        '<div class="metric-value">' + intake.length + '</div>' +
        '<div class="metric-note">Raised but not assigned, so carrying no capacity</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Blocked at the gate</div>' +
        '<div class="metric-value' + (gated.length ? ' is-warn' : '') + '">' + gated.length + '</div>' +
        '<div class="metric-note">Revisions past the allowance, awaiting a decision</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Committed this week</div>' +
        '<div class="metric-value">' + Math.round(committed) + 'h</div>' +
        '<div class="metric-note">Estimates on open tickets, against ' + available + 'h available</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Unpriced sourcing</div>' +
        '<div class="metric-value">' + hrs(sourcing) + '</div>' +
        '<div class="metric-note">FF&amp;E coordination hours nobody is paying for</div>' +
      '</div>' +
    '</div>');

    if (state.flash) {
      h.push('<div class="flash">' + esc(state.flash) + '</div>');
    }

    /* toolbar */
    h.push('<div class="rule-top dk-bar">' +
      '<div class="chips">' +
        '<button type="button" class="chip' + (state.project === 'all' ? ' active' : '') +
          '" data-act="project" data-val="all">All projects<span class="chip-count">' +
          all.length + '</span></button>' +
        PROJ.map(function (p) {
          var n = all.filter(function (t) { return t.p === p.id; }).length;
          return '<button type="button" class="chip' + (state.project === p.id ? ' active' : '') +
            '" data-act="project" data-val="' + p.id + '">' + esc(p.name) +
            '<span class="chip-count">' + n + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="dk-bar-note">' + list.length +
        (list.length === 1 ? ' ticket' : ' tickets') + ' shown · open one to assign it, or change its state in the row</div>' +
    '</div>');

    if (state.who !== 'all') {
      var wp = person(state.who);
      h.push('<div class="dk-scope">Showing only ' + esc(wp.name) + '’s tickets · ' +
        list.length + ' of ' + all.length +
        ' <button type="button" class="chip" data-act="who" data-val="all">Show everyone</button></div>');
    }
    if (intake.length) {
      h.push('<div class="dk-flag">' + intake.length + ' ticket' +
        (intake.length === 1 ? ' is' : 's are') + ' sitting in intake with no estimate' +
        (unplanned ? ', roughly ' + hrs(unplanned) + ' by the template suggestions' : '') +
        '. Until they are assigned they carry no capacity, so the forward forecast understates the load.</div>');
    }

    h.push(queue(list));

    h.push('<div class="rule-top">' + capacity() + '</div>');

    return h.join('');
  }

  /* --------------------------------------------------------------- actions */

  function find(id) { return TICKETS.filter(function (t) { return t.id === id; })[0]; }

  function doGate() {
    var g = state.gate;
    if (!g || !g.choice) {
      state.gate = state.gate || { id: state.open };
      state.gate.error = 'Record a decision: raise a change order, or absorb it with a reason.';
      return;
    }
    if (g.choice === 'absorb' && !g.reason) {
      g.error = 'An absorbed revision needs a reason code.';
      return;
    }
    var t = find(g.id);
    t.decision = { choice: g.choice, reason: g.reason || '' };
    var rec = phaseRec(t);
    if (g.choice === 'co') {
      /* A change order raises the allowance, because the round is now paid for. */
      rec.allow += 1;
      state.flash = 'Change order raised on ' + t.id +
        '. The allowance moves to ' + rec.allow + ' and the ticket can be assigned.';
    } else {
      state.flash = t.id + ' absorbed — ' + g.reason +
        '. It will show in the absorbed causes on the Overview.';
    }
    state.gate = null;
  }

  /* An hour is a record against the ticket's invoice line, carrying who did it
     and the rate at the moment it was logged. On a rate line it moves the
     line's value straight away. */
  function doLog() {
    var l = state.log, t = find(l.id);
    var n = parseFloat(l.hours);
    if (!n || n <= 0) { l.error = 'Enter the hours.'; return; }
    if (!t.who) { l.error = 'Nobody is assigned, so there is no one to log against.'; return; }
    BILL.logTime(t, t.who, n, '18 Sep');
    var line = BILL.lineFor(t.id);
    var d = derive(t);
    state.log = null;
    state.flash = hrs(n) + ' logged by ' + person(t.who).short + ' on ' + t.id +
      ' → ' + d.bucket + '. ' +
      (!line
        ? 'No invoice line covers this work, so it is worth nothing to the client.'
        : line.basis === 'rate'
          ? line.id + ' is now worth ' + money(BILL.value(line)) + ' — ' +
            hrs(BILL.loggedHours(line)) + ' at ' + money(line.rate) + ' an hour.'
          : line.id + ' is a flat ' + money(line.flat) + ', so the hour is already in the fee.');
  }

  /* §5.1 — a ticket only leaves intake once an assignee, an estimate AND a
     window are all present, however they were entered. */
  function settle(t) {
    if (t.state !== 'intake') { return null; }
    if (!t.who || !t.est || !t.start || !t.due) { return null; }
    t.state = 'assigned';
    return t.id + ' is now assigned to ' + person(t.who).name + ' — ' + hrs(t.est) +
      ' booked into ' + t.start + ' – ' + t.due + '.';
  }

  function setField(id, key, raw) {
    var t = find(id);
    var g = gate(t);
    if (g && g.open) {
      state.flash = t.id + ' is held at the revision gate. Record a decision before assigning it.';
      return;
    }
    if (key === 'who') {
      t.who = raw || null;
      state.flash = raw
        ? t.id + ' → ' + person(raw).name + ' (' +
          Math.round(load(raw).ratio * 100) + '% booked this week).'
        : t.id + ' unassigned.';
      if (!raw && t.state !== 'intake') { t.state = 'intake'; }
    } else if (key === 'est') {
      var n = parseFloat(raw);
      if (raw === '' || isNaN(n) || n <= 0) {
        t.est = null;
        state.flash = t.id + ' has no estimate, so it carries no capacity.';
      } else {
        t.est = n;
        state.flash = t.id + ' estimated at ' + hrs(n) +
          (t.start ? ' — ' + hrs(weekHours(t)) + ' of it lands in this week.' : '.');
      }
    } else if (key === 'state') {
      if (raw === t.state) { return; }
      /* Leaving intake needs all three; after that a state change only needs
         somebody to own it. */
      if (raw !== 'intake') {
        var need = [];
        if (!t.who) { need.push('an assignee'); }
        if (t.state === 'intake') {
          if (!t.est) { need.push('an estimate'); }
          if (!t.start || !t.due) { need.push('a window'); }
        }
        if (need.length) {
          state.flash = t.id + ' still needs ' + listOf(need) + ' before it can move to ' +
            STATES.filter(function (s) { return s.id === raw; })[0].name.toLowerCase() + '.';
          return;
        }
      }
      var was = t.state;
      t.state = raw;
      if (raw !== 'blocked') { t.blockNote = null; }
      var byWho = t.who ? ' by ' + person(t.who).short : '';
      if (raw === 'done' && t.est && !logged(t)) {
        /* §10 — closing with nothing logged is the compliance hole. Say so. */
        state.flash = t.id + ' closed' + byWho + ' with no hours logged against it. Its ' +
          hrs(t.est) + ' estimate never becomes an actual.';
      } else if (raw === 'intake') {
        state.flash = t.id + ' sent back to intake from ' +
          STATES.filter(function (s) { return s.id === was; })[0].name.toLowerCase() + '.';
      } else {
        state.flash = t.id + ' moved to ' +
          STATES.filter(function (s) { return s.id === raw; })[0].name.toLowerCase() + byWho + '.';
      }
      return;
    } else if (key === 'start' || key === 'due') {
      var v = raw.trim();
      if (v && !parseDay(v)) {
        state.flash = 'Dates read like "22 Sep" — ' + t.id + ' left unchanged.';
        return;
      }
      t[key] = v || null;
      state.flash = t.id + ' window is now ' + (t.start || '—') + ' – ' + (t.due || '—') + '.';
    }
    var moved = settle(t);
    if (moved) { state.flash = moved; }
  }

  /* ---------------------------------------------------------- render + wire */

  var app = document.getElementById('app');
  function render() { app.innerHTML = view(); }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') { return; }
    var act = el.getAttribute('data-act');
    var val = el.getAttribute('data-val');
    var t;

    if (act === 'project') { state.project = val; state.open = ''; }
    else if (act === 'who') { state.who = (state.who === val ? 'all' : val); state.open = ''; }
    else if (act === 'sort') { state.sort = val; }
    else if (act === 'open') {
      state.open = (state.open === val ? '' : val);
      state.log = null; state.gate = null; state.flash = '';
      t = find(state.open);
      /* Land straight on the gate when the ticket is blocked by one. */
      if (t) { var g = gate(t); if (g && g.open) { state.gate = { id: t.id, choice: '', reason: '' }; } }
    }
    else if (act === 'close') { state.open = ''; state.log = null; state.gate = null; }
    else if (act === 'cancel') { state.log = null; }
    else if (act === 'log-open') { state.log = { id: val, hours: '' }; state.flash = ''; }
    else if (act === 'log-do') { doLog(); }
    else if (act === 'gf') {
      state.gate = state.gate || { id: state.open };
      state.gate.choice = val; state.gate.reason = ''; state.gate.error = '';
    }
    else if (act === 'gr') { state.gate.reason = val; state.gate.error = ''; }
    else if (act === 'gate-do') { state.gate = state.gate || { id: val }; doGate(); }
    else { return; }
    render();
  });

  /* Field edits keep their own state so a re-render does not lose typing. */
  app.addEventListener('input', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), key = el.getAttribute('data-val');
    if (act === 'lf' && state.log) { state.log[key] = el.value; state.log.error = ''; }
  });
  /* Row edits commit on change rather than on every keystroke, so typing an
     estimate is not interrupted by a re-render. */
  app.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');
    if (act === 'set-who') { setField(val, 'who', el.value); }
    else if (act === 'set-est') { setField(val, 'est', el.value); }
    else if (act === 'set-state') { setField(val, 'state', el.value); }
    else if (act === 'set-start') { setField(val, 'start', el.value); }
    else if (act === 'set-due') { setField(val, 'due', el.value); }
    else { return; }
    render();
  });

  render();
})();
