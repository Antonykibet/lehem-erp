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
     Returned with its working, because the whole point of the rule is that
     anyone can see why an hour landed where it did. */

  function derive(t) {
    var w = wt(t.type);
    if (w.bucket !== 'phase') {
      return {
        bucket: w.bucket,
        steps: [
          w.group + ' work type — the bucket is fixed on the type',
          'Bucket: ' + w.bucket
        ]
      };
    }
    var rec = phaseRec(t);
    if (!rec) {
      return { bucket: 'over', steps: ['No phase — treated as overhead', 'Bucket: over'] };
    }
    var ft = FEE[rec.fee];
    return {
      bucket: ft.bucket,
      steps: [
        w.group + ' work type — look the bucket up from the phase',
        PHASE_NAMES[t.ph] + ' is charged ' + ft.label.toLowerCase(),
        'Bucket: ' + ft.bucket
      ]
    };
  }

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

  var state = {
    project: 'all',
    who: 'all',
    open: '',          /* ticket id whose detail panel is showing */
    gate: null,        /* { id, choice, reason, error } */
    log: null,         /* { id, hours, error } */
    tmpl: null,        /* { project, phase, error } */
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
      '<span class="est-fig">' + hrs(t.logged || 0) + ' of ' + hrs(t.est) + '</span>' +
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
        var over = t.est && t.logged > t.est;
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

    var facts = [
      ['Work type', w.name],
      ['Group', w.group],
      ['Project', pr ? pr.name : 'None — business work'],
      ['Phase', t.ph ? PHASE_NAMES[t.ph] + (DESK.PHASE_SERIES[t.ph] ? ' · ' + DESK.PHASE_SERIES[t.ph] : '') : '—'],
      ['Phase charged', rec ? FEE[rec.fee].label : '—'],
      ['Assignee', p ? p.name : 'Unassigned'],
      ['Estimate', t.est ? hrs(t.est) : 'Not set'],
      ['Logged', hrs(t.logged || 0)],
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

    return '<div class="dk-detail">' +
      '<div>' +
        '<div class="caps">The ticket</div>' +
        '<div class="facts">' + facts + '</div>' +
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

  function templatePanel() {
    var t = state.tmpl;
    var rows = t.rows;
    var total = rows ? rows.reduce(function (a, r) { return a + (parseFloat(r.est) || 0); }, 0) : 0;

    return '<div class="tmpl">' +
      '<div class="tmpl-head">' +
        '<div><div class="caps">Open a phase</div>' +
        '<p class="why-sub">Opening a phase spawns its standard tickets. Set who takes each one and how long it should take here — the lead edits and assigns rather than composes, otherwise intake becomes the bottleneck and the system starves.</p></div>' +
        '<button type="button" class="btn" data-act="cancel">Close</button>' +
      '</div>' +
      '<div class="fld-row">' +
        '<label class="fld"><span class="fld-l">Project</span>' +
          '<select class="inp" data-act="tf" data-val="project">' +
            '<option value="">Choose a project…</option>' +
            PROJ.map(function (p) {
              return '<option value="' + p.id + '"' + (t.project === p.id ? ' selected' : '') + '>' +
                esc(p.name) + '</option>';
            }).join('') +
          '</select></label>' +
        '<label class="fld"><span class="fld-l">Phase</span>' +
          '<select class="inp" data-act="tf" data-val="phase">' +
            '<option value="">Choose a phase…</option>' +
            PHASE_KEYS.map(function (k) {
              return '<option value="' + k + '"' + (t.phase === k ? ' selected' : '') + '>' +
                PHASE_NAMES[k] + '</option>';
            }).join('') +
          '</select></label>' +
      '</div>' +

      (rows
        ? (function () {
            var rec = proj(t.project).phases[t.phase];
            var ft = FEE[rec.fee];
            return '<div class="tmpl-list">' +
              '<div class="tmpl-list-head">' +
                '<div><div class="caps">' + rows.length + ' tickets will be raised</div>' +
                '<p class="why-sub">Assignees are suggested from who can do the work and who has most room this week. Change any of them.</p></div>' +
                '<div class="tmpl-fee">' + PHASE_NAMES[t.phase] + ' is charged ' +
                  ft.label.toLowerCase() + ', so these hours land in ' +
                  '<span class="bk bk-' + ft.bucket + '">' + ft.bucket + '</span></div>' +
              '</div>' +
              '<div class="tmpl-grid tmpl-grid-head">' +
                '<span class="caps">Ticket</span><span class="caps">Assignee</span>' +
                '<span class="caps num">Estimate</span>' +
              '</div>' +
              rows.map(function (r, i) {
                var sug = person(r.who);
                var l = sug ? load(sug.id) : null;
                return '<div class="tmpl-grid tmpl-row">' +
                  '<span class="tmpl-t">' + esc(r.title) +
                    '<span class="tmpl-y">' + esc(wt(r.type).name) + '</span></span>' +
                  '<span class="tmpl-who">' +
                    '<select class="inp inp-cell" data-act="tw" data-val="' + i + '">' +
                      P.map(function (p) {
                        return '<option value="' + p.id + '"' + (r.who === p.id ? ' selected' : '') + '>' +
                          esc(p.short) + ' · ' + esc(p.role) + '</option>';
                      }).join('') +
                    '</select>' +
                    (l ? '<span class="tmpl-load">' + l.hours + 'h of ' + l.avail +
                      'h booked this week</span>' : '') +
                  '</span>' +
                  '<span class="tmpl-est">' +
                    '<input class="inp inp-cell inp-num" type="number" min="0" step="0.5" ' +
                      'value="' + r.est + '" data-act="te" data-val="' + i + '">' +
                  '</span>' +
                '</div>';
              }).join('') +
              '<div class="tmpl-total">' + hrs(total) + ' committed across ' +
                rows.length + ' tickets</div>' +
            '</div>';
          })()
        : '') +

      (t.error ? '<div class="form-err">' + esc(t.error) + '</div>' : '') +
      '<div class="dk-actions">' +
        '<button type="button" class="btn btn-go" data-act="tmpl-do">Raise them into intake</button>' +
      '</div>' +
    '</div>';
  }

  /* Which roles suit which work, so a template ticket lands somewhere sensible
     rather than on whoever happens to be idle. */
  var AFFINITY = {
    concept: ['Creative lead', 'Interior designer'],
    present: ['Creative lead', 'Interior designer'],
    dwg100: ['CAD technician', 'Interior designer'],
    dwg200: ['CAD technician', 'Interior designer'],
    dwg300: ['CAD technician', 'Interior designer'],
    spec: ['Interior designer', 'Procurement'],
    revision: ['CAD technician', 'Interior designer'],
    enquiry: ['Procurement'], followup: ['Procurement'],
    delivery: ['Procurement', 'Project coordinator'], reselect: ['Procurement'],
    sitevisit: ['Project coordinator', 'Interior designer'],
    rfi: ['CAD technician', 'Project coordinator'],
    submittal: ['Interior designer', 'Project coordinator'],
    snag: ['Project coordinator'],
    valuation: ['Quantity surveyor'],
    pitch: ['Business & admin'], proposal: ['Business & admin'],
    admin: ['Business & admin'], leave: []
  };

  /* The least booked person who can do the work. On a landscape project the
     drawing roles shift to the landscape team. */
  function suggestWho(typeId, projectId) {
    var pr = proj(projectId);
    var lead = pr ? person(pr.lead) : null;
    var roles = (AFFINITY[typeId] || []).slice();
    if (lead && lead.role === 'Landscape') {
      roles = roles.map(function (r) { return r === 'CAD technician' ? 'Landscape' : r; });
    }
    var byLoad = function (a, b) { return load(a.id).ratio - load(b.id).ratio; };
    for (var i = 0; i < roles.length; i++) {
      var pool = P.filter(function (x) { return x.role === roles[i]; });
      /* The project lead is supervising, so production work goes to someone
         else where there is anyone else to give it to. */
      var notLead = pool.filter(function (x) { return !pr || x.id !== pr.lead; });
      if (notLead.length) { return notLead.slice().sort(byLoad)[0].id; }
      if (pool.length) { return pool.slice().sort(byLoad)[0].id; }
    }
    return P.slice().sort(byLoad)[0].id;
  }

  /* Rebuild the template rows whenever the project or the phase changes. */
  function buildTemplateRows() {
    var t = state.tmpl;
    if (!t || !t.project || !t.phase) { t.rows = null; return; }
    t.rows = DESK.TEMPLATES[t.phase].map(function (r) {
      return {
        type: r.type, title: r.title, est: r.est,
        who: r.who || suggestWho(r.type, t.project)
      };
    });
  }

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
    var sourcing = all.filter(function (t) { return derive(t).bucket === 'sourcing'; })
      .reduce(function (a, t) { return a + (t.logged || 0); }, 0);

    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Work in hand</div>' +
        '<h1 class="page-title">Service desk</h1>' +
        '<p class="page-sub">' + all.length + ' tickets across ' + PROJ.length +
          ' running projects · week of 14 September 2026</p>' +
      '</div>' +
      '<button type="button" class="btn btn-go" data-act="tmpl-open">Open a phase</button>' +
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
        '<div class="metric-note">Estimates on open tickets, against 704h available</div>' +
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
    if (state.tmpl) {
      h.push(templatePanel());
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

  function doLog() {
    var l = state.log, t = find(l.id);
    var n = parseFloat(l.hours);
    if (!n || n <= 0) { l.error = 'Enter the hours.'; return; }
    t.logged = (t.logged || 0) + n;
    var d = derive(t);
    var rec = phaseRec(t);
    state.log = null;
    state.flash = hrs(n) + ' logged on ' + t.id + ' → ' + d.bucket + ' (' +
      wt(t.type).group.toLowerCase() + ' work' +
      (rec ? ', ' + PHASE_NAMES[t.ph] + ' charged ' + FEE[rec.fee].label.toLowerCase() : '') + ').';
  }

  /* §5.1 — a ticket only leaves intake once an assignee, an estimate AND a
     window are all present, however they were entered. */
  function settle(t) {
    if (t.state !== 'intake') { return null; }
    if (!t.who || !t.est || !t.start || !t.due) { return null; }
    t.state = 'assigned';
    t.logged = t.logged || 0;
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
      if (raw === 'done' && t.est && !t.logged) {
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

  function doTemplate() {
    var t = state.tmpl;
    if (!t.project || !t.phase) { t.error = 'Pick a project and a phase.'; return; }
    var bad = t.rows.filter(function (r) { return !r.who || !(parseFloat(r.est) > 0); });
    if (bad.length) {
      t.error = bad.length + ' ticket' + (bad.length === 1 ? '' : 's') +
        ' still needs an assignee and an estimate — the estimate is the capacity allocation.';
      return;
    }
    var pr = proj(t.project);
    var rec = pr.phases[t.phase];
    var made = t.rows.map(function (r) {
      return {
        id: nextId(), p: t.project, ph: t.phase, type: r.type, title: r.title,
        who: r.who, est: parseFloat(r.est), logged: 0, state: 'intake'
      };
    });
    TICKETS = made.concat(TICKETS);
    var total = made.reduce(function (a, r) { return a + r.est; }, 0);
    state.tmpl = null;
    state.project = t.project;
    state.flash = made.length + ' tickets raised for ' + PHASE_NAMES[t.phase] + ' on ' +
      pr.name + ' — ' + hrs(total) + ' assigned. They sit in intake until each one has a ' +
      'window. The phase is charged ' + FEE[rec.fee].label.toLowerCase() +
      ', so their hours will land in ' + FEE[rec.fee].bucket + '.';
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
    else if (act === 'cancel') { state.log = null; state.tmpl = null; }
    else if (act === 'log-open') { state.log = { id: val, hours: '' }; state.flash = ''; }
    else if (act === 'log-do') { doLog(); }
    else if (act === 'gf') {
      state.gate = state.gate || { id: state.open };
      state.gate.choice = val; state.gate.reason = ''; state.gate.error = '';
    }
    else if (act === 'gr') { state.gate.reason = val; state.gate.error = ''; }
    else if (act === 'gate-do') { state.gate = state.gate || { id: val }; doGate(); }
    else if (act === 'tmpl-open') { state.tmpl = { project: '', phase: '', rows: null }; state.open = ''; state.flash = ''; }
    else if (act === 'tmpl-do') { doTemplate(); }
    else { return; }
    render();
  });

  /* Field edits keep their own state so a re-render does not lose typing. */
  app.addEventListener('input', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), key = el.getAttribute('data-val');
    if (act === 'lf' && state.log) { state.log[key] = el.value; state.log.error = ''; }
    else if (act === 'tf' && state.tmpl) {
      state.tmpl[key] = el.value; state.tmpl.error = ''; buildTemplateRows(); render();
    }
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
    else if (act === 'tf' && state.tmpl) {
      state.tmpl[el.getAttribute('data-val')] = el.value; state.tmpl.error = '';
      buildTemplateRows();
    }
    else if (act === 'tw' && state.tmpl && state.tmpl.rows) {
      state.tmpl.rows[parseInt(val, 10)].who = el.value; state.tmpl.error = '';
    }
    else if (act === 'te' && state.tmpl && state.tmpl.rows) {
      state.tmpl.rows[parseInt(val, 10)].est = el.value; state.tmpl.error = '';
    }
    else { return; }
    render();
  });

  render();
})();
