/* Lehem Interiors — Time & Workload
   All figures below are sample data for demonstration. Replace DATA with
   real values (or a fetch from your API) when wiring this to the backend. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data */

  var COLORS = { bill: '#3987e5', fee: '#d95926', margin: '#199e70', over: '#c98500' };

  var BUCKETS = [
    { key: 'bill', label: 'Billed by the hour' },
    { key: 'fee', label: 'Covered by a flat fee' },
    { key: 'margin', label: 'Paid by product markup' },
    { key: 'over', label: 'Admin & unpaid' }
  ];

  var ROLE_ORDER = ['Creative lead', 'Interior designer', 'CAD technician', 'Landscape',
    'Procurement', 'Quantity surveyor', 'Project coordinator', 'Business & admin'];

  var ROLE_PLURAL = {
    'Creative lead': 'Creative leads', 'Interior designer': 'Interior designers',
    'CAD technician': 'CAD technicians', 'Landscape': 'Landscape', 'Procurement': 'Procurement',
    'Quantity surveyor': 'Quantity surveying', 'Project coordinator': 'Project coordination',
    'Business & admin': 'Business & admin'
  };

  /* Share of each discipline's hours, by bucket. Must total 100 per role. */
  var ROLE_MIX = {
    'Creative lead': { bill: 40, fee: 18, margin: 10, over: 32 },
    'Interior designer': { bill: 50, fee: 20, margin: 18, over: 12 },
    'CAD technician': { bill: 56, fee: 20, margin: 12, over: 12 },
    'Landscape': { bill: 48, fee: 20, margin: 18, over: 14 },
    'Procurement': { bill: 10, fee: 4, margin: 72, over: 14 },
    'Quantity surveyor': { bill: 44, fee: 22, margin: 20, over: 14 },
    'Project coordinator': { bill: 30, fee: 16, margin: 40, over: 14 },
    'Business & admin': { bill: 6, fee: 4, margin: 18, over: 72 }
  };

  /* The band you'd expect each discipline to sit in. */
  var ROLE_BAND = {
    'Creative lead': { classic: [52, 62], productive: [64, 74] },
    'Interior designer': { classic: [65, 75], productive: [84, 92] },
    'CAD technician': { classic: [72, 82], productive: [85, 92] },
    'Landscape': { classic: [64, 74], productive: [82, 90] },
    'Procurement': { classic: [8, 20], productive: [80, 90] },
    'Quantity surveyor': { classic: [62, 72], productive: [82, 90] },
    'Project coordinator': { classic: [40, 52], productive: [82, 90] },
    'Business & admin': { classic: [6, 16], productive: [24, 34] }
  };

  var PEOPLE = [
    { id: 'ao', name: 'Ace Oreal', role: 'Creative lead', title: 'Chief Creative Director', initials: 'AO', fte: 1.0, base: 0.68, real: 92, skills: ['Client pitching', 'Concept direction'] },
    { id: 'em', name: 'Elena Meman', role: 'Creative lead', title: 'Creative Head', initials: 'EM', fte: 1.0, base: 0.74, real: 91, skills: ['Concept design', 'Design review'] },
    { id: 'wg', name: 'Wanjeri Gatheru', role: 'Interior designer', title: 'Senior Interior Designer', initials: 'WG', fte: 1.0, base: 0.94, real: 93, skills: ['Space planning', 'FF&E specification'] },
    { id: 'fa', name: 'Faazati Ali', role: 'Interior designer', title: 'Interior Designer', initials: 'FA', fte: 1.0, base: 0.90, real: 90, skills: ['Space planning', 'Material boards'] },
    { id: 'so', name: 'Sonia Omindi', role: 'Interior designer', title: 'Junior Interior Designer', initials: 'SO', fte: 1.0, base: 0.86, real: 88, skills: ['Material boards', 'Drawing support'] },
    { id: 'mm', name: 'Mae Muroki', role: 'Interior designer', title: 'Junior Interior Designer', initials: 'MM', fte: 1.0, base: 0.84, real: 87, skills: ['Mood boards', 'Sourcing support'] },
    { id: 'ak', name: 'Awuor Kapere', role: 'CAD technician', title: 'CAD Technician', initials: 'AK', fte: 1.0, base: 0.97, real: 94, skills: ['Drawing sets', 'Detailing'] },
    { id: 'dm', name: 'Damaris Maina', role: 'CAD technician', title: 'CAD Technician', initials: 'DM', fte: 1.0, base: 0.95, real: 93, skills: ['Drawing sets', 'Revisions'] },
    { id: 'dc', name: 'Deporah Chelimo', role: 'CAD technician', title: 'CAD Technician', initials: 'DC', fte: 1.0, base: 0.92, real: 92, skills: ['Drawing sets', 'Setting out'] },
    { id: 'kf', name: 'Kerwyn Fourie', role: 'Landscape', title: 'Creative Landscape Designer', initials: 'KF', fte: 1.0, base: 0.76, real: 90, skills: ['Planting design', 'Hardscape'] },
    { id: 'kp', name: 'Kepha Mochama', role: 'Landscape', title: 'Landscape CAD Technician', initials: 'KP', fte: 1.0, base: 0.80, real: 89, skills: ['Landscape drawings', 'Details'] },
    { id: 'co', name: 'Chrisphine Otieno', role: 'Landscape', title: 'Landscape CAD Technician', initials: 'CO', fte: 1.0, base: 0.78, real: 88, skills: ['Landscape drawings', 'Surveys'] },
    { id: 'mn', name: 'Martha Ndemo', role: 'Procurement', title: 'Procurement Officer', initials: 'MN', fte: 1.0, base: 0.88, real: 89, skills: ['FF&E sourcing', 'Receiving'] },
    { id: 'sc', name: 'Shelmith Chepng’etich', role: 'Quantity surveyor', title: 'Quantity Surveyor', initials: 'SC', fte: 1.0, base: 0.82, real: 91, skills: ['Cost plans', 'Valuations'] },
    { id: 'an', name: 'Andrew Obel', role: 'Project coordinator', title: 'Project Coordinator', initials: 'AN', fte: 1.0, base: 0.93, real: 90, skills: ['Site coordination', 'Installs'] },
    { id: 'km', name: 'Katanu Munyao', role: 'Business & admin', title: 'Digital Marketer', initials: 'KM', fte: 1.0, base: 0.70, real: 85, skills: ['Content', 'Campaigns'] },
    { id: 'mk', name: 'Mukami Nderi', role: 'Business & admin', title: 'Business Dev Executive', initials: 'MK', fte: 1.0, base: 0.72, real: 86, skills: ['Leads', 'Proposals'] },
    { id: 'ev', name: 'Evalyn Mumbua', role: 'Business & admin', title: 'PA to CCD', initials: 'EV', fte: 1.0, base: 0.75, real: 85, skills: ['Scheduling', 'Client liaison'] }
  ];

  var PROJECTS = ['Halcyon House', 'Redfern Penthouse', 'Marlow Hotel Lobby', 'Ashgrove Residence', 'Verdant Offices'];
  var PHASES = ['Design development', 'Construction docs', 'Procurement', 'Contract admin', 'Schematic design'];

  var PERIODS = [
    { id: 'm', label: 'Last 4 weeks', sub: '4 weeks to Sep 14, 2026', weeks: 4, cellW: '96px', colW: '92px', gap: '18px', merchGM: 40000, mult: 2.80, multDelta: '+0.05',
      cols: ['Aug 24', 'Aug 31', 'Sep 7', 'Sep 14'] },
    { id: 'q', label: 'This quarter', sub: '13 weeks to Sep 14, 2026', weeks: 13, cellW: '42px', colW: '38px', gap: '12px', merchGM: 132000, mult: 2.90, multDelta: '+0.10',
      cols: ['Jun 22', 'Jun 29', 'Jul 6', 'Jul 13', 'Jul 20', 'Jul 27', 'Aug 3', 'Aug 10', 'Aug 17', 'Aug 24', 'Aug 31', 'Sep 7', 'Sep 14'] },
    { id: 't12', label: 'Trailing 12', sub: '12 months to Sep 2026', weeks: 52, cellW: '46px', colW: '42px', gap: '14px', merchGM: 500000, mult: 2.85, multDelta: '+0.15',
      cols: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'] }
  ];

  /* --------------------------------------------------------------- helpers */

  /* Deterministic wobble so the sample data never reshuffles between renders. */
  function wob(a, b, span) { return ((a * 37 + b * 61) % (span * 2 + 1)) - span; }
  function avgOf(arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }

  function spike(pid, j, n) {
    if (pid === 'ak' && j >= n - 2) { return j === n - 1 ? 0.13 : 0.09; }
    if (pid === 'wg' && j === Math.floor(n * 0.7)) { return 0.11; }
    if (pid === 'an' && j === Math.floor(n * 0.4)) { return 0.07; }
    return 0;
  }

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

  function spark(vals) {
    var w = 66, h = 22, pad = 3;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var range = (max - min) || 1;
    var pts = vals.map(function (v, i) {
      return [pad + (i * (w - pad * 2)) / ((vals.length - 1) || 1),
        h - pad - ((v - min) / range) * (h - pad * 2)];
    });
    var d = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ');
    var last = pts[pts.length - 1];
    return { d: d, x: last[0].toFixed(1), y: last[1].toFixed(1) };
  }

  function pts(d) {
    return (d >= 0 ? '↑ up ' : '↓ down ') + Math.abs(d) + ' points on last period';
  }

  /* ----------------------------------------------------------------- state */

  var state = {
    period: 'q', role: 'all', mixView: 'chart', heatView: 'chart',
    focus: '', openPerson: '', roleMetric: 'productive'
  };

  /* --------------------------------------------------------------- compute */

  function compute() {
    var period = PERIODS.filter(function (p) { return p.id === state.period; })[0] || PERIODS[1];
    var cols = period.cols, n = cols.length;

    var rows = PEOPLE.map(function (p, i) {
      var ratios = cols.map(function (c, j) {
        var r = p.base + wob(i, j, 4) / 100 + spike(p.id, j, n);
        return r < 0.42 ? 0.42 : r;
      });
      var avg = avgOf(ratios);
      var availWk = 40 * p.fte;
      return { p: p, i: i, ratios: ratios, avg: avg, availWk: availWk, hours: avg * availWk * period.weeks };
    });

    var selRows = rows.filter(function (r) {
      return state.role === 'all' || r.p.role === state.role;
    });

    function mixBase(set) {
      var tot = 0, b = 0, f = 0, m = 0, o = 0;
      set.forEach(function (r) {
        var mx = ROLE_MIX[r.p.role];
        tot += r.hours;
        b += r.hours * mx.bill / 100;
        f += r.hours * mx.fee / 100;
        m += r.hours * mx.margin / 100;
        o += r.hours * mx.over / 100;
      });
      return { tot: tot, bill: b / tot * 100, fee: f / tot * 100, margin: m / tot * 100, over: o / tot * 100 };
    }

    var base = mixBase(selRows);
    var firm = mixBase(rows);

    function colMix(j, shift) {
      var b = Math.round(base.bill + wob(j + shift, 1, 3));
      var f = Math.round(base.fee + wob(j + shift, 2, 2));
      var m = Math.round(base.margin + wob(j + shift, 3, 3));
      return { bill: b, fee: f, margin: m, over: 100 - b - f - m };
    }

    var hoursPerCol = base.tot / n;
    var mixCols = cols.map(function (label, j) {
      var mx = colMix(j, 0);
      var isLast = j === n - 1;
      var segs = BUCKETS.map(function (bk) {
        var pct = mx[bk.key];
        return {
          pct: pct, h: pct + '%', color: COLORS[bk.key],
          op: (state.focus === '' || state.focus === bk.key) ? '1' : '0.16',
          showLabel: isLast && pct >= 9 && state.focus === '',
          tip: bk.label + ' · ' + pct + '% · ' + Math.round(hoursPerCol * pct / 100) + ' hrs'
        };
      });
      return {
        label: label, segments: segs,
        billPct: mx.bill, feePct: mx.fee, marginPct: mx.margin, overPct: mx.over,
        productivePct: mx.bill + mx.fee + mx.margin
      };
    });

    var classicSeries = mixCols.map(function (c) { return c.billPct + c.feePct; });
    var productiveSeries = mixCols.map(function (c) { return c.productivePct; });
    var classic = Math.round(avgOf(classicSeries));
    var productive = Math.round(avgOf(productiveSeries));
    var prior = cols.map(function (l, j) { return colMix(j, 50); });
    var priorClassic = Math.round(avgOf(prior.map(function (c) { return c.bill + c.fee; })));
    var priorProductive = Math.round(avgOf(prior.map(function (c) { return c.bill + c.fee + c.margin; })));

    var rw = 0, rh = 0;
    selRows.forEach(function (r) { rw += r.p.real * r.hours; rh += r.hours; });
    var realization = Math.round(rw / rh);
    var realSeries = cols.map(function (l, j) { return realization + wob(j, 7, 2); });

    var marginHours = firm.tot * firm.margin / 100;
    var yieldVal = Math.round(period.merchGM / marginHours);
    var yieldSeries = cols.map(function (l, j) { return yieldVal + wob(j, 11, 9); });
    var multSeries = cols.map(function (l, j) { return period.mult + wob(j, 9, 8) / 100; });

    var filtered = state.role !== 'all';

    var hero = {
      value: productive + '%',
      delta: pts(productive - priorProductive),
      deltaColor: productive >= priorProductive ? 'var(--good)' : 'var(--crit)',
      classic: classic,
      classicW: classic + '%',
      marginPts: productive - classic,
      marginW: (productive - classic) + '%',
      tip: 'Every hour that brings money in — billed by the hour, covered by a flat fee, or paid for by the markup on the products you sell. Your accountant calls this productive utilization.',
      note: 'Counted the usual way, only ' + classic + '% of the team’s hours look like they earn anything. The other ' + (productive - classic) + ' points are ordering work — chasing confirmations, re-picking discontinued items, booking deliveries — paid for by the markup on products rather than by a design fee.'
    };

    function metric(label, value, delta, up, series, note, tip) {
      var s = spark(series);
      return {
        label: label, value: value, delta: delta, tip: tip,
        deltaColor: up ? 'var(--good)' : 'var(--crit)',
        sparkPath: s.d, lastX: s.x, lastY: s.y, note: note || ''
      };
    }

    var metrics = [
      metric('Billed as fees', classic + '%', pts(classic - priorClassic), classic >= priorClassic, classicSeries, null,
        'Only the hours a client pays for as a design fee — hourly or flat-fee work. This is the number most software calls "utilization", and on its own it makes a healthy firm look like it is coasting.'),
      metric('Hours actually charged', realization + '%', '↑ up 1 point on last period', true, realSeries, null,
        'Of the hours you could have charged for, how many made it onto an invoice. The rest were written off, discounted, or never captured. Your accountant calls this realization.'),
      metric('Earned per $1 of pay', '$' + period.mult.toFixed(2), '↑ ' + period.multDelta, true, multSeries,
        filtered ? 'Whole firm — the role filter does not change this one.' : null,
        'For every $1 of salary the team is paid, this much revenue comes back. Below $2.50 a firm is usually struggling; $2.75 to $3.25 is healthy. Your accountant calls this the net multiplier.'),
      metric('Product profit per hour', '$' + yieldVal + '/hr', '↑ up $9 on last period', true, yieldSeries,
        filtered ? 'Whole firm — the role filter does not change this one.' : null,
        'Profit on the furniture and fittings you sell, divided by the hours spent sourcing, chasing and delivering them. If it drops below your hourly rate, either the markup is too thin or the ordering process is eating time.')
    ];

    var heatRows = selRows.map(function (r) {
      var open = state.openPerson === r.p.id;
      return {
        id: r.p.id, name: r.p.name, role: r.p.title, sel: open,
        cells: r.ratios.map(function (v, j) {
          var color = seqColor(v);
          var over = v > 1.0;
          return {
            pct: Math.round(v * 100), color: color,
            textColor: lightStep(color) ? '#0d0d0c' : '#f5f2ea',
            over: over, overMark: over ? ' (over)' : '',
            ring: open ? 'box-shadow: inset 0 0 0 2px #f5f2ea;' : '',
            tip: r.p.name + ' · ' + cols[j] + ' · ' + Math.round(v * 100) + '% of a ' + Math.round(r.availWk) + '-hour week'
          };
        })
      };
    });

    var openRow = selRows.filter(function (r) { return r.p.id === state.openPerson; })[0] || null;
    var detail = null;
    if (openRow) {
      var mx = ROLE_MIX[openRow.p.role];
      var h = openRow.hours;
      var pClassic = mx.bill + mx.fee;
      detail = {
        initials: openRow.p.initials,
        name: openRow.p.name,
        meta: openRow.p.title + ' · ' + openRow.p.fte.toFixed(1) + ' FTE · ' + Math.round(openRow.availWk) +
          ' hrs/wk available · avg ' + Math.round(openRow.avg * 100) + '% planned',
        totalHours: Math.round(h) + ' h',
        bars: BUCKETS.map(function (bk) {
          return { label: bk.label, color: COLORS[bk.key], w: mx[bk.key] + '%', hrs: Math.round(h * mx[bk.key] / 100) };
        }),
        productive: pClassic + mx.margin,
        classic: pClassic,
        real: openRow.p.real,
        projects: [0, 1].map(function (k) {
          return {
            name: PROJECTS[(openRow.i + k * 2) % PROJECTS.length],
            phase: PHASES[(openRow.i + k) % PHASES.length],
            hrs: Math.round(h * (pClassic + mx.margin) / 100 * (k === 0 ? 0.6 : 0.4))
          };
        })
      };
    }

    var bench = selRows.filter(function (r) { return r.avg < 0.80; })
      .sort(function (a, b) { return (1 - b.avg) * b.availWk - (1 - a.avg) * a.availWk; })
      .slice(0, 5)
      .map(function (r) {
        return {
          name: r.p.name, role: r.p.title, initials: r.p.initials,
          hours: Math.round((1 - r.avg) * r.availWk) + ' hrs', skills: r.p.skills
        };
      });

    var roleRows = ROLE_ORDER.map(function (role) {
      var mx = ROLE_MIX[role];
      var val = state.roleMetric === 'classic' ? mx.bill + mx.fee : mx.bill + mx.fee + mx.margin;
      var band = ROLE_BAND[role][state.roleMetric];
      return {
        key: role, role: ROLE_PLURAL[role], actual: val,
        bandLeft: band[0] + '%', bandWidth: (band[1] - band[0]) + '%', fillWidth: val + '%',
        sel: state.role === role
      };
    });

    var roleChips = [{ id: 'all', label: 'All roles', count: PEOPLE.length }].concat(
      ROLE_ORDER.map(function (role) {
        return {
          id: role, label: ROLE_PLURAL[role],
          count: PEOPLE.filter(function (p) { return p.role === role; }).length
        };
      })
    );

    var buckets = BUCKETS.map(function (bk) {
      return {
        key: bk.key, label: bk.label, color: COLORS[bk.key],
        pct: Math.round(base[bk.key]), sel: state.focus === bk.key
      };
    });

    return {
      period: period, cols: cols, n: n,
      headerSub: (state.role === 'all' ? 'Whole firm' : ROLE_PLURAL[state.role]) + ' · ' + selRows.length +
        (selRows.length === 1 ? ' person · ' : ' people · ') + period.sub,
      filterNote: 'Showing ' + selRows.length + ' of ' + PEOPLE.length + ' people',
      roleChips: roleChips, hero: hero, metrics: metrics, buckets: buckets,
      mixCols: mixCols, heatRows: heatRows, detail: detail, bench: bench, roleRows: roleRows,
      rangeNote: cols[0] + ' → ' + cols[n - 1] + ', oldest to newest',
      gridCols: '168px repeat(' + n + ', ' + period.cellW + ')'
    };
  }

  /* ------------------------------------------------------------------ view */

  function view(v) {
    var h = [];

    h.push('<div class="header-row">' +
      '<div>' +
        '<div class="caps">Time &amp; Workload</div>' +
        '<h1 class="page-title">Where everyone’s time goes</h1>' +
        '<p class="page-sub">' + v.headerSub + '</p>' +
      '</div>' +
      '<div class="pill-group" role="group" aria-label="Reporting period">' +
        PERIODS.map(function (p) {
          var on = p.id === v.period.id;
          return '<button type="button" class="pill' + (on ? ' active' : '') + '" aria-pressed="' + on +
            '" data-act="period" data-val="' + p.id + '">' + p.label + '</button>';
        }).join('') +
      '</div>' +
    '</div>');

    h.push('<div class="filter-bar">' +
      '<div class="chips" role="group" aria-label="Filter by role">' +
        v.roleChips.map(function (c) {
          var on = state.role === c.id;
          return '<button type="button" class="chip' + (on ? ' active' : '') + '" aria-pressed="' + on +
            '" data-act="role" data-val="' + c.id + '">' + c.label +
            ' <span class="chip-count">' + c.count + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="count-note">' + v.filterNote + '</div>' +
    '</div>');

    /* hero + metrics */
    h.push('<div class="rule-top hero">' +
      '<div>' +
        '<div class="caps"><span class="term">Time that earns money<span class="tip tip-wide">' + v.hero.tip + '</span></span></div>' +
        '<div class="hero-value">' + v.hero.value + '</div>' +
        '<div class="hero-delta" style="color:' + v.hero.deltaColor + ';">' + v.hero.delta + '</div>' +
        '<div class="hero-track">' +
          '<span class="hero-fill" style="left:0; width:' + v.hero.classicW + '; background:var(--b1);"></span>' +
          '<span class="hero-fill" style="left:' + v.hero.classicW + '; width:' + v.hero.marginW + '; background:var(--b3);"></span>' +
        '</div>' +
        '<div class="hero-keys">' +
          '<span class="hero-key"><span class="legend-dot" style="background:var(--b1);"></span>Billed as fees <b>' + v.hero.classic + '%</b></span>' +
          '<span class="hero-key"><span class="legend-dot" style="background:var(--b3);"></span>Paid by product markup <b>+' + v.hero.marginPts + '</b></span>' +
        '</div>' +
        '<p class="hero-note">' + v.hero.note + '</p>' +
      '</div>' +
      '<div class="metrics">' +
        v.metrics.map(function (m) {
          return '<div class="metric">' +
            '<div class="caps"><span class="term">' + m.label + '<span class="tip tip-wide">' + m.tip + '</span></span></div>' +
            '<div class="metric-value">' + m.value + '</div>' +
            '<div class="metric-delta" style="color:' + m.deltaColor + ';">' + m.delta + '</div>' +
            '<svg width="66" height="22" viewBox="0 0 66 22" aria-hidden="true">' +
              '<path d="' + m.sparkPath + '" fill="none" stroke="#898781" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<circle cx="' + m.lastX + '" cy="' + m.lastY + '" r="2.6" fill="var(--accent)"/>' +
            '</svg>' +
            (m.note ? '<div class="metric-note">' + m.note + '</div>' : '') +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>');

    /* hour mix */
    h.push('<section class="rule-top">' +
      '<div class="section-head">' +
        '<div>' +
          '<div class="caps">Every logged hour</div>' +
          '<h2 class="section-title">What the time was spent on</h2>' +
          '<p class="section-sub">Four kinds of hours. The ordering work — chasing confirmations, receiving deliveries, re-picking discontinued items, booking installs — never lands on an hourly invoice, but it is what earns the markup on the products you sell. Click a colour to focus it.</p>' +
        '</div>' +
        '<div class="seg" role="group" aria-label="Hour mix view">' +
          '<button type="button" class="seg-btn' + (state.mixView === 'chart' ? ' active' : '') + '" data-act="mixView" data-val="chart">Chart</button>' +
          '<button type="button" class="seg-btn' + (state.mixView === 'table' ? ' active' : '') + '" data-act="mixView" data-val="table">Table</button>' +
        '</div>' +
      '</div>' +
      '<div class="legend-row">' +
        v.buckets.map(function (b) {
          return '<button type="button" class="legend-btn' + (b.sel ? ' active' : '') + '" aria-pressed="' + b.sel +
            '" data-act="focus" data-val="' + b.key + '">' +
            '<span class="legend-dot" style="background:' + b.color + ';"></span>' + b.label +
            ' <span class="legend-val">' + b.pct + '%</span></button>';
        }).join('') +
      '</div>' +
      (state.mixView === 'chart' ? mixChart(v) : mixTable(v)) +
    '</section>');

    /* capacity */
    h.push('<section class="rule-top">' +
      '<div class="section-head">' +
        '<div>' +
          '<div class="caps">Week by week</div>' +
          '<h2 class="section-title">How booked everyone is</h2>' +
          '<p class="section-sub">How much of each person’s week is already spoken for. Click anyone to see their breakdown.</p>' +
        '</div>' +
        '<div class="seg" role="group" aria-label="Capacity view">' +
          '<button type="button" class="seg-btn' + (state.heatView === 'chart' ? ' active' : '') + '" data-act="heatView" data-val="chart">Chart</button>' +
          '<button type="button" class="seg-btn' + (state.heatView === 'table' ? ' active' : '') + '" data-act="heatView" data-val="table">Table</button>' +
        '</div>' +
      '</div>' +
      (state.heatView === 'chart' ? heatChart(v) : heatTable(v)) +
    '</section>');

    /* role bands + bench */
    h.push('<div class="rule-top bottom-row">' +
      '<section>' +
        '<div class="section-head">' +
          '<div>' +
            '<div class="caps">By role</div>' +
            '<h2 class="section-title">How each role compares</h2>' +
            '<p class="section-sub">Grey band is where you’d expect that role to sit. Click a role to filter the page.</p>' +
          '</div>' +
          '<div class="seg" role="group" aria-label="Which hours to count">' +
            '<button type="button" class="seg-btn' + (state.roleMetric === 'productive' ? ' active' : '') + '" data-act="roleMetric" data-val="productive">All earning</button>' +
            '<button type="button" class="seg-btn' + (state.roleMetric === 'classic' ? ' active' : '') + '" data-act="roleMetric" data-val="classic">Fees only</button>' +
          '</div>' +
        '</div>' +
        '<div>' +
          v.roleRows.map(function (r) {
            return '<button type="button" class="role-row' + (r.sel ? ' sel' : '') + '" aria-pressed="' + r.sel +
              '" data-act="roleRow" data-val="' + r.key + '">' +
              '<span class="role-name">' + r.role + '</span>' +
              '<span class="role-track">' +
                '<span class="role-band" style="left:' + r.bandLeft + '; width:' + r.bandWidth + ';"></span>' +
                '<span class="role-fill" style="width:' + r.fillWidth + ';"></span>' +
              '</span>' +
              '<span class="role-val">' + r.actual + '%</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<section>' +
        '<div class="section-head"><div>' +
          '<div class="caps">Availability</div>' +
          '<h2 class="section-title">Who has spare time</h2>' +
          '<p class="section-sub">Anyone less than 80% booked over this period.</p>' +
        '</div></div>' +
        (v.bench.length ?
          '<div class="bench-list">' + v.bench.map(function (p) {
            return '<div class="bench-card">' +
              '<div class="avatar">' + p.initials + '</div>' +
              '<div>' +
                '<div class="bench-name">' + p.name + '</div>' +
                '<div class="bench-role">' + p.role + '</div>' +
                '<div class="bench-hours">' + p.hours + ' free a week</div>' +
                '<div class="skill-tags">' + p.skills.map(function (s) {
                  return '<span class="skill-tag">' + s + '</span>';
                }).join('') + '</div>' +
              '</div>' +
            '</div>';
          }).join('') + '</div>'
          : '<div class="empty-note">Everyone here is 80% booked or more for this period.</div>') +
      '</section>' +
    '</div>');

    return h.join('');
  }

  function mixChart(v) {
    return '<div class="mix-body">' +
      '<div class="mix-axis">' +
        '<span style="top:0%;">100%</span><span style="top:25%;">75%</span>' +
        '<span style="top:50%;">50%</span><span style="top:75%;">25%</span><span style="top:100%;">0</span>' +
      '</div>' +
      '<div>' +
        '<div class="mix-plot">' +
          '<div class="mix-line" style="top:0%;"></div><div class="mix-line" style="top:25%;"></div>' +
          '<div class="mix-line" style="top:50%;"></div><div class="mix-line" style="top:75%;"></div>' +
          '<div class="mix-cols" style="gap:' + v.period.gap + ';">' +
            v.mixCols.map(function (col) {
              return '<div class="mix-col" style="width:' + v.period.colW + ';">' +
                col.segments.map(function (seg) {
                  return '<div class="mix-seg" style="height:' + seg.h + '; background:' + seg.color + '; opacity:' + seg.op + ';">' +
                    (seg.showLabel ? '<span class="mix-seg-label">' + seg.pct + '%</span>' : '') +
                    '<span class="tip">' + seg.tip + '</span>' +
                  '</div>';
                }).join('') +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="mix-labels" style="gap:' + v.period.gap + ';">' +
          v.mixCols.map(function (col) {
            return '<div class="mix-week-label" style="width:' + v.period.colW + ';">' + col.label + '</div>';
          }).join('') +
        '</div>' +
        '<div class="mix-range-note">' + v.rangeNote + '</div>' +
      '</div>' +
    '</div>';
  }

  function mixTable(v) {
    return '<table class="data-table"><thead><tr>' +
      '<th>Period</th><th>Billed by the hour</th><th>Covered by a flat fee</th>' +
      '<th>Paid by product markup</th><th>Admin &amp; unpaid</th><th>Earns money</th>' +
      '</tr></thead><tbody>' +
      v.mixCols.map(function (c) {
        return '<tr><td class="rowhead">' + c.label + '</td><td>' + c.billPct + '%</td><td>' + c.feePct +
          '%</td><td>' + c.marginPct + '%</td><td>' + c.overPct + '%</td><td>' + c.productivePct + '%</td></tr>';
      }).join('') +
    '</tbody></table>';
  }

  function heatChart(v) {
    var grid = '<div class="heat-grid" style="grid-template-columns:' + v.gridCols + ';">' +
      '<div></div>' +
      v.cols.map(function (w) { return '<div class="heat-head">' + w + '</div>'; }).join('') +
      v.heatRows.map(function (row) {
        return '<button type="button" class="heat-rowhead' + (row.sel ? ' sel' : '') + '" data-act="person" data-val="' + row.id + '">' +
            '<span class="heat-name">' + row.name + '</span>' +
            '<span class="heat-role">' + row.role + '</span>' +
          '</button>' +
          row.cells.map(function (cell) {
            return '<button type="button" class="heat-cell" data-act="person" data-val="' + row.id +
              '" style="background:' + cell.color + '; color:' + cell.textColor + '; ' + cell.ring + '">' +
              cell.pct + '%' + (cell.over ? '<span class="heat-flag"></span>' : '') +
              '<span class="tip">' + cell.tip + '</span></button>';
          }).join('');
      }).join('') +
    '</div>';

    var scale = '<div class="scale-row">' +
      '<span class="scale-swatch" style="background:#184f95;"></span>' +
      '<span class="scale-swatch" style="background:#2a78d6;"></span>' +
      '<span class="scale-swatch" style="background:#5598e7;"></span>' +
      '<span class="scale-swatch" style="background:#9ec5f4;"></span>' +
      '<span>Quieter → busier</span>' +
      '<span style="display:inline-flex; align-items:center; gap:7px; margin-left:16px;">' +
        '<span style="width:7px; height:7px; border-radius:50%; background:var(--crit); display:inline-block;"></span>Booked past full</span>' +
    '</div>';

    return grid + scale + (v.detail ? detailPanel(v.detail) : '');
  }

  function detailPanel(d) {
    return '<div class="detail">' +
      '<div class="detail-head">' +
        '<div class="detail-id">' +
          '<div class="avatar">' + d.initials + '</div>' +
          '<div><div class="detail-name">' + d.name + '</div>' +
          '<div class="detail-meta">' + d.meta + '</div></div>' +
        '</div>' +
        '<button type="button" class="icon-btn" aria-label="Close breakdown" data-act="closeDetail">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14"/><path d="M19 5L5 19"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="detail-grid">' +
        '<div>' +
          '<div class="caps">Hours this period · ' + d.totalHours + '</div>' +
          '<div class="detail-bar">' + d.bars.map(function (b) {
            return '<div style="width:' + b.w + '; background:' + b.color + ';"></div>';
          }).join('') + '</div>' +
          '<div class="detail-legend">' + d.bars.map(function (b) {
            return '<div class="legend-item"><span class="legend-dot" style="background:' + b.color + ';"></span>' +
              b.label + ' <span class="legend-val">' + b.hrs + ' h</span></div>';
          }).join('') + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="caps">Their time</div>' +
          '<div class="detail-metrics">' +
            '<div><span class="detail-num">' + d.productive + '%</span><span class="detail-cap">earns money</span></div>' +
            '<div><span class="detail-num">' + d.classic + '%</span><span class="detail-cap">billed as fees</span></div>' +
            '<div><span class="detail-num">' + d.real + '%</span><span class="detail-cap">actually charged</span></div>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="caps">Active projects</div>' +
          '<div style="margin-top:10px;">' + d.projects.map(function (pr) {
            return '<div class="proj-row"><div><div class="proj-name">' + pr.name + '</div>' +
              '<div class="proj-phase">' + pr.phase + '</div></div>' +
              '<div class="proj-hrs">' + pr.hrs + ' h</div></div>';
          }).join('') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function heatTable(v) {
    return '<table class="data-table"><thead><tr><th>Person</th>' +
      v.cols.map(function (w) { return '<th>' + w + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      v.heatRows.map(function (row) {
        return '<tr><td class="rowhead">' + row.name + ' — ' + row.role + '</td>' +
          row.cells.map(function (c) { return '<td>' + c.pct + '%' + c.overMark + '</td>'; }).join('') +
        '</tr>';
      }).join('') +
    '</tbody></table>';
  }

  /* --------------------------------------------------------- render + events */

  var app = document.getElementById('app');

  function render() { app.innerHTML = view(compute()); }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act');
    var val = el.getAttribute('data-val');

    if (act === 'period') { state.period = val; state.openPerson = ''; }
    else if (act === 'role') { state.role = val; state.openPerson = ''; }
    else if (act === 'roleRow') { state.role = (state.role === val ? 'all' : val); state.openPerson = ''; }
    else if (act === 'roleMetric') { state.roleMetric = val; }
    else if (act === 'focus') { state.focus = (state.focus === val ? '' : val); }
    else if (act === 'mixView') { state.mixView = val; }
    else if (act === 'heatView') { state.heatView = val; }
    else if (act === 'person') { state.openPerson = (state.openPerson === val ? '' : val); }
    else if (act === 'closeDetail') { state.openPerson = ''; }
    else { return; }

    render();
  });

  render();
})();
