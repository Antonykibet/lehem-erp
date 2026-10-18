/* Lehem Interiors — Work Setup: the phase ledger.

   Every phase that has been contracted left a record behind: the fee that
   was agreed, the work items it was broken into, the rate each one was
   committed at, and the hours the clock has since put against them. This
   screen is that record. It is the only place the three numbers sit side by
   side, which is the whole point of it:

     the fee      what the client agreed to pay for the phase
     planned      rate × estimate, summed over the work items — what the
                  firm has promised away out of that fee
     earned       rate × hours actually on the clock — what the work has
                  turned into so far

   Nothing here is editable. A phase is costed when it is contracted, on the
   Team Schedule, and the rates come from Settings. This screen reads. */
(function () {
  'use strict';

  var PROJECTS = DESK.PROJECTS, PHASE_NAMES = DESK.PHASE_NAMES;
  var PHASE_KEYS = DESK.PHASE_KEYS, PROJ = DESK.PROJECTS, P = DESK.PEOPLE;
  var TICKETS = DESK.TICKETS;
  var money = PLAN.money, money0 = PLAN.money0, hrs = PLAN.hrs;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* The sample week: Monday 14 to Friday 18 September 2026. */
  var WEEK_START = new Date(2026, 8, 14);
  var WEEK_END = new Date(2026, 8, 18);

  PLAN.seed(DESK.TICKETS);

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function proj(id) {
    return PROJECTS.filter(function (p) { return p.id === id; })[0];
  }
  function person(id) {
    return DESK.PEOPLE.filter(function (p) { return p.id === id; })[0];
  }
  function wt(id) {
    return DESK.WORK_TYPES.filter(function (w) { return w.id === id; })[0];
  }
  /* "a, b and c" rather than "a and b and c". */
  function listOf(a) {
    if (a.length === 1) { return a[0]; }
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  /* ----------------------------------------------------------------- dates */

  function parseDay(s) {
    if (!s) { return null; }
    var b = String(s).trim().split(' ');
    var m = MONTHS.indexOf(b[1]);
    var d = parseInt(b[0], 10);
    if (m === -1 || !d || d < 1 || d > 31) { return null; }
    return new Date(2026, m, d);
  }
  function fmtDay(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function nextWorkday(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    while (x.getDay() === 0 || x.getDay() === 6) {
      x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1);
    }
    return x;
  }
  function addWorkdays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()), left = n;
    while (left > 0) {
      x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1);
      if (x.getDay() !== 0 && x.getDay() !== 6) { left -= 1; }
    }
    return x;
  }
  function bizDays(a, b) {
    if (!a || !b || b < a) { return 0; }
    var n = 0, x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    while (x <= b) {
      if (x.getDay() !== 0 && x.getDay() !== 6) { n += 1; }
      x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1);
    }
    return n;
  }

  /* Who has room. The planner needs this to suggest an owner for each line,
     so it is the same arithmetic the Team Schedule's capacity rail runs. */
  var OPEN_STATES = ['assigned', 'progress', 'blocked', 'internal', 'external'];
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
  function load(pid) {
    var avail = 40 - (DESK.LEAVE[pid] || 0);
    var h = TICKETS.filter(function (t) {
      return t.who === pid && OPEN_STATES.indexOf(t.state) !== -1;
    }).reduce(function (a, t) { return a + weekHours(t); }, 0);
    return { hours: Math.round(h * 10) / 10, avail: avail, ratio: avail ? h / avail : 0 };
  }

  var state = {
    project: 'all',
    open: '',          /* plan id whose detail is showing */
    contract: null,    /* { project, phase, rows, error } — the phase planner */
    flash: ''
  };

  /* ------------------------------------------------- contracting a phase

     This is where a phase becomes work: its template lines each get an
     owner, an estimate and a window, are priced at that person's rate, and
     are raised as tasks in one go. It lives on this screen because what
     it produces is a plan, and the plan is what the ledger below holds. */

  /* Task ids carry on from the highest already in the queue, so a second
     phase contracted in the same visit cannot reuse the first one's numbers. */
  var seq = TICKETS.reduce(function (a, t) {
    var n = parseInt(String(t.id).replace('LEH-', ''), 10);
    return n > a ? n : a;
  }, 500);
  function nextId() { seq += 1; return 'LEH-' + seq; }

  /* ------------------------------------------------- planning a phase

     Work reaches this board one of two ways: raised ad hoc, or planned in
     bulk when a phase is contracted. This is the second — the templates for
     a phase, each line given an owner and an estimate, priced at that
     person's rate, and raised as tasks in one go. */

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
  function suggestWho(typeId, projectId) {
    var pr = proj(projectId), lead = pr ? person(pr.lead) : null;
    var roles = (AFFINITY[typeId] || []).slice();
    if (lead && lead.role === 'Landscape') {
      roles = roles.map(function (r) { return r === 'CAD technician' ? 'Landscape' : r; });
    }
    var byLoad = function (a, b) { return load(a.id).ratio - load(b.id).ratio; };
    for (var i = 0; i < roles.length; i++) {
      var pool = P.filter(function (x) { return x.role === roles[i]; });
      var notLead = pool.filter(function (x) { return !pr || x.id !== pr.lead; });
      if (notLead.length) { return notLead.slice().sort(byLoad)[0].id; }
      if (pool.length) { return pool.slice().sort(byLoad)[0].id; }
    }
    return P.slice().sort(byLoad)[0].id;
  }

  /* ------------------------------------------------------------------ state */

  function buildRows() {
    var c = state.contract;
    if (!c || !c.project || !c.phase) { c.rows = null; return; }
    c.rows = DESK.TEMPLATES[c.phase].map(function (r) {
      var who = r.who || suggestWho(r.type, c.project);
      return { type: r.type, title: r.title, who: who, est: r.est, start: '', due: '' };
    });
    planWindows(c.rows);
  }

  /* Windows are prefilled rather than demanded. Each person carries their own
     cursor through the calendar, so two people planned on the same phase
     start alongside each other instead of queueing up behind one another,
     and six hours is taken as a day's work on one item. The lead edits
     whichever row is wrong — these are the dates the task is raised with,
     and they are not editable again afterwards. */
  function planWindows(rows) {
    var cursor = {};
    rows.forEach(function (r) {
      var days = Math.max(1, Math.ceil((parseFloat(r.est) || 0) / 6));
      var today = PLAN.now();
      var from = cursor[r.who] ||
        nextWorkday(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
      var to = addWorkdays(from, days - 1);
      r.start = fmtDay(from);
      r.due = fmtDay(to);
      cursor[r.who] = addWorkdays(to, 1);
    });
  }
  /* The rate is never typed here. It is whoever the item is given to, at the
     rate Settings holds for them, so the only way to change what a line costs
     is to change who is doing it or how long it is expected to take. */
  function rowRate(r) { return PLAN.rateFor(r.who); }
  function rowAmount(r) { return rowRate(r) * (parseFloat(r.est) || 0); }

  /* ------------------------------------------------------- the contracting */

  function contractPanel() {
    var c = state.contract;
    var rows = c.rows;
    var pr = c.project ? proj(c.project) : null;
    var fee = (c.project && c.phase) ? PLAN.phaseFee(c.project, c.phase) : 0;
    var already = (c.project && c.phase) ? PLAN.feeCommitted(c.project, c.phase) : 0;
    var nowPlanned = rows ? rows.reduce(function (a, r) { return a + rowAmount(r); }, 0) : 0;
    var hoursPlanned = rows ? rows.reduce(function (a, r) { return a + (parseFloat(r.est) || 0); }, 0) : 0;
    var left = fee - already - nowPlanned;
    var pct = fee ? Math.min(100, Math.round((already + nowPlanned) / fee * 100)) : 0;

    return '<div class="tmpl">' +
      '<div class="tmpl-head">' +
        '<div><div class="caps">Plan a phase</div>' +
        '<p class="why-sub">Break the phase into tasks before any of it is raised. Each one gets an owner, an estimate and a window here, and is raised onto the Team Schedule carrying all three — none of it is typed again afterwards. The rate is not set here either: it belongs to whoever the task is given to, so moving a task to somebody else reprices it.</p></div>' +
        '<button type="button" class="btn" data-act="contract-cancel">Close</button>' +
      '</div>' +

      '<div class="fld-row">' +
        '<label class="fld"><span class="fld-l">Project</span>' +
          '<select class="inp" data-act="cf" data-val="project">' +
            '<option value="">Choose a project…</option>' +
            PROJ.map(function (p) {
              return '<option value="' + p.id + '"' + (c.project === p.id ? ' selected' : '') + '>' +
                esc(p.name) + '</option>';
            }).join('') +
          '</select></label>' +
        '<label class="fld"><span class="fld-l">Phase</span>' +
          '<select class="inp" data-act="cf" data-val="phase">' +
            '<option value="">Choose a phase…</option>' +
            PHASE_KEYS.map(function (k) {
              return '<option value="' + k + '"' + (c.phase === k ? ' selected' : '') + '>' +
                PHASE_NAMES[k] + '</option>';
            }).join('') +
          '</select></label>' +
      '</div>' +

      (pr && c.phase
        ? '<div class="fee-bar">' + feeBarInner(c) + '</div>'
        : '') +

      (rows
        ? '<div class="tmpl-list">' + listInner(rows) + '</div>'
        : '') +

      (c.error ? '<div class="form-err">' + esc(c.error) + '</div>' : '') +
      '<div class="dk-actions">' +
        '<button type="button" class="btn btn-go" data-act="contract-do">Raise these tasks</button>' +
      '</div>' +
    '</div>';
  }

  /* The fee bar and the line totals are the only parts that move when an
     estimate or an assignee changes. They are built separately so that a
     change can refresh them in place: re-rendering the whole panel tears out
     the Create button between mousedown and mouseup, and the click is lost. */
  function feeBarInner(c) {
    var rows = c.rows;
    var pr = c.project ? proj(c.project) : null;
    var fee = (c.project && c.phase) ? PLAN.phaseFee(c.project, c.phase) : 0;
    var already = (c.project && c.phase) ? PLAN.feeCommitted(c.project, c.phase) : 0;
    var nowPlanned = rows ? rows.reduce(function (a, r) { return a + rowAmount(r); }, 0) : 0;
    var left = fee - already - nowPlanned;
    var pct = fee ? Math.min(100, Math.round((already + nowPlanned) / fee * 100)) : 0;
    return ''  +
            '<div class="fee-head">' +
              '<span class="fee-title">' + PHASE_NAMES[c.phase] + ' fee on ' + esc(pr.name) +
                ' · <b>' + money(fee) + '</b></span>' +
              '<span class="fee-note' + (left < 0 ? ' over' : '') + '">' +
                (left < 0 ? money(-left) + ' over the phase fee'
                  : money(left) + ' still unallocated') + '</span>' +
            '</div>' +
            '<div class="fee-track">' +
              '<span class="fee-fill was" style="width:' +
                (fee ? Math.min(100, already / fee * 100) : 0) + '%;"></span>' +
              '<span class="fee-fill now' + (left < 0 ? ' over' : '') + '" style="left:' +
                (fee ? Math.min(100, already / fee * 100) : 0) + '%; width:' +
                (fee ? Math.min(100 - Math.min(100, already / fee * 100), nowPlanned / fee * 100) : 0) + '%;"></span>' +
            '</div>' +
            '<div class="fee-keys">' +
              '<span class="fee-key"><span class="fee-dot was"></span>Already committed ' + money(already) + '</span>' +
              '<span class="fee-key"><span class="fee-dot now"></span>This plan ' + money(nowPlanned) + '</span>' +
              '<span class="fee-key">' + pct + '% of the fee committed</span>' +
            '</div>' +
            '<p class="fee-foot">Every task draws the fee down at its assignee\u2019s rate \u00d7 the hours it is given. Move a task to somebody charged out differently and this moves with it.</p>';
  }

  function totalsInner(rows) {
    var nowPlanned = rows.reduce(function (a, r) { return a + rowAmount(r); }, 0);
    var hoursPlanned = rows.reduce(function (a, r) { return a + (parseFloat(r.est) || 0); }, 0);
    return '<span>' + rows.length + ' task' + (rows.length === 1 ? '' : 's') + '</span>' +
      '<span>' + hrs(hoursPlanned) + ' committed</span>' +
      '<span class="ltotal-big">' + money(nowPlanned) + ' planned</span>';
  }

  function rateInner(r) {
    return money(rowRate(r)) + '<span class="lrate-sub">' +
      (PLAN.rateIsPersonal(r.who) ? 'set on them' : 'their role\u2019s rate') + '</span>';
  }
  function amountInner(r) {
    return money(rowAmount(r)) + '<span class="lamt-sub">as the work is done</span>';
  }

  /* Update what the numbers say without replacing the panel. */
  function refreshPanel() {
    var c = state.contract;
    if (!c || !c.rows) { return; }
    var bar = app.querySelector('.fee-bar');
    if (bar) { bar.innerHTML = feeBarInner(c); }
    var totals = app.querySelector('.ltotals');
    if (totals) { totals.innerHTML = totalsInner(c.rows); }
    var lrows = app.querySelectorAll('.lrow');
    c.rows.forEach(function (r, i) {
      if (!lrows[i]) { return; }
      var rate = lrows[i].querySelector('.lrate');
      if (rate) { rate.innerHTML = rateInner(r); }
      var who = lrows[i].querySelector('.tmpl-load');
      var l = person(r.who) ? load(r.who) : null;
      if (who && l) { who.textContent = l.hours + 'h of ' + l.avail + 'h booked'; }
      var amt = lrows[i].querySelector('.lamt');
      if (amt) { amt.innerHTML = amountInner(r); }
    });
    /* The message stays until Create is pressed again. Taking it away the
       moment a field is touched would both hide it while you are fixing the
       thing it names, and shift the button out from under the pointer. */
  }

  function listInner(rows) {
    return '<div class="lgrid lgrid-head">' +
              '<span class="caps">Task</span>' +
              '<span class="caps">Assignee</span>' +
              '<span class="caps num">Their rate</span>' +
              '<span class="caps num">Hours</span>' +
              '<span class="caps">Window</span>' +
              '<span class="caps num">Cost</span>' +
            '</div>' +
            rows.map(function (r, i) {
              var l = person(r.who) ? load(r.who) : null;
              var isFF = wt(r.type).bucket === 'sourcing';
              return '<div class="lgrid lrow">' +
                '<span class="tmpl-t">' + esc(r.title) +
                  '<span class="tmpl-y">' + esc(wt(r.type).name) + '</span></span>' +
                '<span class="tmpl-who">' +
                  '<select class="inp inp-cell" data-act="cw" data-val="' + i + '">' +
                    P.map(function (p) {
                      return '<option value="' + p.id + '"' + (r.who === p.id ? ' selected' : '') + '>' +
                        esc(p.short) + ' · ' + esc(p.role) + '</option>';
                    }).join('') +
                  '</select>' +
                  (l ? '<span class="tmpl-load">' + l.hours + 'h of ' + l.avail + 'h booked</span>' : '') +
                '</span>' +
                '<span class="lrate">' + money(rowRate(r)) +
                  '<span class="lrate-sub">' +
                    (PLAN.rateIsPersonal(r.who) ? 'set on them' : 'their role\u2019s rate') +
                  '</span></span>' +
                '<span class="lnums">' +
                  '<input class="inp inp-cell inp-num" type="number" min="0" step="0.5" value="' +
                    r.est + '" data-act="ce" data-val="' + i + '" title="Estimated hours">' +
                '</span>' +
                '<span class="lwin">' +
                  '<input class="inp inp-cell inp-day" value="' + esc(r.start || '') +
                    '" placeholder="22 Sep" data-act="cs" data-val="' + i + '" title="Starts">' +
                  '<span class="lwin-sep">\u2013</span>' +
                  '<input class="inp inp-cell inp-day" value="' + esc(r.due || '') +
                    '" placeholder="26 Sep" data-act="cd" data-val="' + i + '" title="Due">' +
                '</span>' +
                '<span class="lamt">' + amountInner(r) + '</span>' +
                (isFF
                  ? '<span class="lnote">Planning FF&amp;E coordination moves these hours out of ' +
                    'unpriced drag and into earning. Remove the task to leave them unpriced.</span>'
                  : '') +
              '</div>';
            }).join('') +
            '<div class="ltotals">' + totalsInner(rows) + '</div>';
  }

  function doContract() {
    var c = state.contract;
    c.error = '';
    if (!c.project || !c.phase) { c.error = 'Pick a project and a phase.'; return; }
    var noWho = c.rows.filter(function (r) { return !r.who || !PLAN.rateFor(r.who); });
    if (noWho.length) {
      c.error = noWho.length + ' task' + (noWho.length === 1 ? '' : 's') +
        ' ' + (noWho.length === 1 ? 'has' : 'have') +
        ' nobody on it, so there is no rate to commit it at.';
      return;
    }
    var noEst = c.rows.filter(function (r) { return !(parseFloat(r.est) > 0); });
    if (noEst.length) {
      c.error = noEst.length + ' task' + (noEst.length === 1 ? '' : 's') +
        ' ' + (noEst.length === 1 ? 'has' : 'have') +
        ' no estimated hours, so nothing would reach the heatmap.';
      return;
    }
    var badWin = c.rows.filter(function (r) {
      var a = parseDay(r.start), b = parseDay(r.due);
      return !a || !b || b < a;
    });
    if (badWin.length) {
      c.error = badWin.length + ' task' + (badWin.length === 1 ? '' : 's') +
        ' ' + (badWin.length === 1 ? 'has' : 'have') +
        ' no usable window. Dates read like \u201c22 Sep\u201d, and the due date ' +
        'cannot come before the start \u2014 without a window the estimate never ' +
        'reaches the heatmap.';
      return;
    }
    var made = PLAN.contractPhase(c.project, c.phase, c.rows);
    var raised = [];
    /* The tasks come from the work items, not the other way round. */
    made.items.forEach(function (item, i) {
      /* Owner, estimate and window all came from the plan, so §5.1 is already
         satisfied and the task is assigned the moment it is raised. Nothing
         about it is typed a second time. */
      var t = {
        id: nextId(), p: c.project, ph: c.phase, type: c.rows[i].type,
        title: c.rows[i].title, who: c.rows[i].who, est: parseFloat(c.rows[i].est),
        start: c.rows[i].start, due: c.rows[i].due,
        logged: 0, state: 'assigned', item: item.id
      };
      TICKETS.unshift(t);
      raised.push(t);
      PLAN.attachTicket(item.id, t.id);
    });
    /* The queue is on another screen, so the tasks have to travel. */
    DESK.rememberRaised(raised);
    var pr = proj(c.project);
    var hours = made.items.reduce(function (a, w) { return a + w.est; }, 0);
    var total = made.items.reduce(function (a, w) { return a + PLAN.forecast(w); }, 0);
    var ids = made.items.map(function (w) { return w.ticket; });
    state.contract = null;
    /* The plan has a screen of its own now, so land on it: the ledger row
       opens underneath with the work items that were just committed. */
    state.project = 'all';
    state.open = made.plan.id;
    state.flash = made.plan.id + ' — ' + made.items.length + ' task' +
      (made.items.length === 1 ? '' : 's') + ' planned for ' +
      PHASE_NAMES[c.phase] + ' on ' + pr.name + ', ' + hrs(hours) + ' committed and worth ' +
      money(total) + '. ' + listOf(ids) + ' are on the Team Schedule, assigned, each with ' +
      'its owner, estimate and window already set.';
  }


  /* ------------------------------------------------------------- the ledger */

  /* Open plans first — they are the ones somebody can still act on — then the
     finished phases, newest first within each group. */
  function ledger() {
    var all = PLAN.store.plans.slice();
    if (state.project !== 'all') {
      all = all.filter(function (pl) { return pl.project === state.project; });
    }
    return all.sort(function (a, b) {
      if (!!a.closed !== !!b.closed) { return a.closed ? 1 : -1; }
      return b.id.localeCompare(a.id);
    });
  }

  /* A phase can be contracted more than once — a second plan adds work to a
     phase already under way — so the fee belongs to the phase, not the plan,
     and is only counted once. */
  function phases(list) {
    var seen = {}, out = [];
    list.forEach(function (pl) {
      var k = pl.project + '|' + pl.phase;
      if (seen[k]) { return; }
      seen[k] = true;
      out.push({ project: pl.project, phase: pl.phase, fee: PLAN.phaseFee(pl.project, pl.phase) });
    });
    return out;
  }

  function totals(list) {
    var fee = phases(list).reduce(function (a, p) { return a + p.fee; }, 0);
    var planned = 0, earned = 0, hours = 0, clocked = 0;
    list.forEach(function (pl) {
      PLAN.itemsOf(pl.id).forEach(function (w) {
        planned += PLAN.forecast(w);
        earned += PLAN.value(w);
        hours += w.est || 0;
        clocked += PLAN.loggedHours(w);
      });
    });
    return {
      fee: fee, planned: planned, earned: earned,
      hours: Math.round(hours * 10) / 10, clocked: Math.round(clocked * 10) / 10,
      left: fee - planned
    };
  }

  /* One line per project, so the question "where has the money gone" has an
     answer before anybody opens a single plan. */
  function byProject() {
    return PROJECTS.map(function (p) {
      var mine = PLAN.store.plans.filter(function (pl) { return pl.project === p.id; });
      var t = totals(mine);
      return { p: p, n: mine.length, nPhase: phases(mine).length, t: t };
    }).filter(function (r) { return r.n > 0; });
  }

  /* --------------------------------------------------------------- the view */

  function feeBar(t) {
    if (!t.fee) { return ''; }
    var earned = Math.min(100, t.earned / t.fee * 100);
    var planned = Math.min(100 - earned, Math.max(0, (t.planned - t.earned) / t.fee * 100));
    return '<div class="cost-bar">' +
      '<span class="cb-earned" style="width:' + earned.toFixed(1) + '%"></span>' +
      '<span class="cb-planned" style="width:' + planned.toFixed(1) + '%"></span>' +
    '</div>';
  }

  function planRow(pl) {
    var items = PLAN.itemsOf(pl.id);
    var t = totals([pl]);
    var over = items.filter(function (w) { return PLAN.isOver(w); }).length;
    var pr = proj(pl.project);
    return '<tr class="cost-row' + (state.open === pl.id ? ' open' : '') +
        '" data-act="plan" data-val="' + pl.id + '">' +
      '<td class="rowhead">' + pl.id +
        (pl.closed ? '<span class="cost-tag">Finished</span>' : '') + '</td>' +
      '<td>' + esc(pr ? pr.name : pl.project) +
        '<span class="dk-sub"> · ' + esc(PHASE_NAMES[pl.phase]) + '</span></td>' +
      '<td>' + esc(pl.agreed || '—') + '</td>' +
      '<td class="num">' + items.length + '</td>' +
      '<td class="num">' + hrs(t.hours) + '</td>' +
      '<td class="num">' + money(t.planned) + '</td>' +
      '<td class="num">' + (t.earned ? money(t.earned) : '<span class="dk-sub">—</span>') + '</td>' +
      '<td class="num">' + (over
        ? '<span class="cost-over">' + over + ' over</span>'
        : '<span class="dk-sub">—</span>') + '</td>' +
    '</tr>';
  }

  function detail(pl) {
    var items = PLAN.itemsOf(pl.id);
    var pr = proj(pl.project);
    var fee = PLAN.phaseFee(pl.project, pl.phase);
    var committed = PLAN.feeCommitted(pl.project, pl.phase);
    var t = totals([pl]);

    return '<div class="detail">' +
      '<div class="detail-head">' +
        '<div><div class="caps">' + pl.id + (pl.closed ? ' · finished' : ' · in flight') + '</div>' +
          '<div class="detail-name">' + esc(PHASE_NAMES[pl.phase]) + ' on ' +
            esc(pr ? pr.name : pl.project) + '</div>' +
          '<div class="detail-meta">Planned ' + esc(pl.agreed || 'earlier') + ' · ' +
            items.length + ' work items · ' + hrs(t.hours) + ' committed</div>' +
        '</div>' +
        '<button type="button" class="btn" data-act="close">Close</button>' +
      '</div>' +

      '<div class="cost-sums">' +
        '<div class="cost-sum"><div class="caps">The phase fee</div>' +
          '<div class="cost-fig">' + money(fee) + '</div>' +
          '<div class="cost-note">What the client agreed to pay for ' +
            esc(PHASE_NAMES[pl.phase].toLowerCase()) + '</div></div>' +
        '<div class="cost-sum"><div class="caps">Planned against it</div>' +
          '<div class="cost-fig">' + money(committed) + '</div>' +
          '<div class="cost-note">' + (committed > fee
            ? money(committed - fee) + ' more work than the fee covers'
            : money(fee - committed) + ' of the fee not yet spoken for') +
            (committed !== t.planned ? ' · ' + money(t.planned) + ' of it on this plan' : '') +
          '</div></div>' +
        '<div class="cost-sum"><div class="caps">Earned so far</div>' +
          '<div class="cost-fig">' + money(t.earned) + '</div>' +
          '<div class="cost-note">' + hrs(t.clocked) + ' on the clock at the rates these ' +
            'items were committed at</div></div>' +
      '</div>' +

      '<table class="data-table"><thead><tr>' +
        '<th>Work item</th><th>Owner</th><th class="num">Rate</th>' +
        '<th class="num">Estimate</th><th class="num">On the clock</th>' +
        '<th class="num">Priced at</th><th class="num">Earned</th>' +
      '</tr></thead><tbody>' +
        items.map(function (w) {
          var who = person(w.who);
          var clocked = PLAN.loggedHours(w);
          var over = PLAN.overBy(w);
          return '<tr>' +
            '<td class="rowhead">' + esc(w.title) +
              (w.ticket ? '<span class="dk-sub"> · ' + esc(w.ticket) + '</span>' : '') + '</td>' +
            '<td>' + (who
              ? '<span class="lead-cell"><span class="avatar-sm">' + esc(who.initials) +
                '</span>' + esc(who.short) + '</span>'
              : '<span class="dk-sub">—</span>') + '</td>' +
            '<td class="num">' + money(w.rate) + '</td>' +
            '<td class="num">' + hrs(w.est) + '</td>' +
            '<td class="num' + (over ? ' cost-over-cell' : '') + '">' + hrs(clocked) +
              (over ? '<span class="cost-over"> ' + hrs(over) + ' over</span>' : '') + '</td>' +
            '<td class="num">' + money(PLAN.forecast(w)) + '</td>' +
            '<td class="num">' + (clocked ? money(PLAN.value(w)) : '<span class="dk-sub">—</span>') +
            '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table>' +

      '<p class="section-sub">Rates are the ones held at the moment the phase was ' +
        'planned. Changing somebody’s rate in Settings moves what the next phase is ' +
        'committed at, never this one — repricing history would quietly rewrite what the ' +
        'firm thought it had earned.</p>' +
    '</div>';
  }

  function view() {
    var list = ledger();
    var t = totals(list);
    var all = totals(PLAN.store.plans);
    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Money</div>' +
        '<h1 class="page-title">Work Setup</h1>' +
        '<p class="page-sub">Every phase that has been set up — the fee agreed, the work ' +
          'planned against it, and what the hours have earned</p>' +
      '</div>' +
      '<button type="button" class="btn btn-go" data-act="contract-open">Plan a phase</button>' +
    '</div>');

    if (state.flash) {
      h.push('<div class="flash">' + esc(state.flash) + '</div>');
    }
    if (state.contract) { h.push(contractPanel()); }

    h.push('<div class="rule-top metrics">' +
      '<div class="metric">' +
        '<div class="caps">Fees contracted</div>' +
        '<div class="metric-value">' + money0(all.fee) + '</div>' +
        '<div class="metric-note">Across ' + phases(PLAN.store.plans).length +
          ' phases on ' + byProject().length + ' projects</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Planned against them</div>' +
        '<div class="metric-value">' + money0(all.planned) + '</div>' +
        '<div class="metric-note">' + hrs(all.hours) + ' of work committed at the rates ' +
          'the people on it are charged out at</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Earned so far</div>' +
        '<div class="metric-value">' + money0(all.earned) + '</div>' +
        '<div class="metric-note">' + hrs(all.clocked) + ' on the clock — this is what the ' +
          'work has actually turned into</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">' + (all.left < 0 ? 'Over the fees' : 'Not yet planned') + '</div>' +
        '<div class="metric-value">' + money0(Math.abs(all.left)) + '</div>' +
        '<div class="metric-note">' + (all.left < 0
          ? 'More work has been promised than the fees cover'
          : 'Fee left to break into tasks when the phases are planned') + '</div>' +
      '</div>' +
    '</div>');

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Where it sits</div>' +
        '<h2 class="section-title">By project</h2>' +
        '<p class="section-sub">The bar reads left to right: solid is earned, faded is ' +
          'planned but not yet worked, and the gap at the end is fee nobody has promised away.</p>' +
      '</div></div>' +
      '<table class="data-table"><thead><tr>' +
        '<th>Project</th><th class="num">Phases</th><th class="num">Fees</th>' +
        '<th class="num">Planned</th><th class="num">Earned</th><th>Drawdown</th>' +
      '</tr></thead><tbody>' +
        byProject().map(function (r) {
          return '<tr class="cost-row' + (state.project === r.p.id ? ' sel' : '') +
              '" data-act="project" data-val="' + r.p.id + '">' +
            '<td class="rowhead">' + esc(r.p.name) + '</td>' +
            '<td class="num">' + r.nPhase + '</td>' +
            '<td class="num">' + money(r.t.fee) + '</td>' +
            '<td class="num">' + money(r.t.planned) + '</td>' +
            '<td class="num">' + money(r.t.earned) + '</td>' +
            '<td style="width:190px">' + feeBar(r.t) + '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table>' +
    '</section>');

    h.push('<section class="rule-top">' +
      '<div class="section-head">' +
        '<div>' +
          '<div class="caps">The ledger</div>' +
          '<h2 class="section-title">Every phase planned</h2>' +
          '<p class="section-sub">One row per plan. Open one to see the work items it was ' +
            'broken into, who each is charged at, and what the clock has put against it.</p>' +
        '</div>' +
        '<div class="chips">' +
          '<button type="button" class="chip' + (state.project === 'all' ? ' active' : '') +
            '" data-act="project" data-val="all">All projects<span class="chip-count">' +
            PLAN.store.plans.length + '</span></button>' +
        '</div>' +
      '</div>' +
      (state.project !== 'all'
        ? '<div class="cost-filter">Showing ' + esc(proj(state.project).name) + ' only · ' +
          money(t.fee) + ' in fees, ' + money(t.planned) + ' planned, ' +
          money(t.earned) + ' earned</div>'
        : '') +
      '<table class="data-table"><thead><tr>' +
        '<th>Plan</th><th>Project · phase</th><th>Planned on</th><th class="num">Items</th>' +
        '<th class="num">Hours</th><th class="num">Priced at</th>' +
        '<th class="num">Earned</th><th class="num">Over estimate</th>' +
      '</tr></thead><tbody>' +
        list.map(planRow).join('') +
      '</tbody></table>' +
      (state.open ? detail(PLAN.store.plans.filter(function (p) {
        return p.id === state.open;
      })[0]) : '') +
    '</section>');

    return h.join('');
  }

  var app = document.getElementById('app');
  function render() { app.innerHTML = view(); }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');
    if (act === 'contract-open') {
      state.contract = { project: '', phase: '', rows: null };
      state.open = ''; state.flash = '';
    }
    else if (act === 'contract-cancel') { state.contract = null; }
    else if (act === 'contract-do') { doContract(); }
    else if (act === 'plan') { state.open = (state.open === val ? '' : val); state.flash = ''; }
    else if (act === 'project') {
      state.project = (state.project === val ? 'all' : val);
      state.open = '';
    } else if (act === 'close') { state.open = ''; }
    else { return; }
    render();
  });

  /* Row edits commit on change rather than on every keystroke, so typing an
     estimate is not interrupted by a re-render. */
  app.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');
    var c = state.contract;
    /* Picking a project or a phase builds a different set of lines, so the
       panel has to be rebuilt. Everything else only moves numbers and is
       refreshed in place — see refreshPanel for why that matters. */
    if (act === 'cf' && c) { c[val] = el.value; c.error = ''; buildRows(); render(); return; }
    if (act === 'cw' && c && c.rows) {
      /* Changing who it goes to reprices the line on its own — the rate comes
         from the person, so there is nothing else to set. */
      c.rows[parseInt(val, 10)].who = el.value;
      refreshPanel(); return;
    }
    if (act === 'ce' && c && c.rows) {
      c.rows[parseInt(val, 10)].est = el.value;
      refreshPanel(); return;
    }
    /* A date moves no total, so it is stored and nothing is redrawn — which
       also leaves the Create button exactly where the pointer left it. */
    if (act === 'cs' && c && c.rows) { c.rows[parseInt(val, 10)].start = el.value; return; }
    if (act === 'cd' && c && c.rows) { c.rows[parseInt(val, 10)].due = el.value; return; }
  });

  render();
})();
