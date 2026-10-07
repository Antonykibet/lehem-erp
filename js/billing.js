/* Lehem Interiors — the billing spine, shared by the Service Desk and Financials.

   The order of events, from the data ingestion spec and the contracting
   decision that sits on top of it:

     contract a phase  →  line items priced (rate or flat)
                       →  invoice created, its lines carrying the prices
                       →  tickets raised, one per line
                       →  time logged against a ticket by its assignee
                       →  the time entry lands on the line, and on a rate line
                          it moves the amount: rate × hours

   Because the basis is set at contracting, the time bucket is still derived
   and never picked by the person logging hours. Rate → bill, flat → fee,
   no line → sourcing for FF&E work and overhead for anything else. */
var BILL = (function () {
  'use strict';

  var RATE = DESK.RATE_BY_ROLE, CONTRACTS = DESK.CONTRACTS;
  var FLAT_BY_TYPE = DESK.FLAT_BY_TYPE;

  function wt(id) { return DESK.WORK_TYPES.filter(function (w) { return w.id === id; })[0]; }
  function person(id) { return DESK.PEOPLE.filter(function (p) { return p.id === id; })[0]; }
  function proj(id) { return DESK.PROJECTS.filter(function (p) { return p.id === id; })[0]; }

  /* ---------------------------------------------------------------- money */

  function money(n) {
    var neg = n < 0;
    var s = '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
    return neg ? '−' + s : s;
  }
  function money0(n) {
    if (Math.abs(n) >= 1000) { return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k'; }
    return money(n);
  }
  function hrs(n) {
    if (n === null || n === undefined) { return '—'; }
    return (Math.round(n * 10) / 10) + 'h';
  }

  /* The rate to suggest for a line, from whoever is doing the work. */
  function suggestRate(whoId) {
    var p = person(whoId);
    return (p && RATE[p.role]) || 75;
  }
  function defaultFlat(typeId) { return !!FLAT_BY_TYPE[typeId]; }

  /* ------------------------------------------------------------ the store */

  var store = { invoices: [], lines: [], entries: [], seq: { inv: 1000, line: 5000, te: 9000 } };

  function nextInvoiceId() { store.seq.inv += 1; return 'INV-' + store.seq.inv; }
  function nextLineId() { store.seq.line += 1; return 'L-' + store.seq.line; }
  function nextEntryId() { store.seq.te += 1; return 'TE-' + store.seq.te; }

  /* ------------------------------------------------------------ line maths

     A rate line is worth rate × hours. Before any time is logged that is the
     estimate, which is the forecast; once hours land it is the actual. The
     two are kept apart so the gap between them is visible — that gap is
     realization, and it is the thing scope creep shows up in. */

  function loggedHours(line) {
    var n = 0;
    store.entries.forEach(function (e) { if (e.line === line.id) { n += e.hours; } });
    return Math.round(n * 10) / 10;
  }
  function forecast(line) {
    return line.basis === 'flat' ? line.flat : line.rate * line.est;
  }
  function actual(line) {
    if (line.basis === 'flat') { return line.flat; }
    var h = loggedHours(line);
    return line.rate * h;
  }
  /* What the line is worth today: a flat line is its amount, a rate line is
     what has actually been earned so far. */
  function value(line) { return actual(line); }

  function linesOf(invId) {
    return store.lines.filter(function (l) { return l.invoice === invId; });
  }
  function invoiceForecast(inv) {
    return linesOf(inv.id).reduce(function (a, l) { return a + forecast(l); }, 0);
  }
  function invoiceValue(inv) {
    return linesOf(inv.id).reduce(function (a, l) { return a + value(l); }, 0);
  }
  function lineFor(ticketId) {
    return store.lines.filter(function (l) { return l.ticket === ticketId; })[0] || null;
  }
  function invoiceOf(lineId) {
    var l = store.lines.filter(function (x) { return x.id === lineId; })[0];
    if (!l) { return null; }
    return store.invoices.filter(function (i) { return i.id === l.invoice; })[0] || null;
  }
  function entriesOf(lineId) {
    return store.entries.filter(function (e) { return e.line === lineId; });
  }

  /* --------------------------------------------------- phase fee drawdown
     Flat lines allocate against the contract's fee for that phase, so a phase
     that has been over-committed says so rather than quietly going over. */

  function phaseFee(projectId, phaseKey) {
    var c = CONTRACTS[projectId];
    return c ? (c.fee[phaseKey] || 0) : 0;
  }
  function flatAllocated(projectId, phaseKey, exceptInvoice) {
    return store.lines.filter(function (l) {
      return l.project === projectId && l.phase === phaseKey && l.basis === 'flat' &&
        l.invoice !== exceptInvoice;
    }).reduce(function (a, l) { return a + l.flat; }, 0);
  }

  /* ------------------------------------------------- §1 the bucket, derived

     Nothing here is chosen by the person logging time. The basis was set once,
     at contracting, and every hour since follows it. */

  function derive(t) {
    var w = wt(t.type);
    if (w.group === 'Business') {
      return { bucket: 'over', steps: [
        'Business work type — the bucket is fixed on the type',
        'Bucket: over'] };
    }
    var line = lineFor(t.id);
    if (!line) {
      if (w.bucket === 'sourcing') {
        return { bucket: 'sourcing', steps: [
          'FF&E coordination, and no invoice line covers it',
          'Nobody is being charged for these hours',
          'Bucket: sourcing'] };
      }
      return { bucket: 'over', steps: [
        'No invoice line — this work was never contracted',
        'Bucket: over'] };
    }
    if (line.basis === 'rate') {
      return { bucket: 'bill', steps: [
        'Billed to ' + line.id + ' on ' + line.invoice,
        'That line is charged by rate, at ' + money(line.rate) + ' an hour',
        'Bucket: bill'] };
    }
    return { bucket: 'fee', steps: [
      'Billed to ' + line.id + ' on ' + line.invoice,
      'That line is a flat fee of ' + money(line.flat),
      'Bucket: fee'] };
  }

  /* -------------------------------------------------------------- writing */

  /* Contracting a phase: price the line items, create the invoice with its
     lines, and hand back the lines so the tickets can be raised from them. */
  function contractPhase(projectId, phaseKey, rows, issuedOn, dueOn) {
    var inv = {
      id: nextInvoiceId(), project: projectId, phase: phaseKey,
      issued: issuedOn || null, due: dueOn || null,
      state: 'draft', paid: 0
    };
    store.invoices.push(inv);
    var made = rows.map(function (r) {
      var line = {
        id: nextLineId(), invoice: inv.id, project: projectId, phase: phaseKey,
        ticket: null, title: r.title, type: r.type, who: r.who,
        basis: r.basis,
        rate: r.basis === 'rate' ? parseFloat(r.rate) : 0,
        est: parseFloat(r.est) || 0,
        flat: r.basis === 'flat' ? parseFloat(r.flat) : 0
      };
      store.lines.push(line);
      return line;
    });
    return { invoice: inv, lines: made };
  }

  function attachTicket(lineId, ticketId) {
    var l = store.lines.filter(function (x) { return x.id === lineId; })[0];
    if (l) { l.ticket = ticketId; }
  }

  /* A logged hour is a record, not a running total: it carries who did it,
     which line it bills to and the rate at the moment it was logged. Rates
     change; history must not move (§7). */
  function logTime(ticket, personId, hours, date) {
    var line = lineFor(ticket.id);
    var d = derive(ticket);
    var e = {
      id: nextEntryId(), ticket: ticket.id, line: line ? line.id : null,
      person: personId, hours: hours, date: date || '18 Sep',
      bucket: d.bucket,
      basis: line ? line.basis : 'none',
      billRate: line && line.basis === 'rate' ? line.rate : 0
    };
    store.entries.push(e);
    return e;
  }

  function entriesOfTicket(ticketId) {
    return store.entries.filter(function (e) { return e.ticket === ticketId; });
  }
  function loggedOnTicket(ticketId) {
    var n = 0;
    store.entries.forEach(function (e) { if (e.ticket === ticketId) { n += e.hours; } });
    return Math.round(n * 10) / 10;
  }

  function markIssued(invId, on, due) {
    var i = store.invoices.filter(function (x) { return x.id === invId; })[0];
    if (!i) { return null; }
    i.state = 'issued'; i.issued = on; i.due = due;
    return i;
  }
  function recordPayment(invId, amount) {
    var i = store.invoices.filter(function (x) { return x.id === invId; })[0];
    if (!i) { return null; }
    i.paid = Math.min(invoiceValue(i), (i.paid || 0) + amount);
    i.state = i.paid >= invoiceValue(i) - 0.5 ? 'paid' : 'part';
    return i;
  }

  /* ---------------------------------------------------------------- seed

     The tickets already in the system were contracted before this screen
     existed, so their invoices are reconstructed from what the phase was
     charged on: hourly phases become rate lines, fixed and per-m² phases
     become flat lines, and an unbilled phase gets no invoice at all —
     which is why Verdant's pre-contract concept hours sit in overhead. */

  var FLAT_UNIT = 110;   /* the blended rate a fixed price was built from */

  function seed(tickets) {
    var groups = {};
    tickets.forEach(function (t) {
      if (!t.p || !t.ph) { return; }
      var k = t.p + '|' + t.ph;
      (groups[k] = groups[k] || []).push(t);
    });

    Object.keys(groups).sort().forEach(function (k) {
      var bits = k.split('|');
      var pid = bits[0], ph = bits[1];
      var pr = proj(pid);
      var fee = pr.phases[ph].fee;
      if (fee === 'unbilled') { return; }

      var basis = fee === 'hourly' ? 'rate' : 'flat';
      /* Procurement is out of scope, so FF&E coordination is not charged for
         today — it gets no line, and its hours land in `sourcing` as unpriced
         drag. Contracting a phase is where that can be changed: put a rate or
         a fee on a coordination line and those hours become earning. */
      var billable = groups[k].filter(function (t) {
        return wt(t.type).bucket !== 'sourcing';
      });
      if (!billable.length) { return; }
      var rows = billable.map(function (t) {
        return {
          title: t.title, type: t.type, who: t.who, basis: basis,
          rate: basis === 'rate' ? suggestRate(t.who) : 0,
          est: t.est || 0,
          flat: basis === 'flat' ? Math.round((t.est || 0) * FLAT_UNIT / 50) * 50 : 0
        };
      });
      var made = contractPhase(pid, ph, rows);
      made.lines.forEach(function (line, i) {
        attachTicket(line.id, billable[i].id);
      });

      /* Where the phase is behind the project's current one the invoice has
         already gone out; the current phase is still being worked. */
      var at = DESK.PHASE_KEYS.indexOf(ph);
      if (at < pr.at) {
        markIssued(made.invoice.id, '1 Sep', '1 Oct');
        if (at < pr.at - 1) { recordPayment(made.invoice.id, invoiceValue(made.invoice)); }
      }
    });

    /* Phases the projects have already finished were invoiced before this
       week, and their tickets are long closed — so they appear as a single
       flat line at the contracted fee rather than as a ticket breakdown.
       Without them the collections view would have almost nothing in it. */
    var HIST = [
      { on: '2 Apr', due: '2 May', state: 'paid' },
      { on: '5 Jun', due: '5 Jul', state: 'paid' },
      { on: '31 Aug', due: '30 Sep', state: 'part' },
      { on: '14 Sep', due: '14 Oct', state: 'issued' }
    ];
    DESK.PROJECTS.forEach(function (pr) {
      DESK.PHASE_KEYS.slice(0, pr.at).forEach(function (ph, i) {
        var already = store.invoices.filter(function (inv) {
          return inv.project === pr.id && inv.phase === ph;
        })[0];
        if (already) { return; }
        var fee = phaseFee(pr.id, ph);
        if (!fee) { return; }
        var h = HIST[Math.min(i, HIST.length - 1)];
        var made = contractPhase(pr.id, ph, [{
          title: DESK.PHASE_NAMES[ph] + ' — agreed fee',
          type: 'spec', who: pr.lead, basis: 'flat', rate: 0, est: 0, flat: fee
        }], h.on, h.due);
        var inv = made.invoice;
        inv.state = 'issued'; inv.issued = h.on; inv.due = h.due; inv.closed = true;
        if (h.state === 'paid') { inv.paid = fee; inv.state = 'paid'; }
        else if (h.state === 'part') { inv.paid = Math.round(fee * 0.6 / 100) * 100; inv.state = 'part'; }
      });
    });

    /* One left unpaid past its date, so the aging has something in it. */
    var late = store.invoices.filter(function (i) {
      return i.state === 'issued' && i.closed;
    })[0];
    if (late) { late.issued = '4 Aug'; late.due = '3 Sep'; }

    /* Hours already booked become real time entries against their line. */
    tickets.forEach(function (t) {
      if (!t.logged || !t.who) { return; }
      var half = Math.round(t.logged / 2 * 10) / 10;
      if (t.logged > 3 && half > 0) {
        logTime(t, t.who, half, '15 Sep');
        logTime(t, t.who, Math.round((t.logged - half) * 10) / 10, '17 Sep');
      } else {
        logTime(t, t.who, t.logged, '16 Sep');
      }
    });
  }

  function isOverdue(inv, today) {
    if (inv.state !== 'issued' && inv.state !== 'part') { return false; }
    if (!inv.due) { return false; }
    var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var b = inv.due.split(' ');
    var d = new Date(2026, MON.indexOf(b[1]), parseInt(b[0], 10));
    return d < (today || new Date(2026, 8, 18));
  }

  return {
    store: store, money: money, money0: money0, hrs: hrs,
    suggestRate: suggestRate, defaultFlat: defaultFlat,
    forecast: forecast, actual: actual, value: value,
    loggedHours: loggedHours, linesOf: linesOf,
    invoiceForecast: invoiceForecast, invoiceValue: invoiceValue,
    lineFor: lineFor, invoiceOf: invoiceOf, entriesOf: entriesOf,
    phaseFee: phaseFee, flatAllocated: flatAllocated,
    derive: derive, contractPhase: contractPhase, attachTicket: attachTicket,
    logTime: logTime, entriesOfTicket: entriesOfTicket, loggedOnTicket: loggedOnTicket,
    markIssued: markIssued, recordPayment: recordPayment,
    nextInvoiceId: nextInvoiceId, seed: seed, isOverdue: isOverdue
  };
})();
