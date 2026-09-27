/* Lehem Interiors — CRM
   Sample data for demonstration. The team names are real; every prospect,
   contact, value and date below is invented. Replace LEADS. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data */

  /* The sales pipeline, in order, with the odds a deal at that stage closes. */
  var STAGES = [
    { id: 'enquiry', name: 'Enquiry', prob: 0.10 },
    { id: 'visit', name: 'Site visit', prob: 0.25 },
    { id: 'proposal', name: 'Proposal', prob: 0.50 },
    { id: 'negotiation', name: 'Negotiation', prob: 0.75 },
    { id: 'won', name: 'Won', prob: 1 }
  ];

  /* Values are in thousands. */
  var LEADS = [
    { id: 'nyali', client: 'Nyali Beach House', type: 'Private residence', stage: 'enquiry',
      services: ['Interior Design', 'Landscaping'], value: 260, source: 'Instagram',
      owner: 'Elena Meman', oi: 'EM', contact: 'Aisha Rahman', contactRole: 'Owner',
      created: '2 Sep', age: 12, next: 'Send the intro pack', nextDate: '16 Sep',
      log: [['2 Sep', 'Enquiry through Instagram DM'], ['4 Sep', 'Replied with availability']] },
    { id: 'kilimani', client: 'Kilimani Co-work', type: 'Commercial fit-out', stage: 'enquiry',
      services: ['Interior Design', 'Project Management'], value: 430, source: 'Website',
      owner: 'Mukami Nderi', oi: 'MK', contact: 'Brian Otieno', contactRole: 'Operations Lead',
      created: '8 Sep', age: 6, next: 'Qualify the budget on a call', nextDate: '15 Sep',
      log: [['8 Sep', 'Website form, 900 sqm floor plate']] },
    { id: 'clinic', client: 'Westlands Clinic', type: 'Healthcare fit-out', stage: 'enquiry',
      services: ['Interior Design', 'Civil Works + FFE'], value: 380, source: 'Referral',
      owner: 'Mukami Nderi', oi: 'MK', contact: 'Dr. Naomi Kariuki', contactRole: 'Practice Owner',
      created: '9 Sep', age: 5, next: 'Book the site visit', nextDate: '17 Sep',
      log: [['9 Sep', 'Referred by a past client']] },
    { id: 'ngong', client: 'Ngong Road Office', type: 'Commercial fit-out', stage: 'enquiry',
      services: ['Interior Design'], value: 290, source: 'Instagram',
      owner: 'Mukami Nderi', oi: 'MK', contact: 'Peter Mwangi', contactRole: 'Director',
      created: '11 Sep', age: 3, next: 'Send the portfolio', nextDate: '16 Sep',
      log: [['11 Sep', 'Saw the Verdant Offices post']] },
    { id: 'kitisuru', client: 'Kitisuru Residence', type: 'Private residence', stage: 'enquiry',
      services: ['Interior Design', 'Landscaping'], value: 220, source: 'Referral',
      owner: 'Elena Meman', oi: 'EM', contact: 'Sarah Njoroge', contactRole: 'Owner',
      created: '12 Sep', age: 2, next: 'Intro call', nextDate: '18 Sep',
      log: [['12 Sep', 'Referred by the Runda client']] },

    { id: 'sankara', client: 'Sankara Suites Refresh', type: 'Hospitality', stage: 'visit',
      services: ['Interior Design', 'Civil Works + FFE'], value: 620, source: 'Repeat client',
      owner: 'Ace Oreal', oi: 'AO', contact: 'James Kimathi', contactRole: 'General Manager',
      created: '14 Aug', age: 31, next: 'Walk the floors with the GM', nextDate: '18 Sep',
      log: [['14 Aug', 'GM called about refreshing 40 rooms'], ['27 Aug', 'Scope call, phased over two years']] },
    { id: 'tworivers', client: 'Two Rivers Retail Unit', type: 'Retail fit-out', stage: 'visit',
      services: ['Interior Design', 'Civil Works + FFE'], value: 210, source: 'Walk-in',
      owner: 'Elena Meman', oi: 'EM', contact: 'Lydia Achieng', contactRole: 'Brand Manager',
      created: '21 Aug', age: 24, next: 'Measure survey', nextDate: '17 Sep',
      log: [['21 Aug', 'Walked into the studio with a lease plan']] },
    { id: 'rundawing', client: 'Runda Garden Wing', type: 'Private residence', stage: 'visit',
      services: ['Interior Design', 'Landscaping'], value: 310, source: 'Referral',
      owner: 'Kerwyn Fourie', oi: 'KF', contact: 'Michael Gitau', contactRole: 'Owner',
      created: '25 Aug', age: 20, next: 'Second visit with the landscape team', nextDate: '19 Sep',
      log: [['25 Aug', 'Referral from the Ashgrove client'], ['3 Sep', 'First site visit, garden wing and pool deck']] },
    { id: 'parklands', client: 'Parklands Show Unit', type: 'Developer', stage: 'visit',
      services: ['Interior Design', 'Civil Works + FFE'], value: 165, source: 'Architect referral',
      owner: 'Mukami Nderi', oi: 'MK', contact: 'Rita Mwende', contactRole: 'Sales Director',
      created: '1 Sep', age: 13, next: 'Site visit', nextDate: '16 Sep',
      log: [['1 Sep', 'Architect passed on the contact']] },

    { id: 'karen', client: 'Karen Villa', type: 'Private residence', stage: 'proposal',
      services: ['Interior Design', 'Landscaping'], value: 340, source: 'Referral',
      owner: 'Elena Meman', oi: 'EM', contact: 'Grace Wanjiku', contactRole: 'Owner',
      created: '28 Jul', age: 48, next: 'Follow up on the proposal', nextDate: '15 Sep',
      log: [['28 Jul', 'Referral enquiry'], ['11 Aug', 'Site visit and brief'], ['29 Aug', 'Proposal issued, phased fee']] },
    { id: 'lavington', client: 'Lavington Duplex', type: 'Private residence', stage: 'proposal',
      services: ['Interior Design'], value: 260, source: 'Website',
      owner: 'Elena Meman', oi: 'EM', contact: 'Tom Barasa', contactRole: 'Owner',
      created: '5 Aug', age: 40, next: 'Chase the decision', nextDate: '18 Sep',
      log: [['5 Aug', 'Website enquiry'], ['2 Sep', 'Proposal issued']] },
    { id: 'muthaiga', client: 'Muthaiga Garden', type: 'Private residence', stage: 'proposal',
      services: ['Landscaping'], value: 150, source: 'Referral',
      owner: 'Kerwyn Fourie', oi: 'KF', contact: 'Ann Mumo', contactRole: 'Owner',
      created: '12 Aug', age: 33, next: 'Revised planting quote', nextDate: '19 Sep',
      log: [['12 Aug', 'Referral'], ['4 Sep', 'Proposal issued'], ['10 Sep', 'Asked to trim the hardscape scope']] },

    { id: 'gigiri', client: 'Gigiri Embassy Annex', type: 'Commercial fit-out', stage: 'negotiation',
      services: ['Interior Design', 'Civil Works + FFE', 'Project Management'], value: 620,
      source: 'Architect referral', owner: 'Ace Oreal', oi: 'AO', contact: 'Daniel Ochieng',
      contactRole: 'Project Director', created: '2 Jul', age: 74,
      next: 'Fee structure meeting', nextDate: '17 Sep',
      log: [['2 Jul', 'Architect introduction'], ['24 Jul', 'Site visit, three floors'],
            ['18 Aug', 'Proposal issued'], ['5 Sep', 'Negotiating the PM fee and payment terms']] },
    { id: 'riverside', client: 'Riverside Apartments', type: 'Developer', stage: 'negotiation',
      services: ['Interior Design', 'Civil Works + FFE'], value: 300, source: 'Architect referral',
      owner: 'Ace Oreal', oi: 'AO', contact: 'Susan Kilonzo', contactRole: 'Development Manager',
      created: '19 Jul', age: 57, next: 'Contract review', nextDate: '22 Sep',
      log: [['19 Jul', 'Architect introduction'], ['8 Aug', 'Show unit brief'], ['30 Aug', 'Proposal issued']] },

    { id: 'rundahome', client: 'Runda Family Home', type: 'Private residence', stage: 'won',
      services: ['Interior Design'], value: 150, source: 'Repeat client',
      owner: 'Elena Meman', oi: 'EM', contact: 'Paul Kimani', contactRole: 'Owner',
      created: '3 Aug', age: 42, next: 'Deposit received, starts 6 Oct', nextDate: '—',
      log: [['3 Aug', 'Second project for this client'], ['26 Aug', 'Proposal issued'], ['8 Sep', 'Signed, deposit received']] },

    { id: 'thika', client: 'Thika Road Showroom', type: 'Retail fit-out', stage: 'lost',
      services: ['Interior Design', 'Civil Works + FFE'], value: 175, source: 'Website',
      owner: 'Mukami Nderi', oi: 'MK', contact: 'Eric Njuguna', contactRole: 'Owner',
      created: '30 Jul', age: 46, next: 'Went with a cheaper contractor', nextDate: '—',
      log: [['30 Jul', 'Website enquiry'], ['20 Aug', 'Proposal issued'], ['1 Sep', 'Lost on price']] }
  ];

  /* --------------------------------------------------------------- helpers */

  function money(k) {
    if (k >= 1000) { return '$' + (k / 1000).toFixed(2).replace(/0$/, '').replace(/\.$/, '') + 'M'; }
    return '$' + k + 'k';
  }
  function stageName(id) {
    var s = STAGES.filter(function (x) { return x.id === id; })[0];
    return s ? s.name : (id === 'lost' ? 'Lost' : id);
  }
  function inStage(id) { return LEADS.filter(function (l) { return l.stage === id; }); }
  function sum(arr) { return arr.reduce(function (a, l) { return a + l.value; }, 0); }

  var OPEN = ['enquiry', 'visit', 'proposal', 'negotiation'];
  function openLeads() { return LEADS.filter(function (l) { return OPEN.indexOf(l.stage) !== -1; }); }

  /* Funnel stages are ORDINAL, so they take one hue stepped light to dark
     rather than five different colours. Steps validated against the dark
     surface: monotone lightness, >=0.06 gaps, light end 3.29:1. */
  var RAMP = [0.96, 0.84, 0.72, 0.60, 0.48];
  var SURFACE = [0x0d, 0x0d, 0x0c];

  function accentRgb() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
      '#a8d15a';
    var h = v.replace('#', '');
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function hex(rgb) {
    return '#' + rgb.map(function (c) {
      return ('0' + Math.round(c).toString(16)).slice(-2);
    }).join('');
  }
  function step(i) {
    var a = accentRgb(), f = RAMP[i];
    return hex(a.map(function (c, k) { return f * c + (1 - f) * SURFACE[k]; }));
  }
  /* Pick whichever ink actually contrasts better against the step, rather than
     guessing from a lightness threshold — the mid-greens fool the guess. */
  function lum(hexStr) {
    var h = hexStr.replace('#', '');
    var lin = [0, 2, 4].map(function (i) {
      var c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  function ratio(a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function inkOn(hexStr) {
    return ratio('#12110f', hexStr) >= ratio('#f5f2ea', hexStr) ? '#12110f' : '#f5f2ea';
  }

  /* Average days in the pipeline for the leads sitting at each stage. */
  function avgAge(id) {
    var ls = inStage(id);
    if (!ls.length) { return 0; }
    return Math.round(ls.reduce(function (a, l) { return a + l.age; }, 0) / ls.length);
  }
  function pace(days) {
    if (days > 55) { return { cls: 'crit', word: 'Stalling' }; }
    if (days > 30) { return { cls: 'warn', word: 'Slowing' }; }
    return { cls: 'good', word: 'Moving' };
  }

  var state = { stage: 'all', open: '', basis: 'count', chart: 'funnel' };

  /* ------------------------------------------------------------------ view */

  function leadDetail(l) {
    var log = l.log.map(function (e) {
      return '<div class="ph-row done">' +
        '<span class="ph-dot"></span>' +
        '<span><span class="ph-name">' + e[1] + '</span>' +
        '<span class="ph-when">' + e[0] + '</span></span>' +
      '</div>';
    }).join('');

    var prob = STAGES.filter(function (s) { return s.id === l.stage; })[0];
    var facts = [
      ['Value', money(l.value)],
      ['Stage', stageName(l.stage)],
      ['Odds of closing', prob ? Math.round(prob.prob * 100) + '%' : (l.stage === 'lost' ? '—' : '—')],
      ['Services wanted', l.services.join(', ')],
      ['Came from', l.source],
      ['Owner', l.owner],
      ['First contact', l.created],
      ['In the pipeline', l.age + ' days']
    ].map(function (f) {
      return '<div class="fact"><span class="fact-key">' + f[0] + '</span>' +
        '<span class="fact-val">' + f[1] + '</span></div>';
    }).join('');

    return '<div class="ov-detail">' +
      '<div><div class="caps">Activity</div><div class="ph-list">' + log + '</div></div>' +
      '<div><div class="caps">The deal</div><div class="facts">' + facts + '</div></div>' +
      '<div><div class="caps">Next step</div>' +
        '<div class="next-step">' +
          '<div class="next-what">' + l.next + '</div>' +
          '<div class="next-when">' + (l.nextDate !== '—' ? 'Due ' + l.nextDate + ' · ' : '') + l.owner + '</div>' +
        '</div>' +
        '<div class="caps" style="margin-top:20px;">Contact</div>' +
        '<div class="next-step">' +
          '<div class="next-what">' + l.contact + '</div>' +
          '<div class="next-when">' + l.contactRole + ' · ' + l.client + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function view() {
    var h = [];
    var open = openLeads();
    var openValue = sum(open);
    var weighted = STAGES.slice(0, 4).reduce(function (a, s) {
      return a + sum(inStage(s.id)) * s.prob;
    }, 0);
    var shown = state.stage === 'all' ? LEADS : inStage(state.stage);

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Clients &amp; pipeline</div>' +
        '<h1 class="page-title">CRM</h1>' +
        '<p class="page-sub">' + open.length + ' live enquiries · ' + money(openValue) +
          ' in the pipeline · week of 14 September 2026</p>' +
      '</div>' +
    '</div>');

    /* headline numbers */
    h.push('<div class="rule-top metrics">' +
      '<div class="metric">' +
        '<div class="caps">Pipeline value</div>' +
        '<div class="metric-value">' + money(openValue) + '</div>' +
        '<div class="metric-note">Everything still open, at full value</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Weighted forecast</div>' +
        '<div class="metric-value">' + money(Math.round(weighted)) + '</div>' +
        '<div class="metric-note">Each deal at its odds of closing</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Win rate</div>' +
        '<div class="metric-value">62%</div>' +
        '<div class="metric-note">13 of 21 proposals, last 12 months</div>' +
      '</div>' +
      '<div class="metric">' +
        '<div class="caps">Enquiry to signed</div>' +
        '<div class="metric-value">7 weeks</div>' +
        '<div class="metric-note">Average, last 12 months</div>' +
      '</div>' +
    '</div>');

    /* funnel */
    var counts = STAGES.map(function (s) { return inStage(s.id).length; });
    var values = STAGES.map(function (s) { return sum(inStage(s.id)); });
    var byValue = state.basis === 'value';
    var basis = byValue ? values : counts;
    var base = basis[0] || 1;

    /* Half-heights in viewBox units, measured from the centre line.
       The floor keeps a one-lead stage visible. */
    var halves = basis.map(function (v) { return Math.max(4, v / base * 48); });

    /* Whatever the band height encodes is what the band is labelled with. */
    var bandLabel = function (i) {
      return byValue ? money(values[i])
        : counts[i] + (counts[i] === 1 ? ' lead' : ' leads');
    };

    var stageCells = STAGES.map(function (s, i) {
      var hL = halves[i];
      var hR = i < STAGES.length - 1 ? halves[i + 1] : halves[i] * 0.72;
      var fill = step(i);
      var on = state.stage === s.id;
      var inside = (hL + hR) / 2 >= 11;

      var prev = i === 0 ? null : basis[i - 1];
      var drop = i === 0 ? null : prev - basis[i];
      var conv = i === 0 ? null : (prev ? Math.round(basis[i] / prev * 100) : 0);

      var carried;
      if (i === 0) {
        carried = 'The top of the funnel';
      } else if (drop === 0) {
        carried = 'Everything carried through';
      } else if (drop < 0) {
        /* By value the funnel can widen — say so rather than report 123%. */
        carried = (byValue ? money(-drop) : -drop) + ' more than ' +
          STAGES[i - 1].name.toLowerCase();
      } else {
        carried = conv + '% carried through · ' +
          (byValue ? money(drop) + ' fell away'
            : drop + (drop === 1 ? ' lead' : ' leads') + ' fell away');
      }

      var d = 'M 0 ' + (50 - hL) + ' L 100 ' + (50 - hR) +
              ' L 100 ' + (50 + hR) + ' L 0 ' + (50 + hL) + ' Z';

      return '<button type="button" class="hf-stage' + (on ? ' active' : '') +
        '" aria-pressed="' + on + '" data-act="stage" data-val="' + s.id + '">' +
        '<span class="hf-band">' +
          '<svg class="hf-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
            '<path d="' + d + '" fill="' + fill + '"></path>' +
          '</svg>' +
          (inside
            ? '<span class="hf-inband" style="color:' + inkOn(fill) + ';">' + bandLabel(i) + '</span>'
            : '<span class="hf-inband hf-inband-out" style="bottom:calc(50% + ' +
                Math.max(hL, hR) + '%);">' + bandLabel(i) + '</span>') +
          '<span class="hf-tip">' + s.name + ' · ' + counts[i] +
            (counts[i] === 1 ? ' lead' : ' leads') + ' · ' + money(values[i]) +
            ' · ' + Math.round(s.prob * 100) + '% odds</span>' +
        '</span>' +
        '<span class="hf-foot">' +
          '<span class="hf-name">' + s.name + '</span>' +
          '<span class="hf-num">' + (byValue
            ? counts[i] + (counts[i] === 1 ? ' lead' : ' leads')
            : money(values[i])) + '</span>' +
          '<span class="hf-conv">' + carried + '</span>' +
          '<span class="hf-odds">' + Math.round(s.prob * 100) + '% likely to close</span>' +
        '</span>' +
      '</button>';
    }).join('');

    /* An honest funnel can widen: more sitting in a later stage than the one
       behind it is worth saying out loud rather than drawing away. */
    var bulge = null;
    for (var bi = 1; bi < basis.length; bi++) {
      if (basis[bi] > basis[bi - 1]) { bulge = STAGES[bi].name; break; }
    }

    var maxAge = Math.max.apply(null, STAGES.map(function (s) { return avgAge(s.id); }));
    var stallCells = STAGES.slice(0, 4).map(function (s) {
      var d = avgAge(s.id);
      var p = pace(d);
      return '<div class="stall-cell">' +
        '<span class="stall-name">' + s.name + '</span>' +
        '<span class="stall-track"><span class="stall-fill ' + p.cls +
          '" style="width:' + Math.round(d / maxAge * 100) + '%;"></span></span>' +
        '<span class="stall-meta"><b>' + d + ' days</b>' +
          '<span class="stall-word ' + p.cls + '"><span class="stall-dot"></span>' +
          p.word + '</span></span>' +
      '</div>';
    }).join('');

    var tableRows = STAGES.map(function (s, i) {
      var conv = i === 0 ? '—'
        : (counts[i - 1] ? Math.round(counts[i] / counts[i - 1] * 100) + '%' : '—');
      return '<tr>' +
        '<td><span class="tbl-swatch" style="background:' + step(i) + ';"></span>' + s.name + '</td>' +
        '<td class="num">' + counts[i] + '</td>' +
        '<td class="num">' + money(values[i]) + '</td>' +
        '<td class="num">' + Math.round(s.prob * 100) + '%</td>' +
        '<td class="num">' + conv + '</td>' +
        '<td class="num">' + avgAge(s.id) + ' days</td>' +
      '</tr>';
    }).join('') +
      '<tr class="tbl-muted"><td><span class="tbl-swatch tbl-swatch-out"></span>Lost</td>' +
      '<td class="num">' + inStage('lost').length + '</td>' +
      '<td class="num">' + money(sum(inStage('lost'))) + '</td>' +
      '<td class="num">—</td><td class="num">—</td>' +
      '<td class="num">' + avgAge('lost') + ' days</td></tr>';

    var isFunnel = state.chart === 'funnel';

    h.push('<section class="rule-top">' +
      '<div class="section-head"><div>' +
        '<div class="caps">Leads funnel</div>' +
        '<h2 class="section-title">Where the work is coming from</h2>' +
        '<p class="section-sub">Every live enquiry by stage, left to right. The band narrows by how many leads are left at each step. Click a stage to see only those leads.</p>' +
      '</div>' +
      '<div class="fn2-controls">' +
        '<div class="pill-group">' +
          '<button type="button" class="pill' + (state.basis === 'count' ? ' active' : '') +
            '" data-act="basis" data-val="count">By lead count</button>' +
          '<button type="button" class="pill' + (state.basis === 'value' ? ' active' : '') +
            '" data-act="basis" data-val="value">By value</button>' +
        '</div>' +
        '<div class="pill-group">' +
          '<button type="button" class="pill' + (isFunnel ? ' active' : '') +
            '" data-act="chart" data-val="funnel">Funnel</button>' +
          '<button type="button" class="pill' + (isFunnel ? '' : ' active') +
            '" data-act="chart" data-val="table">Table</button>' +
        '</div>' +
      '</div>' +
      '</div>' +

      (isFunnel
        ? '<div class="hf">' + stageCells + '</div>' +
          '<div class="fn2-foot">' +
            '<span>' + (byValue
              ? 'Band height is the money sitting at each stage.'
              : 'Band height is the number of leads at each stage.') +
              (bulge ? ' It widens at ' + bulge + ' — there is more there than in the stage behind it.' : '') +
            '</span>' +
            '<span>' + inStage('lost').length + ' lost this quarter · ' + money(sum(inStage('lost'))) + '</span>' +
          '</div>' +
          '<div class="stall-strip">' +
            '<div class="stall-head">' +
              '<div class="caps">How long they sit there</div>' +
              '<p class="stall-sub">Average days in the pipeline for the leads at each stage.</p>' +
            '</div>' +
            '<div class="stall-grid">' + stallCells + '</div>' +
            '<p class="stall-note">Deals in negotiation have been open ' + avgAge('negotiation') +
              ' days on average — longer than the 49-day enquiry-to-signed average. ' +
              'That is where the pipeline is losing time.</p>' +
          '</div>'
        : '<table class="data-table"><thead><tr>' +
            '<th>Stage</th><th class="num">Leads</th><th class="num">Value</th>' +
            '<th class="num">Odds</th><th class="num">Carried through</th><th class="num">Avg. age</th>' +
          '</tr></thead><tbody>' + tableRows + '</tbody></table>') +
    '</section>');

    /* leads + panels */
    var bySource = {};
    LEADS.forEach(function (l) { bySource[l.source] = (bySource[l.source] || 0) + 1; });
    var sources = Object.keys(bySource).map(function (k) {
      return { name: k, n: bySource[k] };
    }).sort(function (a, b) { return b.n - a.n; });
    var maxS = sources[0].n;
    var warm = LEADS.filter(function (l) {
      return ['Referral', 'Architect referral', 'Repeat client'].indexOf(l.source) !== -1;
    }).length;

    var due = openLeads().slice().sort(function (a, b) {
      return parseInt(a.nextDate, 10) - parseInt(b.nextDate, 10);
    }).slice(0, 5);

    h.push('<div class="rule-top two-col">' +
      '<section>' +
        '<div class="section-head"><div>' +
          '<div class="caps">' + (state.stage === 'all' ? 'All leads' : stageName(state.stage)) + '</div>' +
          '<h2 class="section-title">' + shown.length + ' ' + (shown.length === 1 ? 'lead' : 'leads') + '</h2>' +
          '<p class="section-sub">Click any lead for its history, the deal and who to call next.</p>' +
        '</div>' +
        (state.stage === 'all' ? ''
          : '<button type="button" class="chip" data-act="stage" data-val="all">Show all leads</button>') +
        '</div>' +
        '<div class="lead-list">' +
          shown.map(function (l) {
            var isOpen = state.open === l.id;
            var cls = l.stage === 'won' ? 'won' : (l.stage === 'lost' ? 'lost' : '');
            return '<button type="button" class="lead-row' + (isOpen ? ' open' : '') +
              '" aria-expanded="' + isOpen + '" data-act="lead" data-val="' + l.id + '">' +
              '<span class="lead-top">' +
                '<span class="avatar">' + l.oi + '</span>' +
                '<span class="lead-who">' +
                  '<span class="lead-name">' + l.client + '</span>' +
                  '<span class="lead-type">' + l.type + ' · ' + l.source + '</span>' +
                  '<span class="svc-tags">' + l.services.map(function (s) {
                    return '<span class="svc-tag">' + s + '</span>';
                  }).join('') + '</span>' +
                '</span>' +
                '<span class="lead-right">' +
                  '<span class="lead-value">' + money(l.value) + '</span>' +
                  '<span class="stage-tag ' + cls + '">' + stageName(l.stage) + '</span>' +
                  '<span class="lead-next">' + (l.nextDate !== '—' ? l.next + ' · ' + l.nextDate : l.next) + '</span>' +
                '</span>' +
              '</span>' +
              (isOpen ? leadDetail(l) : '') +
            '</button>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<aside>' +
        '<div class="panel">' +
          '<div class="caps">Where leads come from</div>' +
          '<div class="money-meta" style="margin-top:8px;">' + warm + ' of ' + LEADS.length +
            ' came through people you already know.</div>' +
          sources.map(function (s) {
            return '<div class="cause-row">' +
              '<span class="cause-name">' + s.name + '</span>' +
              '<span class="cause-track"><span class="cause-fill" style="width:' +
                Math.round(s.n / maxS * 100) + '%; background:var(--accent);"></span></span>' +
              '<span class="cause-val">' + s.n + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="panel">' +
          '<div class="caps">Needs a call this week</div>' +
          '<div class="bench-list" style="margin-top:12px;">' +
            due.map(function (l) {
              return '<div class="bench-card">' +
                '<div class="avatar">' + l.oi + '</div>' +
                '<div>' +
                  '<div class="bench-name">' + l.client + '</div>' +
                  '<div class="bench-role">' + l.next + '</div>' +
                  '<div class="bench-hours">' + l.nextDate + ' · ' + l.owner + '</div>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</aside>' +
    '</div>');

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
    if (act === 'stage') { state.stage = (state.stage === val ? 'all' : val); state.open = ''; }
    else if (act === 'lead') { state.open = (state.open === val ? '' : val); }
    else if (act === 'basis') { state.basis = val; }
    else if (act === 'chart') { state.chart = val; }
    else { return; }
    render();
  });

  render();
})();
