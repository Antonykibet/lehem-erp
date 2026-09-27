/* Lehem Interiors — service desk: the model.
   Sample data for demonstration. The team names are real; every ticket,
   estimate and time entry below is invented.

   The shape follows the data ingestion spec: work types carry a bucket rule,
   phases carry a fee type and a revision allowance, and a ticket's bucket is
   derived from those two things — never chosen by the person logging time. */
var DESK = (function () {
  'use strict';

  /* ------------------------------------------------------------- the people */

  var PEOPLE = [
    { id: 'ao', name: 'Ace Oreal', short: 'Ace', role: 'Creative lead', initials: 'AO', hours: 40, lead: true },
    { id: 'em', name: 'Elena Meman', short: 'Elena', role: 'Creative lead', initials: 'EM', hours: 40, lead: true },
    { id: 'wg', name: 'Wanjeri Gatheru', short: 'Wanjeri', role: 'Interior designer', initials: 'WG', hours: 40, lead: true },
    { id: 'fa', name: 'Faazati Ali', short: 'Faazati', role: 'Interior designer', initials: 'FA', hours: 40, lead: true },
    { id: 'so', name: 'Sonia Omindi', short: 'Sonia', role: 'Interior designer', initials: 'SO', hours: 40 },
    { id: 'mm', name: 'Mae Muroki', short: 'Mae', role: 'Interior designer', initials: 'MM', hours: 40 },
    { id: 'ak', name: 'Awuor Kapere', short: 'Awuor', role: 'CAD technician', initials: 'AK', hours: 40 },
    { id: 'dm', name: 'Damaris Maina', short: 'Damaris', role: 'CAD technician', initials: 'DM', hours: 40 },
    { id: 'dc', name: 'Deporah Chelimo', short: 'Deporah', role: 'CAD technician', initials: 'DC', hours: 40 },
    { id: 'kf', name: 'Kerwyn Fourie', short: 'Kerwyn', role: 'Landscape', initials: 'KF', hours: 40, lead: true },
    { id: 'kp', name: 'Kepha Mochama', short: 'Kepha', role: 'Landscape', initials: 'KP', hours: 40 },
    { id: 'co', name: 'Chrisphine Otieno', short: 'Chrisphine', role: 'Landscape', initials: 'CO', hours: 40 },
    { id: 'mn', name: 'Martha Ndemo', short: 'Martha', role: 'Procurement', initials: 'MN', hours: 40 },
    { id: 'sc', name: "Shelmith Chepng'etich", short: 'Shelmith', role: 'Quantity surveyor', initials: 'SC', hours: 40 },
    { id: 'an', name: 'Andrew Obel', short: 'Andrew', role: 'Project coordinator', initials: 'AN', hours: 40, lead: true },
    { id: 'km', name: 'Katanu Munyao', short: 'Katanu', role: 'Business & admin', initials: 'KM', hours: 40 },
    { id: 'mk', name: 'Mukami Nderi', short: 'Mukami', role: 'Business & admin', initials: 'MK', hours: 40 },
    { id: 'ev', name: 'Evalyn Mumbua', short: 'Evalyn', role: 'Business & admin', initials: 'EV', hours: 40 }
  ];

  /* Leave in the sample week, subtracted from available hours (§7 `leave`). */
  var LEAVE = { mm: 16, co: 8 };

  /* --------------------------------------------------- the work-type taxonomy
     §4. A closed list. Each type carries its bucket rule: 'phase' means look
     the bucket up from the phase's fee type, anything else is fixed. */

  var WORK_TYPES = [
    { id: 'concept', group: 'Design', name: 'Concept development', bucket: 'phase' },
    { id: 'present', group: 'Design', name: 'Client presentation', bucket: 'phase' },
    { id: 'dwg100', group: 'Design', name: 'Drawing package — 100 series (plans)', bucket: 'phase', sheets: true, series: '100' },
    { id: 'dwg200', group: 'Design', name: 'Drawing package — 200 series (elevations)', bucket: 'phase', sheets: true, series: '200' },
    { id: 'dwg300', group: 'Design', name: 'Drawing package — 300 series (sections & details)', bucket: 'phase', sheets: true, series: '300' },
    { id: 'spec', group: 'Design', name: 'Specification / FF&E schedule', bucket: 'phase' },
    { id: 'revision', group: 'Design', name: 'Revision', bucket: 'phase', revision: true },

    { id: 'enquiry', group: 'FF&E coordination', name: 'Supplier enquiry / sample request', bucket: 'sourcing' },
    { id: 'followup', group: 'FF&E coordination', name: 'Supplier follow-up', bucket: 'sourcing' },
    { id: 'delivery', group: 'FF&E coordination', name: 'Delivery & install scheduling', bucket: 'sourcing' },
    { id: 'reselect', group: 'FF&E coordination', name: 'Reselection', bucket: 'sourcing', draftCO: true },

    { id: 'sitevisit', group: 'Site', name: 'Site visit / inspection', bucket: 'phase' },
    { id: 'rfi', group: 'Site', name: 'RFI response', bucket: 'phase' },
    { id: 'submittal', group: 'Site', name: 'Submittal review', bucket: 'phase' },
    { id: 'snag', group: 'Site', name: 'Snag / punch item', bucket: 'phase' },
    { id: 'valuation', group: 'Site', name: 'Subcontractor valuation', bucket: 'phase' },

    { id: 'pitch', group: 'Business', name: 'Lead response / pitch', bucket: 'over', lead: true },
    { id: 'proposal', group: 'Business', name: 'Proposal preparation', bucket: 'over', lead: true },
    { id: 'admin', group: 'Business', name: 'Admin / internal / training', bucket: 'over' },
    { id: 'leave', group: 'Business', name: 'Leave', bucket: 'over' }
  ];

  /* ------------------------------------------------------------ the buckets */

  var BUCKETS = {
    bill: { name: 'Billed by the hour', paid: 'Design fee', tone: 'earn' },
    fee: { name: 'Covered by a flat fee', paid: 'Design fee', tone: 'earn' },
    sourcing: { name: 'FF&E coordination', paid: 'Nothing — currently unpriced', tone: 'drag' },
    over: { name: 'Admin, business development, internal', paid: 'Overhead', tone: 'over' }
  };

  /* Fee type on a phase decides the bucket for design and site work (§1). */
  var FEE_TYPES = {
    hourly: { label: 'Hourly', bucket: 'bill' },
    fixed: { label: 'Fixed fee', bucket: 'fee' },
    psf: { label: 'Per m²', bucket: 'fee' },
    unbilled: { label: 'Unbilled', bucket: 'over' }
  };

  var PHASE_KEYS = ['concept', 'initial', 'detail', 'site', 'handover'];
  var PHASE_NAMES = {
    concept: 'Concept',
    initial: 'Initial direction',
    detail: 'Detail drawing',
    site: 'On site',
    handover: 'Handover'
  };
  var PHASE_SERIES = { initial: '100–200 series', detail: '300 series' };

  /* ----------------------------------------------------------- the projects
     `at` is the current phase index. Each phase carries its own fee type and
     revision allowance, both set on the contract at Won (§3, event 2). */

  var PROJECTS = [
    { id: 'halcyon', name: 'Halcyon House', lead: 'wg', at: 3,
      phases: {
        concept: { fee: 'fixed', allow: 2, used: 2 },
        initial: { fee: 'fixed', allow: 2, used: 1 },
        detail: { fee: 'hourly', allow: 3, used: 2 },
        site: { fee: 'hourly', allow: 2, used: 2 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } },
    { id: 'redfern', name: 'Redfern Penthouse', lead: 'fa', at: 3,
      phases: {
        concept: { fee: 'fixed', allow: 2, used: 1 },
        initial: { fee: 'fixed', allow: 2, used: 1 },
        detail: { fee: 'fixed', allow: 2, used: 1 },
        site: { fee: 'hourly', allow: 2, used: 1 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } },
    { id: 'marlow', name: 'Marlow Hotel Lobby', lead: 'em', at: 2,
      phases: {
        concept: { fee: 'fixed', allow: 3, used: 3 },
        initial: { fee: 'fixed', allow: 2, used: 2 },
        detail: { fee: 'fixed', allow: 2, used: 2 },
        site: { fee: 'hourly', allow: 2, used: 0 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } },
    { id: 'ashgrove', name: 'Ashgrove Residence', lead: 'wg', at: 2,
      phases: {
        concept: { fee: 'fixed', allow: 2, used: 1 },
        initial: { fee: 'fixed', allow: 2, used: 2 },
        detail: { fee: 'hourly', allow: 3, used: 1 },
        site: { fee: 'hourly', allow: 2, used: 0 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } },
    { id: 'tatu', name: 'Tatu Gardens Clubhouse', lead: 'kf', at: 1,
      phases: {
        concept: { fee: 'fixed', allow: 2, used: 1 },
        initial: { fee: 'psf', allow: 2, used: 0 },
        detail: { fee: 'psf', allow: 2, used: 0 },
        site: { fee: 'hourly', allow: 2, used: 0 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } },
    /* Verdant's concept is pre-contract, so its hours are absorbed: the
       phase fee type is `unbilled` and every design hour lands in `over`. */
    { id: 'verdant', name: 'Verdant Offices', lead: 'ao', at: 0,
      phases: {
        concept: { fee: 'unbilled', allow: 2, used: 0 },
        initial: { fee: 'fixed', allow: 2, used: 0 },
        detail: { fee: 'fixed', allow: 2, used: 0 },
        site: { fee: 'hourly', allow: 2, used: 0 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } },
    { id: 'brookside', name: 'Brookside Show Unit', lead: 'fa', at: 4,
      phases: {
        concept: { fee: 'fixed', allow: 1, used: 1 },
        initial: { fee: 'fixed', allow: 2, used: 2 },
        detail: { fee: 'fixed', allow: 2, used: 1 },
        site: { fee: 'hourly', allow: 2, used: 2 },
        handover: { fee: 'fixed', allow: 1, used: 0 }
      } }
  ];

  /* ------------------------------------------------------------- the states */

  var STATES = [
    { id: 'intake', name: 'Intake', note: 'Raised, nobody on it yet' },
    { id: 'assigned', name: 'Assigned', note: 'Has an owner, estimate and window' },
    { id: 'progress', name: 'In progress', note: 'Being worked on now' },
    { id: 'blocked', name: 'Blocked', note: 'Waiting on someone or something' },
    { id: 'review', name: 'In review', note: 'With the lead or the client' },
    { id: 'done', name: 'Done', note: 'Closed this week' }
  ];

  /* --------------------------------------------------- phase ticket templates
     §5.3. Opening a phase spawns its standard set, so the lead edits and
     assigns rather than composes. */

  var TEMPLATES = {
    concept: [
      { type: 'concept', title: 'Site measure and brief workshop', est: 12 },
      { type: 'concept', title: 'Two concept directions', est: 24 },
      { type: 'present', title: 'Concept presentation to client', est: 6 }
    ],
    initial: [
      { type: 'dwg100', title: '100-series plans — first issue', est: 32 },
      { type: 'dwg200', title: '200-series elevations — first issue', est: 28 },
      { type: 'spec', title: 'Outline FF&E schedule', est: 10 },
      { type: 'present', title: 'Initial direction sign-off', est: 4 }
    ],
    detail: [
      { type: 'dwg300', title: '300-series sections & details', est: 40 },
      { type: 'spec', title: 'Specification pack for tender', est: 14 },
      { type: 'valuation', title: 'QS cost plan update', est: 8, who: 'sc' },
      { type: 'spec', title: 'Spec review with the QS', est: 4, who: 'sc' }
    ],
    site: [
      { type: 'sitevisit', title: 'Weekly site inspection', est: 6 },
      { type: 'submittal', title: 'Submittal review — joinery', est: 6 },
      { type: 'delivery', title: 'Delivery & install programme', est: 8 }
    ],
    handover: [
      { type: 'snag', title: 'Snag list walkthrough', est: 8 },
      { type: 'sitevisit', title: 'Client handover walkthrough', est: 4 }
    ]
  };

  /* ------------------------------------------------------------- the tickets
     `est` is the estimate in hours, `logged` the hours already booked.
     A ticket in `intake` has no assignee, no estimate and no window — which is
     exactly why it cannot reach the heatmap until someone assigns it (§5.1). */

  var TICKETS = [
    /* --- Halcyon House (on site) --- */
    { id: 'LEH-401', p: 'halcyon', ph: 'site', type: 'sitevisit', title: 'Week 12 site inspection', who: 'an', est: 6, logged: 4.5, start: '15 Sep', due: '19 Sep', state: 'progress' },
    { id: 'LEH-402', p: 'halcyon', ph: 'site', type: 'rfi', title: 'RFI 41 — bulkhead height at the stair', who: 'ak', est: 3, logged: 3, start: '15 Sep', due: '17 Sep', state: 'review' },
    { id: 'LEH-403', p: 'halcyon', ph: 'site', type: 'delivery', title: 'Install sequence for the joinery delivery', who: 'mn', est: 8, logged: 6, start: '14 Sep', due: '18 Sep', state: 'progress' },
    { id: 'LEH-404', p: 'halcyon', ph: 'site', type: 'followup', title: 'Chase the stone supplier on the vanity tops', who: 'mn', est: 4, logged: 3.5, start: '15 Sep', due: '19 Sep', state: 'progress' },
    /* The gate case: site allowance is 2 and 2 are used, so this one blocks. */
    { id: 'LEH-405', p: 'halcyon', ph: 'site', type: 'revision', title: 'Revision — client wants the island moved 300mm', est: null, state: 'intake' },
    { id: 'LEH-406', p: 'halcyon', ph: 'site', type: 'submittal', title: 'Submittal review — light fittings', who: 'wg', est: 5, logged: 1, start: '16 Sep', due: '22 Sep', state: 'assigned' },
    { id: 'LEH-407', p: 'halcyon', ph: 'site', type: 'snag', title: 'Snag — skirting gap in the guest bedroom', est: null, state: 'intake' },

    /* --- Redfern Penthouse (on site) --- */
    { id: 'LEH-388', p: 'redfern', ph: 'site', type: 'sitevisit', title: 'First delivery inspection', who: 'an', est: 5, logged: 2, start: '16 Sep', due: '19 Sep', state: 'progress' },
    { id: 'LEH-389', p: 'redfern', ph: 'site', type: 'rfi', title: 'RFI 12 — AV back box positions', who: 'dm', est: 3, logged: 3, start: '14 Sep', due: '16 Sep', state: 'done' },
    { id: 'LEH-390', p: 'redfern', ph: 'site', type: 'reselect', title: 'Reselect the dining pendants — original discontinued', who: 'mn', est: 6, logged: 5.5, start: '15 Sep', due: '19 Sep', state: 'blocked', blockNote: 'Draft change order raised, waiting on the client' },
    { id: 'LEH-391', p: 'redfern', ph: 'site', type: 'delivery', title: 'Book the second delivery slot', who: 'mn', est: 3, logged: 0, start: '18 Sep', due: '22 Sep', state: 'assigned' },
    { id: 'LEH-392', p: 'redfern', ph: 'detail', type: 'revision', title: 'Revision — revised wardrobe internals', who: 'dm', est: 8, logged: 6, start: '15 Sep', due: '19 Sep', state: 'progress' },

    /* --- Marlow Hotel Lobby (detail drawing) --- */
    { id: 'LEH-355', p: 'marlow', ph: 'detail', type: 'dwg300', title: '300-series — reception desk details', who: 'ak', est: 24, logged: 18, start: '10 Sep', due: '24 Sep', state: 'progress' },
    { id: 'LEH-356', p: 'marlow', ph: 'detail', type: 'dwg300', title: '300-series — lift lobby wall build-ups', who: 'ak', est: 16, logged: 11, start: '14 Sep', due: '26 Sep', state: 'progress' },
    { id: 'LEH-357', p: 'marlow', ph: 'detail', type: 'spec', title: 'Specification pack for tender', who: 'em', est: 14, logged: 4, start: '16 Sep', due: '30 Sep', state: 'assigned' },
    /* Detail allowance is 2 and 2 are used — the third revision blocks. */
    { id: 'LEH-358', p: 'marlow', ph: 'detail', type: 'revision', title: 'Revision — third round on the feature ceiling', est: null, state: 'intake' },
    { id: 'LEH-359', p: 'marlow', ph: 'detail', type: 'valuation', title: 'QS cost plan update', who: 'sc', est: 8, logged: 5, start: '15 Sep', due: '19 Sep', state: 'progress' },
    { id: 'LEH-360', p: 'marlow', ph: 'detail', type: 'enquiry', title: 'Sample request — terrazzo options', who: 'mn', est: 4, logged: 2.5, start: '15 Sep', due: '18 Sep', state: 'progress' },
    { id: 'LEH-361', p: 'marlow', ph: 'detail', type: 'present', title: 'Client review of the detail package', who: 'em', est: 4, logged: 0, start: '22 Sep', due: '24 Sep', state: 'assigned' },

    /* --- Ashgrove Residence (detail drawing) --- */
    { id: 'LEH-372', p: 'ashgrove', ph: 'detail', type: 'dwg300', title: '300-series — kitchen and pantry details', who: 'dc', est: 28, logged: 21, start: '8 Sep', due: '25 Sep', state: 'progress' },
    { id: 'LEH-373', p: 'ashgrove', ph: 'detail', type: 'spec', title: 'Dining chair reselection schedule', who: 'wg', est: 6, logged: 4, start: '15 Sep', due: '19 Sep', state: 'progress' },
    { id: 'LEH-374', p: 'ashgrove', ph: 'detail', type: 'reselect', title: 'Reselect the dining chairs — lead time too long', who: 'mn', est: 8, logged: 6.5, start: '14 Sep', due: '19 Sep', state: 'progress' },
    { id: 'LEH-375', p: 'ashgrove', ph: 'detail', type: 'dwg300', title: '300-series — bathroom setting out', est: null, state: 'intake' },
    { id: 'LEH-376', p: 'ashgrove', ph: 'detail', type: 'valuation', title: 'Permit set cost check', who: 'sc', est: 6, logged: 0, start: '29 Sep', due: '3 Oct', state: 'assigned' },

    /* --- Tatu Gardens Clubhouse (initial direction) --- */
    { id: 'LEH-410', p: 'tatu', ph: 'initial', type: 'dwg100', title: '100-series — hardscape layout', who: 'kp', est: 26, logged: 15, start: '9 Sep', due: '26 Sep', state: 'progress' },
    { id: 'LEH-411', p: 'tatu', ph: 'initial', type: 'dwg200', title: '200-series — pavilion elevations', who: 'co', est: 20, logged: 8, start: '15 Sep', due: '30 Sep', state: 'progress' },
    { id: 'LEH-412', p: 'tatu', ph: 'initial', type: 'present', title: 'Planting plan review with the developer', who: 'kf', est: 5, logged: 0, start: '30 Sep', due: '2 Oct', state: 'assigned' },
    { id: 'LEH-413', p: 'tatu', ph: 'initial', type: 'spec', title: 'Outline planting schedule', est: null, state: 'intake' },
    { id: 'LEH-414', p: 'tatu', ph: 'initial', type: 'dwg100', title: '100-series — drainage and levels', who: 'kp', est: 18, logged: 2, start: '18 Sep', due: '3 Oct', state: 'assigned' },

    /* --- Verdant Offices (concept, pre-contract) --- */
    { id: 'LEH-420', p: 'verdant', ph: 'concept', type: 'concept', title: 'Two concept directions', who: 'ao', est: 24, logged: 16, start: '8 Sep', due: '24 Sep', state: 'progress' },
    { id: 'LEH-421', p: 'verdant', ph: 'concept', type: 'present', title: 'Concept sign-off presentation', who: 'ao', est: 6, logged: 0, start: '24 Sep', due: '26 Sep', state: 'assigned' },
    { id: 'LEH-422', p: 'verdant', ph: 'concept', type: 'concept', title: 'Test fit for 900 sqm floor plate', who: 'so', est: 14, logged: 9, start: '11 Sep', due: '22 Sep', state: 'progress' },

    /* --- Brookside Show Unit (handover) --- */
    { id: 'LEH-330', p: 'brookside', ph: 'handover', type: 'snag', title: 'Snag list — four items outstanding', who: 'an', est: 8, logged: 6, start: '14 Sep', due: '19 Sep', state: 'progress' },
    { id: 'LEH-331', p: 'brookside', ph: 'handover', type: 'sitevisit', title: 'Client walkthrough', who: 'fa', est: 4, logged: 0, start: '26 Sep', due: '29 Sep', state: 'assigned' },
    { id: 'LEH-332', p: 'brookside', ph: 'handover', type: 'delivery', title: 'Final install of the loose furniture', who: 'mn', est: 5, logged: 5, start: '12 Sep', due: '16 Sep', state: 'done' },

    /* --- Business work: always `over`, tagged to a lead where it is BD --- */
    { id: 'LEH-430', p: null, ph: null, type: 'proposal', title: 'Proposal — Kilimani Co-work', who: 'mk', est: 8, logged: 5, start: '15 Sep', due: '19 Sep', state: 'progress', leadId: 'kilimani' },
    { id: 'LEH-431', p: null, ph: null, type: 'pitch', title: 'Pitch — Westlands Clinic', who: 'mk', est: 6, logged: 2, start: '16 Sep', due: '22 Sep', state: 'assigned', leadId: 'clinic' },
    { id: 'LEH-432', p: null, ph: null, type: 'admin', title: 'Timesheet chase and Monday returns', who: 'ev', est: 4, logged: 3, start: '14 Sep', due: '18 Sep', state: 'progress' },
    { id: 'LEH-433', p: null, ph: null, type: 'admin', title: 'Revit upgrade training session', est: null, state: 'intake' }
  ];

  return {
    PEOPLE: PEOPLE, LEAVE: LEAVE, WORK_TYPES: WORK_TYPES, BUCKETS: BUCKETS,
    FEE_TYPES: FEE_TYPES, PHASE_KEYS: PHASE_KEYS, PHASE_NAMES: PHASE_NAMES,
    PHASE_SERIES: PHASE_SERIES, PROJECTS: PROJECTS, STATES: STATES,
    TEMPLATES: TEMPLATES, TICKETS: TICKETS
  };
})();
