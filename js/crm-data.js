/* Lehem Interiors — the CRM pipeline, as data.

   Split out of crm.js so the Overview can read the pipeline without
   rendering the CRM screen. In a real build this is a query; here it is the
   one place the leads are written down. */
var CRM = (function () {
  'use strict';

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

  /* Lost is a real outcome but not a funnel step, so it lives beside the
     stages rather than in them — the funnel would otherwise count a loss as
     progress and the weighted forecast would include it. */
  var ALL_STAGES = STAGES.concat([{ id: 'lost', name: 'Lost', prob: 0 }]);
  var LOST_REASONS = ['Lost on price', 'Went to another firm', 'Project shelved',
    'No response', 'Outside what we do'];

  /* ------------------------------------------------ moves made this visit

     Winning a lead creates a project that other screens read, so the lead's
     new stage has to still be true when you come back to this one. There is
     no server behind the prototype, so the changes ride along in
     sessionStorage; closing the tab restores the sample pipeline. */

  /* What the capture form offers. Drawn from what Lehem already records, so
     a new enquiry is comparable with the ones already in the funnel. */
  var SOURCES = ['Referral', 'Architect referral', 'Repeat client', 'Website',
    'Instagram', 'Walk-in'];
  var TYPES = ['Private residence', 'Commercial fit-out', 'Healthcare fit-out',
    'Hospitality', 'Retail fit-out', 'Developer'];
  var SERVICES = ['Interior Design', 'Landscaping', 'Civil Works + FFE', 'Project Management'];

  /* Leads captured this visit. A patch store cannot hold a lead that did not
     exist when the page loaded, so new ones get their own list and are put at
     the front of the pipeline, newest first. */
  var ADDED = 'lehem.newleads';
  function addedLeads() {
    try { return JSON.parse(window.sessionStorage.getItem(ADDED) || '[]'); }
    catch (e) { return []; }
  }
  function rememberLead(rec) {
    try {
      window.sessionStorage.setItem(ADDED, JSON.stringify(addedLeads().concat([rec])));
    } catch (e) { /* storage off — the screen you are on still works */ }
  }
  addedLeads().forEach(function (rec) {
    if (LEADS.some(function (l) { return l.id === rec.id; })) { return; }
    LEADS.unshift(rec);
  });

  var MOVED = 'lehem.leads';
  function moves() {
    try { return JSON.parse(window.sessionStorage.getItem(MOVED) || '{}'); }
    catch (e) { return {}; }
  }
  function rememberMove(id, patch) {
    try {
      var all = moves();
      all[id] = Object.assign({}, all[id] || {}, patch);
      window.sessionStorage.setItem(MOVED, JSON.stringify(all));
    } catch (e) { /* storage off — the screen you are on still works */ }
  }
  (function () {
    var m = moves();
    LEADS.forEach(function (l) {
      if (!m[l.id]) { return; }
      Object.keys(m[l.id]).forEach(function (k) { l[k] = m[l.id][k]; });
    });
  })();

  var OPEN = ['enquiry', 'visit', 'proposal', 'negotiation'];

  function inStage(id) { return LEADS.filter(function (l) { return l.stage === id; }); }
  function sum(arr) { return arr.reduce(function (a, l) { return a + l.value; }, 0); }
  function openLeads() { return LEADS.filter(function (l) { return OPEN.indexOf(l.stage) !== -1; }); }
  /* Each open deal at its stage's odds of closing. */
  function weighted() {
    return Math.round(STAGES.slice(0, 4).reduce(function (a, s) {
      return a + sum(inStage(s.id)) * s.prob;
    }, 0));
  }

  return {
    STAGES: STAGES, ALL_STAGES: ALL_STAGES, LOST_REASONS: LOST_REASONS,
    LEADS: LEADS, OPEN: OPEN, rememberMove: rememberMove,
    rememberLead: rememberLead, addedLeads: addedLeads,
    SOURCES: SOURCES, TYPES: TYPES, SERVICES: SERVICES,
    inStage: inStage, sum: sum, openLeads: openLeads, weighted: weighted
  };
})();
