/* Lehem Interiors — Projects
   Sample data for demonstration. The team names are real; clients, sites,
   dates, drawing numbers and values are invented. Replace PROJECTS below. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data */

  /* Lehem's four service lines. A project can carry several. */
  var SERVICES = ['Interior Design', 'Landscaping', 'Civil Works + FFE', 'Project Management'];

  /* The phase spine. The first three are Lehem's design stages and their
     drawing series; the last two cover execution. Delete the final two
     entries if site work is tracked outside this module. */
  var PHASES = [
    { key: 'concept', name: 'Concept', series: '' },
    { key: 'initial', name: 'Initial direction', series: '100–200 series' },
    { key: 'detail', name: 'Detail drawing', series: '300 series' },
    { key: 'site', name: 'On site', series: '' },
    { key: 'handover', name: 'Handover', series: '' }
  ];

  var PROJECTS = [
    {
      id: 'halcyon', name: 'Halcyon House', client: 'Private client', location: 'Karen',
      type: 'Private residence', services: ['Interior Design', 'Civil Works + FFE'],
      status: 'active', at: 3, lead: 'Wanjeri Gatheru', leadInitials: 'WG',
      size: '420 m²', value: '$412,000', started: '6 Jan 2026', next: 'Install · 12 Oct',
      phases: [
        { start: '6 Jan', end: '3 Feb', weeks: 4, owner: 'Ace Oreal', note: 'Signed off at the second presentation' },
        { start: '5 Feb', end: '20 Mar', weeks: 6, owner: 'Wanjeri Gatheru', note: 'Drawings 101–214 issued · 2 revisions' },
        { start: '23 Mar', end: '29 May', weeks: 10, owner: 'Awuor Kapere', note: 'Drawings 301–348 issued · 3 revisions' },
        { start: '8 Jun', end: null, weeks: 15, owner: 'Andrew Obel', note: 'Joinery on site · install booked for 12 Oct' }
      ]
    },
    {
      id: 'redfern', name: 'Redfern Penthouse', client: 'Private client', location: 'Westlands',
      type: 'Residential', services: ['Interior Design', 'Civil Works + FFE'],
      status: 'active', at: 3, lead: 'Faazati Ali', leadInitials: 'FA',
      size: '260 m²', value: '$268,000', started: '24 Feb 2026', next: 'First delivery · 30 Sep',
      phases: [
        { start: '24 Feb', end: '17 Mar', weeks: 3, owner: 'Elena Meman', note: 'Two directions presented, client chose the warmer one' },
        { start: '19 Mar', end: '30 Apr', weeks: 6, owner: 'Faazati Ali', note: 'Drawings 101–186 issued · 1 revision' },
        { start: '4 May', end: '26 Jun', weeks: 8, owner: 'Damaris Maina', note: 'Drawings 301–329 issued · 2 revisions' },
        { start: '6 Jul', end: null, weeks: 11, owner: 'Andrew Obel', note: 'Three orders past their promised date' }
      ]
    },
    {
      id: 'marlow', name: 'Marlow Hotel Lobby', client: 'Hospitality group', location: 'Upper Hill',
      type: 'Hospitality', services: ['Interior Design', 'Project Management'],
      status: 'active', at: 2, lead: 'Elena Meman', leadInitials: 'EM',
      size: '640 m²', value: '$980,000', started: '11 May 2026', next: 'Client review · 24 Sep',
      phases: [
        { start: '11 May', end: '19 Jun', weeks: 6, owner: 'Ace Oreal', note: 'Three schemes, the board picked scheme B' },
        { start: '22 Jun', end: '7 Aug', weeks: 7, owner: 'Elena Meman', note: 'Drawings 101–228 issued · 2 revisions' },
        { start: '10 Aug', end: null, weeks: 6, owner: 'Awuor Kapere', note: 'Drawings 301–312 so far · a third revision was requested' }
      ]
    },
    {
      id: 'ashgrove', name: 'Ashgrove Residence', client: 'Private client', location: 'Runda',
      type: 'Private residence', services: ['Interior Design', 'Landscaping', 'Civil Works + FFE'],
      status: 'active', at: 2, lead: 'Wanjeri Gatheru', leadInitials: 'WG',
      size: '510 m²', value: '$196,000', started: '2 Mar 2026', next: 'Permit set · 3 Oct',
      phases: [
        { start: '2 Mar', end: '27 Mar', weeks: 4, owner: 'Elena Meman', note: 'Signed off after a single round' },
        { start: '30 Mar', end: '22 May', weeks: 8, owner: 'Wanjeri Gatheru', note: 'Drawings 101–204 issued · 2 revisions' },
        { start: '25 May', end: null, weeks: 17, owner: 'Deporah Chelimo', note: 'Drawings 301–341 issued · dining chairs being reselected' }
      ]
    },
    {
      id: 'verdant', name: 'Verdant Offices', client: 'Commercial tenant', location: 'Kilimani',
      type: 'Commercial fit-out', services: ['Interior Design', 'Project Management'],
      status: 'active', at: 0, lead: 'Ace Oreal', leadInitials: 'AO',
      size: '1,150 m²', value: '$540,000', started: '24 Aug 2026', next: 'Concept sign-off · 26 Sep',
      phases: [
        { start: '24 Aug', end: null, weeks: 4, owner: 'Ace Oreal', note: 'Two directions with the client, sign-off due 26 Sep' }
      ]
    },
    {
      id: 'sagana', name: 'Sagana River Lodge', client: 'Lodge owner', location: 'Sagana',
      type: 'Hospitality', services: ['Interior Design', 'Landscaping'],
      status: 'hold', at: 1, lead: 'Elena Meman', leadInitials: 'EM',
      size: '880 m²', value: '$610,000', started: '13 Apr 2026', next: 'Paused · client financing',
      phases: [
        { start: '13 Apr', end: '15 May', weeks: 5, owner: 'Ace Oreal', note: 'Approved, then scope widened to the river deck' },
        { start: '18 May', end: '3 Jul', weeks: 7, owner: 'Kerwyn Fourie', note: 'Drawings 101–142 issued · paused 3 Jul pending client financing' }
      ]
    },
    {
      id: 'tatu', name: 'Tatu Gardens Clubhouse', client: 'Developer', location: 'Tatu City',
      type: 'Clubhouse & grounds', services: ['Landscaping', 'Civil Works + FFE', 'Project Management'],
      status: 'active', at: 1, lead: 'Kerwyn Fourie', leadInitials: 'KF',
      size: '2,400 m²', value: '$735,000', started: '6 Jul 2026', next: 'Planting plan review · 2 Oct',
      phases: [
        { start: '6 Jul', end: '14 Aug', weeks: 6, owner: 'Kerwyn Fourie', note: 'Masterplan approved by the developer' },
        { start: '17 Aug', end: null, weeks: 5, owner: 'Kepha Mochama', note: 'Drawings 101–168 issued · hardscape under review' }
      ]
    },
    {
      id: 'brookside', name: 'Brookside Show Unit', client: 'Developer', location: 'Westlands',
      type: 'Residential show unit', services: ['Interior Design', 'Civil Works + FFE'],
      status: 'active', at: 4, lead: 'Faazati Ali', leadInitials: 'FA',
      size: '180 m²', value: '$148,000', started: '19 Jan 2026', next: 'Client walkthrough · 29 Sep',
      phases: [
        { start: '19 Jan', end: '6 Feb', weeks: 3, owner: 'Elena Meman', note: 'Fast-tracked for the sales launch' },
        { start: '9 Feb', end: '13 Mar', weeks: 5, owner: 'Faazati Ali', note: 'Drawings 101–152 issued' },
        { start: '16 Mar', end: '24 Apr', weeks: 6, owner: 'Damaris Maina', note: 'Drawings 301–318 issued · 1 revision' },
        { start: '4 May', end: '28 Aug', weeks: 17, owner: 'Andrew Obel', note: 'Two-week overrun on joinery' },
        { start: '31 Aug', end: null, weeks: 3, owner: 'Andrew Obel', note: 'Snag list down to four items' }
      ]
    },
    {
      id: 'kileleshwa', name: 'Kileleshwa Duplex', client: 'Private client', location: 'Kileleshwa',
      type: 'Private residence', services: ['Interior Design'],
      status: 'complete', at: 4, lead: 'Wanjeri Gatheru', leadInitials: 'WG',
      size: '300 m²', value: '$224,000', started: '8 Sep 2025', next: 'Closed out · 5 Jun',
      phases: [
        { start: '8 Sep', end: '3 Oct', weeks: 4, owner: 'Ace Oreal', note: 'Signed off at the first presentation' },
        { start: '6 Oct', end: '21 Nov', weeks: 7, owner: 'Wanjeri Gatheru', note: 'Drawings 101–176 issued' },
        { start: '24 Nov', end: '30 Jan', weeks: 8, owner: 'Awuor Kapere', note: 'Drawings 301–334 issued · 2 revisions' },
        { start: '9 Feb', end: '15 May', weeks: 14, owner: 'Andrew Obel', note: 'Delivered on programme' },
        { start: '18 May', end: '5 Jun', weeks: 3, owner: 'Andrew Obel', note: 'Closed out, final invoice settled' }
      ]
    }
  ];

  var STATUSES = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Running' },
    { id: 'hold', label: 'On hold' },
    { id: 'complete', label: 'Complete' }
  ];

  var state = { service: 'all', phase: 'all', status: 'all', open: '' };

  /* --------------------------------------------------------------- helpers */

  function matches(p) {
    if (state.status !== 'all' && p.status !== state.status) { return false; }
    if (state.service !== 'all' && p.services.indexOf(state.service) === -1) { return false; }
    if (state.phase !== 'all' && PHASES[p.at].key !== state.phase) { return false; }
    return true;
  }

  /* Ignores the phase filter, so the pipeline always shows the full spread
     of whatever the service and status filters have selected. */
  function forPipeline() {
    return PROJECTS.filter(function (p) {
      if (state.status !== 'all' && p.status !== state.status) { return false; }
      if (state.service !== 'all' && p.services.indexOf(state.service) === -1) { return false; }
      return true;
    });
  }

  function statusTag(p) {
    if (p.status === 'hold') { return '<span class="status-tag hold">On hold</span>'; }
    if (p.status === 'complete') { return '<span class="status-tag done">Complete</span>'; }
    return '';
  }

  function rail(p) {
    return '<div class="rail">' + PHASES.map(function (ph, i) {
      var done = i < p.at || (p.status === 'complete' && i <= p.at);
      var now = i === p.at && p.status !== 'complete';
      var cls = done ? 'done' : (now ? 'now' : 'todo');
      var rec = p.phases[i];
      var sub = '—';
      if (done && rec) { sub = 'done ' + rec.end; }
      else if (now && p.status === 'hold') { sub = 'paused'; }
      else if (now && rec) { sub = 'since ' + rec.start; }
      return '<span class="rail-step ' + cls + '">' +
        '<span class="rail-bar"></span>' +
        '<span class="rail-label">' + ph.name + '</span>' +
        '<span class="rail-sub">' + sub + '</span>' +
      '</span>';
    }).join('') + '</div>';
  }

  function detail(p) {
    var timeline = PHASES.map(function (ph, i) {
      var rec = p.phases[i];
      var done = i < p.at || (p.status === 'complete' && i <= p.at);
      var now = i === p.at && p.status !== 'complete';
      var cls = done ? 'done' : (now ? 'now' : 'todo');
      var dates = '';
      if (rec) {
        dates = rec.start + ' – ' + (rec.end ? rec.end : 'now') + ' · ' + rec.weeks +
          ' week' + (rec.weeks === 1 ? '' : 's') + ' · ' + rec.owner;
      } else {
        dates = 'Not started';
      }
      return '<div class="tl-row ' + cls + '">' +
        '<span class="tl-dot"></span>' +
        '<div class="tl-body">' +
          '<div class="tl-name">' + ph.name +
            (ph.series ? '<span class="tl-series">' + ph.series + '</span>' : '') + '</div>' +
          '<div class="tl-dates">' + dates + '</div>' +
          (rec && rec.note ? '<div class="tl-note">' + rec.note + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    var facts = [
      ['Client', p.client],
      ['Location', p.location],
      ['Type', p.type],
      ['Floor area', p.size],
      ['Contract value', p.value],
      ['Services', p.services.join(', ')],
      ['Lead', p.lead],
      ['Started', p.started],
      ['Next', p.next]
    ].map(function (f) {
      return '<div class="fact"><span class="fact-key">' + f[0] + '</span>' +
        '<span class="fact-val">' + f[1] + '</span></div>';
    }).join('');

    return '<div class="proj-detail">' +
      '<div><div class="caps">Phase history</div><div class="tl">' + timeline + '</div></div>' +
      '<div><div class="caps">Project</div><div class="facts">' + facts + '</div></div>' +
    '</div>';
  }

  /* ------------------------------------------------------------------ view */

  function view() {
    var shown = PROJECTS.filter(matches);
    var pipeSet = forPipeline();
    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Portfolio</div>' +
        '<h1 class="page-title">Projects</h1>' +
        '<p class="page-sub">' + shown.length + ' of ' + PROJECTS.length +
          ' projects · every job, the phases it has been through, and where it sits now</p>' +
      '</div>' +
      '<div class="pill-group" role="group" aria-label="Project status">' +
        STATUSES.map(function (s) {
          var on = state.status === s.id;
          return '<button type="button" class="pill' + (on ? ' active' : '') + '" aria-pressed="' + on +
            '" data-act="status" data-val="' + s.id + '">' + s.label + '</button>';
        }).join('') +
      '</div>' +
    '</div>');

    h.push('<div class="filter-bar">' +
      '<div class="chips" role="group" aria-label="Filter by service">' +
        [{ id: 'all', label: 'All services' }].concat(SERVICES.map(function (s) {
          return { id: s, label: s };
        })).map(function (c) {
          var on = state.service === c.id;
          var count = c.id === 'all' ? PROJECTS.length : PROJECTS.filter(function (p) {
            return p.services.indexOf(c.id) !== -1;
          }).length;
          return '<button type="button" class="chip' + (on ? ' active' : '') + '" aria-pressed="' + on +
            '" data-act="service" data-val="' + c.id + '">' + c.label +
            ' <span class="chip-count">' + count + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="count-note">Projects carry more than one service, so these add up past ' + PROJECTS.length + '</div>' +
    '</div>');

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Where the work sits</div>' +
        '<h2 class="section-title">Projects by phase</h2>' +
        '<p class="section-sub">Click a phase to show only the projects sitting in it.</p>' +
      '</div></div>' +
      '<div class="pipeline">' +
        PHASES.map(function (ph) {
          var n = pipeSet.filter(function (p) { return PHASES[p.at].key === ph.key; }).length;
          var on = state.phase === ph.key;
          return '<button type="button" class="pipe-tile' + (on ? ' active' : '') + '" aria-pressed="' + on +
            '" data-act="phase" data-val="' + ph.key + '">' +
            '<span class="pipe-count">' + n + '</span>' +
            '<span class="pipe-name">' + ph.name + '</span>' +
            '<span class="pipe-series">' + (ph.series || ' ') + '</span>' +
          '</button>';
        }).join('') +
      '</div>');

    if (state.phase !== 'all') {
      h.push('<div style="margin-top:14px;"><button type="button" class="chip" data-act="phase" data-val="all">' +
        'Clear phase filter</button></div>');
    }
    h.push('</section>');

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">The catalogue</div>' +
        '<h2 class="section-title">Every project</h2>' +
        '<p class="section-sub">The rail under each project is its phase history — filled behind it, highlighted where it stands today. Click any project for the full record.</p>' +
      '</div></div>');

    if (!shown.length) {
      h.push('<div class="empty-note">No projects match these filters.</div></section>');
      return h.join('');
    }

    h.push('<div class="proj-list">' + shown.map(function (p) {
      var open = state.open === p.id;
      return '<button type="button" class="proj-card' + (open ? ' open' : '') + '" data-act="project" data-val="' + p.id + '">' +
        '<span class="proj-top">' +
          '<span>' +
            '<span class="proj-title">' + p.name + '</span>' +
            '<span class="proj-sub">' + p.type + ' · ' + p.location + ' · led by ' + p.lead + '</span>' +
            '<span class="svc-tags">' +
              p.services.map(function (s) {
                return '<span class="svc-tag' + (state.service === s ? ' on' : '') + '">' + s + '</span>';
              }).join('') + statusTag(p) +
            '</span>' +
          '</span>' +
          '<span class="proj-right">' +
            '<span class="proj-value">' + p.value + '</span>' +
            '<span class="proj-next">' + p.next + '</span>' +
          '</span>' +
        '</span>' +
        rail(p) +
        (open ? detail(p) : '') +
      '</button>';
    }).join('') + '</div></section>');

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

    if (act === 'status') { state.status = val; state.open = ''; }
    else if (act === 'service') { state.service = val; state.open = ''; }
    else if (act === 'phase') { state.phase = (state.phase === val ? 'all' : val); state.open = ''; }
    else if (act === 'project') { state.open = (state.open === val ? '' : val); }
    else { return; }

    render();
  });

  render();
})();
