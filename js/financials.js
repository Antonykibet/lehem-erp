/* Lehem Interiors — Financials: contracting, invoicing and collection.

   This is where a phase is priced, and pricing it is what creates the
   invoice. Tickets are raised from the invoice's lines, so every hour the
   team logs afterwards already knows what it is worth and who is paying
   for it. Nothing downstream has to guess. */
(function () {
  'use strict';

  var P = DESK.PEOPLE, PROJ = DESK.PROJECTS, WT = DESK.WORK_TYPES;
  var PHASE_KEYS = DESK.PHASE_KEYS, PHASE_NAMES = DESK.PHASE_NAMES;
  var CONTRACTS = DESK.CONTRACTS, INV_STATES = DESK.INVOICE_STATES;
  var money = BILL.money, hrs = BILL.hrs;
  var TICKETS = DESK.TICKETS.slice();

  BILL.seed(TICKETS);

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var TODAY = new Date(2026, 8, 18);

  function wt(id) { return WT.filter(function (w) { return w.id === id; })[0]; }
  function person(id) { return P.filter(function (p) { return p.id === id; })[0]; }
  function proj(id) { return PROJ.filter(function (p) { return p.id === id; })[0]; }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function parseDay(s) {
    if (!s) { return null; }
    var b = String(s).trim().split(' ');
    var m = MONTHS.indexOf(b[1]), d = parseInt(b[0], 10);
    if (m === -1 || !d) { return null; }
    return new Date(2026, m, d);
  }
  function daysLate(inv) {
    var d = parseDay(inv.due);
    if (!d) { return 0; }
    return Math.round((TODAY - d) / 86400000);
  }
  function owed(inv) { return BILL.invoiceValue(inv) - (inv.paid || 0); }

  /* ------------------------------------------------------ capacity, reused
     The contracting panel suggests an assignee, so it needs the same view of
     who is busy that the Service Desk has. */

  var WEEK_START = new Date(2026, 8, 14), WEEK_END = new Date(2026, 8, 18);
  function bizDays(a, b) {
    var n = 0, d = new Date(a.getTime());
    while (d <= b) { if (d.getDay() !== 0 && d.getDay() !== 6) { n++; } d.setDate(d.getDate() + 1); }
    return n;
  }
  function weekHours(t) {
    if (!t.est || !t.start || !t.due) { return 0; }
    var a = parseDay(t.start), b = parseDay(t.due);
    if (!a || !b) { return 0; }
    var total = bizDays(a, b);
    if (!total) { return 0; }
    var lo = a > WEEK_START ? a : WEEK_START, hi = b < WEEK_END ? b : WEEK_END;
    if (lo > hi) { return 0; }
    return t.est / total * bizDays(lo, hi);
  }
  function load(pid) {
    var avail = 40 - (DESK.LEAVE[pid] || 0);
    var h = TICKETS.filter(function (t) {
      return t.who === pid && ['assigned', 'progress', 'blocked', 'review'].indexOf(t.state) !== -1;
    }).reduce(function (a, t) { return a + weekHours(t); }, 0);
    return { hours: Math.round(h * 10) / 10, avail: avail, ratio: avail ? h / avail : 0 };
  }

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

  var state = {
    contract: null,      /* { project, phase, rows, error } */
    openInv: '',
    filter: 'all',       /* all | draft | owed | overdue | paid */
    flash: '',
    seq: 600
  };
  function nextTicketId() { state.seq += 1; return 'LEH-' + state.seq; }

  function buildRows() {
    var c = state.contract;
    if (!c || !c.project || !c.phase) { c.rows = null; return; }
    c.rows = DESK.TEMPLATES[c.phase].map(function (r) {
      var who = r.who || suggestWho(r.type, c.project);
      var flat = BILL.defaultFlat(r.type);
      return {
        type: r.type, title: r.title, who: who, est: r.est,
        basis: flat ? 'flat' : 'rate',
        rate: BILL.suggestRate(who),
        flat: flat ? Math.round(r.est * 110 / 50) * 50 : 0
      };
    });
  }
  function rowAmount(r) {
    return r.basis === 'flat' ? (parseFloat(r.flat) || 0)
      : (parseFloat(r.rate) || 0) * (parseFloat(r.est) || 0);
  }

  /* ------------------------------------------------------- the contracting */

  function contractPanel() {
    var c = state.contract;
    var rows = c.rows;
    var pr = c.project ? proj(c.project) : null;
    var fee = (c.project && c.phase) ? BILL.phaseFee(c.project, c.phase) : 0;
    var already = (c.project && c.phase) ? BILL.flatAllocated(c.project, c.phase) : 0;
    var nowFlat = rows ? rows.filter(function (r) { return r.basis === 'flat'; })
      .reduce(function (a, r) { return a + (parseFloat(r.flat) || 0); }, 0) : 0;
    var nowRate = rows ? rows.filter(function (r) { return r.basis === 'rate'; })
      .reduce(function (a, r) { return a + rowAmount(r); }, 0) : 0;
    var left = fee - already - nowFlat;
    var pct = fee ? Math.min(100, Math.round((already + nowFlat) / fee * 100)) : 0;

    return '<div class="tmpl">' +
      '<div class="tmpl-head">' +
        '<div><div class="caps">Contract a phase</div>' +
        '<p class="why-sub">Price the phase before any work is raised. Each line becomes an invoice line, and each invoice line becomes a ticket. Choose whether a line is charged by rate or as a flat fee — that one choice decides what the hours are worth and which bucket they land in.</p></div>' +
        '<button type="button" class="btn" data-act="cancel">Close</button>' +
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
        ? '<div class="fee-bar">' +
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
                (fee ? Math.min(100 - Math.min(100, already / fee * 100), nowFlat / fee * 100) : 0) + '%;"></span>' +
            '</div>' +
            '<div class="fee-keys">' +
              '<span class="fee-key"><span class="fee-dot was"></span>Already allocated ' + money(already) + '</span>' +
              '<span class="fee-key"><span class="fee-dot now"></span>This invoice ' + money(nowFlat) + '</span>' +
              '<span class="fee-key">' + pct + '% of the fee committed</span>' +
            '</div>' +
            '<p class="fee-foot">Only flat lines draw down the fee. Rate lines are charged on top of it, as hours are logged.</p>' +
          '</div>'
        : '') +

      (rows
        ? '<div class="tmpl-list">' +
            '<div class="lgrid lgrid-head">' +
              '<span class="caps">Line item</span>' +
              '<span class="caps">Assignee</span>' +
              '<span class="caps">Charged</span>' +
              '<span class="caps num">Rate / hours</span>' +
              '<span class="caps num">Amount</span>' +
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
                '<span class="basis">' +
                  '<button type="button" class="basis-btn' + (r.basis === 'rate' ? ' on' : '') +
                    '" data-act="cb" data-val="' + i + '|rate">By rate</button>' +
                  '<button type="button" class="basis-btn' + (r.basis === 'flat' ? ' on' : '') +
                    '" data-act="cb" data-val="' + i + '|flat">Flat fee</button>' +
                '</span>' +
                '<span class="lnums">' +
                  (r.basis === 'rate'
                    ? '<span class="lnum-pair">' +
                        '<input class="inp inp-cell inp-num" type="number" min="0" step="5" value="' +
                          r.rate + '" data-act="cr" data-val="' + i + '" title="Rate an hour">' +
                        '<span class="lnum-x">×</span>' +
                        '<input class="inp inp-cell inp-num" type="number" min="0" step="0.5" value="' +
                          r.est + '" data-act="ce" data-val="' + i + '" title="Estimated hours">' +
                      '</span>'
                    : '<span class="lnum-pair">' +
                        '<input class="inp inp-cell inp-num inp-wide" type="number" min="0" step="50" value="' +
                          r.flat + '" data-act="cl" data-val="' + i + '" title="Flat amount">' +
                        '<span class="lnum-est">for ' + hrs(r.est) + ' of work</span>' +
                      '</span>') +
                '</span>' +
                '<span class="lamt">' + money(rowAmount(r)) +
                  '<span class="lamt-sub">' +
                    (r.basis === 'rate' ? 'as hours are logged' : 'drawn from the fee') + '</span>' +
                '</span>' +
                (isFF && r.basis
                  ? '<span class="lnote">Charging for FF&amp;E coordination moves these hours out of ' +
                    'unpriced drag and into earning. Remove the line to leave them unpriced.</span>'
                  : '') +
              '</div>';
            }).join('') +
            '<div class="ltotals">' +
              '<span>' + money(nowRate) + ' by rate, forecast from the estimates</span>' +
              '<span>' + money(nowFlat) + ' in flat fees</span>' +
              '<span class="ltotal-big">' + money(nowRate + nowFlat) + ' invoiced</span>' +
            '</div>' +
          '</div>'
        : '') +

      (c.error ? '<div class="form-err">' + esc(c.error) + '</div>' : '') +
      '<div class="dk-actions">' +
        '<button type="button" class="btn btn-go" data-act="contract-do">Create the invoice and raise the tickets</button>' +
      '</div>' +
    '</div>';
  }

  function doContract() {
    var c = state.contract;
    if (!c.project || !c.phase) { c.error = 'Pick a project and a phase.'; return; }
    var bad = c.rows.filter(function (r) { return rowAmount(r) <= 0; });
    if (bad.length) {
      c.error = bad.length + ' line' + (bad.length === 1 ? '' : 's') +
        ' has no amount. A rate line needs a rate and hours; a flat line needs a figure.';
      return;
    }
    var noEst = c.rows.filter(function (r) { return !(parseFloat(r.est) > 0); });
    if (noEst.length) {
      c.error = noEst.length + ' line' + (noEst.length === 1 ? '' : 's') +
        ' has no estimated hours, so the ticket it raises would carry no capacity.';
      return;
    }
    var made = BILL.contractPhase(c.project, c.phase, c.rows);
    /* The tickets come from the lines, not the other way round. */
    made.lines.forEach(function (line, i) {
      var t = {
        id: nextTicketId(), p: c.project, ph: c.phase, type: c.rows[i].type,
        title: c.rows[i].title, who: c.rows[i].who, est: parseFloat(c.rows[i].est),
        logged: 0, state: 'intake', line: line.id
      };
      TICKETS.unshift(t);
      BILL.attachTicket(line.id, t.id);
    });
    var pr = proj(c.project);
    var total = made.lines.reduce(function (a, l) { return a + BILL.forecast(l); }, 0);
    state.contract = null;
    state.openInv = made.invoice.id;
    state.filter = 'all';
    state.flash = made.invoice.id + ' created for ' + PHASE_NAMES[c.phase] + ' on ' + pr.name +
      ' — ' + made.lines.length + ' lines worth ' + money(total) + ', and ' + made.lines.length +
      ' tickets raised from them into intake.';
  }

  /* ------------------------------------------------------------- invoices */

  function invoiceRows() {
    var all = BILL.store.invoices.slice().sort(function (a, b) {
      var order = { draft: 0, part: 1, issued: 1, paid: 2 };
      if (order[a.state] !== order[b.state]) { return order[a.state] - order[b.state]; }
      return b.id.localeCompare(a.id);
    });
    if (state.filter === 'draft') { all = all.filter(function (i) { return i.state === 'draft'; }); }
    if (state.filter === 'owed') { all = all.filter(function (i) { return owed(i) > 0 && i.state !== 'draft'; }); }
    if (state.filter === 'overdue') { all = all.filter(function (i) { return BILL.isOverdue(i); }); }
    if (state.filter === 'paid') { all = all.filter(function (i) { return i.state === 'paid'; }); }
    return all;
  }

  function lineTable(inv) {
    var lines = BILL.linesOf(inv.id);
    return '<div class="inv-detail">' +
      '<div class="lgrid2 lgrid2-head">' +
        '<span class="caps">Line</span><span class="caps">Charged</span>' +
        '<span class="caps num">Hours est / logged</span>' +
        '<span class="caps num">Forecast</span><span class="caps num">Earned</span>' +
        '<span class="caps">Ticket</span>' +
      '</div>' +
      lines.map(function (l) {
        var logged = BILL.loggedHours(l);
        var fc = BILL.forecast(l), earned = BILL.value(l);
        var gap = l.basis === 'rate' && l.est ? logged - l.est : 0;
        var es = BILL.entriesOf(l.id);
        return '<div class="lgrid2 lrow2">' +
          '<span class="l-title">' + esc(l.title) +
            '<span class="tmpl-y">' + esc(wt(l.type).name) + '</span></span>' +
          '<span>' + (l.basis === 'rate'
            ? '<span class="bk bk-bill">rate</span><span class="l-rate">' + money(l.rate) + '/h</span>'
            : '<span class="bk bk-fee">flat</span>') + '</span>' +
          '<span class="num">' + (l.basis === 'rate'
            ? hrs(l.est) + ' / <b>' + hrs(logged) + '</b>' +
              (gap > 0 ? '<span class="l-over">' + hrs(gap) + ' over</span>' : '')
            : '<span class="dk-sub">' + hrs(l.est) + ' allowed</span>') + '</span>' +
          '<span class="num">' + money(fc) + '</span>' +
          '<span class="num"><b>' + money(earned) + '</b></span>' +
          '<span>' + (l.ticket
            ? '<span class="dk-id">' + l.ticket + '</span>'
            : '<span class="dk-sub">closed out</span>') + '</span>' +
          (es.length
            ? '<span class="l-entries">' +
                es.map(function (e) {
                  var p = person(e.person);
                  /* On a rate line the hour is worth money on its own; on a flat
                     line it is already inside the fee, which is a different
                     thing from nobody paying for it. */
                  var tail = e.billRate ? money(e.hours * e.billRate)
                    : (e.basis === 'flat' ? 'inside the fee' : 'not charged');
                  return '<span class="te"><span class="avatar-sm">' + (p ? p.initials : '?') +
                    '</span>' + hrs(e.hours) + ' on ' + e.date + ' · ' + tail + '</span>';
                }).join('') +
              '</span>'
            : '') +
        '</div>';
      }).join('') +
      '<div class="inv-foot">' +
        '<span>' + lines.length + ' lines · forecast ' + money(BILL.invoiceForecast(inv)) +
          ' · earned so far ' + money(BILL.invoiceValue(inv)) + '</span>' +
        (inv.state === 'draft'
          ? '<button type="button" class="btn btn-go" data-act="issue" data-val="' + inv.id +
            '">Issue this invoice</button>'
          : (owed(inv) > 0
            ? '<button type="button" class="btn btn-go" data-act="pay" data-val="' + inv.id +
              '">Record payment of ' + money(owed(inv)) + '</button>'
            : '<span class="paid-note">Settled in full</span>')) +
      '</div>' +
    '</div>';
  }

  /* --------------------------------------------------------------- the view */

  function view() {
    var invs = BILL.store.invoices;
    var wip = invs.filter(function (i) { return i.state === 'draft'; })
      .reduce(function (a, i) { return a + BILL.invoiceValue(i); }, 0);
    var unbilledFc = invs.filter(function (i) { return i.state === 'draft'; })
      .reduce(function (a, i) { return a + BILL.invoiceForecast(i); }, 0);
    var owedTotal = invs.filter(function (i) { return i.state === 'issued' || i.state === 'part'; })
      .reduce(function (a, i) { return a + owed(i); }, 0);
    var overdue = invs.filter(function (i) { return BILL.isOverdue(i); })
      .reduce(function (a, i) { return a + owed(i); }, 0);
    var collected = invs.reduce(function (a, i) { return a + (i.paid || 0); }, 0);

    /* Unpriced FF&E coordination, straight off the tickets that have no line. */
    var sourcing = TICKETS.filter(function (t) { return BILL.derive(t).bucket === 'sourcing'; })
      .reduce(function (a, t) { return a + BILL.loggedOnTicket(t.id); }, 0);

    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Billing &amp; collection</div>' +
        '<h1 class="page-title">Financials</h1>' +
        '<p class="page-sub">' + invs.length + ' invoices across ' + PROJ.length +
          ' projects · week of 14 September 2026</p>' +
      '</div>' +
      '<button type="button" class="btn btn-go" data-act="contract-open">Contract a phase</button>' +
    '</div>');

    h.push('<div class="rule-top metrics">' +
      '<div class="metric">' +
        '<div class="caps">Work in progress</div>' +
        '<div class="metric-value">' + money(wip) + '</div>' +
        '<div class="metric-note">Earned on draft invoices, not yet sent · ' +
          money(unbilledFc) + ' forecast when complete</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Issued and unpaid</div>' +
        '<div class="metric-value">' + money(owedTotal) + '</div>' +
        '<div class="metric-note">Out with clients, waiting to come in</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Overdue</div>' +
        '<div class="metric-value' + (overdue ? ' is-warn' : '') + '">' + money(overdue) + '</div>' +
        '<div class="metric-note">Past its due date</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Unpriced coordination</div>' +
        '<div class="metric-value">' + hrs(sourcing) + '</div>' +
        '<div class="metric-note">FF&amp;E hours on tickets with no invoice line</div>' +
      '</div>' +
    '</div>');

    if (state.flash) { h.push('<div class="flash">' + esc(state.flash) + '</div>'); }
    if (state.contract) { h.push(contractPanel()); }

    /* ---- collections ---- */
    var buckets = [
      { id: 'cur', name: 'Within terms', cls: 'good', lo: -9999, hi: 0 },
      { id: 'b30', name: '1–30 days late', cls: 'warn', lo: 1, hi: 30 },
      { id: 'b60', name: '31–60 days late', cls: 'serious', lo: 31, hi: 60 },
      { id: 'b61', name: 'Over 60 days', cls: 'crit', lo: 61, hi: 9999 }
    ].map(function (b) {
      var set = invs.filter(function (i) {
        if (i.state !== 'issued' && i.state !== 'part') { return false; }
        if (owed(i) <= 0) { return false; }
        var d = daysLate(i);
        return d >= b.lo && d <= b.hi;
      });
      b.amount = set.reduce(function (a, i) { return a + owed(i); }, 0);
      b.count = set.length;
      return b;
    });
    var arTotal = buckets.reduce(function (a, b) { return a + b.amount; }, 0) || 1;

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Collection</div>' +
        '<h2 class="section-title">What is owed, and how late</h2>' +
        '<p class="section-sub">Every issued invoice with money still on it, grouped by how far past its due date it is.</p>' +
      '</div></div>' +
      '<div class="ar-grid">' +
        buckets.map(function (b) {
          return '<div class="ar-cell">' +
            '<span class="ar-name"><span class="ar-dot ' + b.cls + '"></span>' + b.name + '</span>' +
            '<span class="ar-amt">' + money(b.amount) + '</span>' +
            '<span class="ar-track"><span class="ar-fill ' + b.cls +
              '" style="width:' + Math.round(b.amount / arTotal * 100) + '%;"></span></span>' +
            '<span class="ar-n">' + b.count + (b.count === 1 ? ' invoice' : ' invoices') + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</section>');

    /* ---- the invoice listing ---- */
    var counts = {
      all: invs.length,
      draft: invs.filter(function (i) { return i.state === 'draft'; }).length,
      owed: invs.filter(function (i) { return owed(i) > 0 && i.state !== 'draft'; }).length,
      overdue: invs.filter(function (i) { return BILL.isOverdue(i); }).length,
      paid: invs.filter(function (i) { return i.state === 'paid'; }).length
    };
    var rows = invoiceRows();

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">The ledger</div>' +
        '<h2 class="section-title">Invoices</h2>' +
        '<p class="section-sub">One invoice per contracted phase. Open any of them for its lines, the hours logged against each and the ticket it raised.</p>' +
      '</div>' +
      '<div class="chips">' +
        [['all', 'All'], ['draft', 'Draft'], ['owed', 'Owed'], ['overdue', 'Overdue'], ['paid', 'Paid']]
          .map(function (f) {
            return '<button type="button" class="chip' + (state.filter === f[0] ? ' active' : '') +
              '" data-act="filter" data-val="' + f[0] + '">' + f[1] +
              '<span class="chip-count">' + counts[f[0]] + '</span></button>';
          }).join('') +
      '</div>' +
      '</div>' +

      '<table class="data-table inv-table"><thead><tr>' +
        '<th>Invoice</th><th>Project · phase</th><th class="num">Lines</th>' +
        '<th class="num">Forecast</th><th class="num">Earned</th><th class="num">Owed</th>' +
        '<th>Due</th><th>State</th>' +
      '</tr></thead><tbody>' +
        rows.map(function (inv) {
          var pr = proj(inv.project);
          var open = state.openInv === inv.id;
          var late = BILL.isOverdue(inv);
          var st = INV_STATES.filter(function (s) { return s.id === inv.state; })[0];
          return '<tr class="dk-row' + (open ? ' open' : '') + (late ? ' late' : '') + '">' +
            '<td><button type="button" class="dk-row-btn" aria-expanded="' + open +
              '" data-act="inv" data-val="' + inv.id + '">' +
              '<span class="dk-id">' + inv.id + '</span>' +
              '<span class="dk-row-title">' + PHASE_NAMES[inv.phase] +
                (inv.closed ? ' — agreed fee' : '') + '</span>' +
            '</button></td>' +
            '<td>' + esc(pr.name) + '<span class="dk-sub">' + PHASE_NAMES[inv.phase] + '</span></td>' +
            '<td class="num">' + BILL.linesOf(inv.id).length + '</td>' +
            '<td class="num"><span class="dk-sub">' + money(BILL.invoiceForecast(inv)) + '</span></td>' +
            '<td class="num">' + money(BILL.invoiceValue(inv)) + '</td>' +
            '<td class="num">' + (owed(inv) > 0
              ? '<b class="' + (late ? 'owed-late' : '') + '">' + money(owed(inv)) + '</b>'
              : '<span class="dk-sub">—</span>') + '</td>' +
            '<td><span class="dk-sub">' + (inv.due || 'not sent') +
              (late ? '<span class="late-note">' + daysLate(inv) + ' days late</span>' : '') +
              '</span></td>' +
            '<td><span class="inv-state st-' + inv.state + '">' + st.name + '</span></td>' +
          '</tr>' +
          (open ? '<tr class="dk-det-row"><td colspan="8">' + lineTable(inv) + '</td></tr>' : '');
        }).join('') +
      '</tbody></table>' +
    '</section>');

    return h.join('');
  }

  /* --------------------------------------------------------- render + wire */

  var app = document.getElementById('app');
  function render() { app.innerHTML = view(); }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') { return; }
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');
    if (act === 'contract-open') {
      state.contract = { project: '', phase: '', rows: null }; state.flash = ''; state.openInv = '';
    }
    else if (act === 'cancel') { state.contract = null; }
    else if (act === 'contract-do') { doContract(); }
    else if (act === 'cb') {
      var bits = val.split('|');
      var r = state.contract.rows[parseInt(bits[0], 10)];
      r.basis = bits[1];
      if (r.basis === 'flat' && !r.flat) { r.flat = Math.round(r.est * 110 / 50) * 50; }
      if (r.basis === 'rate' && !r.rate) { r.rate = BILL.suggestRate(r.who); }
      state.contract.error = '';
    }
    else if (act === 'inv') { state.openInv = (state.openInv === val ? '' : val); state.flash = ''; }
    else if (act === 'filter') { state.filter = val; state.openInv = ''; }
    else if (act === 'issue') {
      BILL.markIssued(val, '18 Sep', '18 Oct');
      state.flash = val + ' issued, due 18 Oct.';
    }
    else if (act === 'pay') {
      var inv = BILL.store.invoices.filter(function (i) { return i.id === val; })[0];
      BILL.recordPayment(val, owed(inv));
      state.flash = val + ' settled in full.';
    }
    else { return; }
    render();
  });

  app.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');
    var c = state.contract;
    if (act === 'cf' && c) { c[val] = el.value; c.error = ''; buildRows(); }
    else if (act === 'cw' && c && c.rows) {
      var r = c.rows[parseInt(val, 10)];
      r.who = el.value;
      if (r.basis === 'rate') { r.rate = BILL.suggestRate(r.who); }
      c.error = '';
    }
    else if (act === 'cr' && c && c.rows) { c.rows[parseInt(val, 10)].rate = el.value; c.error = ''; }
    else if (act === 'ce' && c && c.rows) { c.rows[parseInt(val, 10)].est = el.value; c.error = ''; }
    else if (act === 'cl' && c && c.rows) { c.rows[parseInt(val, 10)].flat = el.value; c.error = ''; }
    else { return; }
    render();
  });

  render();
})();
