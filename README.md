# Lehem Interiors — work management

Six working screens of the interiors work-management tool, as a plain static
site. No build step, no framework, no dependencies.

```
lehem-erp/
├── index.html        Overview — the morning screen
├── projects.html     Projects — every job, its phases and where it sits now
├── desk.html         Service Desk — tickets, estimates, the gate, contracting
├── workload.html     Time & Workload — utilization and capacity
├── crm.html          CRM — leads funnel, pipeline and follow-ups
├── settings.html     Settings — the rate card, by role and by person
├── css/app.css       All styling for every screen
├── js/nav.js         Sidebar + mobile hamburger
├── js/desk-data.js   People, work types, phases, contracts, rates and tickets
├── js/plan.js        The planning spine — work items, time entries, buckets
├── js/crm-data.js    Leads and funnel stages
├── js/feed.js        The follow-up feed, on every screen
├── js/overview.js    Overview scorecards, the day roster and project status
├── js/projects.js    Project records, phase rails and filters
├── js/desk.js        Ticket listing, the four spec rules, capacity, contracting
├── js/workload.js    Workload data model, calculations and interactions
├── js/settings.js    The rate card
├── js/crm.js         Leads, funnel maths and pipeline interactions
└── assets/lehem-logo.png
```

## How an hour gets its meaning

The whole product turns on one chain, and nothing in it is typed twice:

```
contract a phase  →  work items, each with an owner, an estimate and a window
                  →  a ticket raised per item, carrying all three
                  →  the assignee moves it to In progress and the clock starts
                  →  the next state change stops it and writes the span
                  →  the hours land on the item, at that person's rate
```

Costing is the ledger side of the same chain. Every phase that has been
contracted leaves a plan behind, and that screen puts three numbers side by
side for each one: the fee the client agreed, the work planned against it at
the rates of whoever it was given to, and what the clock has earned so far.
Opening a plan shows the work items it was broken into. Nothing on it is
editable — a phase is costed when it is contracted, and the rates come from
Settings.

Contracting a phase happens on Costing, from the button beside the page
title: pick a project and a phase and its template becomes a set of work
items, each with an owner, an estimate, a window and a price. Raising them
writes the plan into the ledger below — which opens on it — and drops the
tickets onto the Service Desk, already assigned, with nothing left to fill
in on them. The prototype has no server, so tickets raised this way ride
along in the browser session; closing the tab restores the sample data.


Rates live in Settings — a default per role, agreed at onboarding, with an
override where a person is charged out differently. Nobody types a rate when
planning work: it follows whoever the item is given to, so moving a line to
somebody else reprices it. A rate changed in Settings applies to the next
phase planned, never to work already committed.

That makes the time bucket **derived**, which is the point. An hour is:

- **on a planned work item** — somebody is paying for it
- **FF&E coordination with no work item** — unpriced, and the firm does not
  sell the product, so nothing else covers it
- **overhead** — admin, pitching, or work never planned into a phase

Nobody picks the bucket, so the utilization figure cannot be talked up.

No invoice is produced anywhere in this tool and nothing is collected —
billing happens in the practice's own accounts. The prices here are what the
work is worth, used to decide what is being paid for and how far the phase
fee has been drawn down.

## The follow-up feed

Bottom right of every screen, a panel of things the signed-in person has to
chase. Nothing in it is authored: an item exists because a due date passed,
because a ticket is in intake with no owner, because the revision gate is shut
on it, or because a work item ran out of estimate. It opens once per browser
tab, collapses to a bell with a count, and gets out of the way as soon as the
page is touched. The rules live in `js/feed.js`.

The sample data is the week of 14–18 September 2026, read as at Friday the
18th.

## Running it locally

Any static server will do — the pages use relative paths, so opening
`index.html` from the filesystem works too, apart from the web fonts.

```bash
cd lehem-erp
python3 -m http.server 8000
# then open http://localhost:8000
```

## Hosting it

It is a folder of static files, so any of these work with zero configuration:

- **Netlify** — drag the folder onto app.netlify.com/drop
- **Vercel** — `vercel deploy` in this directory
- **Cloudflare Pages** — connect the repo, leave the build command empty,
  set the output directory to `/`
