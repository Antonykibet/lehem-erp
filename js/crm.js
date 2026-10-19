/* Lehem Interiors — CRM
   Sample data for demonstration. The team names are real; every prospect,
   contact, value and date below is invented. Replace LEADS. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data
     The leads live in crm-data.js, so the Overview can read the pipeline
     without rendering this screen. */

  var STAGES = CRM.STAGES;
  var LEADS = CRM.LEADS;

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

  var OPEN = CRM.OPEN;
  function openLeads() { return CRM.openLeads(); }

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

  var state = {
    stage: 'all', open: '', basis: 'count', chart: 'funnel',
    add: null,        /* the capture form */
    step: null,       /* { id, what, when } — a next step being rewritten */
    move: null,       /* { id, stage, reason } — a stage change being made */
    handoff: null,    /* the Won panel: a lead becoming a project */
    flash: ''
  };

  var ALL_STAGES = CRM.ALL_STAGES, LOST_REASONS = CRM.LOST_REASONS;
  var TODAY = '18 Sep';
  var SOURCES = CRM.SOURCES, TYPES = CRM.TYPES, SERVICES = CRM.SERVICES;

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function lead(id) { return LEADS.filter(function (l) { return l.id === id; })[0]; }
  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      .split('-')[0] || ('p' + Date.now());
  }
  function dollars(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /* ------------------------------------------------------- moving a lead on

     Every move writes itself into the activity log. That is what makes the
     "how long they sit there" figures true rather than seeded, and it means
     nobody has to remember to write down what they just did. */

  function applyMove(id, stage, reason) {
    var l = lead(id);
    var note = stage === 'lost'
      ? 'Lost — ' + reason
      : stage === 'won' ? 'Won' : 'Moved to ' + stageName(stage);
    l.stage = stage;
    l.log = l.log.concat([[TODAY, note]]);
    if (stage === 'lost') { l.next = reason; l.nextDate = '\u2014'; }
    if (stage === 'won') { l.next = 'Won \u2014 project opened'; l.nextDate = '\u2014'; }
    CRM.rememberMove(id, { stage: l.stage, log: l.log, next: l.next, nextDate: l.nextDate });
  }

  /* ------------------------------------------------------ capturing a lead

     Seven fields, because an enquiry that takes longer than a phone call to
     write down does not get written down. Everything else about a lead is
     earned later: the stage moves, the log, what it turns into. */

  function blankLead() {
    return { client: '', type: TYPES[0], source: SOURCES[0], value: '',
      services: ['Interior Design'], owner: DESK.PEOPLE[0].id,
      contact: '', contactRole: 'Owner', error: '' };
  }

  function doAdd() {
    var a = state.add;
    a.error = '';
    if (!a.client.trim()) { a.error = 'Whose enquiry is it? Give it a name.'; return; }
    if (!a.services.length) { a.error = 'Pick at least one service they are asking for.'; return; }
    var val = parseFloat(a.value);
    if (!(val > 0)) { a.error = 'Put a rough value on it — a pipeline without figures ' +
      'forecasts nothing.'; return; }

    var who = DESK.PEOPLE.filter(function (p) { return p.id === a.owner; })[0];
    var id = slug(a.client) + '-' + (Date.now() % 10000);
    var rec = {
      id: id, client: a.client.trim(), type: a.type, stage: 'enquiry',
      services: a.services.slice(), value: Math.round(val), source: a.source,
      owner: who.name, oi: who.initials,
      contact: a.contact.trim() || a.client.trim(), contactRole: a.contactRole,
      created: TODAY, age: 0,
      next: 'First response', nextDate: TODAY,
      log: [[TODAY, 'Enquiry through ' + a.source.toLowerCase()]]
    };
    LEADS.unshift(rec);
    CRM.rememberLead(rec);
    state.add = null;
    state.stage = 'all';
    state.open = id;
    state.flash = rec.client + ' is in the funnel at enquiry, ' + money(rec.value) +
      ', with ' + who.short + ' on it. Its first response is due today \u2014 move it on ' +
      'from its own panel as it goes.';
  }

  /* --------------------------------------------- the handoff: lead to project

     This is the only place a project is created, and the only place a phase
     fee is ever entered. The split defaults to what Lehem's own signed
     contracts average out at, so the usual case is typing one number. */

  /* What Lehem's seven signed contracts actually average out at. The last
     phase takes whatever is left rather than its own percentage, so the five
     fees always add up to the contract sum exactly however they round. */
  var SPLIT = { concept: 0.0875, initial: 0.2599, detail: 0.3482, site: 0.2264, handover: 0.0781 };

  function openHandoff(id) {
    var l = lead(id);
    var sum = l.value * 1000;
    var fee = splitOf(sum);
    state.handoff = {
      id: id, name: l.client, lead: '', signed: TODAY,
      sum: String(sum), fee: fee, error: ''
    };
    state.open = id;
    state.flash = '';
  }

  function splitOf(sum) {
    var keys = DESK.PHASE_KEYS, fee = {}, run = 0;
    keys.forEach(function (k, i) {
      if (i === keys.length - 1) { fee[k] = Math.max(0, Math.round(sum) - run); return; }
      fee[k] = Math.round(sum * SPLIT[k] / 100) * 100;
      run += fee[k];
    });
    return fee;
  }

  /* Retyping the contract sum re-splits the phases, because that is the
     whole point of the default. Touching a phase fee leaves the rest alone. */
  function resplit(h) { h.fee = splitOf(parseFloat(h.sum) || 0); }
  function feeTotal(h) {
    return DESK.PHASE_KEYS.reduce(function (a, k) { return a + (parseFloat(h.fee[k]) || 0); }, 0);
  }

  function doHandoff() {
    var h = state.handoff, l = lead(h.id);
    h.error = '';
    if (!h.name.trim()) { h.error = 'The project needs a name.'; return; }
    if (!h.lead) { h.error = 'Somebody has to lead it.'; return; }
    var total = feeTotal(h);
    if (!(total > 0)) { h.error = 'The phase fees come to nothing — set a contract sum.'; return; }

    var id = slug(h.name);
    if (DESK.PROJECTS.some(function (p) { return p.id === id; })) { id = id + '-' + (Date.now() % 1000); }

    /* Three revisions on every phase apart from concept, which is where
       clients are meant to iterate. Nothing has been worked yet, so every
       allowance starts unspent and the project starts at concept. */
    var phases = {};
    DESK.PHASE_KEYS.forEach(function (k) {
      phases[k] = { fee: k === 'site' ? 'hourly' : 'fixed', allow: k === 'concept' ? 2 : 3, used: 0 };
    });
    var fee = {};
    DESK.PHASE_KEYS.forEach(function (k) { fee[k] = parseFloat(h.fee[k]) || 0; });

    var who = DESK.PEOPLE.filter(function (p) { return p.id === h.lead; })[0];
    DESK.rememberProject({
      id: id, name: h.name.trim(), lead: h.lead, signed: h.signed || null,
      phases: phases, fee: fee,
      client: l.contact, type: l.type, services: l.services,
      leadName: who.name, leadInitials: who.initials,
      value: l.value, started: h.signed || TODAY, source: l.source
    });
    DESK.PROJECTS.push({ id: id, name: h.name.trim(), lead: h.lead, at: 0, phases: phases });
    DESK.CONTRACTS[id] = { signed: h.signed || null, fee: fee };

    applyMove(h.id, 'won');
    state.handoff = null;
    state.open = h.id;
    state.flash = h.name.trim() + ' is open as a project, led by ' + who.short + ', with ' +
      dollars(total) + ' of fees across five phases \u2014 ' +
      DESK.PHASE_NAMES.concept.toLowerCase() + ' first at ' + dollars(fee.concept) +
      '. Plan its first phase on Work Setup and the tasks land on the Team Schedule.';
  }


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
        /* The next step is a commitment, not a caption — so it is typed here,
           and the follow-up feed chases it the way it chases an overdue task. */
        (state.step && state.step.id === l.id
          ? '<div class="form" style="margin-top:10px;">' +
              '<label class="fld"><span class="fld-l">What happens next</span>' +
                '<input class="inp" value="' + esc(state.step.what) + '" ' +
                'placeholder="e.g. Send the revised proposal" data-act="sf" data-val="what"></label>' +
              '<label class="fld"><span class="fld-l">By when</span>' +
                '<input class="inp" value="' + esc(state.step.when) + '" ' +
                'placeholder="e.g. 24 Sep" data-act="sf" data-val="when"></label>' +
              (state.step.error ? '<div class="form-err">' + esc(state.step.error) + '</div>' : '') +
              '<div class="dk-actions">' +
                '<button type="button" class="btn btn-go" data-act="step-do">Set it</button>' +
                '<button type="button" class="btn" data-act="step-cancel">Cancel</button>' +
              '</div>' +
            '</div>'
          : '<div class="next-step">' +
              '<div class="next-what">' + esc(l.next) + '</div>' +
              '<div class="next-when">' + (l.nextDate !== '—' ? 'Due ' + l.nextDate + ' · ' : '') +
                esc(l.owner) + '</div>' +
            '</div>' +
            '<div class="dk-actions">' +
              '<button type="button" class="btn" data-act="step-open" data-val="' + l.id +
                '">Change the next step</button>' +
            '</div>') +
        '<div class="caps" style="margin-top:20px;">Contact</div>' +
        '<div class="next-step">' +
          '<div class="next-what">' + l.contact + '</div>' +
          '<div class="next-when">' + l.contactRole + ' · ' + l.client + '</div>' +
        '</div>' +

        /* Moving the stage is the whole job of this screen, so it sits here
           rather than behind a menu. Every move writes the log itself. */
        '<div class="caps" style="margin-top:20px;">Move it on</div>' +
        '<select class="inp" style="margin-top:10px;" data-act="stage-set" data-val="' + l.id + '">' +
          ALL_STAGES.map(function (st) {
            return '<option value="' + st.id + '"' + (l.stage === st.id ? ' selected' : '') + '>' +
              esc(st.name) + '</option>';
          }).join('') +
        '</select>' +
        (state.move && state.move.id === l.id
          ? '<div class="gate-reasons" style="margin-top:12px;">' +
              LOST_REASONS.map(function (r) {
                return '<button type="button" class="chip' +
                  (state.move.reason === r ? ' active' : '') +
                  '" data-act="lost-why" data-val="' + esc(r) + '">' + esc(r) + '</button>';
              }).join('') +
            '</div>' +
            (state.move.error ? '<div class="form-err">' + esc(state.move.error) + '</div>' : '') +
            '<div class="dk-actions">' +
              '<button type="button" class="btn btn-go" data-act="lost-do">Record it as lost</button>' +
              '<button type="button" class="btn" data-act="move-cancel">Cancel</button>' +
            '</div>'
          : '') +
        (l.stage === 'won'
          ? '<div class="gate-done" style="margin-top:12px;">Won. A project was opened from this ' +
            'lead, so its phases and fees are on Work Setup.</div>'
          : '') +
        /* The stage reads Won only once the project exists, so say what the
           dropdown is waiting for rather than letting it look like it failed. */
        (state.handoff && state.handoff.id === l.id
          ? '<div class="dk-note">Won — it stays at ' + stageName(l.stage).toLowerCase() +
            ' until the project below is opened.</div>'
          : '') +
      '</div>' +
    '</div>';
  }

  function addPanel() {
    var a = state.add;
    return '<div class="tmpl">' +
      '<div class="tmpl-head">' +
        '<div><div class="caps">New enquiry</div>' +
          '<p class="why-sub">Seven fields. It goes into the funnel at enquiry with a first ' +
            'response due today, and everything else about it is earned as it moves.</p></div>' +
        '<button type="button" class="btn" data-act="add-cancel">Close</button>' +
      '</div>' +
      '<div class="form">' +
        '<div class="fld-row">' +
          '<label class="fld"><span class="fld-l">Who is asking</span>' +
            '<input class="inp" value="' + esc(a.client) + '" placeholder="e.g. Nyali Beach House" ' +
            'data-act="af" data-val="client"></label>' +
          '<label class="fld"><span class="fld-l">What kind of job</span>' +
            '<select class="inp" data-act="af" data-val="type">' +
              TYPES.map(function (t) {
                return '<option value="' + esc(t) + '"' + (a.type === t ? ' selected' : '') +
                  '>' + esc(t) + '</option>';
              }).join('') +
            '</select></label>' +
        '</div>' +
        '<div class="fld-row">' +
          '<label class="fld"><span class="fld-l">Roughly worth ($ thousands)</span>' +
            '<input class="inp" type="number" min="0" step="10" value="' + esc(a.value) + '" ' +
            'placeholder="e.g. 260" data-act="af" data-val="value"></label>' +
          '<label class="fld"><span class="fld-l">How they found us</span>' +
            '<select class="inp" data-act="af" data-val="source">' +
              SOURCES.map(function (x) {
                return '<option value="' + esc(x) + '"' + (a.source === x ? ' selected' : '') +
                  '>' + esc(x) + '</option>';
              }).join('') +
            '</select></label>' +
        '</div>' +
        '<div class="fld-row">' +
          '<label class="fld"><span class="fld-l">Who owns it</span>' +
            '<select class="inp" data-act="af" data-val="owner">' +
              DESK.PEOPLE.map(function (p) {
                return '<option value="' + p.id + '"' + (a.owner === p.id ? ' selected' : '') +
                  '>' + esc(p.name) + ' \u00b7 ' + esc(p.role) + '</option>';
              }).join('') +
            '</select></label>' +
          '<label class="fld"><span class="fld-l">Their contact</span>' +
            '<input class="inp" value="' + esc(a.contact) + '" placeholder="Name of the person" ' +
            'data-act="af" data-val="contact"></label>' +
        '</div>' +
        '<div class="fld"><span class="fld-l">What they are asking for</span>' +
          '<div class="gate-reasons" style="margin-top:8px;">' +
            SERVICES.map(function (sv) {
              var on = a.services.indexOf(sv) !== -1;
              return '<button type="button" class="chip' + (on ? ' active' : '') +
                '" data-act="asvc" data-val="' + esc(sv) + '">' + esc(sv) + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        (a.error ? '<div class="form-err">' + esc(a.error) + '</div>' : '') +
        '<div class="dk-actions">' +
          '<button type="button" class="btn btn-go" data-act="add-do">Put it in the funnel</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* The panel that turns a won lead into a project. It is the only place a
     project is created and the only place a phase fee is entered, so it asks
     for both at once and defaults everything it can. */

  function handoffPanel() {
    var h = state.handoff, l = lead(h.id);
    var total = feeTotal(h);
    var sum = parseFloat(h.sum) || 0;
    var off = total - sum;

    return '<div class="tmpl">' +
      '<div class="tmpl-head">' +
        '<div><div class="caps">Open the project</div>' +
          '<p class="why-sub">' + esc(l.client) + ' is won. A project opens from it, and the ' +
            'phase fees set here are what every planned task draws down against \u2014 this is ' +
            'the only place they are entered. The split defaults to what Lehem\u2019s signed ' +
            'contracts average out at; change any phase the contract prices differently.</p></div>' +
        '<button type="button" class="btn" data-act="handoff-cancel">Close</button>' +
      '</div>' +

      '<div class="form">' +
        '<div class="fld-row">' +
          '<label class="fld"><span class="fld-l">Project name</span>' +
            '<input class="inp" value="' + esc(h.name) + '" data-act="hf" data-val="name"></label>' +
          '<label class="fld"><span class="fld-l">Project lead</span>' +
            '<select class="inp" data-act="hf" data-val="lead">' +
              '<option value="">Choose who leads it\u2026</option>' +
              DESK.PEOPLE.map(function (p) {
                return '<option value="' + p.id + '"' + (h.lead === p.id ? ' selected' : '') + '>' +
                  esc(p.name) + ' \u00b7 ' + esc(p.role) + '</option>';
              }).join('') +
            '</select></label>' +
        '</div>' +
        '<div class="fld-row">' +
          '<label class="fld"><span class="fld-l">Contract sum</span>' +
            '<input class="inp" type="number" min="0" step="1000" value="' + esc(h.sum) +
            '" data-act="hf" data-val="sum"></label>' +
          '<label class="fld"><span class="fld-l">Signed</span>' +
            '<input class="inp" value="' + esc(h.signed) + '" placeholder="e.g. 18 Sep" ' +
            'data-act="hf" data-val="signed"></label>' +
        '</div>' +
      '</div>' +

      '<div class="tmpl-list">' +
        '<div class="caps">The fee, phase by phase</div>' +
        '<div class="hf-grid">' +
          DESK.PHASE_KEYS.map(function (k) {
            var pct = sum ? Math.round((parseFloat(h.fee[k]) || 0) / sum * 100) : 0;
            return '<label class="hf-cell"><span class="fld-l">' + esc(DESK.PHASE_NAMES[k]) + '</span>' +
              '<input class="inp inp-cell inp-num" type="number" min="0" step="100" value="' +
                (h.fee[k] || 0) + '" data-act="hfee" data-val="' + k + '">' +
              '<span class="hf-pct">' + pct + '% of the sum</span></label>';
          }).join('') +
        '</div>' +
        '<div class="ltotals">' +
          '<span>' + esc(l.services.join(', ')) + '</span>' +
          '<span>' + (Math.abs(off) < 1 ? 'splits the sum exactly'
            : (off > 0 ? dollars(off) + ' over the sum' : dollars(-off) + ' under the sum')) + '</span>' +
          '<span class="ltotal-big">' + dollars(total) + ' in fees</span>' +
        '</div>' +
      '</div>' +

      (h.error ? '<div class="form-err">' + esc(h.error) + '</div>' : '') +
      '<div class="dk-actions">' +
        '<button type="button" class="btn btn-go" data-act="handoff-do">Open the project</button>' +
      '</div>' +
      '<p class="gate-foot">Concept allows two revisions, every phase after it three. ' +
        'Nothing has been worked yet, so the project starts at concept with every allowance ' +
        'unspent.</p>' +
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
      '<button type="button" class="btn btn-go" data-act="add-open">Log an enquiry</button>' +
    '</div>');

    if (state.flash) {
      h.push('<div class="flash">' + esc(state.flash) + '</div>');
    }
    /* The capture form is a page-level action, so it stays up here. The
       handoff belongs to one lead, so it drops out of that lead's row the
       way its detail does — see the lead list below. */
    if (state.add) { h.push(addPanel()); }

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
            return '<div class="lead-row' + (isOpen ? ' open' : '') + '">' +
              '<button type="button" class="lead-head" aria-expanded="' + isOpen +
                '" data-act="lead" data-val="' + l.id + '">' +
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
              '</button>' +
              (isOpen ? leadDetail(l) : '') +
              (state.handoff && state.handoff.id === l.id ? handoffPanel() : '') +
            '</div>';
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
    if (act === 'stage') {
      state.stage = (state.stage === val ? 'all' : val);
      state.open = ''; state.move = null;
    }
    else if (act === 'lead') {
      state.open = (state.open === val ? '' : val);
      state.move = null; state.step = null; state.flash = '';
    }
    else if (act === 'basis') { state.basis = val; }
    else if (act === 'chart') { state.chart = val; }
    else if (act === 'lost-why') { state.move.reason = val; state.move.error = ''; }
    else if (act === 'lost-do') {
      if (!state.move.reason) { state.move.error = 'Pick a reason — the win rate is only ' +
        'worth reading if the losses say why.'; render(); return; }
      applyMove(state.move.id, 'lost', state.move.reason);
      state.flash = lead(state.move.id).client + ' recorded as lost — ' + state.move.reason +
        '. It leaves the pipeline, so the forecast drops by its value.';
      state.move = null;
    }
    else if (act === 'move-cancel') { state.move = null; }
    else if (act === 'add-open') {
      state.add = blankLead(); state.open = ''; state.move = null;
      state.handoff = null; state.flash = '';
    }
    else if (act === 'add-cancel') { state.add = null; }
    else if (act === 'add-do') { doAdd(); }
    else if (act === 'asvc') {
      var sv = state.add.services, at = sv.indexOf(val);
      if (at === -1) { sv.push(val); } else { sv.splice(at, 1); }
      state.add.error = '';
    }
    else if (act === 'step-open') {
      var sl = lead(val);
      state.step = { id: val, what: sl.next === '—' ? '' : sl.next,
        when: sl.nextDate === '\u2014' ? '' : sl.nextDate, error: '' };
    }
    else if (act === 'step-cancel') { state.step = null; }
    else if (act === 'step-do') {
      var st2 = state.step, sl2 = lead(st2.id);
      if (!st2.what.trim()) {
        st2.error = 'Say what happens next — "chase it" is not a next step.'; render(); return;
      }
      if (st2.when.trim() && !/^\d{1,2} [A-Z][a-z]{2}$/.test(st2.when.trim())) {
        st2.error = 'Dates read like "24 Sep".'; render(); return;
      }
      sl2.next = st2.what.trim();
      sl2.nextDate = st2.when.trim() || '\u2014';
      sl2.log = sl2.log.concat([[TODAY, 'Next step set: ' + sl2.next +
        (sl2.nextDate !== '\u2014' ? ' by ' + sl2.nextDate : '')]]);
      CRM.rememberMove(st2.id, { next: sl2.next, nextDate: sl2.nextDate, log: sl2.log });
      state.flash = sl2.client + ' \u2014 ' + sl2.next +
        (sl2.nextDate !== '\u2014' ? ', due ' + sl2.nextDate : '') +
        '. It is on ' + sl2.owner.split(' ')[0] + '\u2019s follow-up list now.';
      state.step = null;
    }
    else if (act === 'handoff-cancel') { state.handoff = null; }
    else if (act === 'handoff-do') { doHandoff(); }
    else { return; }
    render();
  });

  /* Field edits commit on change, so typing a figure is not interrupted. */
  app.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { return; }
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');

    if (act === 'stage-set') {
      var l = lead(val);
      var to = el.value;
      if (to === l.stage) { return; }
      state.flash = '';
      if (to === 'lost') { state.move = { id: val, stage: 'lost', reason: '', error: '' }; }
      else if (to === 'won') { state.move = null; openHandoff(val); }
      else {
        state.move = null;
        applyMove(val, to);
        state.flash = l.client + ' moved to ' + stageName(to).toLowerCase() + '. The move is in ' +
          'its activity log, and the weighted forecast has it at ' +
          Math.round((ALL_STAGES.filter(function (x) { return x.id === to; })[0].prob) * 100) +
          '% now.';
      }
      render(); return;
    }
    /* No re-render on a field edit: rebuilding the form would pull the
       button out from under the pointer mid-click, and nothing here depends
       on another field. The message stays until the button is pressed. */
    if (act === 'af' && state.add) {
      state.add[val] = el.value; return;
    }
    if (act === 'sf' && state.step) {
      state.step[val] = el.value; state.step.error = ''; return;
    }
    if (act === 'hf' && state.handoff) {
      state.handoff[val] = el.value;
      state.handoff.error = '';
      if (val === 'sum') { resplit(state.handoff); }
      render(); return;
    }
    if (act === 'hfee' && state.handoff) {
      state.handoff.fee[val] = el.value;
      state.handoff.error = '';
      render(); return;
    }
  });

  render();
})();
