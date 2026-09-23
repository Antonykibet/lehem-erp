/* Lehem Interiors — Overview
   All figures below are sample data for demonstration. Replace DATA with
   real values (or a fetch from your API) when wiring this to the backend. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data */

  var ITEMS = [
    { id: 'i1', kind: 'Money', cat: 'money', color: 'var(--crit)',
      title: 'Halcyon House — invoice 1042 is 21 days overdue',
      sub: 'Sent 24 Aug · two reminders, no reply',
      amount: '$38,400', action: 'Chase',
      next: 'The install is booked for 12 Oct and this invoice covers the deposit on the joinery. Either call the client office this week or hold the delivery until it clears — do not let both slide.' },
    { id: 'i2', kind: 'Changes', cat: 'changes', color: 'var(--crit)',
      title: 'Marlow Hotel Lobby — a third revision was requested',
      sub: 'The contract allows two · asked for in Tuesday’s client email',
      amount: '~14 hrs', action: 'Raise change order',
      next: 'Nothing bills until this is raised and signed. Roughly 14 hours of redrawing plus new quotes on two bespoke items. Raise it before anyone starts, or record it as absorbed so it at least shows up in the numbers.' },
    { id: 'i3', kind: 'Orders', cat: 'orders', color: 'var(--serious)',
      title: 'Redfern Penthouse — 3 orders are past their promised date',
      sub: 'Longest is 26 days late · sofa frame, two side tables',
      amount: '$46,800', action: 'Review',
      next: 'The sofa frame misses the delivery window on 30 Sep. Ask the vendor for a firm date, and if it slips again the client needs to hear it from you before they notice the empty room.' },
    { id: 'i4', kind: 'People', cat: 'people', color: 'var(--warn)',
      title: 'Awuor Kapere is booked past full for two weeks running',
      sub: '108% this week, 112% next · drawing sets and detailing',
      amount: '112%', action: 'Rebalance',
      next: 'Chrisphine has 9 hours free a week and can take the detailing. If nothing moves, expect the Ashgrove permit set to slip or the hours to come out of a weekend.' },
    { id: 'i5', kind: 'Orders', cat: 'orders', color: 'var(--serious)',
      title: 'Ashgrove Residence — dining chairs arrived damaged',
      sub: 'Received 11 Sep · 6 of 8 chairs, frames cracked in transit',
      amount: '$9,200', action: 'Open claim',
      next: 'File the freight claim within 14 days of receipt or the carrier stops paying. The line is discontinued, so the reselection hours should go on a change order rather than quietly onto the project.' },
    { id: 'i6', kind: 'Money', cat: 'money', color: 'var(--warn)',
      title: 'Verdant Offices — 60% of the deposit is spent, no invoice raised',
      sub: 'Concept sign-off due 26 Sep',
      amount: '$24,000', action: 'Invoice',
      next: 'You are holding their money and doing the work, but nothing has been billed against the phase. Raise the progress invoice at sign-off so the deposit stops standing in for revenue.' }
  ];

  var TABS = [
    { id: 'all', label: 'Everything' },
    { id: 'money', label: 'Money' },
    { id: 'orders', label: 'Orders' },
    { id: 'people', label: 'People' },
    { id: 'changes', label: 'Changes' }
  ];

  var CAUSES = [
    { name: 'Scope never priced', amount: 9400 },
    { name: 'Goodwill', amount: 4800 },
    { name: 'Reselection', amount: 2900 },
    { name: 'Quoting error', amount: 1500 }
  ];

  var TEAM = [
    { initials: 'AO', r: 0.68 }, { initials: 'EM', r: 0.74 }, { initials: 'WG', r: 1.02 },
    { initials: 'FA', r: 0.90 }, { initials: 'SO', r: 0.86 }, { initials: 'MM', r: 0.84 },
    { initials: 'AK', r: 1.12 }, { initials: 'DM', r: 0.95 }, { initials: 'DC', r: 0.92 },
    { initials: 'KF', r: 0.76 }, { initials: 'KP', r: 0.80 }, { initials: 'CO', r: 0.78 },
    { initials: 'MN', r: 0.88 }, { initials: 'SC', r: 0.82 }, { initials: 'AN', r: 0.93 },
    { initials: 'KM', r: 0.70 }, { initials: 'MK', r: 0.72 }, { initials: 'EV', r: 0.75 }
  ];

  var PROJECTS = [
    { name: 'Halcyon House', phase: 'Contract admin', fee: 78, prog: 71, budget: '$412,000', milestone: 'Install', date: '12 Oct', lead: 'WG', leadName: 'Wanjeri' },
    { name: 'Redfern Penthouse', phase: 'Procurement', fee: 61, prog: 64, budget: '$268,000', milestone: 'First delivery', date: '30 Sep', lead: 'FA', leadName: 'Faazati' },
    { name: 'Marlow Hotel Lobby', phase: 'Design development', fee: 44, prog: 38, budget: '$980,000', milestone: 'Client review', date: '24 Sep', lead: 'EM', leadName: 'Elena' },
    { name: 'Ashgrove Residence', phase: 'Construction docs', fee: 52, prog: 55, budget: '$196,000', milestone: 'Permit set', date: '3 Oct', lead: 'WG', leadName: 'Wanjeri' },
    { name: 'Verdant Offices', phase: 'Schematic design', fee: 22, prog: 30, budget: '$540,000', milestone: 'Concept sign-off', date: '26 Sep', lead: 'AO', leadName: 'Ace' }
  ];

  /* --------------------------------------------------------------- helpers */

  var SEQ = ['#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4'];
  function seqColor(r) {
    if (r < 0.60) { return SEQ[0]; }
    if (r < 0.68) { return SEQ[1]; }
    if (r < 0.75) { return SEQ[2]; }
    if (r < 0.82) { return SEQ[3]; }
    if (r < 0.89) { return SEQ[4]; }
    if (r < 0.96) { return SEQ[5]; }
    if (r < 1.03) { return SEQ[6]; }
    if (r < 1.10) { return SEQ[7]; }
    return SEQ[8];
  }
  function lightStep(c) { return c === SEQ[5] || c === SEQ[6] || c === SEQ[7] || c === SEQ[8]; }

  var state = { tab: 'all', openItem: '' };

  /* ------------------------------------------------------------------ view */

  function view() {
    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Monday, 14 September 2026</div>' +
        '<h1 class="page-title">Good morning, Eva</h1>' +
        '<p class="page-sub">18 people · 5 active projects · 6 things want a decision</p>' +
      '</div>' +
      '<div class="period-note">Money shown for this quarter</div>' +
    '</div>');

    h.push('<div class="rule-top money">' +
      '<div class="money-cell">' +
        '<div class="caps">Profit on design fees</div>' +
        '<div class="money-value">$186,400</div>' +
        '<div class="money-meta">42% of fees billed · up $12,300 on last quarter</div>' +
      '</div>' +
      '<div class="money-cell">' +
        '<div class="caps">Profit on products</div>' +
        '<div class="money-value">$132,000</div>' +
        '<div class="money-meta">26% after freight, storage and delivery · $153 per hour of ordering work</div>' +
      '</div>' +
      '<div class="money-cell">' +
        '<div class="caps">Client money you hold</div>' +
        '<div class="money-value">$418,000</div>' +
        '<div class="split-track">' +
          '<span class="split-fill" style="left:0; width:70%; background:var(--b1);"></span>' +
          '<span class="split-fill" style="left:70%; width:30%; background:var(--b3);"></span>' +
        '</div>' +
        '<div class="split-keys">' +
          '<span class="split-key"><span class="dot" style="background:var(--b1);"></span>$291k already spent on orders</span>' +
          '<span class="split-key"><span class="dot" style="background:var(--b3);"></span>$127k still free</span>' +
        '</div>' +
      '</div>' +
      '<div class="money-cell">' +
        '<div class="caps">Expected in, next 30 days</div>' +
        '<div class="money-value">$164,500</div>' +
        '<div class="money-meta">7 invoices · $38,400 of it already overdue</div>' +
      '</div>' +
    '</div>');

    var shown = ITEMS.filter(function (x) { return state.tab === 'all' || x.cat === state.tab; });

    h.push('<div class="rule-top two-col">' +
      '<section>' +
        '<div class="section-head"><div>' +
          '<div class="caps">Needs a decision</div>' +
          '<h2 class="section-title">What wants you today</h2>' +
          '<p class="section-sub">Pulled from every part of the system. Click anything to see what happens next.</p>' +
        '</div></div>' +
        '<div class="tabs" role="group" aria-label="Filter by kind">' +
          TABS.map(function (t) {
            var on = state.tab === t.id;
            var count = t.id === 'all' ? ITEMS.length : ITEMS.filter(function (x) { return x.cat === t.id; }).length;
            return '<button type="button" class="tab' + (on ? ' active' : '') + '" aria-pressed="' + on +
              '" data-act="tab" data-val="' + t.id + '">' + t.label +
              ' <span class="tab-count">' + count + '</span></button>';
          }).join('') +
        '</div>' +
        '<div style="margin-top:8px;">' +
          shown.map(function (it) {
            var open = state.openItem === it.id;
            return '<button type="button" class="item' + (open ? ' open' : '') + '" data-act="item" data-val="' + it.id + '">' +
              '<span class="item-dot" style="background:' + it.color + ';"></span>' +
              '<span class="item-body">' +
                '<span class="item-kind">' + it.kind + '</span>' +
                '<span class="item-title">' + it.title + '</span>' +
                '<span class="item-sub">' + it.sub + '</span>' +
                (open ? '<span class="item-next">' + it.next + '</span>' : '') +
              '</span>' +
              '<span class="item-right">' +
                '<span class="item-amount">' + it.amount + '</span>' +
                '<span class="item-action">' + it.action + ' →</span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<aside>' +
        '<div class="panel">' +
          '<div class="caps">Work you gave away</div>' +
          '<div class="panel-value">$18,600</div>' +
          '<div class="money-meta" style="margin-top:8px;">9 extra requests absorbed this quarter instead of charged. Last quarter: $11,200.</div>' +
          CAUSES.map(function (c) {
            return '<div class="cause-row">' +
              '<span class="cause-name">' + c.name + '</span>' +
              '<span class="cause-track"><span class="cause-fill" style="width:' +
                Math.round(c.amount / 9400 * 100) + '%;"></span></span>' +
              '<span class="cause-val">$' + (c.amount / 1000).toFixed(1) + 'k</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="panel">' +
          '<div class="caps">The team this week</div>' +
          '<div class="panel-row">' +
            '<div><span class="panel-num">75%</span><span class="panel-cap">time that earns</span></div>' +
            '<div><span class="panel-num">55%</span><span class="panel-cap">billed as fees</span></div>' +
            '<div><span class="panel-num">2</span><span class="panel-cap">booked past full</span></div>' +
          '</div>' +
          '<div class="team-strip">' +
            TEAM.map(function (p) {
              var color = seqColor(p.r);
              return '<span class="team-chip" style="background:' + color + '; color:' +
                (lightStep(color) ? '#0d0d0c' : '#f5f2ea') + ';">' + p.initials +
                (p.r > 1.0 ? '<span class="team-flag"></span>' : '') + '</span>';
            }).join('') +
          '</div>' +
          '<a href="workload.html" class="panel-link">Open time &amp; workload</a>' +
        '</div>' +
      '</aside>' +
    '</div>');

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Active work</div>' +
        '<h2 class="section-title">Projects</h2>' +
        '<p class="section-sub">The bar is the fee you have drawn. The line is how far along the work actually is. Fee ahead of progress is the early warning.</p>' +
      '</div></div>' +
      '<table class="ptable"><thead><tr>' +
        '<th style="width:24%;">Project</th><th style="width:28%;">Fee drawn vs. progress</th>' +
        '<th style="width:14%;">Product budget</th><th style="width:20%;">Next milestone</th><th style="width:14%;">Lead</th>' +
      '</tr></thead><tbody>' +
        PROJECTS.map(function (p) {
          var gap = p.fee - p.prog;
          var ahead = gap > 4;
          var note = ahead ? 'Fee is ' + gap + ' points ahead of the work'
            : (gap < -4 ? 'Work is ' + Math.abs(gap) + ' points ahead of the fee' : 'Fee and progress in step');
          return '<tr>' +
            '<td><div class="p-name">' + p.name + '</div><div class="p-phase">' + p.phase + '</div></td>' +
            '<td>' +
              '<div class="burn">' +
                '<span class="burn-fill" style="width:' + p.fee + '%; background:' +
                  (ahead ? 'var(--serious)' : 'var(--b1)') + ';"></span>' +
                '<span class="burn-mark" style="left:' + p.prog + '%;"></span>' +
                '<span class="burn-tip">' + p.fee + '% of the fee drawn · work ' + p.prog + '% done</span>' +
              '</div>' +
              '<div class="p-phase" style="margin-top:6px; color:' +
                (ahead ? 'var(--serious)' : 'var(--ink-3)') + ';">' + note + '</div>' +
            '</td>' +
            '<td class="num">' + p.budget + '</td>' +
            '<td><div>' + p.milestone + '</div><div class="p-phase">' + p.date + '</div></td>' +
            '<td><span class="lead-cell"><span class="avatar-sm">' + p.lead + '</span>' + p.leadName + '</span></td>' +
          '</tr>';
        }).join('') +
      '</tbody></table>' +
    '</section>');

    return h.join('');
  }

  /* --------------------------------------------------------- render + events */

  var app = document.getElementById('app');
  function render() { app.innerHTML = view(); }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act');
    var val = el.getAttribute('data-val');

    if (act === 'tab') { state.tab = val; state.openItem = ''; }
    else if (act === 'item') { state.openItem = (state.openItem === val ? '' : val); }
    else { return; }

    render();
  });

  render();
})();
