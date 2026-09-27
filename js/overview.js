/* Lehem Interiors — Overview
   Sample data for demonstration. The team names are real; clients, dates,
   projects and money figures are invented. Replace the data blocks below. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data */

  /* Same phase spine as the Projects module. */
  var PHASES = ['Concept', 'Initial direction', 'Detail drawing', 'On site', 'Handover'];

  /* Running projects. Mirrors the Projects module's "Running" filter. */
  var PROJECTS = [
    { id: 'halcyon', name: 'Halcyon House', at: 3, fee: 78, prog: 71, budget: '$412,000',
      milestone: 'Install', date: '12 Oct', lead: 'WG', leadName: 'Wanjeri', started: '6 Jan 2026',
      phases: [['6 Jan', '3 Feb', 'Ace Oreal'], ['5 Feb', '20 Mar', 'Wanjeri Gatheru'],
               ['23 Mar', '29 May', 'Awuor Kapere'], ['8 Jun', null, 'Andrew Obel']] },
    { id: 'redfern', name: 'Redfern Penthouse', at: 3, fee: 61, prog: 64, budget: '$268,000',
      milestone: 'First delivery', date: '30 Sep', lead: 'FA', leadName: 'Faazati', started: '24 Feb 2026',
      phases: [['24 Feb', '17 Mar', 'Elena Meman'], ['19 Mar', '30 Apr', 'Faazati Ali'],
               ['4 May', '26 Jun', 'Damaris Maina'], ['6 Jul', null, 'Andrew Obel']] },
    { id: 'marlow', name: 'Marlow Hotel Lobby', at: 2, fee: 44, prog: 38, budget: '$980,000',
      milestone: 'Client review', date: '24 Sep', lead: 'EM', leadName: 'Elena', started: '11 May 2026',
      phases: [['11 May', '19 Jun', 'Ace Oreal'], ['22 Jun', '7 Aug', 'Elena Meman'],
               ['10 Aug', null, 'Awuor Kapere']] },
    { id: 'ashgrove', name: 'Ashgrove Residence', at: 2, fee: 52, prog: 55, budget: '$196,000',
      milestone: 'Permit set', date: '3 Oct', lead: 'WG', leadName: 'Wanjeri', started: '2 Mar 2026',
      phases: [['2 Mar', '27 Mar', 'Elena Meman'], ['30 Mar', '22 May', 'Wanjeri Gatheru'],
               ['25 May', null, 'Deporah Chelimo']] },
    { id: 'tatu', name: 'Tatu Gardens Clubhouse', at: 1, fee: 31, prog: 34, budget: '$735,000',
      milestone: 'Planting review', date: '2 Oct', lead: 'KF', leadName: 'Kerwyn', started: '6 Jul 2026',
      phases: [['6 Jul', '14 Aug', 'Kerwyn Fourie'], ['17 Aug', null, 'Kepha Mochama']] },
    { id: 'verdant', name: 'Verdant Offices', at: 0, fee: 22, prog: 30, budget: '$540,000',
      milestone: 'Concept sign-off', date: '26 Sep', lead: 'AO', leadName: 'Ace', started: '24 Aug 2026',
      phases: [['24 Aug', null, 'Ace Oreal']] },
    { id: 'brookside', name: 'Brookside Show Unit', at: 4, fee: 94, prog: 92, budget: '$148,000',
      milestone: 'Client walkthrough', date: '29 Sep', lead: 'FA', leadName: 'Faazati', started: '19 Jan 2026',
      phases: [['19 Jan', '6 Feb', 'Elena Meman'], ['9 Feb', '13 Mar', 'Faazati Ali'],
               ['16 Mar', '24 Apr', 'Damaris Maina'], ['4 May', '28 Aug', 'Andrew Obel'],
               ['31 Aug', null, 'Andrew Obel']] }
  ];

  /* Who is on what today. One row per person at work. */
  var TODAY = [
    { initials: 'WG', name: 'Wanjeri Gatheru', role: 'Senior Interior Designer',
      task: 'Joinery elevations, detail review before the install', project: 'halcyon', hrs: 6 },
    { initials: 'AN', name: 'Andrew Obel', role: 'Project Coordinator',
      task: 'On site with the joinery contractor', project: 'halcyon', hrs: 8 },
    { initials: 'AK', name: 'Awuor Kapere', role: 'CAD Technician',
      task: '300-series revisions to the lobby ceiling', project: 'marlow', hrs: 8 },
    { initials: 'EM', name: 'Elena Meman', role: 'Creative Head',
      task: 'Client review pack for Thursday', project: 'marlow', hrs: 4 },
    { initials: 'SC', name: 'Shelmith Chepng’etich', role: 'Quantity Surveyor',
      task: 'Cost plan update after the third revision', project: 'marlow', hrs: 5 },
    { initials: 'DM', name: 'Damaris Maina', role: 'CAD Technician',
      task: 'Permit set markups', project: 'ashgrove', hrs: 7 },
    { initials: 'DC', name: 'Deporah Chelimo', role: 'CAD Technician',
      task: 'Setting-out drawings for the kitchen', project: 'ashgrove', hrs: 6 },
    { initials: 'FA', name: 'Faazati Ali', role: 'Interior Designer',
      task: 'Delivery check and snag walk', project: 'redfern', hrs: 5 },
    { initials: 'MN', name: 'Martha Ndemo', role: 'Procurement Officer',
      task: 'Chasing the three late orders with the vendor', project: 'redfern', hrs: 6 },
    { initials: 'AO', name: 'Ace Oreal', role: 'Chief Creative Director',
      task: 'Concept presentation, two directions', project: 'verdant', hrs: 4 },
    { initials: 'SO', name: 'Sonia Omindi', role: 'Junior Interior Designer',
      task: 'Material boards for the concept pack', project: 'verdant', hrs: 6 },
    { initials: 'KF', name: 'Kerwyn Fourie', role: 'Creative Landscape Designer',
      task: 'Planting plan, courtyard and entry', project: 'tatu', hrs: 5 },
    { initials: 'KP', name: 'Kepha Mochama', role: 'Landscape CAD Technician',
      task: 'Hardscape details, 100-series', project: 'tatu', hrs: 6 },
    { initials: 'MM', name: 'Mae Muroki', role: 'Junior Interior Designer',
      task: 'Snag list photos and close-out pack', project: 'brookside', hrs: 5 }
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

  function projectById(id) {
    return PROJECTS.filter(function (p) { return p.id === id; })[0];
  }

  /* A compact version of the Projects module's phase rail: filled from the
     start through the phase the project is in now. */
  function miniRail(p) {
    return '<span class="mini-rail">' +
      PHASES.map(function (ph, i) {
        var cls = i < p.at ? 'done' : (i === p.at ? 'now' : 'todo');
        return '<span class="mini-step ' + cls + '"></span>';
      }).join('') +
      '<span class="mini-phase">' + PHASES[p.at] + '</span>' +
    '</span>';
  }

  /* The row dropdown: phase history and the money. */
  function projectDetail(p) {
    var history = PHASES.map(function (ph, i) {
      var rec = p.phases[i];
      var cls = i < p.at ? 'done' : (i === p.at ? 'now' : 'todo');
      var when = rec ? rec[0] + ' – ' + (rec[1] ? rec[1] : 'now') + ' · ' + rec[2] : 'Not started';
      return '<div class="ph-row ' + cls + '">' +
        '<span class="ph-dot"></span>' +
        '<span><span class="ph-name">' + ph + '</span>' +
        '<span class="ph-when">' + when + '</span></span>' +
      '</div>';
    }).join('');

    var facts = [
      ['Fee drawn', p.fee + '%'],
      ['Work complete', p.prog + '%'],
      ['Product budget', p.budget],
      ['Started', p.started],
      ['Lead', p.leadName],
      ['Next', p.milestone + ' · ' + p.date]
    ].map(function (f) {
      return '<div class="fact"><span class="fact-key">' + f[0] + '</span>' +
        '<span class="fact-val">' + f[1] + '</span></div>';
    }).join('');

    var onIt = TODAY.filter(function (t) { return t.project === p.id; });
    var who = onIt.length
      ? onIt.map(function (t) {
          return '<div class="ov-flag">' +
            '<span class="avatar-sm">' + t.initials + '</span>' +
            '<span><span class="ov-flag-title">' + t.name + '</span>' +
            '<span class="ov-flag-sub">' + t.task + '</span></span>' +
          '</div>';
        }).join('')
      : '<div class="ov-flag-none">Nobody booked on this one today.</div>';

    return '<div class="ov-detail">' +
      '<div><div class="caps">Phase history</div><div class="ph-list">' + history + '</div></div>' +
      '<div><div class="caps">The numbers</div><div class="facts">' + facts + '</div></div>' +
      '<div><div class="caps">On it today</div><div class="ov-flags">' + who + '</div></div>' +
    '</div>';
  }

  var state = { day: 'all', openProject: '' };

  /* ------------------------------------------------------------------ view */

  /* How long a project has been running, as of the 14 Sep 2026 sample week. */
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function elapsed(started) {
    var bits = started.split(' ');
    var d0 = new Date(2026, MONTHS.indexOf(bits[1]), parseInt(bits[0], 10));
    var days = Math.round((new Date(2026, 8, 14) - d0) / 86400000);
    if (days < 31) { return Math.max(1, Math.round(days / 7)) + ' weeks in'; }
    var m = Math.round(days / 30.4);
    return m + ' month' + (m === 1 ? '' : 's') + ' in';
  }

  function view() {
    var h = [];
    var shown = TODAY.filter(function (t) { return state.day === 'all' || t.project === state.day; });
    var hours = TODAY.reduce(function (a, t) { return a + t.hrs; }, 0);

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Monday, 14 September 2026</div>' +
        '<h1 class="page-title">Good morning, Eva</h1>' +
        '<p class="page-sub">' + TODAY.length + ' people at work today · ' + hours +
          ' hours booked · ' + PROJECTS.length + ' projects running</p>' +
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

    var counts = PHASES.map(function (ph, i) {
      return PROJECTS.filter(function (p) { return p.at === i; }).length;
    });
    var tints = ['28%', '44%', '60%', '78%', '100%'];
    var statusBar = '<div class="status-bar">' +
        PHASES.map(function (ph, i) {
          if (!counts[i]) { return ''; }
          return '<span class="sb-seg" style="width:' + (counts[i] / PROJECTS.length * 100) +
            '%; background:color-mix(in srgb, var(--accent) ' + tints[i] + ', transparent);" ' +
            'title="' + ph + ': ' + counts[i] + '"></span>';
        }).join('') +
      '</div>' +
      '<div class="sb-legend">' +
        PHASES.map(function (ph, i) {
          return '<span class="sb-key">' +
            '<span class="sb-dot" style="background:color-mix(in srgb, var(--accent) ' + tints[i] + ', transparent);"></span>' +
            ph + ' <b>' + counts[i] + '</b></span>';
        }).join('') +
      '</div>';

    /* ---- today ---- */
    h.push('<div class="rule-top two-col">' +
      '<section>' +
        '<div class="section-head"><div>' +
          '<div class="caps">Today</div>' +
          '<h2 class="section-title">Who is on what</h2>' +
          '<p class="section-sub">Everyone booked in today, the job they are on, and the project it belongs to.</p>' +
        '</div></div>' +
        '<div class="tabs" role="group" aria-label="Filter by project">' +
          [{ id: 'all', label: 'Everyone' }].concat(PROJECTS.map(function (p) {
            return { id: p.id, label: p.name };
          })).map(function (c) {
            var on = state.day === c.id;
            var count = c.id === 'all' ? TODAY.length
              : TODAY.filter(function (t) { return t.project === c.id; }).length;
            if (!count) { return ''; }
            return '<button type="button" class="tab' + (on ? ' active' : '') + '" aria-pressed="' + on +
              '" data-act="day" data-val="' + c.id + '">' + c.label +
              ' <span class="tab-count">' + count + '</span></button>';
          }).join('') +
        '</div>' +
        statusBar +
        '<div class="today-list">' +
          shown.map(function (t) {
            var p = projectById(t.project);
            return '<div class="today-row">' +
              '<span class="avatar">' + t.initials + '</span>' +
              '<span class="today-who">' +
                '<span class="today-name">' + t.name + '</span>' +
                '<span class="today-role">' + t.role + '</span>' +
              '</span>' +
              '<span class="today-task">' + t.task + '</span>' +
              '<span class="today-proj">' +
                '<span class="today-proj-name">' + p.name + '</span>' +
                miniRail(p) +
                '<span class="today-hrs">' + t.hrs + ' hrs</span>' +
              '</span>' +
            '</div>';
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

    /* ---- projects: status bar + table ---- */
    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Active work</div>' +
        '<h2 class="section-title">Projects</h2>' +
        '<p class="section-sub">The bar in each row is the fee you have drawn; the line is how far along the work actually is. Fee ahead of progress is the early warning.</p>' +
      '</div></div>' +
      '<table class="ptable"><thead><tr>' +
        '<th style="width:28%;">Project</th><th style="width:28%;">Fee drawn vs. progress</th>' +
        '<th style="width:13%;">Product budget</th><th style="width:16%;">Started</th><th style="width:15%;">Lead</th>' +
      '</tr></thead><tbody>' +
        PROJECTS.map(function (p) {
          var gap = p.fee - p.prog;
          var ahead = gap > 4;
          var note = ahead ? 'Fee is ' + gap + ' points ahead of the work'
            : (gap < -4 ? 'Work is ' + Math.abs(gap) + ' points ahead of the fee' : 'Fee and progress in step');
          var open = state.openProject === p.id;
          return '<tr class="ptable-row' + (open ? ' open' : '') + '">' +
            '<td>' +
              '<button type="button" class="p-name-btn" aria-expanded="' + open +
                '" data-act="proj" data-val="' + p.id + '">' +
                '<span class="p-name">' + p.name + '</span>' +
                '<svg class="chev' + (open ? ' open' : '') + '" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
              '</button>' + miniRail(p) +
            '</td>' +
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
            '<td><div>' + p.started + '</div><div class="p-phase">' + elapsed(p.started) + '</div></td>' +
            '<td><span class="lead-cell"><span class="avatar-sm">' + p.lead + '</span>' + p.leadName + '</span></td>' +
          '</tr>' +
          '<tr class="det-row' + (open ? '' : ' hidden') + '"><td colspan="5">' + projectDetail(p) + '</td></tr>';
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

    if (act === 'day') { state.day = val; }
    else if (act === 'proj') { state.openProject = (state.openProject === val ? '' : val); }
    else { return; }

    render();
  });

  render();
})();
