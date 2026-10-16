/* Lehem Interiors — Settings: the rate card.

   This is the one place an hour's charge-out rate is set. A role carries the
   default, agreed once at onboarding; a person can sit above or below it.
   Nothing downstream ever types a rate: planning a phase takes the rate from
   whoever the work item is given to, and reassigning the item reprices it.

   Rates are read forward, not backward. Changing one here moves what future
   work will be committed at; work already planned keeps the rate it was
   planned at, because repricing history would quietly rewrite what the firm
   thought it had earned. */
(function () {
  'use strict';

  var P = DESK.PEOPLE, ROLE_RATE = DESK.RATE_BY_ROLE;
  var money = PLAN.money, hrs = PLAN.hrs;

  PLAN.seed(DESK.TICKETS);

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var ROLES = Object.keys(ROLE_RATE);
  var state = { role: 'all', flash: '' };

  /* Hours already committed at each person's rate, so a change here has a
     visible consequence rather than being an abstract number. */
  function committedFor(personId) {
    var h = 0, v = 0;
    PLAN.store.plans.filter(function (pl) { return !pl.closed; }).forEach(function (pl) {
      PLAN.itemsOf(pl.id).forEach(function (w) {
        if (w.who !== personId) { return; }
        h += w.est || 0;
        v += PLAN.forecast(w);
      });
    });
    return { hours: Math.round(h * 10) / 10, value: v };
  }

  function roleRows() {
    return ROLES.map(function (role) {
      var people = P.filter(function (p) { return p.role === role; });
      var off = people.filter(function (p) { return PLAN.rateIsPersonal(p.id); });
      return { role: role, rate: ROLE_RATE[role], n: people.length, off: off.length };
    });
  }

  function view() {
    var shown = state.role === 'all' ? P : P.filter(function (p) { return p.role === state.role; });
    var rates = P.map(function (p) { return PLAN.rateFor(p.id); });
    var lo = Math.min.apply(null, rates), hi = Math.max.apply(null, rates);
    var personal = P.filter(function (p) { return PLAN.rateIsPersonal(p.id); }).length;
    var committedTotal = P.reduce(function (a, p) { return a + committedFor(p.id).value; }, 0);

    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Configuration</div>' +
        '<h1 class="page-title">Settings</h1>' +
        '<p class="page-sub">The rate card — what an hour is charged at, by role and by person</p>' +
      '</div>' +
    '</div>');

    h.push('<div class="rule-top metrics">' +
      '<div class="metric">' +
        '<div class="caps">Rates in use</div>' +
        '<div class="metric-value">' + money(lo) + '–' + money(hi) + '</div>' +
        '<div class="metric-note">Across ' + P.length + ' people in ' + ROLES.length +
          ' roles, charged by the hour</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Set on the person</div>' +
        '<div class="metric-value">' + personal + '</div>' +
        '<div class="metric-note">' + (P.length - personal) +
          ' follow their role’s default; the rest are set individually</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Committed at these rates</div>' +
        '<div class="metric-value">' + money(committedTotal) + '</div>' +
        '<div class="metric-note">Work already planned keeps the rate it was planned ' +
          'at — a change here applies to the next phase, not the last one</div>' +
      '</div>' +
    '</div>');

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Defaults</div>' +
        '<h2 class="section-title">By role</h2>' +
        '<p class="section-sub">Agreed once at onboarding. Everyone in a role is charged at ' +
          'its rate unless they have one of their own.</p>' +
      '</div></div>' +
      '<div class="rate-grid">' +
        roleRows().map(function (r) {
          return '<button type="button" class="rate-cell' +
            (state.role === r.role ? ' sel' : '') + '" data-act="role" data-val="' +
            esc(r.role) + '">' +
            '<span class="rate-role">' + esc(r.role) + '</span>' +
            '<span class="rate-amt">' + money(r.rate) + '<span class="rate-per">/h</span></span>' +
            '<span class="rate-n">' + r.n + ' ' + (r.n === 1 ? 'person' : 'people') +
              (r.off ? ' · ' + r.off + ' set individually' : '') + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</section>');

    h.push('<section class="rule-top">' +
      '<div class="section-head">' +
      '<div>' +
        '<div class="caps">The team</div>' +
        '<h2 class="section-title">By person</h2>' +
        '<p class="section-sub">The rate every work item given to them will be committed at, ' +
          'and what is on their plate at that rate today.</p>' +
      '</div>' +
      '<div class="chips">' +
        '<button type="button" class="chip' + (state.role === 'all' ? ' active' : '') +
          '" data-act="role" data-val="all">All roles<span class="chip-count">' +
          P.length + '</span></button>' +
      '</div>' +
      '</div>' +

      '<table class="data-table"><thead><tr>' +
        '<th>Person</th><th>Role</th><th class="num">Rate</th><th>Source</th>' +
        '<th class="num">Committed</th><th class="num">Worth</th>' +
      '</tr></thead><tbody>' +
        shown.map(function (p) {
          var own = PLAN.rateIsPersonal(p.id);
          var c = committedFor(p.id);
          return '<tr>' +
            '<td><span class="lead-cell"><span class="avatar-sm">' + p.initials + '</span>' +
              esc(p.name) + '</span></td>' +
            '<td><span class="dk-sub">' + esc(p.role) + '</span></td>' +
            '<td class="num"><b>' + money(PLAN.rateFor(p.id)) + '</b></td>' +
            '<td>' + (own
              ? '<span class="rate-tag own">Set on them</span>'
              : '<span class="rate-tag">Role default</span>') + '</td>' +
            '<td class="num">' + (c.hours ? hrs(c.hours) : '<span class="dk-sub">—</span>') + '</td>' +
            '<td class="num">' + (c.value ? money(c.value) : '<span class="dk-sub">—</span>') + '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table>' +
      '<p class="section-sub" style="margin-top:16px;">Editing a rate is part of onboarding and ' +
        'account administration, so it is not wired up in this prototype — the figures above ' +
        'are what the rest of the product reads.</p>' +
    '</section>');

    return h.join('');
  }

  var app = document.getElementById('app');
  function render() { app.innerHTML = view(); }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    if (el.getAttribute('data-act') === 'role') {
      var v = el.getAttribute('data-val');
      state.role = (state.role === v ? 'all' : v);
      render();
    }
  });

  render();
})();