- **GitHub Pages** — push to a repo, enable Pages on the branch root
- **Any web server** — copy the folder into the web root

The only external request is the Google Fonts stylesheet for Archivo and
Instrument Serif. If the site must work offline or behind a firewall,
self-host those two families and swap the `<link>` in both HTML files.

## What's real and what isn't

Every figure in this site is **sample data written into the two JS files**.
The team is real — the eighteen names, job titles and disciplines come from
Lehem's own team page — but the hours, utilization percentages, realization
figures, project names, budgets and money totals are all invented for
demonstration.

Before showing this to anyone who might read it as fact, either say so, or
replace the data. The places to look:

| What | Where |
|---|---|
| People, disciplines, FTE, planned load | `js/workload.js` → `PEOPLE` |
| How each discipline's hours split across the four buckets | `js/workload.js` → `ROLE_MIX` |
| Expected band per discipline | `js/workload.js` → `ROLE_BAND` |
| Reporting periods, merchandise margin, multiplier | `js/workload.js` → `PERIODS` |
| Attention list on the Overview | `js/overview.js` → `ITEMS` |
| Projects, fee drawn vs. progress | `js/overview.js` → `PROJECTS` |
| Absorbed change-order causes | `js/overview.js` → `CAUSES` |

Both screens compute everything downstream from those constants, so changing
`PEOPLE` or `ROLE_MIX` updates the KPIs, the chart, the heatmap, the role
bands and the bench list together. When you wire this to a real backend, the
cleanest seam is to replace those constants with a `fetch()` and call
`render()` once the data arrives.

## Currency

Money is shown in US dollars throughout. If this is going in front of a
Kenyan audience, search for `$` in `js/overview.js` and `js/workload.js` —
the affected strings are the four figures in the money row, the product
profit per hour, and the "earned per $1 of pay" metric.

## Interactions that work

**Overview** — filter the attention list by kind; click any item to expand
what happens next; the team panel links through to the workload screen.

**Time & Workload** — switch reporting period (4 weeks / quarter / trailing
12); filter the whole page by discipline via the chips or by clicking a role
band; click a bucket in the legend to isolate it; click any person or
heatmap cell for their breakdown; toggle either chart to a table view;
switch the role bands between all earning hours and fee-billed hours only.
Hover any heatmap cell or bar segment for detail, and any dotted metric
label for its plain-English definition.

## Notes on the build

- Plain ES5-compatible JavaScript in IIFEs, no modules, no bundler.
- Each screen re-renders its `#app` container from state on every
  interaction. Fine at this data size; if the heatmap grows well past
  eighteen people, move to targeted DOM updates.
- Chart colours are a colourblind-checked categorical set; the capacity
  heatmap uses a single-hue sequential ramp, and over-capacity is flagged
  with a red dot plus a legend entry rather than by colour alone.
- Responsive at 1180px, 860px and 620px. The sidebar becomes a hamburger
  menu below 860px.
- Disabled nav items are real `disabled` buttons, so they are skipped by
  keyboard navigation.

## What the Service Desk enforces

The screen follows the data ingestion spec rather than decorating it.

The time bucket (`bill`, `fee`, `sourcing`, `over`) is derived at write time from
the ticket's work type and its phase's fee type, and shown as a numbered chain in
the detail panel. Nobody picks it, so the utilization figure on Time & Workload
cannot be talked up.

A ticket cannot leave intake until it has an assignee, an estimate and a date
window. The estimate is the forward capacity allocation — it is what the capacity
rail is built from — so a ticket without one carries no load and says so.

A revision ticket on a phase that has used its revision allowance cannot be
assigned until someone records a decision: raise a change order, or absorb it
with one of four reason codes. Its row is locked until they do.

Opening a phase spawns its standard ticket set with an assignee and an estimate
suggested for each — the assignee picked from who can do that kind of work and
who has most room that week.

## Sample data

Every project, ticket, lead, estimate and figure in these screens is invented.
The eighteen people are the real Lehem team, so nothing here should be presented
as a measurement of anyone's actual work. Replace `js/desk-data.js`, and the data
arrays at the top of each of the other `js/` files, to point at real records.
