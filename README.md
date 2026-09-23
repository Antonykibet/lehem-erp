# Lehem Interiors — operations dashboard

Two working screens of the interiors ERP, as a plain static site. No build step,
no framework, no dependencies.

```
lehem-erp/
├── index.html        Overview — the morning screen
├── workload.html     Time & Workload — utilization and capacity
├── css/app.css       All styling for both screens
├── js/nav.js         Sidebar + mobile hamburger
├── js/overview.js    Overview data, rendering and interactions
├── js/workload.js    Workload data model, calculations and interactions
└── assets/lehem-logo.png
```

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
