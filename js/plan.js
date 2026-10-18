/* Lehem Interiors — the planning spine, shared by every screen that reads work.

   The order of events, from the data ingestion spec and the scope the tool
   actually covers:

     contract a phase  →  the phase is broken into work items, each priced
                       →  the plan is recorded, its items carrying the prices
                       →  tasks raised, one per item
                       →  the assignee moves a task to In progress and the
                          clock starts; the next state change stops it
                       →  the span becomes the time entry, lands on the item,
                          and moves the amount: rate × hours

   No invoice is ever produced here. The prices are what the work is worth —
   a planning number, used to decide whether an hour is being paid for and to
   draw down the phase fee. Billing happens in the practice's own accounts.

   Nobody types hours into this tool. Time is what the clock measured
   between two status transitions, and the bucket it lands in is derived
   rather than picked: on a work item → planned, FF&E coordination with no
   item → sourcing, anything else → overhead. */
var PLAN = (function () {
  'use strict';

  var RATE = DESK.RATE_BY_ROLE, PERSON_RATE = DESK.RATE_BY_PERSON || {};
  var CONTRACTS = DESK.CONTRACTS;

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

  /* The rate an hour is charged at. Nobody types this when planning work:
     it follows whoever the item is given to — their own rate if Settings
     gives them one, otherwise their role's default. Reassign the item and
     the figure moves with it, which is the whole point of holding rates on
     people rather than on lines. */
  function rateFor(whoId) {
    if (!whoId) { return 0; }
    if (PERSON_RATE[whoId]) { return PERSON_RATE[whoId]; }
    var p = person(whoId);
    return (p && RATE[p.role]) || 75;
  }
  /* True where the person is charged out off their role's default. */
  function rateIsPersonal(whoId) { return !!PERSON_RATE[whoId]; }

  /* ------------------------------------------------------------ the store */

  var store = { plans: [], items: [], entries: [], spans: [],
    seq: { plan: 1000, item: 5000, te: 9000, span: 2000 } };

  function nextPlanId() { store.seq.plan += 1; return 'PL-' + store.seq.plan; }
  function nextItemId() { store.seq.item += 1; return 'W-' + store.seq.item; }
  function nextEntryId() { store.seq.te += 1; return 'TE-' + store.seq.te; }
  function nextSpanId() { store.seq.span += 1; return 'SP-' + store.seq.span; }

  /* ------------------------------------------------------------ item maths

     A rate item is worth rate × hours. Before any time is logged that is the
     estimate, which is the forecast; once hours land it is the actual. The
     two are kept apart so the gap between them is visible — that gap is where
     scope creep shows up, and on a utilization tool it is the whole point. */

  function loggedHours(item) {
    var n = 0;
    store.entries.forEach(function (e) { if (e.item === item.id) { n += e.hours; } });
    return Math.round(n * 10) / 10;
  }
  function forecast(item) { return item.rate * item.est; }
  function actual(item) { return item.rate * loggedHours(item); }
  /* What the item is worth today — the hours actually logged against it, at
     the rate it was planned at. */
  function value(item) { return actual(item); }

  /* Hours past the estimate, which is the figure a lead acts on. Negative
     means there is estimate left; it is reported as 0 rather than as credit,
     because unspent estimate is not the same kind of fact as an overrun. */
  function overBy(item) {
    var over = loggedHours(item) - (item.est || 0);
    return over > 0 ? Math.round(over * 10) / 10 : 0;
  }
  function isOver(item) { return overBy(item) > 0; }

  function itemsOf(planId) {
    return store.items.filter(function (w) { return w.plan === planId; });
  }
  function planForecast(pl) {
    return itemsOf(pl.id).reduce(function (a, w) { return a + forecast(w); }, 0);
  }
  function planValue(pl) {
    return itemsOf(pl.id).reduce(function (a, w) { return a + value(w); }, 0);
  }
  function planCommitted(pl) {
    return Math.round(itemsOf(pl.id).reduce(function (a, w) { return a + (w.est || 0); }, 0) * 10) / 10;
  }
  function planLogged(pl) {
    return Math.round(itemsOf(pl.id).reduce(function (a, w) { return a + loggedHours(w); }, 0) * 10) / 10;
  }
  function planOverN(pl) {
    return itemsOf(pl.id).filter(isOver).length;
  }
  function itemFor(ticketId) {
    return store.items.filter(function (w) { return w.ticket === ticketId; })[0] || null;
  }
  function planOf(itemId) {
    var w = store.items.filter(function (x) { return x.id === itemId; })[0];
    if (!w) { return null; }
    return store.plans.filter(function (p) { return p.id === w.plan; })[0] || null;
  }
  function entriesOf(itemId) {
    return store.entries.filter(function (e) { return e.item === itemId; });
  }

  /* --------------------------------------------------- phase fee drawdown
     Flat items allocate against the contract's fee for that phase, so a phase
     that has been over-committed says so rather than quietly going over. */

  function phaseFee(projectId, phaseKey) {
    var c = CONTRACTS[projectId];
    return c ? (c.fee[phaseKey] || 0) : 0;
  }
  /* Every work item draws down the phase fee — there is no second kind of
     line that sits outside it. What is committed is rate × estimate, so a
     phase that has been over-planned says so before anyone starts. */
  function feeCommitted(projectId, phaseKey, exceptPlan) {
    return store.items.filter(function (w) {
      return w.project === projectId && w.phase === phaseKey && w.plan !== exceptPlan;
    }).reduce(function (a, w) { return a + forecast(w); }, 0);
  }

  /* ------------------------------------------------- §1 the bucket, derived

     Nothing here is chosen by the person logging time. The item was priced
     once, at contracting, and every hour since follows it. */

  function derive(t) {
    var w = wt(t.type);
    if (w.group === 'Business') {
      return { bucket: 'over', steps: [
        'Business work type — the bucket is fixed on the type',
        'Bucket: over'] };
    }
    var item = itemFor(t.id);
    if (!item) {
      if (w.bucket === 'sourcing') {
        return { bucket: 'sourcing', steps: [
          'FF&E coordination, and no work item covers it',
          'Nobody is paying for these hours',
          'Bucket: sourcing'] };
      }
      return { bucket: 'over', steps: [
        'No work item — this work was never planned into a phase',
        'Bucket: over'] };
    }
    var who = person(item.who);
    return { bucket: 'planned', steps: [
      'Planned as ' + item.id + ' on ' + item.plan,
      'Charged at ' + money(item.rate) + ' an hour, which is ' +
        (who ? who.short + '\u2019s rate' : 'the rate on the item'),
      'Bucket: planned'] };
  }

  /* -------------------------------------------------------------- writing */

  /* Contracting a phase: price the work items, record the plan, and hand the
     items back so the tasks can be raised from them. */
  function contractPhase(projectId, phaseKey, rows, agreedOn) {
    var pl = {
      id: nextPlanId(), project: projectId, phase: phaseKey,
      agreed: agreedOn || '18 Sep', closed: false
    };
    store.plans.push(pl);
    var made = rows.map(function (r) {
      var item = {
        id: nextItemId(), plan: pl.id, project: projectId, phase: phaseKey,
        ticket: null, title: r.title, type: r.type, who: r.who,
        /* The rate is taken from the person at the moment the plan is made,
           and kept. Changing somebody's rate in Settings later must not
           silently reprice work already committed (§7). */
        rate: rateFor(r.who),
        est: parseFloat(r.est) || 0,
        /* The window is part of the plan too — it is what spreads the
           estimate across days, and the task is raised carrying it. */
        start: r.start || null, due: r.due || null
      };
      store.items.push(item);
      return item;
    });
    return { plan: pl, items: made };
  }

  function attachTicket(itemId, ticketId) {
    var w = store.items.filter(function (x) { return x.id === itemId; })[0];
    if (w) { w.ticket = ticketId; }
  }

  /* A logged hour is a record, not a running total: it carries who did it,
     which item it belongs to and the rate at the moment it was logged. Rates
     change; history must not move (§7). */
  function logTime(ticket, personId, hours, date) {
    var item = itemFor(ticket.id);
    var d = derive(ticket);
    var e = {
      id: nextEntryId(), ticket: ticket.id, item: item ? item.id : null,
      person: personId, hours: hours, date: date || '18 Sep',
      bucket: d.bucket,
      billRate: item ? item.rate : 0
    };
    store.entries.push(e);
    return e;
  }

  /* ------------------------------------------------------------ the clock

     Nobody types hours into this tool. A task earns them by sitting in
     In progress: moving it there starts the clock, moving it anywhere else
     stops it, and the span between those two transitions becomes the time
     entry. The assignee never estimates after the fact and never rounds to
     the nearest half hour, which is where timesheets lose their credibility.

     Only working hours count. A task left In progress on Friday evening
     and closed on Monday morning is worth the hours inside the working days
     it actually spanned, not the seventy that elapsed. */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var YEAR = 2026;
  /* The sample week is fixed so the figures do not drift with the real
     calendar. Everything the clock measures live is measured against it. */
  var NOW = new Date(YEAR, 8, 18, 14, 10, 0, 0);
  var LOADED = new Date();
  /* The clock the whole tool reads. It starts at the sample moment and then
     runs in real seconds, so a span opened during a demo measures exactly
     as long as the demo took. */
  function now() { return new Date(NOW.getTime() + (new Date() - LOADED)); }
  var DAY_FROM = 9, DAY_TO = 18;      /* the working day, 09:00 to 18:00 */

  function isWorkday(d) { var n = d.getDay(); return n >= 1 && n <= 5; }
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  /* "15 Sep" → a Date in the sample year. */
  function dayFrom(label) {
    if (!label) { return null; }
    var b = String(label).trim().split(' ');
    var m = MONTHS.indexOf(b[1]), d = parseInt(b[0], 10);
    if (m === -1 || !d) { return null; }
    return new Date(YEAR, m, d);
  }
  function dayLabel(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function clockLabel(d) {
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* Working hours between two instants, counted day by day and clipped to
     09:00–18:00 on weekdays. Nights and weekends cost nothing. */
  function workedBetween(a, b) {
    if (!a || !b || !(b > a)) { return 0; }
    var total = 0, cur = midnight(a), guard = 0;
    while (cur <= b && guard < 400) {
      guard += 1;
      if (isWorkday(cur)) {
        var from = new Date(cur); from.setHours(DAY_FROM, 0, 0, 0);
        var to = new Date(cur); to.setHours(DAY_TO, 0, 0, 0);
        var lo = a > from ? a : from;
        var hi = b < to ? b : to;
        if (hi > lo) { total += (hi - lo) / 3600000; }
      }
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
    return Math.round(total * 100) / 100;
  }

  function spansOf(ticketId) {
    return store.spans.filter(function (sp) { return sp.ticket === ticketId; });
  }
  function openSpan(ticketId) {
    return spansOf(ticketId).filter(function (sp) { return !sp.off; })[0] || null;
  }
  /* What the running clock has gathered so far — not yet an entry, because
     the span is not closed. */
  function running(ticketId, at) {
    var sp = openSpan(ticketId);
    if (!sp) { return 0; }
    return workedBetween(sp.on, at || now());
  }

  function clockOn(ticket, personId, at) {
    if (openSpan(ticket.id)) { return null; }
    var sp = {
      id: nextSpanId(), ticket: ticket.id, person: personId || ticket.who,
      on: at || now(), off: null, hours: 0
    };
    store.spans.push(sp);
    return sp;
  }

  /* Closing the span is the only thing in this tool that writes time. */
  function clockOff(ticket, at) {
    var sp = openSpan(ticket.id);
    if (!sp) { return null; }
    sp.off = at || now();
    sp.hours = Math.round(workedBetween(sp.on, sp.off) * 10) / 10;
    if (sp.hours > 0) { logTime(ticket, sp.person, sp.hours, dayLabel(sp.off)); }
    return sp;
  }

  /* How a span reads in the panel: "15 Sep · 09:30 → 15:30 · 6h". */
  function spanLabel(sp) {
    return dayLabel(sp.on) + ' · ' + clockLabel(sp.on) + ' → ' +
      (sp.off ? clockLabel(sp.off) : 'running');
  }

  function entriesOfTicket(ticketId) {
    return store.entries.filter(function (e) { return e.ticket === ticketId; });
  }
  function loggedOnTicket(ticketId) {
    var n = 0;
    store.entries.forEach(function (e) { if (e.ticket === ticketId) { n += e.hours; } });
    return Math.round(n * 10) / 10;
  }
  function closePlan(planId) {
    var p = store.plans.filter(function (x) { return x.id === planId; })[0];
    if (p) { p.closed = true; }
    return p || null;
  }

  /* ---------------------------------------------------------------- seed

     The tasks already in the system were planned before this screen
     existed, so their plans are reconstructed: every contracted phase gets
     a work item per task, priced at its assignee's rate, and an
     uncontracted phase gets no plan at all — which is why Verdant's
     pre-contract concept hours sit in overhead. */

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

      /* Procurement is out of scope, so FF&E coordination is not priced
         today — it gets no item, and its hours land in `sourcing` as unpriced
         drag. Contracting a phase is where that can be changed: put a rate or
         a fee on a coordination item and those hours start being paid for. */
      var billable = groups[k].filter(function (t) {
        return wt(t.type).bucket !== 'sourcing';
      });
      if (!billable.length) { return; }
      var rows = billable.map(function (t) {
        return { title: t.title, type: t.type, who: t.who, est: t.est || 0,
          start: t.start, due: t.due };
      });
      var made = contractPhase(pid, ph, rows, AGREED[DESK.PHASE_KEYS.indexOf(ph)] || '1 Sep');
      made.items.forEach(function (item, i) {
        attachTicket(item.id, billable[i].id);
      });
    });

    /* Phases the projects have already finished were planned before this
       week and their tasks are long closed, so they appear as a single
       item at the contracted fee rather than as a task breakdown. Without
       them the ledger would only show work in flight. */
    DESK.PROJECTS.forEach(function (pr) {
      DESK.PHASE_KEYS.slice(0, pr.at).forEach(function (ph, i) {
        var already = store.plans.filter(function (pl) {
          return pl.project === pr.id && pl.phase === ph;
        })[0];
        if (already) { return; }
        var fee = phaseFee(pr.id, ph);
        if (!fee) { return; }
        /* A finished phase is one line: the fee that was agreed, and the
           hours it took, back-figured at the lead's rate. Those hours are
           booked straight onto the item — the phase is done, so the work
           happened, and a closed plan showing nothing logged would read as
           a phase nobody ever worked. The entry carries no task, which
           keeps it out of this week's utilization where it does not belong. */
        var lead = pr.lead;
        var hoursTaken = Math.round(fee / (rateFor(lead) || 85));
        var made = contractPhase(pr.id, ph, [{
          title: DESK.PHASE_NAMES[ph] + ' — agreed fee',
          type: 'spec', who: lead, est: hoursTaken
        }], AGREED[i] || '2 Apr');
        made.plan.closed = true;
        store.entries.push({
          id: nextEntryId(), ticket: null, item: made.items[0].id,
          person: lead, hours: hoursTaken, date: made.plan.agreed,
          bucket: 'planned', billRate: made.items[0].rate
        });
      });
    });

    /* Hours already on a task got there the only way this tool allows:
       as spans of In progress. They are laid back into working days from
       the task's start, capped at six hours a day because nobody sits on
       one task from nine to six, and each closed span writes its entry. */
    tickets.forEach(function (t) {
      if (!t.logged || !t.who) { return; }
      var left = Math.round(t.logged * 10) / 10;
      var day = dayFrom(t.start) || new Date(YEAR, 8, 15);
      var guard = 0;
      while (left > 0.05 && guard < 40) {
        guard += 1;
        if (isWorkday(day)) {
          var take = Math.round(Math.min(left, 6) * 10) / 10;
          var on = new Date(day); on.setHours(9, 30, 0, 0);
          var off = new Date(on.getTime() + Math.round(take * 60) * 60000);
          /* Past 13:00 a span has eaten lunch, so push the close an hour on.
             It keeps the readout honest without changing the hours. */
          if (off.getHours() >= 13) { off = new Date(off.getTime() + 3600000); }
          store.spans.push({
            id: nextSpanId(), ticket: t.id, person: t.who,
            on: on, off: off, hours: take
          });
          logTime(t, t.who, take, dayLabel(off));
          left = Math.round((left - take) * 10) / 10;
        }
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      }
    });

    /* A task caught mid-flight has its clock still running — the span is
       open, so its hours are not an entry yet and will not be until the
       state moves on. That is the honest state of a desk at any moment. */
    tickets.forEach(function (t) {
      if (t.state !== 'progress' || !t.who) { return; }
      var on = new Date(now().getTime());
      on.setHours(9, 30, 0, 0);
      if (!isWorkday(on)) { return; }
      store.spans.push({
        id: nextSpanId(), ticket: t.id, person: t.who, on: on, off: null, hours: 0
      });
    });
  }

  /* Roughly when each phase would have been agreed, by position in the
     lifecycle — enough to order the ledger sensibly. */
  var AGREED = ['2 Apr', '5 Jun', '31 Aug', '14 Sep', '18 Sep'];

  return {
    store: store, money: money, money0: money0, hrs: hrs,
    rateFor: rateFor, rateIsPersonal: rateIsPersonal,
    forecast: forecast, actual: actual, value: value,
    loggedHours: loggedHours, overBy: overBy, isOver: isOver,
    itemsOf: itemsOf, planForecast: planForecast, planValue: planValue,
    planCommitted: planCommitted, planLogged: planLogged, planOverN: planOverN,
    itemFor: itemFor, planOf: planOf, entriesOf: entriesOf,
    phaseFee: phaseFee, feeCommitted: feeCommitted,
    derive: derive, contractPhase: contractPhase, attachTicket: attachTicket,
    logTime: logTime, entriesOfTicket: entriesOfTicket, loggedOnTicket: loggedOnTicket,
    spansOf: spansOf, openSpan: openSpan, running: running,
    clockOn: clockOn, clockOff: clockOff, spanLabel: spanLabel,
    workedBetween: workedBetween, dayLabel: dayLabel, clockLabel: clockLabel, now: now,
    closePlan: closePlan, nextPlanId: nextPlanId, seed: seed
  };
})();
