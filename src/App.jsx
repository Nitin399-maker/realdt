import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_TYPES = ["Office", "Multifamily", "Industrial", "Retail", "Data Center", "Mixed-Use", "Life Science", "Hotel"];
const STRATEGIES = ["Core", "Core-Plus", "Value-Add", "Opportunistic"];
const CITIES = [
  ["New York, NY", "Boston, MA", "Washington, DC", "Philadelphia, PA", "Miami, FL"],
  ["Chicago, IL", "Dallas, TX", "Houston, TX", "Atlanta, GA", "Charlotte, NC"],
  ["Los Angeles, CA", "San Francisco, CA", "Seattle, WA", "Denver, CO", "Phoenix, AZ"],
  ["Austin, TX", "Nashville, TN", "Minneapolis, MN", "Detroit, MI", "Portland, OR"],
  ["Raleigh, NC", "Salt Lake City, UT", "San Diego, CA", "Las Vegas, NV", "Tampa, FL"],
  ["Ashburn, VA", "Columbus, OH", "Kansas City, MO", "Indianapolis, IN", "Richmond, VA"],
];
const CITIES_FLAT = CITIES.flat();

const STATE_CONFIG = {
  Healthy:           { color: "#10b981", bg: "rgba(16,185,129,0.10)",  label: "Healthy"    },
  Watch:             { color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  label: "Watch"      },
  Stabilization:     { color: "#f97316", bg: "rgba(249,115,22,0.10)",  label: "Stabilization" },
  "At Risk":         { color: "#ef4444", bg: "rgba(239,68,68,0.10)",   label: "At Risk"    },
  "Operational Risk":{ color: "#991b1b", bg: "rgba(153,27,27,0.10)",   label: "Op. Risk"   },
};
const STATUS_COLORS = { green: "#10b981", amber: "#f59e0b", red: "#ef4444" };
const SENSITIVITY_CONFIG = {
  Public:       { color: "#10b981", bg: "rgba(16,185,129,0.09)"  },
  Internal:     { color: "#3b82f6", bg: "rgba(59,130,246,0.09)"  },
  Confidential: { color: "#f59e0b", bg: "rgba(245,158,11,0.09)"  },
  Restricted:   { color: "#ef4444", bg: "rgba(239,68,68,0.09)"   },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED PRNG (deterministic random)
// ─────────────────────────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY GENERATION (145 properties)
// ─────────────────────────────────────────────────────────────────────────────

const DETAIL_PROPS = [
  {
    id: "prop-001", name: "One Market Plaza",       location: "San Francisco, CA", type: "Office",      strategy: "Core",         nra: 1_650_000, units: null, yearBuilt: 1976, majorRenovation: 2019,
    topTenants: [{ name: "Salesforce", sf: 420000, pct: 25.5, expiry: "2029-06" }, { name: "Splunk", sf: 180000, pct: 10.9, expiry: "2026-03" }, { name: "Autodesk", sf: 140000, pct: 8.5, expiry: "2027-12" }],
    debtMaturity: 18, image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
  },
  {
    id: "prop-002", name: "Riverside Commons",      location: "Austin, TX",        type: "Multifamily", strategy: "Value-Add",    nra: null, units: 412, yearBuilt: 2005, majorRenovation: 2022,
    topTenants: null, debtMaturity: 36, image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  },
  {
    id: "prop-003", name: "Northgate Logistics Hub",location: "Chicago, IL",       type: "Industrial",  strategy: "Core-Plus",    nra: 820_000, units: null, yearBuilt: 2017, majorRenovation: null,
    topTenants: [{ name: "Amazon Logistics", sf: 410000, pct: 50.0, expiry: "2028-09" }, { name: "FedEx Ground", sf: 164000, pct: 20.0, expiry: "2027-06" }],
    debtMaturity: 54, image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  },
  {
    id: "prop-004", name: "Legacy Crossing Retail", location: "Dallas, TX",        type: "Retail",      strategy: "Opportunistic",nra: 340_000, units: null, yearBuilt: 2001, majorRenovation: 2018,
    topTenants: [{ name: "Whole Foods", sf: 45000, pct: 13.2, expiry: "2025-12" }, { name: "REI", sf: 22000, pct: 6.5, expiry: "2026-06" }, { name: "Regal Cinemas", sf: 55000, pct: 16.2, expiry: "2025-06" }],
    debtMaturity: 8, image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80",
  },
  {
    id: "prop-005", name: "Apex Data Center One",  location: "Ashburn, VA",       type: "Data Center", strategy: "Core",         nra: 185_000, units: null, yearBuilt: 2020, majorRenovation: null,
    topTenants: [{ name: "Microsoft Azure", sf: 92500, pct: 50.0, expiry: "2032-12" }, { name: "Oracle Cloud", sf: 37000, pct: 20.0, expiry: "2030-06" }],
    debtMaturity: 72, image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
  },
];

const PROP_NAMES_PREFIX = [
  "Metro", "Harbor", "Summit", "Park", "Lakeside", "Westgate", "Eastbridge", "Pinnacle",
  "Crown", "Meridian", "Horizon", "Capitol", "Liberty", "Pacific", "Atlantic", "Central",
  "Riverfront", "Midtown", "Uptown", "Downtown", "Gateway", "Heritage", "Legacy", "Apex",
  "Nexus", "Sterling", "Granite", "Ironwood", "Oakwood", "Cedarview",
];
const PROP_NAMES_SUFFIX = [
  "Tower", "Center", "Place", "Plaza", "Commons", "Exchange", "Hub", "Park",
  "Campus", "Square", "Point", "Court", "Crossing", "Landing", "Heights",
  "Way", "Terrace", "Logistics", "Corporate", "Business",
];

function generateProps() {
  const props = [...DETAIL_PROPS];
  const rng = seededRng(777);
  let idx = 6;
  while (props.length < 145) {
    const type = ASSET_TYPES[Math.floor(rng() * ASSET_TYPES.length)];
    const strategy = STRATEGIES[Math.floor(rng() * STRATEGIES.length)];
    const city = CITIES_FLAT[Math.floor(rng() * CITIES_FLAT.length)];
    const prefix = PROP_NAMES_PREFIX[Math.floor(rng() * PROP_NAMES_PREFIX.length)];
    const suffix = PROP_NAMES_SUFFIX[Math.floor(rng() * PROP_NAMES_SUFFIX.length)];
    const name = `${prefix} ${suffix}`;
    const yearBuilt = 1975 + Math.floor(rng() * 47);
    const hasReno = rng() > 0.5;
    const nra = type === "Multifamily" ? null : Math.round((80000 + rng() * 1500000) / 1000) * 1000;
    const units = type === "Multifamily" ? Math.round(80 + rng() * 600) : null;
    const debtMaturity = Math.round(3 + rng() * 84);
    props.push({
      id: `prop-${String(idx).padStart(3, "0")}`,
      name, location: city, type, strategy, nra, units,
      yearBuilt, majorRenovation: hasReno ? yearBuilt + 10 + Math.floor(rng() * 15) : null,
      topTenants: null, debtMaturity,
      image: null,
    });
    idx++;
  }
  return props;
}

const ALL_PROPERTIES = generateProps();

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT GENERATION (60 months per property)
// ─────────────────────────────────────────────────────────────────────────────

function generateSnapshots(propId, seed) {
  const rng = seededRng(Math.round(seed * 1e6));
  const now = new Date(2025, 1, 1);
  const snapshots = [];

  // Base values keyed by property id for the 5 detail props, else derive from seed
  const baseMap = {
    "prop-001": { occ: 87, noi: 42.1, dscr: 1.38 },
    "prop-002": { occ: 94, noi: 8.6,  dscr: 1.22 },
    "prop-003": { occ: 96, noi: 18.4, dscr: 1.61 },
    "prop-004": { occ: 72, noi: 6.2,  dscr: 1.09 },
    "prop-005": { occ: 98, noi: 32.8, dscr: 1.74 },
  };
  const base = baseMap[propId] || {
    occ:  65 + rng() * 30,
    noi:  1.5 + rng() * 60,
    dscr: 1.05 + rng() * 0.75,
  };

  let occ = base.occ, noi = base.noi, dscr = base.dscr;

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const j = (rng() - 0.5) * 2;
    const occV   = Math.min(99.5, Math.max(52, occ + j * 2.5 + (i < 6 ? -1.5 : 0)));
    const noiV   = Math.max(0.5, noi + j * 0.9 + (i < 12 ? -0.2 : 0));
    const dscrV  = Math.max(0.88, dscr + j * 0.05 + (i < 6 ? -0.04 : 0));
    const wob    = Math.round(6 + Math.abs(j) * 14);
    const capex  = Math.min(100, Math.max(40, 83 + j * 12));
    const energy = +(1.5 + j * 4).toFixed(1);
    const coll   = Math.min(99.9, Math.max(82, 95.5 + j * 2.2));
    const deliq  = Math.max(0.1, 100 - coll);
    const fc     = Math.min(99, Math.max(45, 76 + j * 9));
    // NEW KPIs
    const tiCost = +(28 + j * 18).toFixed(0);   // TI cost per SF
    const lcPct  = +(4.2 + j * 2.1).toFixed(1); // LC as % of base rent
    const freeRentMo = Math.max(0, Math.round(2 + j * 3)); // avg free rent months
    const netAbsorption = +(j * 12000).toFixed(0); // SF net absorption
    const avgRentPSF = +(32 + (noi / (base.nra || 200000)) * 1000 + j * 4).toFixed(2);
    const retentionRate = Math.min(98, Math.max(45, 72 + j * 12));
    const waleYrs    = +(3.2 + rng() * 5).toFixed(1); // WALE
    const noiMargin  = +((noiV / (noiV / 0.48)) * 100).toFixed(1);
    const ebitdaPxy  = +(noiV * 1.06).toFixed(2);
    const capRateIn  = +(4.5 + rng() * 2 + j * 0.3).toFixed(2);
    const irrTTM     = +(8 + j * 5).toFixed(1);
    const ltv        = +(45 + rng() * 25 + j * 3).toFixed(1);
    const equityMultiple = +(1.4 + rng() * 1.2).toFixed(2);

    snapshots.push({
      month: d.toISOString().slice(0, 7),
      // Original KPIs
      occupancy: +occV.toFixed(1),
      noiTTM: +noiV.toFixed(2),
      noiPlanPct: +(((noiV / noi) - 1) * 100 + j * 2).toFixed(1),
      dscr: +dscrV.toFixed(2),
      covenantHeadroom: +((dscrV - 1.15) * 100).toFixed(1),
      collections: +coll.toFixed(1),
      delinquency: +deliq.toFixed(1),
      workOrderBacklog: wob,
      workOrderAvgDays: +(3.5 + Math.abs(j) * 1.8).toFixed(1),
      capexOnTime: +capex.toFixed(0),
      energyCostYoY: energy,
      forecastConfidence: +fc.toFixed(0),
      // NEW KPIs
      tiCostPerSF: tiCost,
      lcPct,
      freeRentMonths: freeRentMo,
      netAbsorptionSF: +netAbsorption,
      avgRentPSF,
      tenantRetentionRate: +retentionRate.toFixed(1),
      wale: waleYrs,
      noiMarginPct: noiMargin,
      ebitdaProxy: ebitdaPxy,
      capRateInPlace: capRateIn,
      irrTTM,
      ltv,
      equityMultiple,
    });
  }
  return snapshots;
}

// Build snapshot map lazily
const _snapshotCache = {};
function getSnapshots(propId) {
  if (!_snapshotCache[propId]) {
    const idx = ALL_PROPERTIES.findIndex(p => p.id === propId);
    _snapshotCache[propId] = generateSnapshots(propId, (idx + 1) * 1.7 + 0.3);
  }
  return _snapshotCache[propId];
}
function getLatestSnapshot(propId) {
  const snaps = getSnapshots(propId);
  return snaps[snaps.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH MODEL
// ─────────────────────────────────────────────────────────────────────────────

function computeHealthState(snap) {
  let score = 100;
  const drivers = [];

  // Occupancy
  if (snap.occupancy < 72)       { score -= 28; drivers.push({ key: "occupancy",    label: "Occupancy critically low",          severity: "high",   impact: 28 }); }
  else if (snap.occupancy < 82)  { score -= 14; drivers.push({ key: "occupancy",    label: "Occupancy below target",            severity: "medium", impact: 14 }); }

  // DSCR / Covenant
  if (snap.dscr < 1.1)           { score -= 32; drivers.push({ key: "dscr",         label: "DSCR at covenant risk",             severity: "high",   impact: 32 }); }
  else if (snap.dscr < 1.25)     { score -= 16; drivers.push({ key: "dscr",         label: "DSCR tightening",                   severity: "medium", impact: 16 }); }

  // NOI vs plan
  if (snap.noiPlanPct < -12)     { score -= 18; drivers.push({ key: "noi",          label: "NOI materially below plan",         severity: "high",   impact: 18 }); }
  else if (snap.noiPlanPct < -5) { score -= 9;  drivers.push({ key: "noi",          label: "NOI trailing plan",                 severity: "medium", impact: 9  }); }

  // LTV
  if (snap.ltv > 72)             { score -= 12; drivers.push({ key: "ltv",          label: "LTV above threshold",               severity: "medium", impact: 12 }); }

  // Delinquency
  if (snap.delinquency > 10)     { score -= 12; drivers.push({ key: "collections",  label: "Delinquency elevated",              severity: "medium", impact: 12 }); }
  else if (snap.delinquency > 6) { score -= 6;  drivers.push({ key: "collections",  label: "Collections softening",             severity: "low",    impact: 6  }); }

  // Work order backlog
  if (snap.workOrderBacklog > 22){ score -= 8;  drivers.push({ key: "workorder",    label: "Work order backlog growing",        severity: "low",    impact: 8  }); }

  // Energy
  if (snap.energyCostYoY > 10)   { score -= 8;  drivers.push({ key: "energy",       label: "Energy cost spike",                 severity: "medium", impact: 8  }); }
  else if (snap.energyCostYoY > 6){ score -= 4; drivers.push({ key: "energy",       label: "Energy overage — monitor",          severity: "low",    impact: 4  }); }

  // Capex
  if (snap.capexOnTime < 65)     { score -= 10; drivers.push({ key: "capex",        label: "Capex schedule slippage",           severity: "medium", impact: 10 }); }
  else if (snap.capexOnTime < 78){ score -= 5;  drivers.push({ key: "capex",        label: "Capex mild delay risk",             severity: "low",    impact: 5  }); }

  // WALE
  if (snap.wale < 2.0)           { score -= 10; drivers.push({ key: "wale",         label: "WALE below 2 years — rollover risk",severity: "high",   impact: 10 }); }
  else if (snap.wale < 3.5)      { score -= 5;  drivers.push({ key: "wale",         label: "WALE moderate — monitor leasing",   severity: "low",    impact: 5  }); }

  // Tenant retention
  if (snap.tenantRetentionRate < 55){ score -= 8; drivers.push({ key: "retention", label: "Low tenant retention rate",          severity: "medium", impact: 8  }); }

  // IRR TTM
  if (snap.irrTTM < 4)           { score -= 8;  drivers.push({ key: "irr",          label: "IRR below hurdle rate",             severity: "medium", impact: 8  }); }

  score = Math.max(0, Math.min(100, score));
  drivers.sort((a, b) => b.impact - a.impact);
  const topDrivers = drivers.slice(0, 3);

  let state;
  if      (score >= 85) state = "Healthy";
  else if (score >= 70) state = "Watch";
  else if (score >= 55) state = "Stabilization";
  else if (score >= 35) state = "At Risk";
  else                  state = "Operational Risk";

  const actions = [];
  if (snap.occupancy < 82)       actions.push("Accelerate leasing outreach + TI approval");
  if (snap.dscr < 1.25)          actions.push("Initiate lender dialogue on covenant waiver");
  if (snap.noiPlanPct < -5)      actions.push("Review expense line items for quick savings");
  if (snap.capexOnTime < 78)     actions.push("Escalate capex PM to exec steering committee");
  if (snap.energyCostYoY > 6)    actions.push("Audit energy contracts and accelerate retrofit");
  if (snap.wale < 3.0)           actions.push("Engage anchor tenant on early renewal terms");
  if (snap.ltv > 70)             actions.push("Explore partial paydown to manage LTV");
  if (actions.length === 0)      actions.push("Maintain current operating plan", "Monitor covenant headroom monthly", "Review lease expirations quarterly");
  return { health_state: state, health_score: score, top_drivers: topDrivers, recommended_actions: actions.slice(0, 3) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

function computePortfolioSummary() {
  const props = ALL_PROPERTIES.map(p => {
    const snap = getLatestSnapshot(p.id);
    const health = computeHealthState(snap);
    return { ...p, snap, health };
  });
  const totalNOI    = props.reduce((s, p) => s + p.snap.noiTTM, 0);
  const totalNRA    = props.reduce((s, p) => s + (p.nra || (p.units || 0) * 900), 0);
  const avgOcc      = props.reduce((s, p) => s + p.snap.occupancy, 0) / props.length;
  const avgDSCR     = props.reduce((s, p) => s + p.snap.dscr, 0) / props.length;
  const avgWALE     = props.reduce((s, p) => s + p.snap.wale, 0) / props.length;
  const avgLTV      = props.reduce((s, p) => s + p.snap.ltv, 0) / props.length;
  const avgCapRate  = props.reduce((s, p) => s + p.snap.capRateInPlace, 0) / props.length;
  const avgIRR      = props.reduce((s, p) => s + p.snap.irrTTM, 0) / props.length;
  const avgRetention= props.reduce((s, p) => s + p.snap.tenantRetentionRate, 0) / props.length;
  const avgNOIMargin= props.reduce((s, p) => s + p.snap.noiMarginPct, 0) / props.length;
  const stateCounts = { Healthy: 0, Watch: 0, Stabilization: 0, "At Risk": 0, "Operational Risk": 0 };
  props.forEach(p => stateCounts[p.health.health_state]++);

  // Risk drivers — computed from portfolio data, sorted by impact score
  const riskDrivers = buildRiskDrivers(props);

  return { props, totalNOI, totalNRA, avgOcc, avgDSCR, avgWALE, avgLTV, avgCapRate, avgIRR, avgRetention, avgNOIMargin, stateCounts, riskDrivers };
}

function buildRiskDrivers(props) {
  const drivers = [
    {
      label: "Lease rollover concentration",
      key: "wale",
      affected: props.filter(p => p.snap.wale < 3.5).length,
      severity: "high",
      description: "WALE < 3.5 years across assets",
      impactScore: 0,
    },
    {
      label: "DSCR / Covenant headroom tightening",
      key: "dscr",
      affected: props.filter(p => p.snap.dscr < 1.3).length,
      severity: "high",
      description: "DSCR below 1.30x watch threshold",
      impactScore: 0,
    },
    {
      label: "NOI underperformance vs plan",
      key: "noi",
      affected: props.filter(p => p.snap.noiPlanPct < -5).length,
      severity: "high",
      description: "NOI trailing budget by >5%",
      impactScore: 0,
    },
    {
      label: "Occupancy below target",
      key: "occupancy",
      affected: props.filter(p => p.snap.occupancy < 85).length,
      severity: "medium",
      description: "Occupancy below 85% threshold",
      impactScore: 0,
    },
    {
      label: "LTV above policy threshold",
      key: "ltv",
      affected: props.filter(p => p.snap.ltv > 68).length,
      severity: "medium",
      description: "LTV > 68% — refi risk elevated",
      impactScore: 0,
    },
    {
      label: "Capex schedule slippage",
      key: "capex",
      affected: props.filter(p => p.snap.capexOnTime < 78).length,
      severity: "medium",
      description: "Capex on-time rate < 78%",
      impactScore: 0,
    },
    {
      label: "Energy cost overruns",
      key: "energy",
      affected: props.filter(p => p.snap.energyCostYoY > 7).length,
      severity: "low",
      description: "Energy cost YoY > 7%",
      impactScore: 0,
    },
    {
      label: "Delinquency / collections risk",
      key: "collections",
      affected: props.filter(p => p.snap.delinquency > 6).length,
      severity: "low",
      description: "Delinquency > 6%",
      impactScore: 0,
    },
    {
      label: "Low tenant retention",
      key: "retention",
      affected: props.filter(p => p.snap.tenantRetentionRate < 65).length,
      severity: "low",
      description: "Retention rate < 65%",
      impactScore: 0,
    },
    {
      label: "IRR below hurdle rate",
      key: "irr",
      affected: props.filter(p => p.snap.irrTTM < 6).length,
      severity: "medium",
      description: "Trailing 12-mo IRR below 6% hurdle",
      impactScore: 0,
    },
  ];

  // Compute impact score: severity weight × affected count × portfolio share
  const severityWeight = { high: 3, medium: 2, low: 1 };
  const n = props.length;
  drivers.forEach(d => {
    d.impactScore = severityWeight[d.severity] * d.affected * (d.affected / n) * 100;
  });
  // Sort descending by impactScore
  drivers.sort((a, b) => b.impactScore - a.impactScore);
  return drivers;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────────────────────────────────────

function deriveAlerts(props) {
  const alerts = [];
  props.forEach(p => {
    const snap = p.snap;
    const h = p.health;
    const prev = getSnapshots(p.id).slice(-2)[0];
    if (snap.dscr < 1.15) alerts.push({ severity: "Material", prop: p, driver: "DSCR near breach",        whyNow: `DSCR ${snap.dscr.toFixed(2)}x vs 1.15x covenant`, horizon: "Now",     action: "Lender dialogue immediately", ts: new Date().toISOString() });
    else if (snap.dscr < 1.25) alerts.push({ severity: "Watch",    prop: p, driver: "DSCR tightening",         whyNow: `Dropped ${Math.abs(((snap.dscr - (prev?.dscr || snap.dscr)) * 100)).toFixed(0)}bps MoM`, horizon: "30 days", action: "Review refi options",         ts: new Date().toISOString() });
    if (snap.occupancy < 75)   alerts.push({ severity: "Material", prop: p, driver: "Occupancy critically low", whyNow: `${snap.occupancy}% — 3mo trend -220bps`,         horizon: "Now",     action: "Emergency leasing task force", ts: new Date().toISOString() });
    else if (snap.occupancy < 84) alerts.push({ severity: "Watch", prop: p, driver: "Occupancy below target",   whyNow: `${snap.occupancy}% vs 85% target`,               horizon: "30 days", action: "Increase TI budget",           ts: new Date().toISOString() });
    if (snap.noiPlanPct < -10)  alerts.push({ severity: "Material", prop: p, driver: "NOI underperformance",    whyNow: `${snap.noiPlanPct.toFixed(1)}% vs plan YTD`,      horizon: "Now",     action: "Expense review + reforecast",  ts: new Date().toISOString() });
    if (p.debtMaturity <= 10)   alerts.push({ severity: "Watch",    prop: p, driver: "Debt maturity imminent",  whyNow: `${p.debtMaturity}mo to maturity`,                 horizon: "90 days", action: "Initiate refi process",        ts: new Date().toISOString() });
    if (snap.wale < 1.8)        alerts.push({ severity: "Material", prop: p, driver: "Critical rollover risk",  whyNow: `WALE ${snap.wale.toFixed(1)}yr — anchor lease expiring`, horizon: "30 days", action: "Engage tenant for early renewal", ts: new Date().toISOString() });
    if (snap.ltv > 72)          alerts.push({ severity: "Watch",    prop: p, driver: "LTV above policy",        whyNow: `LTV ${snap.ltv.toFixed(1)}% vs 70% policy`,       horizon: "90 days", action: "Explore partial paydown",      ts: new Date().toISOString() });
  });
  const order = { Material: 0, Watch: 1, Info: 2 };
  const hOrder = { Now: 0, "30 days": 1, "90 days": 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity] || hOrder[a.horizon] - hOrder[b.horizon]);
  return alerts.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE SYSTEMS & INGESTION
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEMS = [
  { id: "yardi",    name: "Yardi / PMS",          freq: "Daily",   category: "Property Mgmt", color: "#3b82f6" },
  { id: "gl",       name: "GL / ERP (Oracle)",     freq: "Monthly", category: "Financial",     color: "#8b5cf6" },
  { id: "forecast", name: "Forecasting (Argus)",   freq: "Weekly",  category: "Financial",     color: "#ec4899" },
  { id: "cmms",     name: "CMMS / BMS",            freq: "Daily",   category: "Operational",   color: "#f59e0b" },
  { id: "esg",      name: "ESG / Utilities",       freq: "Weekly",  category: "ESG",           color: "#10b981" },
  { id: "crm",      name: "Leasing CRM",           freq: "Daily",   category: "Leasing",       color: "#06b6d4" },
  { id: "docs",     name: "Document Repository",   freq: "Weekly",  category: "Legal",         color: "#6366f1" },
  { id: "market",   name: "Market Data (CoStar)",  freq: "Weekly",  category: "Market",        color: "#84cc16" },
];

const DATA_TYPES = [
  { type: "rent_roll",        label: "Rent roll update",         system: "yardi"    },
  { type: "gl_journal",       label: "GL journal entry",         system: "gl"       },
  { type: "meter_read",       label: "Utilities meter read",     system: "esg"      },
  { type: "work_order",       label: "Work order status",        system: "cmms"     },
  { type: "forecast_revision",label: "Forecast revision",        system: "forecast" },
  { type: "lease_clause",     label: "Lease clause extracted",   system: "docs"     },
  { type: "market_comp",      label: "Market comp update",       system: "market"   },
  { type: "occupancy",        label: "Occupancy updated",        system: "yardi"    },
];

function classifySensitivity(item) {
  if (["lease_clause", "lender_terms", "tenant_name"].includes(item.dataType)) return "Restricted";
  if (["gl_journal", "forecast_revision", "budget"].includes(item.dataType))  return "Confidential";
  if (["work_order", "meter_read", "rent_roll"].includes(item.dataType))       return "Internal";
  return "Public";
}

let _ingestItems = [];
let _systemStatus = {};

function seedSystems() {
  const rng = seededRng(999);
  SYSTEMS.forEach(s => {
    const ago = Math.floor(rng() * 120) * 60000;
    _systemStatus[s.id] = {
      lastRun: new Date(Date.now() - ago).toISOString(),
      status: rng() > 0.1 ? "success" : "warning",
      records: Math.floor(rng() * 2000) + 200,
      nextRun: new Date(Date.now() + (s.freq === "Daily" ? 86400000 : s.freq === "Weekly" ? 604800000 : 2592000000) - ago).toISOString(),
    };
  });
  // Seed only first 20 properties for ingest items (performance)
  ALL_PROPERTIES.slice(0, 20).forEach(p => {
    DATA_TYPES.forEach((dt, i) => {
      const rng2 = seededRng(p.id.charCodeAt(5) * 100 + i * 17);
      const item = {
        id: `${p.id}-${dt.type}-init-${i}`,
        ts: new Date(Date.now() - Math.floor(rng2() * 86400000 * 3)).toISOString(),
        property: p.name, propId: p.id, dataType: dt.type, label: dt.label, system: dt.system,
      };
      item.sensitivity = classifySensitivity(item);
      _ingestItems.push(item);
    });
  });
  _ingestItems.sort((a, b) => b.ts.localeCompare(a.ts));
}
seedSystems();

function getIngestItems() { return _ingestItems; }

function ingestBatchRun(onProgress) {
  return new Promise(resolve => {
    let step = 0;
    const steps = [
      "Connecting to source systems…", "Ingesting Yardi PMS…", "Pulling GL journals…",
      "Processing ESG meters…", "Running CMMS sync…", "Updating Argus forecasts…",
      "Syncing CRM leasing activity…", "Computing health states (145 assets)…", "Refreshing alerts queue…", "Complete ✓",
    ];
    const interval = setInterval(() => {
      onProgress(steps[step], Math.round((step / (steps.length - 1)) * 100));
      step++;
      if (step >= steps.length) {
        clearInterval(interval);
        SYSTEMS.forEach(s => {
          _systemStatus[s.id] = { lastRun: new Date().toISOString(), status: "success", records: Math.floor(Math.random() * 2000) + 200, nextRun: new Date(Date.now() + (s.freq === "Daily" ? 86400000 : s.freq === "Weekly" ? 604800000 : 2592000000)).toISOString() };
        });
        ALL_PROPERTIES.slice(0, 10).forEach(p => {
          const dt = DATA_TYPES[Math.floor(Math.random() * DATA_TYPES.length)];
          const item = { id: `${p.id}-${dt.type}-batch-${Date.now()}`, ts: new Date().toISOString(), property: p.name, propId: p.id, dataType: dt.type, label: dt.label, system: dt.system };
          item.sensitivity = classifySensitivity(item);
          _ingestItems.unshift(item);
        });
        resolve();
      }
    }, 320);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE EVENTS (detail props only)
// ─────────────────────────────────────────────────────────────────────────────

const TIMELINE_EVENTS = {
  "prop-001": [
    { month: "2020-03", type: "state",       label: "Entered Watch",                      color: "#f59e0b", icon: "⚠" },
    { month: "2020-09", type: "operational", label: "HVAC System Failure — Zone 3",       color: "#ef4444", icon: "⚙" },
    { month: "2021-02", type: "leasing",     label: "Salesforce Expansion +120k SF",      color: "#3b82f6", icon: "📋"},
    { month: "2021-06", type: "state",       label: "Recovered to Healthy",               color: "#10b981", icon: "✓" },
    { month: "2022-04", type: "capex",       label: "Lobby Renovation Complete $4.2M",    color: "#8b5cf6", icon: "🔨"},
    { month: "2023-03", type: "financial",   label: "Q1 GL Close — Rent abatement adj.",  color: "#6366f1", icon: "$" },
    { month: "2024-01", type: "leasing",     label: "Splunk renewal risk flagged",         color: "#f59e0b", icon: "⚠" },
    { month: "2024-06", type: "state",       label: "Entered Watch — Rollover risk",      color: "#f59e0b", icon: "⚠" },
    { month: "2025-01", type: "capex",       label: "Roof replacement — In progress",     color: "#6366f1", icon: "🔨"},
  ],
  "prop-002": [
    { month: "2020-06", type: "capex",       label: "Unit renovation program started",    color: "#8b5cf6", icon: "🔨"},
    { month: "2021-04", type: "state",       label: "Entered Stabilization",              color: "#f59e0b", icon: "⚠" },
    { month: "2021-10", type: "financial",   label: "Refi completed — Rate locked 3.8%", color: "#10b981", icon: "$" },
    { month: "2022-03", type: "state",       label: "Recovered to Healthy",              color: "#10b981", icon: "✓" },
    { month: "2023-07", type: "leasing",     label: "Occupancy peak 97.2%",              color: "#3b82f6", icon: "📋"},
    { month: "2024-08", type: "operational", label: "SLA incident — Pool closure 18d",   color: "#ef4444", icon: "⚙" },
    { month: "2025-01", type: "capex",       label: "Value-add Phase 2 approved",         color: "#6366f1", icon: "🔨"},
  ],
  "prop-003": [
    { month: "2020-01", type: "leasing",     label: "Amazon Lease signed 10yr NNN",       color: "#10b981", icon: "📋"},
    { month: "2021-05", type: "capex",       label: "Dock expansion — 20 new doors",      color: "#8b5cf6", icon: "🔨"},
    { month: "2022-02", type: "financial",   label: "NOI exceeded plan by 8.2%",          color: "#10b981", icon: "$" },
    { month: "2023-09", type: "operational", label: "Sprinkler upgrade complete",          color: "#6366f1", icon: "⚙" },
    { month: "2024-04", type: "leasing",     label: "FedEx early renewal option exercised",color: "#3b82f6", icon: "📋"},
    { month: "2025-01", type: "state",       label: "Maintained Healthy",                 color: "#10b981", icon: "✓" },
  ],
  "prop-004": [
    { month: "2020-04", type: "leasing",     label: "JC Penney vacated 38k SF",           color: "#ef4444", icon: "⚠" },
    { month: "2020-07", type: "state",       label: "Entered At Risk",                    color: "#ef4444", icon: "⚠" },
    { month: "2021-01", type: "financial",   label: "Loan covenant waiver granted",        color: "#f59e0b", icon: "$" },
    { month: "2021-08", type: "leasing",     label: "Whole Foods lease — 10yr",           color: "#10b981", icon: "📋"},
    { month: "2022-03", type: "state",       label: "Moved to Stabilization",             color: "#f59e0b", icon: "⚠" },
    { month: "2022-11", type: "capex",       label: "Common area regen $2.8M",            color: "#8b5cf6", icon: "🔨"},
    { month: "2023-06", type: "state",       label: "Watch — Regal expiry 2025",          color: "#f59e0b", icon: "⚠" },
    { month: "2025-01", type: "state",       label: "At Risk — Maturity + vacancies",     color: "#ef4444", icon: "⚠" },
  ],
  "prop-005": [
    { month: "2020-03", type: "leasing",     label: "Microsoft Azure lease signed 12yr",  color: "#10b981", icon: "📋"},
    { month: "2020-09", type: "capex",       label: "Phase 1 Fit-out Complete",            color: "#8b5cf6", icon: "🔨"},
    { month: "2021-06", type: "leasing",     label: "Oracle Cloud lease signed 10yr",     color: "#10b981", icon: "📋"},
    { month: "2022-01", type: "state",       label: "Healthy — 98% leased",               color: "#10b981", icon: "✓" },
    { month: "2023-04", type: "capex",       label: "Generator redundancy upgrade",        color: "#6366f1", icon: "🔨"},
    { month: "2024-02", type: "financial",   label: "NOI +11% vs plan",                   color: "#10b981", icon: "$" },
    { month: "2025-01", type: "capex",       label: "Phase 2 capacity expansion approved", color: "#6366f1", icon: "🔨"},
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION ENGINE — DATA & FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// Extended per-property asset metadata for simulation
const ASSET_META = {
  "prop-001": { conditionScore: 62, leaseRollover12m: 18.4, debtRateType: "Fixed", debtRate: 4.25, capexProjects: [{ name: "Roof Replacement", cost: 3800000, status: "In Progress", pctComplete: 22 }], auditIds: ["AUD-001-PMS","AUD-001-GL","AUD-001-ESG"] },
  "prop-002": { conditionScore: 78, leaseRollover12m: 8.2,  debtRateType: "Fixed", debtRate: 3.80, capexProjects: [{ name: "Unit Renovation Ph2", cost: 1200000, status: "Approved", pctComplete: 0 }], auditIds: ["AUD-002-PMS","AUD-002-GL"] },
  "prop-003": { conditionScore: 88, leaseRollover12m: 4.1,  debtRateType: "Floating", debtRate: 5.15, capexProjects: [{ name: "Dock Expansion Ph2", cost: 2200000, status: "Planning", pctComplete: 0 }], auditIds: ["AUD-003-PMS","AUD-003-ESG"] },
  "prop-004": { conditionScore: 44, leaseRollover12m: 29.4, debtRateType: "Fixed", debtRate: 5.60, capexProjects: [{ name: "Roof Replacement", cost: 2100000, status: "Planned", pctComplete: 0 }, { name: "HVAC Upgrade", cost: 850000, status: "Planned", pctComplete: 0 }], auditIds: ["AUD-004-PMS","AUD-004-GL","AUD-004-DOCS"] },
  "prop-005": { conditionScore: 94, leaseRollover12m: 0.0,  debtRateType: "Fixed", debtRate: 3.95, capexProjects: [{ name: "Phase 2 Expansion", cost: 28000000, status: "Approved", pctComplete: 0 }], auditIds: ["AUD-005-PMS","AUD-005-ESG"] },
};
function getAssetMeta(propId) {
  return ASSET_META[propId] || { conditionScore: 70, leaseRollover12m: 12, debtRateType: "Fixed", debtRate: 4.8, capexProjects: [{ name: "General Maintenance", cost: 500000, status: "Planned", pctComplete: 0 }], auditIds: [] };
}

// Source freshness per property (returns feed -> lastRefresh map)
function getSourceFreshness(propId) {
  return {
    PMS:      _systemStatus.yardi?.lastRun    || new Date(Date.now() - 3600000).toISOString(),
    GL:       _systemStatus.gl?.lastRun       || new Date(Date.now() - 86400000 * 2).toISOString(),
    Forecast: _systemStatus.forecast?.lastRun || new Date(Date.now() - 86400000 * 5).toISOString(),
    ESG:      _systemStatus.esg?.lastRun      || new Date(Date.now() - 86400000 * 3).toISOString(),
    CMMS:     _systemStatus.cmms?.lastRun     || new Date(Date.now() - 7200000).toISOString(),
    CRM:      _systemStatus.crm?.lastRun      || new Date(Date.now() - 86400000).toISOString(),
  };
}

// Confidence = f(freshness, missing feeds)
function computeConfidence(propId) {
  const freshness = getSourceFreshness(propId);
  const now = Date.now();
  let score = 100;
  const issues = [];
  Object.entries(freshness).forEach(([feed, ts]) => {
    const ageHrs = (now - new Date(ts).getTime()) / 3600000;
    if (ageHrs > 168) { score -= 20; issues.push(`${feed} stale (${Math.floor(ageHrs/24)}d)`); }
    else if (ageHrs > 48) { score -= 8; issues.push(`${feed} aging (${Math.round(ageHrs)}h)`); }
  });
  const level = score >= 85 ? "High" : score >= 65 ? "Medium" : "Low";
  const color = score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444";
  return { score, level, color, issues, freshness };
}

// Scenario library definition
const SCENARIO_LIBRARY = [
  // Featured
  { id: "capex_delay",     category: "featured", label: "Capex Delay: Roof Replacement",      desc: "Model the impact of deferring planned roof replacement work, including R&M uplift and potential tenant disruption.",    timeToImpact: "short",  cost: "$$$", riskReduction: "Low",  deps: ["Procurement","Lender"],   icon: "🔨", color: "#f97316" },
  { id: "accel_capex",     category: "featured", label: "Accelerate Capex Completion",         desc: "Fast-track current capex program through overtime spend to recapture occupancy uplift and reduce condition risk sooner.", timeToImpact: "medium", cost: "$$$", riskReduction: "High", deps: ["Procurement"],            icon: "⚡", color: "#3b82f6" },
  { id: "lease_restructure",category:"featured", label: "Lease Restructure (Renewals Push)",   desc: "Proactively restructure expiring leases with concessions to improve renewal probability and reduce rollover risk.",       timeToImpact: "medium", cost: "$$",  riskReduction: "High", deps: ["Tenant","Legal"],          icon: "📋", color: "#8b5cf6" },
  { id: "refinance_early", category: "featured", label: "Refinance Early",                     desc: "Retire existing debt ahead of maturity to lock in current rate environment and improve covenant headroom.",              timeToImpact: "medium", cost: "$$",  riskReduction: "Med",  deps: ["Lender","Treasury"],       icon: "🏦", color: "#06b6d4" },
  { id: "energy_retrofit", category: "featured", label: "Energy Retrofit",                     desc: "Execute energy efficiency upgrades (lighting, HVAC controls, metering) to reduce utility expense and improve ESG score.", timeToImpact: "long",   cost: "$$",  riskReduction: "Med",  deps: ["Procurement","ESG"],       icon: "♻", color: "#10b981" },
  // Capex & Condition
  { id: "hvac_upgrade",    category: "capex",    label: "HVAC System Upgrade",                 desc: "Replace aging HVAC infrastructure to reduce failure risk and R&M costs.",                                                 timeToImpact: "medium", cost: "$$$", riskReduction: "High", deps: ["Procurement"],            icon: "🌡", color: "#f97316" },
  { id: "facade_repair",   category: "capex",    label: "Façade / Envelope Repair",            desc: "Address deferred façade maintenance to prevent water ingress and tenant disruption.",                                     timeToImpact: "short",  cost: "$$",  riskReduction: "Med",  deps: ["Procurement"],            icon: "🏗", color: "#f59e0b" },
  // Leasing & Revenue
  { id: "accel_leasing",   category: "leasing",  label: "Accelerate Leasing Incentives",       desc: "Increase TI and LC budget to compress vacant period and stabilize occupancy faster.",                                    timeToImpact: "short",  cost: "$$",  riskReduction: "Med",  deps: ["Tenant","Finance"],       icon: "🎯", color: "#ec4899" },
  { id: "anchor_expansion",category: "leasing",  label: "Anchor Tenant Expansion",             desc: "Negotiate expansion option with anchor tenant to absorb vacant SF and extend WALE.",                                     timeToImpact: "medium", cost: "$",   riskReduction: "High", deps: ["Tenant"],                  icon: "📈", color: "#10b981" },
  // Financing
  { id: "partial_paydown", category: "financing",label: "Partial Debt Paydown",                desc: "Use operating cash flow or asset sale proceeds to pay down debt and reduce LTV.",                                        timeToImpact: "short",  cost: "$",   riskReduction: "Med",  deps: ["Lender","Treasury"],       icon: "💳", color: "#06b6d4" },
  { id: "interest_hedge",  category: "financing",label: "Interest Rate Hedge",                 desc: "Add cap or swap to floating rate exposure to reduce DSCR volatility.",                                                   timeToImpact: "short",  cost: "$",   riskReduction: "Med",  deps: ["Treasury","Lender"],       icon: "🛡", color: "#6366f1" },
  // Operations & ESG
  { id: "property_mgmt",   category: "ops",      label: "Property Management Upgrade",         desc: "Upgrade PM firm or add asset manager resource to reduce WO backlog and improve tenant satisfaction.",                   timeToImpact: "medium", cost: "$",   riskReduction: "Med",  deps: ["HR","Procurement"],        icon: "👷", color: "#84cc16" },
  { id: "esg_certification",category:"ops",      label: "ESG Certification (LEED/ENERGY STAR)","desc": "Pursue certification to improve market positioning, reduce energy costs, and satisfy ESG reporting mandates.",          timeToImpact: "long",   cost: "$$",  riskReduction: "Med",  deps: ["ESG","Legal"],             icon: "🌿", color: "#10b981" },
  // Stress Tests
  { id: "major_vacancy",   category: "stress",   label: "Stress: Major Tenant Vacates",        desc: "Model the impact of losing the largest tenant at lease expiry with no immediate backfill.",                              timeToImpact: "short",  cost: "$",   riskReduction: "Low",  deps: [],                          icon: "⚠", color: "#ef4444" },
  { id: "rate_spike",      category: "stress",   label: "Stress: Rate Spike +150bps",          desc: "Stress test floating-rate debt with a 150bps rate increase and its impact on DSCR and covenant.",                       timeToImpact: "short",  cost: "$",   riskReduction: "Low",  deps: ["Treasury"],                icon: "📉", color: "#ef4444" },
  { id: "recession_noi",   category: "stress",   label: "Stress: Recession — NOI -20%",        desc: "Apply a severe downside scenario of 20% NOI decline across base rent and recoveries.",                                  timeToImpact: "short",  cost: "$",   riskReduction: "Low",  deps: [],                          icon: "🌩", color: "#991b1b" },
];

const SIM_CATEGORIES = [
  { id: "featured",  label: "⭐ Featured",        desc: "Most-used scenarios" },
  { id: "capex",     label: "🔨 Capex & Condition", desc: "Capital investment" },
  { id: "leasing",   label: "📋 Leasing & Revenue", desc: "Occupancy & rent" },
  { id: "financing", label: "🏦 Financing",        desc: "Debt & capital structure" },
  { id: "ops",       label: "⚙ Operations & ESG",  desc: "Operating efficiency" },
  { id: "stress",    label: "⚠ Stress Tests",      desc: "Downside scenarios" },
];

// Default inputs per scenario type
function getDefaultInputs(scenarioId, snap, meta) {
  const noi = snap.noiTTM * 1e6;
  const capexProj = meta.capexProjects[0] || { cost: 2000000 };
  switch (scenarioId) {
    case "capex_delay": return { time_horizon_months: 24, start_month: 1, capex_project_cost: capexProj.cost, delay_months: 12, mitigation_cost_pm: 18000, disruption_level: "Medium", failure_prob_pct: Math.max(5, 100 - meta.conditionScore) };
    case "accel_capex": return { time_horizon_months: 24, start_month: 1, capex_project_cost: capexProj.cost, accel_months: 6, overtime_cost_pct: 18, occ_uplift_pct: 4.5 };
    case "lease_restructure": {
      // For distressed retail with high rollover (prop-004-like), use more aggressive defaults
      const isDistressedRetail = snap.occupancy < 80 && meta.leaseRollover12m > 20;
      return {
        time_horizon_months: 24, start_month: 1,
        top_n_leases: isDistressedRetail ? 5 : 3,
        renewal_prob_uplift_pct: isDistressedRetail ? 45 : 25,
        rent_concession_pct: isDistressedRetail ? 8 : 5,
        free_rent_months: isDistressedRetail ? 4 : 3,
        ti_psf: isDistressedRetail ? 60 : 45,
        term_extension_months: isDistressedRetail ? 48 : 36,
      };
    }
    case "refinance_early": return { time_horizon_months: 36, start_month: 3, new_rate_pct: Math.max(3.5, meta.debtRate - 0.75), refi_costs: noi * 0.015, term_years: 7, io_months: 12, hedge_enabled: false, hedge_cost: noi * 0.004 };
    case "energy_retrofit": return { time_horizon_months: 36, start_month: 2, retrofit_cost: noi * 0.04, energy_savings_pct: 22, impl_months: 8, rebates: noi * 0.005, mv_enabled: true };
    case "major_vacancy": return { time_horizon_months: 24, start_month: 1, vacancy_pct: meta.leaseRollover12m, backfill_months: 18 };
    case "rate_spike": return { time_horizon_months: 24, start_month: 1, rate_delta_bps: 150 };
    case "recession_noi": return { time_horizon_months: 36, start_month: 1, noi_decline_pct: 20 };
    default: return { time_horizon_months: 24, start_month: 1 };
  }
}

// ── Core simulation engine ──
function runScenario(snap, scenarioId, inputs, constraints, meta = {}) {
  const h = inputs.time_horizon_months || 24;
  const periods = [6, 12, 24, 36].filter(p => p <= h);
  const noi     = snap.noiTTM * 1e6;
  const occ     = snap.occupancy;
  const dscr    = snap.dscr;
  const ltv     = snap.ltv;
  const energy  = snap.energyCostYoY;

  let d = {};

  switch (scenarioId) {
    case "capex_delay": {
      const { delay_months, mitigation_cost_pm, failure_prob_pct, disruption_level } = inputs;
      const disruptionOccHit = disruption_level === "High" ? 5 : disruption_level === "Medium" ? 2.5 : 0.8;
      const mitigationCostTotal = mitigation_cost_pm * delay_months;
      const rmUplift = noi * 0.032 * (delay_months / 12);
      d = {
        noi12: -(mitigationCostTotal + rmUplift * 0.5),
        noi24: -(mitigationCostTotal + rmUplift),
        noi36: -(mitigationCostTotal * 1.2 + rmUplift * 1.5),
        occDelta12: -disruptionOccHit * 0.5,
        occDelta24: -disruptionOccHit,
        occDelta36: -disruptionOccHit * 1.2,
        dscrDelta12: -0.04, dscrDelta24: -0.07, dscrDelta36: -0.09,
        breachProb12: snap.dscr < 1.25 ? 32 : 12,
        breachProb24: snap.dscr < 1.25 ? 45 : 20,
        energyDelta: 0, ltvDelta: 0,
        drivers: [`R&M and mitigation costs totaling ${fmtCurrency(mitigationCostTotal + rmUplift)}`, `Occupancy risk of -${disruptionOccHit.toFixed(1)}pp from tenant disruption`, `Increased failure probability to ${failure_prob_pct + 15}% without intervention`],
        risksChanged: [{ risk: "Operational Failure", lhBefore: "Medium", lhAfter: "High", impBefore: "Medium", impAfter: "High", note: "Deferred maintenance compounds condition risk" }, { risk: "Covenant Breach", lhBefore: snap.dscr < 1.25 ? "Medium" : "Low", lhAfter: snap.dscr < 1.25 ? "High" : "Medium", impBefore: "High", impAfter: "High", note: "NOI erosion from mitigation costs" }],
      };
      break;
    }
    case "accel_capex": {
      const { capex_project_cost, accel_months, overtime_cost_pct, occ_uplift_pct } = inputs;
      const overtimeCost = capex_project_cost * (overtime_cost_pct / 100);
      const noiUplift12 = noi * (occ_uplift_pct / 100) * 0.5;
      const noiUplift24 = noi * (occ_uplift_pct / 100);
      d = {
        noi12: -overtimeCost + noiUplift12,
        noi24: noiUplift24,
        noi36: noiUplift24 * 1.1,
        occDelta12: occ_uplift_pct * 0.4,
        occDelta24: occ_uplift_pct * 0.85,
        occDelta36: occ_uplift_pct,
        dscrDelta12: 0.02, dscrDelta24: 0.06, dscrDelta36: 0.09,
        breachProb12: Math.max(2, (snap.dscr < 1.25 ? 28 : 8) - 8),
        breachProb24: Math.max(2, (snap.dscr < 1.25 ? 28 : 8) - 16),
        energyDelta: -1.2, ltvDelta: -1.5,
        drivers: [`Overtime premium of ${fmtCurrency(overtimeCost)} absorbed upfront`, `NOI uplift of ${fmtCurrency(noiUplift24)} at 24mo from occupancy recovery`, `Condition score improvement reduces operational risk probability`],
        risksChanged: [{ risk: "Operational Failure", lhBefore: "Medium", lhAfter: "Low", impBefore: "High", impAfter: "Medium", note: "Capex completion de-risks physical condition" }, { risk: "Tenant Churn", lhBefore: "Medium", lhAfter: "Low", impBefore: "High", impAfter: "Low", note: "Improved space quality increases retention probability" }],
      };
      break;
    }
    case "lease_restructure": {
      const { renewal_prob_uplift_pct, rent_concession_pct, free_rent_months, ti_psf, term_extension_months } = inputs;
      const nra = snap.netAbsorptionSF ? Math.abs(snap.netAbsorptionSF) : 200000;
      const tiCostTotal = ti_psf * nra * 0.15;
      const rentHit = noi * (rent_concession_pct / 100) * 0.4;
      const freeRentCost = noi * (free_rent_months / 120);
      // For high rollover / distressed assets the stabilisation uplift is much more impactful
      const rolloverFactor = meta?.leaseRollover12m > 20 ? 0.55 : 0.3;
      const stabilizationUplift = noi * (renewal_prob_uplift_pct / 100) * rolloverFactor;
      const occUplift24 = meta?.leaseRollover12m > 20
        ? Math.min(18, renewal_prob_uplift_pct * 0.35) // stronger occ recovery for distressed retail
        : renewal_prob_uplift_pct * 0.12;
      const dscrImpact24 = meta?.leaseRollover12m > 20 ? 0.09 : 0.04;
      const breachAfter = meta?.leaseRollover12m > 20
        ? Math.max(4, (snap.dscr < 1.25 ? 18 : 7))   // materially lower breach risk post-restructure
        : Math.max(3, (snap.dscr < 1.25 ? 22 : 7));
      d = {
        noi12: -(rentHit + freeRentCost + tiCostTotal * 0.5),
        noi24: stabilizationUplift - rentHit * 0.3,
        noi36: stabilizationUplift * 1.8,
        occDelta12: meta?.leaseRollover12m > 20 ? 3.5 : 1.2,
        occDelta24: occUplift24,
        occDelta36: occUplift24 * 1.4,
        dscrDelta12: -0.03, dscrDelta24: dscrImpact24, dscrDelta36: dscrImpact24 * 2,
        breachProb12: snap.dscr < 1.25 ? 30 : 10,
        breachProb24: breachAfter,
        energyDelta: 0, ltvDelta: -0.5,
        drivers: [
          `Near-term NOI headwind of ${fmtCurrency(rentHit + freeRentCost)} from concessions and TI`,
          `Renewal probability uplift of +${renewal_prob_uplift_pct}% reduces rollover exposure — ${fmtCurrency(stabilizationUplift)} stabilisation gain at 24mo`,
          `WALE extension by ${(term_extension_months/12).toFixed(1)}yr and occupancy recovery of +${occUplift24.toFixed(1)}pp materially improves covenant headroom`,
        ],
        risksChanged: [{ risk: "Tenant Churn", lhBefore: "High", lhAfter: "Low", impBefore: "High", impAfter: "Low", note: "Renewal probability materially improved" }, { risk: "Covenant Breach", lhBefore: snap.dscr < 1.25 ? "High" : "Medium", lhAfter: "Medium", impBefore: "High", impAfter: "Medium", note: "Short-term NOI pressure but stabilizing" }],
      };
      break;
    }
    case "refinance_early": {
      const { new_rate_pct, refi_costs, io_months, term_years, hedge_enabled, hedge_cost } = inputs;
      const meta = getAssetMeta("prop-001"); // will be overridden by caller
      const rateDelta = new_rate_pct - snap.dscr * 0.8; // proxy
      const dscrUplift = Math.max(0.02, 0.12 - Math.abs(rateDelta) * 0.02);
      const hedgeCostActual = hedge_enabled ? hedge_cost : 0;
      d = {
        noi12: -(refi_costs + hedgeCostActual),
        noi24: noi * 0.018,
        noi36: noi * 0.038,
        occDelta12: 0, occDelta24: 0.5, occDelta36: 0.8,
        dscrDelta12: dscrUplift * 0.5, dscrDelta24: dscrUplift, dscrDelta36: dscrUplift * 1.1,
        breachProb12: Math.max(2, (snap.dscr < 1.25 ? 28 : 8) - 12),
        breachProb24: Math.max(1, (snap.dscr < 1.25 ? 28 : 8) - 22),
        energyDelta: 0, ltvDelta: -1.2,
        drivers: [`Refi costs of ${fmtCurrency(refi_costs + hedgeCostActual)} absorbed in Year 1`, `DSCR improvement of +${dscrUplift.toFixed(2)}x from improved debt terms`, `${io_months}mo interest-only period provides near-term cashflow relief`],
        risksChanged: [{ risk: "Covenant Breach", lhBefore: snap.dscr < 1.25 ? "High" : "Medium", lhAfter: "Low", impBefore: "High", impAfter: "Low", note: `New rate ${new_rate_pct.toFixed(2)}% materially improves headroom` }, { risk: "Operational Failure", lhBefore: "Low", lhAfter: "Low", impBefore: "Low", impAfter: "Low", note: "No change" }],
      };
      break;
    }
    case "energy_retrofit": {
      const { retrofit_cost, energy_savings_pct, impl_months, rebates } = inputs;
      const annualSavings = noi * 0.08 * (energy_savings_pct / 100) * 12;
      const netCost = retrofit_cost - rebates;
      d = {
        noi12: -(netCost * 0.6) + annualSavings * (Math.max(0, 12 - impl_months) / 12),
        noi24: annualSavings * 0.9 - netCost * 0.1,
        noi36: annualSavings * 1.8,
        occDelta12: 0, occDelta24: 1.2, occDelta36: 2.0,
        dscrDelta12: 0, dscrDelta24: 0.03, dscrDelta36: 0.06,
        breachProb12: snap.dscr < 1.25 ? 28 : 8,
        breachProb24: Math.max(3, (snap.dscr < 1.25 ? 20 : 5)),
        energyDelta: -(energy_savings_pct * 0.22),
        ltvDelta: -0.8,
        drivers: [`Net implementation cost of ${fmtCurrency(netCost)} after ${fmtCurrency(rebates)} rebates`, `Annual utility savings of ${fmtCurrency(annualSavings)} from ${energy_savings_pct}% efficiency gain`, `ESG score improvement supports tenant retention and regulatory compliance`],
        risksChanged: [{ risk: "Compliance/ESG Flag", lhBefore: "Medium", lhAfter: "Low", impBefore: "Medium", impAfter: "Low", note: "Certification reduces reporting risk" }, { risk: "Operational Failure", lhBefore: "Medium", lhAfter: "Low", impBefore: "Medium", impAfter: "Low", note: "New systems reduce HVAC/utility failure risk" }],
      };
      break;
    }
    case "major_vacancy": {
      const { vacancy_pct, backfill_months } = inputs;
      const vacancyNOIHit = noi * (vacancy_pct / 100) * 0.85;
      d = {
        noi12: -vacancyNOIHit, noi24: -vacancyNOIHit * (backfill_months > 12 ? 0.8 : 0.4), noi36: -vacancyNOIHit * 0.2,
        occDelta12: -vacancy_pct * 0.85, occDelta24: -vacancy_pct * (backfill_months > 12 ? 0.5 : 0.2), occDelta36: -vacancy_pct * 0.1,
        dscrDelta12: -0.12, dscrDelta24: -0.08, dscrDelta36: -0.03,
        breachProb12: Math.min(85, (snap.dscr < 1.25 ? 60 : 35) + vacancy_pct * 1.5),
        breachProb24: Math.min(70, (snap.dscr < 1.25 ? 45 : 25) + vacancy_pct),
        energyDelta: -1.5, ltvDelta: 3.2,
        drivers: [`Immediate NOI loss of ${fmtCurrency(vacancyNOIHit)} from ${vacancy_pct.toFixed(1)}% vacancy`, `Backfill timeline of ${backfill_months}mo drives sustained cashflow gap`, `DSCR covenant breach risk elevated to critical level`],
        risksChanged: [{ risk: "Covenant Breach", lhBefore: snap.dscr < 1.25 ? "High" : "Medium", lhAfter: "Very High", impBefore: "High", impAfter: "High", note: "NOI shock drives DSCR below covenant floor" }, { risk: "Tenant Churn", lhBefore: "Medium", lhAfter: "High", impBefore: "High", impAfter: "High", note: "Vacancy signals asset quality concerns" }],
      };
      break;
    }
    case "rate_spike": {
      const { rate_delta_bps } = inputs;
      const dscrHit = (rate_delta_bps / 10000) * ltv / 100 * 8;
      d = {
        noi12: -noi * 0.02, noi24: -noi * 0.025, noi36: -noi * 0.03,
        occDelta12: 0, occDelta24: -0.5, occDelta36: -1,
        dscrDelta12: -dscrHit, dscrDelta24: -dscrHit, dscrDelta36: -dscrHit * 0.9,
        breachProb12: Math.min(90, (snap.dscr < 1.3 ? 55 : 28) + rate_delta_bps * 0.1),
        breachProb24: Math.min(80, (snap.dscr < 1.3 ? 45 : 22) + rate_delta_bps * 0.08),
        energyDelta: 0, ltvDelta: 2.1,
        drivers: [`Rate increase of +${rate_delta_bps}bps increases debt service by ${fmtCurrency(noi * 0.02)}`, `DSCR decline of ${dscrHit.toFixed(2)}x directly impacts covenant headroom`, `Floating rate exposure ${snap.dscr < 1.25 ? "already strained" : "creates new risk"}`],
        risksChanged: [{ risk: "Covenant Breach", lhBefore: snap.dscr < 1.25 ? "High" : "Medium", lhAfter: "Very High", impBefore: "High", impAfter: "High", note: `+${rate_delta_bps}bps compresses DSCR by ${dscrHit.toFixed(2)}x` }],
      };
      break;
    }
    case "recession_noi": {
      const { noi_decline_pct } = inputs;
      const noiHit = noi * (noi_decline_pct / 100);
      d = {
        noi12: -noiHit, noi24: -noiHit * 0.9, noi36: -noiHit * 0.7,
        occDelta12: -noi_decline_pct * 0.35, occDelta24: -noi_decline_pct * 0.25, occDelta36: -noi_decline_pct * 0.15,
        dscrDelta12: -0.18, dscrDelta24: -0.15, dscrDelta36: -0.1,
        breachProb12: Math.min(95, (snap.dscr < 1.25 ? 70 : 48) + noi_decline_pct),
        breachProb24: Math.min(85, (snap.dscr < 1.25 ? 60 : 38) + noi_decline_pct * 0.7),
        energyDelta: -2, ltvDelta: 5,
        drivers: [`Severe NOI contraction of ${fmtCurrency(noiHit)} (${noi_decline_pct}% decline)`, `Occupancy pressure of -${(noi_decline_pct * 0.35).toFixed(1)}pp from macro demand shock`, `Covenant breach near-certain without lender accommodation`],
        risksChanged: [{ risk: "Covenant Breach", lhBefore: "High", lhAfter: "Very High", impBefore: "High", impAfter: "High", note: "Recession scenario tests all financial covenants" }, { risk: "Tenant Churn", lhBefore: "Medium", lhAfter: "Very High", impBefore: "High", impAfter: "High", note: "Macro stress cascades to occupancy" }],
      };
      break;
    }
    default: {
      d = { noi12: 0, noi24: 0, noi36: 0, occDelta12: 0, occDelta24: 0, occDelta36: 0, dscrDelta12: 0, dscrDelta24: 0, dscrDelta36: 0, breachProb12: 8, breachProb24: 8, energyDelta: 0, ltvDelta: 0, drivers: ["No projection available"], risksChanged: [] };
    }
  }

  // Apply constraints
  if (constraints.noCovenant && d.breachProb24 > 20) {
    d.noi24 = Math.max(d.noi24, -noi * 0.05);
    d.dscrDelta24 = Math.max(d.dscrDelta24, -0.03);
    d.notes = "Constrained: covenant breach limit applied";
  }

  return { ...d, baseNOI: noi, baseOcc: occ, baseDSCR: dscr };
}

function projectHealthState(snap, projection, periods) {
  return periods.map(p => {
    const clamp = (p > 24 ? 36 : p > 12 ? 24 : 12);
    const projNoi   = (snap.noiTTM * 1e6 + (projection[`noi${p}`] || 0)) / 1e6;
    const projOcc   = Math.min(99, Math.max(50, snap.occupancy + (projection[`occDelta${clamp}`] || 0)));
    const projDscr  = Math.max(0.85, snap.dscr + (projection[`dscrDelta${clamp}`] || 0));
    const projLtv   = Math.max(0, snap.ltv + (projection.ltvDelta || 0));
    const projEnergy= snap.energyCostYoY + (projection.energyDelta || 0);
    // noiPlanPct: how far projected NOI deviates from the *original plan* (snap.noiPlanPct encodes current variance, apply delta on top)
    const noiDeltaPct = ((projNoi - snap.noiTTM) / snap.noiTTM) * 100;
    const projNoiPlanPct = snap.noiPlanPct + noiDeltaPct;
    // Carry through wale and delinquency unchanged (scenario doesn't model them directly)
    const mockSnap = {
      ...snap,
      noiTTM: projNoi,
      occupancy: projOcc,
      dscr: projDscr,
      ltv: projLtv,
      energyCostYoY: projEnergy,
      noiPlanPct: projNoiPlanPct,
    };
    const h = computeHealthState(mockSnap);
    return { period: p, health: h.health_state, score: h.health_score, occ: projOcc, noi: projNoi, dscr: projDscr };
  });
}

function recommendDecision(snap, baseline, scenA, scenB, constraints) {
  const score = (proj) => {
    if (!proj) return -9999;
    const noiGain   = (proj.noi24 || 0) / (snap.noiTTM * 1e6) * 100;
    const dscrGain  = (proj.dscrDelta24 || 0) * 50;
    const breachPen = -(proj.breachProb24 || 50) * 0.8;
    const occGain   = (proj.occDelta24 || 0) * 1.5;
    return noiGain + dscrGain + breachPen + occGain;
  };
  // Only include real scenarios — Baseline is the fallback, never the winner
  const candidates = [
    scenA ? { label: scenA.label, proj: scenA, s: score(scenA) } : null,
    scenB ? { label: scenB.label, proj: scenB, s: score(scenB) } : null,
  ].filter(Boolean);

  if (candidates.length === 0) {
    return { recommended: "Baseline", scores: [], rationale: ["Maintain current plan", "Monitor KPIs closely", "Revisit in 30 days"], tradeoffs: ["No scenario selected — run simulation to get recommendations"] };
  }

  candidates.sort((a, b) => b.s - a.s);
  const winner = candidates[0];
  const tradeoffsBase = [
    "Near-term cash outlay required before returns materialise",
    "Execution risk and stakeholder coordination required for implementation",
    "Market conditions may affect projected recovery timeline",
  ];
  return {
    recommended: winner.label,
    scores: candidates,
    rationale: winner.proj?.drivers?.slice(0, 3) || ["Best risk-adjusted outcome among evaluated scenarios"],
    tradeoffs: tradeoffsBase,
  };
}

function generateTasks(recommendation, prop, scenarioId) {
  const baseDate = new Date();
  const addDays = d => { const dt = new Date(baseDate); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); };
  const taskTemplates = {
    capex_delay:     [{ owner: "Asset Manager", task: "Escalate roof deferral risk to investment committee", due: addDays(5) }, { owner: "Property Manager", task: "Implement leak mitigation patches and inspection", due: addDays(10) }, { owner: "Finance Partner", task: "Quantify R&M uplift for reforecast", due: addDays(7) }, { owner: "Risk", task: "Update risk register with deferred maintenance flag", due: addDays(3) }],
    accel_capex:     [{ owner: "Asset Manager", task: "Approve acceleration budget and overtime spend", due: addDays(3) }, { owner: "Property Manager", task: "Issue procurement RFP for accelerated timeline", due: addDays(7) }, { owner: "Finance Partner", task: "Model cash flow impact of front-loaded spend", due: addDays(5) }, { owner: "Treasury", task: "Confirm reserve availability for overtime costs", due: addDays(4) }],
    lease_restructure:[{ owner: "Asset Manager", task: "Initiate renewal conversations with top 3 expiring tenants", due: addDays(7) }, { owner: "Property Manager", task: "Prepare TI scope and cost estimates", due: addDays(14) }, { owner: "Finance Partner", task: "Model concession impact on NOI and budget variance", due: addDays(5) }, { owner: "Risk", task: "Review lease clause risk for renegotiation terms", due: addDays(10) }],
    refinance_early: [{ owner: "Treasury", task: "Issue RFP to 3 lending counterparties", due: addDays(7) }, { owner: "Asset Manager", task: "Approve refinance strategy at steering committee", due: addDays(5) }, { owner: "Finance Partner", task: "Run accretion/dilution model for refi scenarios", due: addDays(10) }, { owner: "Risk", task: "Review covenant package and lender side-letter", due: addDays(14) }],
    energy_retrofit: [{ owner: "Property Manager", task: "Engage ESG consultant for retrofit scoping", due: addDays(10) }, { owner: "Finance Partner", task: "Model rebate and savings assumptions for approval", due: addDays(7) }, { owner: "Asset Manager", task: "Approve retrofit budget at capex committee", due: addDays(14) }, { owner: "Risk", task: "Assess tenant disruption and lease covenant impact", due: addDays(10) }],
  };
  return (taskTemplates[scenarioId] || [
    { owner: "Asset Manager", task: `Execute ${recommendation.recommended} recommendation`, due: addDays(5) },
    { owner: "Finance Partner", task: "Update financial model with scenario outputs", due: addDays(7) },
    { owner: "Risk", task: "Refresh risk register with scenario outcomes", due: addDays(5) },
    { owner: "Property Manager", task: "Align operational plan with scenario timeline", due: addDays(10) },
  ]).map((t, i) => ({ ...t, id: `task-${i + 1}`, status: "pending" }));
}

function generateDecisionMemo(prop, snap, meta, scenarioA, projA, scenarioB, projB, recommendation, confidence) {
  const asOf = snap.month;
  const health = computeHealthState(snap);
  const freshness = getSourceFreshness(prop.id);
  const lines = [
    `INVESTMENT DECISION MEMO`,
    `═══════════════════════════════════════`,
    `Asset: ${prop.name} | ${prop.type} | ${prop.location}`,
    `Strategy: ${prop.strategy} | As-of: ${asOf}`,
    `Prepared by: RealDT Simulation Engine | Confidence: ${confidence.level}`,
    ``,
    `1. EXECUTIVE SUMMARY`,
    `─────────────────────`,
    `${prop.name} currently presents a health score of ${health.health_score}/100 (${health.health_state}). This memo evaluates ${scenarioA ? scenarioA.label : "Baseline"} and ${scenarioB ? scenarioB.label : "no second scenario"} against the current trajectory. Recommendation: ${recommendation.recommended}.`,
    ``,
    `2. CURRENT SITUATION`,
    `─────────────────────`,
    `Occupancy: ${snap.occupancy.toFixed(1)}% | NOI TTM: ${fmtCurrency(snap.noiTTM * 1e6)} (${snap.noiPlanPct > 0 ? "+" : ""}${snap.noiPlanPct.toFixed(1)}% vs plan)`,
    `DSCR: ${snap.dscr.toFixed(2)}x | Covenant headroom: +${snap.covenantHeadroom.toFixed(0)}bps | LTV: ${snap.ltv.toFixed(1)}%`,
    `WALE: ${snap.wale.toFixed(1)}yr | Asset condition score: ${meta.conditionScore}/100`,
    `Lease rollover (12m): ${meta.leaseRollover12m.toFixed(1)}% | Debt rate: ${meta.debtRate.toFixed(2)}% (${meta.debtRateType})`,
    `Top drivers: ${health.top_drivers.map(d => d.label).join("; ")}`,
    ``,
    `3. OPTIONS COMPARED`,
    `────────────────────`,
    `                     Baseline        ${scenarioA ? scenarioA.label.padEnd(22) : "".padEnd(22)} ${scenarioB ? scenarioB.label : ""}`,
    `NOI Δ 24mo:          $0              ${projA ? fmtCurrency(projA.noi24 || 0).padEnd(22) : "N/A".padEnd(22)} ${projB ? fmtCurrency(projB.noi24 || 0) : "N/A"}`,
    `Occ Δ 24mo:          0pp             ${projA ? ((projA.occDelta24 || 0) > 0 ? "+" : "") + (projA.occDelta24 || 0).toFixed(1) + "pp" : "N/A"}`,
    `DSCR Δ 24mo:         0x              ${projA ? ((projA.dscrDelta24 || 0) > 0 ? "+" : "") + (projA.dscrDelta24 || 0).toFixed(2) + "x" : "N/A"}`,
    `Breach Prob 24mo:    ${snap.dscr < 1.25 ? "28" : "8"}%             ${projA ? (projA.breachProb24 || 0) + "%" : "N/A"}`,
    ``,
    `4. RECOMMENDATION`,
    `──────────────────`,
    `Recommended: ${recommendation.recommended}`,
    recommendation.rationale?.map((r, i) => `${i + 1}. ${r}`).join("\n") || "",
    ``,
    `Tradeoffs:`,
    recommendation.tradeoffs?.map(t => `• ${t}`).join("\n") || "",
    ``,
    `5. EVIDENCE & TRACEABILITY`,
    `───────────────────────────`,
    Object.entries(freshness).map(([feed, ts]) => `${feed}: ${fmtTS(ts)}`).join(" | "),
    `Audit IDs: ${meta.auditIds.join(", ")}`,
    `Data confidence: ${confidence.level} (${confidence.score}/100) — ${confidence.issues.length > 0 ? confidence.issues.join(", ") : "All feeds current"}`,
    `Generated: ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  ];
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(v) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${sign}$${Math.round(a / 1e6)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
}
const fmtPct = (v, plus = false) => { const s = v.toFixed(1) + "%"; return plus && v > 0 ? "+" + s : s; };
function fmtNum(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(Math.round(v));
}
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function fmtTS(iso) { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

function kpiStatus(key, value) {
  const map = {
    occupancy:         [{ v: 90, s: "green" }, { v: 82, s: "amber" }],
    dscr:              [{ v: 1.35, s: "green" }, { v: 1.2, s: "amber" }],
    noiPlanPct:        [{ v: -2, s: "green" }, { v: -8, s: "amber" }],
    delinquency:       [{ v: 3, s: "green", inv: true }, { v: 6, s: "amber", inv: true }],
    capexOnTime:       [{ v: 85, s: "green" }, { v: 70, s: "amber" }],
    energyCostYoY:     [{ v: 3, s: "green", inv: true }, { v: 7, s: "amber", inv: true }],
    ltv:               [{ v: 55, s: "green", inv: true }, { v: 68, s: "amber", inv: true }],
    wale:              [{ v: 4.5, s: "green" }, { v: 2.5, s: "amber" }],
    tenantRetentionRate:[{ v: 75, s: "green" }, { v: 60, s: "amber" }],
    irrTTM:            [{ v: 8, s: "green" }, { v: 5, s: "amber" }],
    capRateInPlace:    [{ v: 5.5, s: "green" }, { v: 4.0, s: "amber" }],
  };
  if (!map[key]) return "green";
  for (const t of map[key]) {
    if (t.inv ? value <= t.v : value >= t.v) return t.s;
  }
  return "red";
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#3b82f6", width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return <svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 7, padding: "8px 12px", color: "#1e3a5f", fontSize: 12, zIndex: 9999, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 12px rgba(15,23,42,0.10)", animation: "slideIn 0.3s ease" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
      {message}
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7a96", cursor: "pointer", fontSize: 18, marginLeft: 4, padding: 0 }}>×</button>
    </div>
  );
}

function Badge({ text, color, bg }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color, background: bg, border: `1px solid ${color}22` }}>{text}</span>;
}
function StateBadge({ state }) { const c = STATE_CONFIG[state] || STATE_CONFIG.Healthy; return <Badge text={c.label} color={c.color} bg={c.bg} />; }
function SeverityBadge({ severity }) {
  const m = { Material: { color: "#ef4444", bg: "rgba(239,68,68,0.10)" }, Watch: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" }, Info: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" } };
  const c = m[severity] || m.Info; return <Badge text={severity} color={c.color} bg={c.bg} />;
}
function SensitivityBadge({ level }) { const c = SENSITIVITY_CONFIG[level] || SENSITIVITY_CONFIG.Public; return <Badge text={level} color={c.color} bg={c.bg} />; }
function SysStatusBadge({ status }) {
  const m = { success: { color: "#10b981", text: "OK" }, warning: { color: "#f59e0b", text: "Warn" }, error: { color: "#ef4444", text: "Error" } };
  const c = m[status] || m.success; return <Badge text={c.text} color={c.color} bg={c.color + "18"} />;
}

function Skeleton({ width = "100%", height = 20, radius = 6 }) {
  return <div style={{ width, height, borderRadius: radius, background: "linear-gradient(90deg,#e8edf4 25%,#f4f7fb 50%,#e8edf4 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}

function KpiTile({ label, value, delta, sparkData, status, tooltip, onClick, subLabel }) {
  const [hover, setHover] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const sColor = STATUS_COLORS[status] || STATUS_COLORS.green;
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowTip(false); }}
      style={{ background: hover ? "#edf2fb" : "#ffffff", border: `1px solid ${hover ? "#94a3b8" : "#d1dae8"}`, borderRadius: 8, padding: "14px 16px", cursor: onClick ? "pointer" : "default", transition: "all 0.15s", position: "relative", borderLeft: `3px solid ${sColor}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {delta !== undefined && delta !== null && (
            <span style={{ fontSize: 10, color: delta > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}</span>
          )}
          {tooltip && (
            <div style={{ position: "relative" }}>
              <span onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)} style={{ color: "#7c8fa8", cursor: "help", fontSize: 11 }}>ⓘ</span>
              {showTip && (
                <div style={{ position: "absolute", right: 0, top: 20, width: 220, background: "#ffffff", border: "1px solid #94a3b8", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#6b7a96", zIndex: 300, lineHeight: 1.5, boxShadow: "0 4px 16px rgba(15,23,42,0.10)" }}>{tooltip}</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, color: sColor, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{value}</div>
      {subLabel && <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>{subLabel}</div>}
      {sparkData && <div style={{ marginTop: 8 }}><Sparkline data={sparkData} color={sColor} /></div>}
    </div>
  );
}

function SidePanel({ open, onClose, title, children }) {
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: open ? 420 : 0, background: "#ffffff", borderLeft: "1px solid #d1dae8", boxShadow: open ? "-8px 0 32px rgba(15,23,42,0.08)" : "none", transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", zIndex: 500, display: "flex", flexDirection: "column" }}>
      {open && (
        <>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #d1dae8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7a96", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>{children}</div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — PORTFOLIO COCKPIT
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioCockpit({ onNavigateToAsset, batchCount }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [drawerAlert, setDrawerAlert] = useState(null);
  const [filterState, setFilterState] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [expandedState, setExpandedState] = useState(null);

  useEffect(() => {
    setLoading(true);
    // Use setTimeout to avoid blocking render for large dataset
    const t = setTimeout(() => {
      const s = computePortfolioSummary();
      setSummary(s);
      setAlerts(deriveAlerts(s.props));
      setLoading(false);
    }, 700);
    return () => clearTimeout(t);
  }, [batchCount]);

  if (loading) return (
    <div style={{ padding: 32, display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>{[...Array(10)].map((_, i) => <Skeleton key={i} height={100} />)}</div>
      <Skeleton height={180} /> <Skeleton height={220} />
    </div>
  );

  const { props, totalNOI, totalNRA, avgOcc, avgDSCR, avgWALE, avgLTV, avgCapRate, avgIRR, avgRetention, avgNOIMargin, stateCounts, riskDrivers } = summary;

  // Prev month snapshot helpers (use first 5 for sparklines to keep perf)
  const spark = (kpiKey, propIds = null) => {
    const pids = propIds || DETAIL_PROPS.map(p => p.id);
    return Array.from({ length: 12 }, (_, i) => {
      const idx = 59 - (11 - i);
      return pids.reduce((s, pid) => s + (getSnapshots(pid)[idx]?.[kpiKey] || 0), 0) / pids.length;
    });
  };

  const stateOrder = ["Healthy", "Watch", "Stabilization", "At Risk", "Operational Risk"];
  const filteredAlerts = alerts.filter(a => (!filterState || a.prop.health.health_state === filterState) && (!filterType || a.prop.type === filterType));

  // Portfolio stats for extra KPIs
  const atRiskCount = (stateCounts["At Risk"] || 0) + (stateCounts["Operational Risk"] || 0);
  const totalEquityME = (props.reduce((s, p) => s + p.snap.equityMultiple, 0) / props.length).toFixed(2);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1500, margin: "0 auto" }}>

      {/* Header stat bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        {[
          { label: "Assets", value: ALL_PROPERTIES.length },
          { label: "Types", value: [...new Set(ALL_PROPERTIES.map(p => p.type))].length },
          { label: "Strategies", value: [...new Set(ALL_PROPERTIES.map(p => p.strategy))].length },
          { label: "Markets", value: [...new Set(ALL_PROPERTIES.map(p => p.location))].length },
          { label: "At Risk / Op Risk", value: atRiskCount, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ background: "#f8fafc", border: "1px solid #d1dae8", borderRadius: 6, padding: "6px 14px", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color || "#0f172a", fontFamily: "'DM Mono', monospace" }}>{s.value}</span>
            <span style={{ fontSize: 11, color: "#7c8fa8" }}>{s.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#7c8fa8", display: "flex", alignItems: "center" }}>
          As of: <span style={{ color: "#6b7a96", marginLeft: 4 }}>Feb 2026 · 145-asset portfolio</span>
        </div>
      </div>

      {/* ── SWIMLANE 1 ── */}
      <div style={{ marginBottom: 6 }}>
        <SectionHeader color="#3b82f6" label="Portfolio Health Overview" />

        {/* KPI Ribbon — split Operational | Financial */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 0, marginBottom: 20, background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, overflow: "hidden" }}>
          {/* Operational */}
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Operational KPIs</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <KpiTile label="Portfolio Occupancy"     value={fmtPct(avgOcc)}          sparkData={spark("occupancy")}       status={kpiStatus("occupancy", avgOcc)}           tooltip="Weighted avg occ. Source: Yardi — daily." />
              <KpiTile label="Portfolio WALE"           value={`${avgWALE.toFixed(1)}yr`} sparkData={spark("wale")}           status={kpiStatus("wale", avgWALE)}               tooltip="Weighted avg lease expiry. Source: Leasing CRM — daily." />
              <KpiTile label="Tenant Retention Rate"   value={fmtPct(avgRetention)}    sparkData={spark("tenantRetentionRate")} status={kpiStatus("tenantRetentionRate", avgRetention)} tooltip="% of expiring tenants renewing. Source: Leasing CRM." />
              <KpiTile label="WO Backlog (avg)"        value={`${Math.round(props.reduce((s,p) => s + p.snap.workOrderBacklog, 0) / props.length)} open`} subLabel={`${(props.reduce((s,p) => s + p.snap.workOrderAvgDays,0)/props.length).toFixed(1)}d avg resolution`} status={props.reduce((s,p)=>s+p.snap.workOrderBacklog,0)/props.length > 15 ? "amber" : "green"} tooltip="Avg open work orders per asset. Source: CMMS — daily." />
              <KpiTile label="Capex On-Time %"         value={fmtPct(props.reduce((s,p)=>s+p.snap.capexOnTime,0)/props.length)} status={kpiStatus("capexOnTime", props.reduce((s,p)=>s+p.snap.capexOnTime,0)/props.length)} tooltip="Capex milestones on schedule. Source: PM Tool — weekly." />
              <KpiTile label="Energy Cost YoY"         value={fmtPct(props.reduce((s,p)=>s+p.snap.energyCostYoY,0)/props.length, true)} status={kpiStatus("energyCostYoY", props.reduce((s,p)=>s+p.snap.energyCostYoY,0)/props.length)} tooltip="Avg YoY energy cost change. Source: ESG/Utilities — weekly." />
            </div>
          </div>
          <div style={{ background: "#d1dae8" }} />
          {/* Financial */}
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Financial KPIs</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <KpiTile label="Portfolio NOI (TTM)"     value={fmtCurrency(totalNOI*1e6)} sparkData={spark("noiTTM")}          status="green"                                   tooltip="Trailing 12-mo NOI. Source: GL/ERP — monthly close." />
              <KpiTile label="Portfolio DSCR"          value={`${avgDSCR.toFixed(2)}x`}  sparkData={spark("dscr")}            status={kpiStatus("dscr", avgDSCR)}              tooltip="Wtd avg DSCR. Source: GL + Loan models." />
              <KpiTile label="Portfolio LTV"           value={fmtPct(avgLTV)}            sparkData={spark("ltv")}             status={kpiStatus("ltv", avgLTV)}                tooltip="Avg loan-to-value. Source: Loan models — monthly." />
              <KpiTile label="In-Place Cap Rate"       value={`${avgCapRate.toFixed(2)}%`} sparkData={spark("capRateInPlace")} status={kpiStatus("capRateInPlace", avgCapRate)} tooltip="Wtd avg in-place cap rate. Source: Argus — weekly." />
              <KpiTile label="Portfolio IRR (TTM)"     value={fmtPct(avgIRR, true)}      sparkData={spark("irrTTM")}          status={kpiStatus("irrTTM", avgIRR)}             tooltip="Trailing 12-mo IRR. Source: Argus + GL — monthly." />
              <KpiTile label="NOI Margin"              value={fmtPct(avgNOIMargin)}       sparkData={spark("noiMarginPct")}   status="green"                                   tooltip="NOI as % of gross revenue. Source: GL — monthly." />
              <KpiTile label="Avg Equity Multiple"    value={`${totalEquityME}x`}         status="green"                                                                        tooltip="Portfolio avg equity multiple. Source: Argus — weekly." />
              <KpiTile label="Collections / Delinq"   value={`${(props.reduce((s,p)=>s+p.snap.collections,0)/props.length).toFixed(1)}% / ${(props.reduce((s,p)=>s+p.snap.delinquency,0)/props.length).toFixed(1)}%`} status={kpiStatus("delinquency", props.reduce((s,p)=>s+p.snap.delinquency,0)/props.length)} tooltip="Collections rate and delinquency. Source: Yardi — daily." />
              <KpiTile label="Forecast Confidence"    value={`${Math.round(props.reduce((s,p)=>s+p.snap.forecastConfidence,0)/props.length)}%`} status="amber" tooltip="Composite forecast confidence score. Source: Argus — weekly." />
            </div>
          </div>
        </div>

        {/* Distribution + Risk Drivers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 20 }}>

          {/* ── Health Distribution ── */}
          <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Fixed header */}
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #edf1f7" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Health Distribution — 145 Assets</div>
              {/* Stacked bar */}
              <div style={{ display: "flex", height: 26, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
                {stateOrder.filter(s => stateCounts[s] > 0).map(s => (
                  <div key={s}
                    onClick={() => { setExpandedState(expandedState === s ? null : s); setFilterState(expandedState === s ? null : s); }}
                    style={{ width: `${(stateCounts[s] / props.length) * 100}%`, background: STATE_CONFIG[s].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", cursor: "pointer", transition: "filter 0.15s", filter: expandedState === s ? "brightness(1.25)" : "none", minWidth: 18 }}>
                    {stateCounts[s]}
                  </div>
                ))}
              </div>
              {/* State legend rows */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {stateOrder.map(s => (
                  <div key={s}
                    onClick={() => { setExpandedState(expandedState === s ? null : s); setFilterState(expandedState === s ? null : s); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "4px 7px", borderRadius: 5, background: expandedState === s ? STATE_CONFIG[s].bg : "#f8fafc", border: `1px solid ${expandedState === s ? STATE_CONFIG[s].color + "55" : "#d1dae8"}`, transition: "all 0.15s" }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: STATE_CONFIG[s].color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#6b7a96", flex: 1 }}>{s}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: STATE_CONFIG[s].color }}>{stateCounts[s]}</span>
                    <span style={{ fontSize: 9, color: "#7c8fa8" }}>{((stateCounts[s] / props.length) * 100).toFixed(0)}%</span>
                    <span style={{ fontSize: 10, color: expandedState === s ? STATE_CONFIG[s].color : "#94a3b8", marginLeft: 2 }}>{expandedState === s ? "▲" : "▼"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expanded asset list for selected state — scrollable */}
            {expandedState && (() => {
              const stateAssets = props.filter(p => p.health.health_state === expandedState);
              const cfg = STATE_CONFIG[expandedState];
              return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid #edf1f7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {expandedState} · {stateAssets.length} asset{stateAssets.length !== 1 ? "s" : ""}
                    </div>
                    <button onClick={() => { setExpandedState(null); setFilterState(null); }}
                      style={{ background: "none", border: "none", color: "#7c8fa8", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 220, padding: "6px 8px" }}>
                    {stateAssets.map(p => (
                      <div key={p.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 6, marginBottom: 3, background: "#f8fafc", border: "1px solid #d4dce9", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#edf1f7"}
                        onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
                      >
                        <div style={{ width: 4, height: 30, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: "#7c8fa8" }}>{p.location} · {p.type}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: cfg.color, fontFamily: "'DM Mono', monospace" }}>{p.health.health_score}</div>
                          <div style={{ fontSize: 9, color: "#94a3b8" }}>score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Type filter — only when no state expanded */}
            {!expandedState && (
              <div style={{ padding: "10px 16px 12px", borderTop: "1px solid #edf1f7" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Filter by type</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {ASSET_TYPES.map(t => {
                    const cnt = props.filter(p => p.type === t).length;
                    if (cnt === 0) return null;
                    return (
                      <button key={t} onClick={() => setFilterType(filterType === t ? null : t)}
                        style={{ background: filterType === t ? "#dbeafe" : "#edf1f7", border: `1px solid ${filterType === t ? "#3b82f6" : "#d1dae8"}`, borderRadius: 4, padding: "3px 8px", color: filterType === t ? "#2563eb" : "#7c8fa8", fontSize: 10, cursor: "pointer" }}>
                        {t} {cnt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Risk Drivers — sorted by impact, scrollable ── */}
          <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Fixed header */}
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #edf1f7", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em" }}>Portfolio Risk Drivers</div>
              <div style={{ marginLeft: "auto", fontSize: 9, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#7c8fa8" }}>↓</span> Sorted by impact score
              </div>
            </div>
            {/* Scrollable list */}
            <div style={{ overflowY: "auto", maxHeight: 360, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
              {riskDrivers.map((d, i) => {
                const maxScore = riskDrivers[0].impactScore;
                const barW = maxScore > 0 ? (d.impactScore / maxScore) * 100 : 0;
                const sevColor = d.severity === "high" ? "#ef4444" : d.severity === "medium" ? "#f59e0b" : "#3b82f6";
                return (
                  <div key={i} style={{ padding: "7px 10px 6px", background: "#f8fafc", border: "1px solid #e2eaf3", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                    {/* Background fill */}
                    <div style={{ position: "absolute", inset: 0, width: `${barW}%`, background: `${sevColor}06`, pointerEvents: "none" }} />
                    {/* Top row: rank | label | count — all on same baseline */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, position: "relative", marginBottom: 5 }}>
                      <div style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 3, background: `${sevColor}15`, border: `1px solid ${sevColor}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: sevColor, alignSelf: "center" }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: "#1e3a5f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.label}
                      </div>
                      {/* Fixed-width count block so numbers never shift */}
                      <div style={{ flexShrink: 0, width: 52, textAlign: "right" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: sevColor, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{d.affected}</span>
                        <span style={{ fontSize: 8, color: "#94a3b8", marginLeft: 2, verticalAlign: "middle" }}>/{((d.affected / props.length) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {/* Bottom row: spacer | bar | score — columns mirror top row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                      <div style={{ flexShrink: 0, width: 18 }} />
                      <div style={{ flex: 1, height: 3, background: "#e2eaf3", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barW}%`, background: `linear-gradient(to right, ${sevColor}dd, ${sevColor}55)`, transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ flexShrink: 0, width: 52, textAlign: "right", fontSize: 9, fontWeight: 700, color: sevColor, fontFamily: "'DM Mono', monospace" }}>
                        {d.impactScore.toFixed(0)}
                      </div>
                    </div>
                    {/* Description */}
                    <div style={{ marginTop: 3, paddingLeft: 26, fontSize: 9, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── SWIMLANE 2 — ALERTS ── */}
      <SectionHeader color="#ef4444" label="Alerts & Upcoming Risks" extra={
        <div style={{ display: "flex", gap: 6 }}>
          {filterState && <FilterChip label={`State: ${filterState}`} onClear={() => setFilterState(null)} />}
          {filterType  && <FilterChip label={`Type: ${filterType}`}   onClear={() => setFilterType(null)}  />}
        </div>
      } />

      <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {["Severity", "Property", "Type", "State", "Driver", "Why Now", "Horizon", "Action", "Updated"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #d1dae8", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((a, i) => (
              <tr key={i} onClick={() => setDrawerAlert(a)}
                style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "11px 14px" }}><SeverityBadge severity={a.severity} /></td>
                <td style={{ padding: "11px 14px" }}><div style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{a.prop.name}</div><div style={{ color: "#7c8fa8", fontSize: 10 }}>{a.prop.location}</div></td>
                <td style={{ padding: "11px 14px", color: "#6b7a96", fontSize: 11, whiteSpace: "nowrap" }}>{a.prop.type}</td>
                <td style={{ padding: "11px 14px" }}><StateBadge state={a.prop.health.health_state} /></td>
                <td style={{ padding: "11px 14px", color: "#1e3a5f" }}>{a.driver}</td>
                <td style={{ padding: "11px 14px", color: "#6b7a96", maxWidth: 170 }}>{a.whyNow}</td>
                <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}><span style={{ fontSize: 11, fontWeight: 700, color: a.horizon === "Now" ? "#ef4444" : a.horizon === "30 days" ? "#f59e0b" : "#3b82f6" }}>{a.horizon}</span></td>
                <td style={{ padding: "11px 14px", color: "#6b7a96", maxWidth: 160 }}>{a.action}</td>
                <td style={{ padding: "11px 14px", color: "#94a3b8", fontSize: 10, whiteSpace: "nowrap" }}>{timeAgo(a.ts)}</td>
              </tr>
            ))}
            {filteredAlerts.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No alerts match current filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Alert drawer */}
      <SidePanel open={!!drawerAlert} onClose={() => setDrawerAlert(null)} title={drawerAlert?.prop?.name || ""}>
        {drawerAlert && (() => {
          const snap = drawerAlert.prop.snap;
          const health = drawerAlert.prop.health;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <StateBadge state={health.health_state} />
                <div style={{ fontSize: 28, fontWeight: 900, color: STATE_CONFIG[health.health_state]?.color, fontFamily: "'DM Mono', monospace" }}>{health.health_score}</div>
                <div style={{ fontSize: 12, color: "#6b7a96" }}>/ 100</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>KPI Snapshot</div>
                {[
                  { label: "Occupancy", v: fmtPct(snap.occupancy), k: "occupancy", val: snap.occupancy },
                  { label: "DSCR", v: `${snap.dscr.toFixed(2)}x`, k: "dscr", val: snap.dscr },
                  { label: "NOI vs Plan", v: fmtPct(snap.noiPlanPct, true), k: "noiPlanPct", val: snap.noiPlanPct },
                  { label: "LTV", v: fmtPct(snap.ltv), k: "ltv", val: snap.ltv },
                  { label: "WALE", v: `${snap.wale.toFixed(1)}yr`, k: "wale", val: snap.wale },
                  { label: "IRR TTM", v: fmtPct(snap.irrTTM, true), k: "irrTTM", val: snap.irrTTM },
                ].map(kpi => {
                  const st = kpiStatus(kpi.k, kpi.val);
                  return (
                    <div key={kpi.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, marginBottom: 5, borderLeft: `3px solid ${STATUS_COLORS[st]}` }}>
                      <span style={{ fontSize: 12, color: "#6b7a96" }}>{kpi.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLORS[st], fontFamily: "'DM Mono', monospace" }}>{kpi.v}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Top Drivers</div>
                {health.top_drivers.map((d, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 6, marginBottom: 5, fontSize: 12, color: "#1e3a5f", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.severity === "high" ? "#ef4444" : d.severity === "medium" ? "#f59e0b" : "#10b981", flexShrink: 0 }} />
                    {d.label}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Recent Signals</div>
                {getIngestItems().filter(it => it.propId === drawerAlert.prop.id).slice(0, 4).map(it => (
                  <div key={it.id} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 6, marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#1e3a5f" }}>{it.label}</span>
                      <SensitivityBadge level={it.sensitivity} />
                    </div>
                    <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>{timeAgo(it.ts)} · {SYSTEMS.find(s => s.id === it.system)?.name}</div>
                  </div>
                ))}
                {getIngestItems().filter(it => it.propId === drawerAlert.prop.id).length === 0 && (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No recent signals — run batch to ingest</div>
                )}
              </div>
              <button onClick={() => { onNavigateToAsset(drawerAlert.prop.id); setDrawerAlert(null); }}
                style={{ background: "#1d4ed8", border: "none", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                Open Asset Twin →
              </button>
            </div>
          );
        })()}
      </SidePanel>
    </div>
  );
}

function SectionHeader({ color, label, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 8 }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</div>
      {extra && <div style={{ marginLeft: "auto" }}>{extra}</div>}
    </div>
  );
}
function FilterChip({ label, onClear }) {
  return (
    <button onClick={onClear} style={{ background: "#d1dae8", border: "1px solid #94a3b8", borderRadius: 4, padding: "3px 10px", color: "#6b7a96", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
      {label} <span style={{ color: "#6b7a96" }}>×</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — ASSET TWIN
// ─────────────────────────────────────────────────────────────────────────────

function AssetTwin({ initialPropId, batchCount, onNavigateToSource, onNavigateToSim }) {
  const [selectedPropId, setSelectedPropId] = useState(initialPropId || "prop-001");
  const [loading, setLoading] = useState(false);
  const [selectedEventIdx, setSelectedEventIdx] = useState(null);
  const [hoveredEventIdx, setHoveredEventIdx] = useState(null);
  const [sidePanel, setSidePanel] = useState(null);
  const [activeScenario, setActiveScenario] = useState("baseline");
  const [showMemo, setShowMemo] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);

  useEffect(() => { setSelectedPropId(initialPropId || "prop-001"); }, [initialPropId]);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, [selectedPropId]);

  const prop    = ALL_PROPERTIES.find(p => p.id === selectedPropId) || DETAIL_PROPS[0];
  const snaps   = getSnapshots(selectedPropId);
  const snap    = snaps[snaps.length - 1];
  const prevSnap= snaps[snaps.length - 2];
  const health  = computeHealthState(snap);
  const events  = TIMELINE_EVENTS[selectedPropId] || [];
  const stateColor = STATE_CONFIG[health.health_state]?.color || "#10b981";
  const allMonths  = snaps.map(s => s.month);
  const tickMonths = allMonths.filter((_, i) => i % 6 === 0);

  const scenarios = {
    baseline: { label: "Baseline",                        noi12: 0,                      noi24: 0,                       occDelta: 0,    covenantBreachProb: snap.dscr < 1.2 ? 28 : 8,   health: health.health_state },
    scenA:    { label: "Capex Delay (Roof)",              noi12: -snap.noiTTM * 0.04,    noi24: -snap.noiTTM * 0.06,     occDelta: -2.1, covenantBreachProb: snap.dscr < 1.2 ? 45 : 18,  health: "At Risk"           },
    scenB:    { label: "Energy Retrofit",                 noi12: -snap.noiTTM * 0.02,    noi24: snap.noiTTM * 0.05,      occDelta: 0.5,  covenantBreachProb: snap.dscr < 1.2 ? 20 : 5,   health: "Watch"             },
    scenC:    { label: "Lease Restructure",               noi12: -snap.noiTTM * 0.03,    noi24: snap.noiTTM * 0.08,      occDelta: 3.2,  covenantBreachProb: snap.dscr < 1.2 ? 22 : 6,   health: "Stabilization"     },
    scenD:    { label: "Refinance Early",                 noi12: -snap.noiTTM * 0.005,   noi24: snap.noiTTM * 0.03,      occDelta: 0,    covenantBreachProb: 3,                           health: health.health_state  },
    scenE:    { label: "Accelerate Leasing Incentives",   noi12: -snap.noiTTM * 0.025,   noi24: snap.noiTTM * 0.11,      occDelta: 5.8,  covenantBreachProb: snap.dscr < 1.2 ? 35 : 10,  health: "Watch"             },
  };

  const fin = {
    baseRent: snap.noiTTM * 0.72, recoveries: snap.noiTTM * 0.14, otherIncome: snap.noiTTM * 0.06,
    utilities: snap.noiTTM * 0.08, rm: snap.noiTTM * 0.06, taxes: snap.noiTTM * 0.09, insurance: snap.noiTTM * 0.03, mgmtFee: snap.noiTTM * 0.04,
    noi: snap.noiTTM, arAging30: snap.noiTTM * 0.02, arAging60: snap.noiTTM * 0.008, badDebt: snap.noiTTM * 0.003,
  };

  // Show only 5 detail props in pill tabs
  const pillProps = DETAIL_PROPS;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1500, margin: "0 auto" }}>
      {/* Property selector pills (detail props) + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {pillProps.map(p => {
          const h = computeHealthState(getLatestSnapshot(p.id));
          return (
            <button key={p.id} onClick={() => setSelectedPropId(p.id)}
              style={{ padding: "7px 15px", borderRadius: 20, border: `1.5px solid ${selectedPropId === p.id ? STATE_CONFIG[h.health_state].color : "#d1dae8"}`, background: selectedPropId === p.id ? STATE_CONFIG[h.health_state].bg : "#f8fafc", color: selectedPropId === p.id ? STATE_CONFIG[h.health_state].color : "#6b7a96", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: STATE_CONFIG[h.health_state].color }} />
              {p.name.split(" ").slice(0, 2).join(" ")}
            </button>
          );
        })}
        <div style={{ height: 24, width: 1, background: "#d1dae8" }} />
        <select onChange={e => e.target.value && setSelectedPropId(e.target.value)} value={selectedPropId}
          style={{ background: "#f8fafc", border: "1px solid #d1dae8", borderRadius: 8, padding: "7px 12px", color: "#6b7a96", fontSize: 12, cursor: "pointer", outline: "none" }}>
          <option value="">Search 145 assets…</option>
          {ALL_PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name} — {p.location} ({p.type})</option>)}
        </select>

      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 16 }}><Skeleton height={200} /><Skeleton height={100} /><Skeleton height={220} /></div>
      ) : (
        <>
          {/* SWIMLANE 1 — Property overview */}
          {(() => {
            const meta = getAssetMeta(selectedPropId);
            const futureEvents = (TIMELINE_EVENTS[selectedPropId] || []).filter(ev => ev.month > snap.month);
            // Build key highlights from health drivers + timeline events + meta
            const highlights = [];
            // From health drivers
            health.top_drivers.forEach(d => {
              const sevColor = d.severity === "high" ? "#ef4444" : d.severity === "medium" ? "#f59e0b" : "#6366f1";
              highlights.push({ text: d.label, color: sevColor, icon: d.severity === "high" ? "🔴" : d.severity === "medium" ? "🟡" : "🔵" });
            });
            // From capex projects
            meta.capexProjects.slice(0, 2).forEach(cp => {
              highlights.push({ text: `${cp.name} — ${fmtCurrency(cp.cost)} (${cp.status}${cp.pctComplete > 0 ? `, ${cp.pctComplete}% complete` : ""})`, color: "#8b5cf6", icon: "🔨" });
            });
            // From upcoming timeline events
            futureEvents.slice(0, 2).forEach(ev => {
              highlights.push({ text: `${ev.month}: ${ev.label}`, color: ev.color, icon: ev.icon });
            });
            // From KPI trends
            if (snap.occupancy - prevSnap.occupancy < -1.5) highlights.push({ text: `Occupancy declining ${(snap.occupancy - prevSnap.occupancy).toFixed(1)}pp MoM`, color: "#ef4444", icon: "📉" });
            if (snap.delinquency > 6) highlights.push({ text: `Delinquency elevated at ${snap.delinquency.toFixed(1)}%`, color: "#f59e0b", icon: "⚠" });
            if (snap.wale < 2.5) highlights.push({ text: `WALE critical — ${snap.wale.toFixed(1)}yr`, color: "#ef4444", icon: "⚠" });
            if (meta.leaseRollover12m > 20) highlights.push({ text: `${meta.leaseRollover12m.toFixed(1)}% of leases expire in 12 months`, color: "#f59e0b", icon: "📋" });

            return (
            <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 260px" }}>
                {/* Left: identity + KPIs + meta */}
                <div style={{ padding: "16px 22px", borderRight: "1px solid #e2eaf3" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{prop.name}</div>
                      <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 2 }}>{prop.location} · {prop.type} · {prop.strategy}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <StateBadge state={health.health_state} />
                      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: stateColor, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{health.health_score}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>/ 100</div>
                      </div>
                    </div>
                  </div>
                  {/* Key metrics strip */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 10 }}>
                    {[
                      { label: prop.type === "Multifamily" ? "Units" : "NRA", value: prop.type === "Multifamily" ? `${prop.units}u` : `${fmtNum(prop.nra)} SF` },
                      { label: "Built / Reno", value: `${prop.yearBuilt}${prop.majorRenovation ? ` / ${prop.majorRenovation}` : ""}` },
                      { label: "Debt Maturity", value: `${prop.debtMaturity}mo`, warn: prop.debtMaturity <= 12 },
                      { label: "DSCR", value: `${snap.dscr.toFixed(2)}x`, warn: snap.dscr < 1.2 },
                      { label: "WALE", value: `${snap.wale.toFixed(1)}yr`, warn: snap.wale < 2.5 },
                      { label: "Condition", value: `${meta.conditionScore}/100`, warn: meta.conditionScore < 65 },
                    ].map(m => (
                      <div key={m.label} style={{ background: m.warn ? "#fff5f5" : "#f8fafc", borderRadius: 6, padding: "6px 10px", border: `1px solid ${m.warn ? "#fecaca" : "#e2eaf3"}` }}>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m.warn ? "#ef4444" : "#1e3a5f" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Tenants + system freshness row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {prop.topTenants && prop.topTenants.slice(0,3).map(t => (
                      <div key={t.name} style={{ background: "#f1f5f9", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "#6b7a96" }}>
                        <span style={{ fontWeight: 700, color: "#1e3a5f" }}>{t.name}</span> · {fmtPct(t.pct)} · exp {t.expiry}
                      </div>
                    ))}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                      {[{ cat: "PMS", sys: "yardi" }, { cat: "GL", sys: "gl" }, { cat: "ESG", sys: "esg" }].map(s => {
                        const it = getIngestItems().find(i => i.propId === prop.id && i.system === s.sys);
                        return (
                          <div key={s.cat} style={{ fontSize: 9, color: "#94a3b8" }}>
                            <span style={{ color: "#7c8fa8" }}>{s.cat} </span>{it ? timeAgo(it.ts) : "—"}
                          </div>
                        );
                      })}
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>As of <span style={{ color: "#6b7a96" }}>{snap.month}</span></div>
                    </div>
                  </div>
                </div>

                {/* Right: key highlights panel */}
                <div style={{ padding: "14px 18px", background: "#fafbfd" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Key Highlights</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {highlights.slice(0, 7).map((h, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "5px 8px", background: "#ffffff", border: `1px solid ${h.color}22`, borderLeft: `3px solid ${h.color}`, borderRadius: 5 }}>
                        <span style={{ fontSize: 11, flexShrink: 0, lineHeight: 1.3 }}>{h.icon}</span>
                        <span style={{ fontSize: 10, color: "#374151", lineHeight: 1.4 }}>{h.text}</span>
                      </div>
                    ))}
                    {highlights.length === 0 && (
                      <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>No active alerts — asset performing within targets</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* SWIMLANE 2 — Timeline */}
          {events.length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>5-Year Event Timeline</div>
              <div style={{ overflowX: "auto", paddingBottom: 8 }}>
                <div style={{ position: "relative", minWidth: 900, height: 100 }}>
                  <div style={{ height: 2, background: "#d1dae8", borderRadius: 1, position: "absolute", left: 0, right: 0, top: 48 }} />
                  {tickMonths.map(m => {
                    const idx = allMonths.indexOf(m);
                    const pct = (idx / (allMonths.length - 1)) * 100;
                    return (
                      <div key={m} style={{ position: "absolute", left: `${pct}%`, top: 44, transform: "translateX(-50%)" }}>
                        <div style={{ width: 1, height: 8, background: "#94a3b8", margin: "0 auto" }} />
                        <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 3, whiteSpace: "nowrap" }}>{m.slice(0, 7)}</div>
                      </div>
                    );
                  })}
                  {/* Current */}
                  {(() => {
                    const idx = allMonths.indexOf(snap.month);
                    const pct = (idx / (allMonths.length - 1)) * 100;
                    return <div style={{ position: "absolute", left: `${pct}%`, top: 42, transform: "translateX(-50%)", width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 0 4px rgba(59,130,246,0.2)", animation: "pulse 2s infinite" }} />;
                  })()}
                  {events.map((ev, i) => {
                    const idx = allMonths.indexOf(ev.month);
                    if (idx < 0) return null;
                    const pct = (idx / (allMonths.length - 1)) * 100;
                    const above = i % 2 === 0;
                    // Clamp horizontally so tooltip never overflows left/right edge
                    const nearLeft  = pct < 12;
                    const nearRight = pct > 85;
                    const tipStyle = {
                      position: "absolute",
                      // Horizontal anchor: left-edge events anchor to left, right-edge to right, else centre
                      ...(nearLeft  ? { left: -6 }              : {}),
                      ...(nearRight ? { right: -6 }             : {}),
                      ...(!nearLeft && !nearRight ? { left: "50%", transform: "translateX(-50%)" } : {}),
                      // Vertical: above dots sit below icon, below dots sit above icon
                      ...(above ? { top: 32 } : { bottom: 32 }),
                      background: "#ffffff",
                      border: `1.5px solid ${ev.color}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      whiteSpace: "nowrap",
                      zIndex: 200,
                      boxShadow: "0 6px 24px rgba(15,23,42,0.15)",
                      minWidth: 240,
                      pointerEvents: "none",
                    };
                    // Arrow sits at the edge that touches the dot
                    const arrowHPos = nearLeft ? { left: 10 } : nearRight ? { right: 10 } : { left: "50%", transform: "translateX(-50%)" };
                    const arrowVPos = above ? { top: -6 } : { bottom: -6 };
                    const arrowRotate = above ? "rotate(45deg)" : "rotate(225deg)";
                    return (
                      <div key={i}
                        onClick={() => setSelectedEventIdx(selectedEventIdx === i ? null : i)}
                        onMouseEnter={() => setHoveredEventIdx(i)}
                        onMouseLeave={() => setHoveredEventIdx(null)}
                        style={{ position: "absolute", left: `${pct}%`, top: above ? 10 : 56, transform: "translateX(-50%)", cursor: "pointer", zIndex: (selectedEventIdx === i || hoveredEventIdx === i) ? 60 : 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: ev.color + "18", border: `2px solid ${ev.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, transition: "all 0.15s", boxShadow: (selectedEventIdx === i || hoveredEventIdx === i) ? `0 0 0 4px ${ev.color}22` : "none" }}>{ev.icon}</div>
                        {(selectedEventIdx === i || hoveredEventIdx === i) && (
                          <div style={tipStyle}>
                            {/* Directional caret */}
                            <div style={{
                              position: "absolute",
                              ...arrowHPos,
                              ...arrowVPos,
                              width: 10,
                              height: 10,
                              background: "#ffffff",
                              borderLeft:   above ? `1.5px solid ${ev.color}` : "none",
                              borderTop:    above ? `1.5px solid ${ev.color}` : "none",
                              borderRight:  above ? "none" : `1.5px solid ${ev.color}`,
                              borderBottom: above ? "none" : `1.5px solid ${ev.color}`,
                              transform: arrowRotate,
                            }} />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: ev.color, textTransform: "uppercase", letterSpacing: "0.08em", background: ev.color + "15", padding: "2px 7px", borderRadius: 10 }}>{ev.type}</span>
                              <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{ev.month}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.4, marginBottom: 6 }}>{ev.icon} {ev.label}</div>
                            <div style={{ height: 1, background: "#e2eaf3", marginBottom: 8 }} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <div style={{ background: "#f8fafc", borderRadius: 5, padding: "5px 8px" }}>
                                <div style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "capitalize" }}>{ev.type}</div>
                              </div>
                              <div style={{ background: "#f8fafc", borderRadius: 5, padding: "5px 8px" }}>
                                <div style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Period</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{ev.month}</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 10, color: "#6b7a96" }}>Click to pin · hover to preview</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                {[["capex","#8b5cf6","🔨 Capex"],["state","#f59e0b","⚠ State"],["leasing","#3b82f6","📋 Leasing"],["operational","#ef4444","⚙ Operational"],["financial","#10b981","$ Financial"]].map(([t,c,l]) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#7c8fa8" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SWIMLANE 3 — High-level KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              {
                title: "Operational KPIs", color: "#3b82f6",
                kpis: [
                  { label: "Occupancy",        value: fmtPct(snap.occupancy),              delta: snap.occupancy - prevSnap.occupancy, k: "occupancy", v: snap.occupancy,              sparkData: snaps.slice(-12).map(s => s.occupancy) },
                  { label: "WALE",             value: `${snap.wale.toFixed(1)}yr`,          delta: snap.wale - prevSnap.wale,          k: "wale",      v: snap.wale,                   sparkData: snaps.slice(-12).map(s => s.wale) },
                  { label: "Tenant Retention", value: fmtPct(snap.tenantRetentionRate),      k: "tenantRetentionRate", v: snap.tenantRetentionRate },
                  { label: "Net Absorption",   value: `${(snap.netAbsorptionSF/1000).toFixed(1)}k SF`, status: snap.netAbsorptionSF >= 0 ? "green" : "amber" },
                  { label: "WO Backlog",       value: `${snap.workOrderBacklog} / ${snap.workOrderAvgDays}d`, status: snap.workOrderBacklog > 15 ? "amber" : "green" },
                  { label: "Capex On-Time",    value: fmtPct(snap.capexOnTime),             k: "capexOnTime", v: snap.capexOnTime },
                  { label: "Energy Cost YoY",  value: fmtPct(snap.energyCostYoY, true),     k: "energyCostYoY", v: snap.energyCostYoY },
                  { label: "Avg Rent PSF",     value: `$${snap.avgRentPSF.toFixed(2)}`,     status: "green", sparkData: snaps.slice(-12).map(s => s.avgRentPSF) },
                ],
              },
              {
                title: "Financial KPIs", color: "#8b5cf6",
                kpis: [
                  { label: "NOI TTM",          value: fmtCurrency(snap.noiTTM * 1e6),       delta: snap.noiTTM - prevSnap.noiTTM, status: "green", sparkData: snaps.slice(-12).map(s => s.noiTTM) },
                  { label: "NOI vs Plan",      value: fmtPct(snap.noiPlanPct, true),        k: "noiPlanPct", v: snap.noiPlanPct },
                  { label: "DSCR / Headroom",  value: `${snap.dscr.toFixed(2)}x / +${snap.covenantHeadroom.toFixed(0)}bps`, k: "dscr", v: snap.dscr, sparkData: snaps.slice(-12).map(s => s.dscr) },
                  { label: "LTV",              value: fmtPct(snap.ltv),                     k: "ltv", v: snap.ltv, sparkData: snaps.slice(-12).map(s => s.ltv) },
                  { label: "In-Place Cap Rate",value: `${snap.capRateInPlace.toFixed(2)}%`, k: "capRateInPlace", v: snap.capRateInPlace },
                  { label: "IRR (TTM)",        value: fmtPct(snap.irrTTM, true),            k: "irrTTM", v: snap.irrTTM, sparkData: snaps.slice(-12).map(s => s.irrTTM) },
                  { label: "NOI Margin",       value: fmtPct(snap.noiMarginPct),            status: "green" },
                  { label: "Collections",      value: `${fmtPct(snap.collections)} / ${fmtPct(snap.delinquency)}`, k: "delinquency", v: snap.delinquency },
                ],
              },
            ].map(group => (
              <div key={group.title} style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: group.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{group.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {group.kpis.map(kpi => (
                    <KpiTile key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} sparkData={kpi.sparkData}
                      status={kpi.k ? kpiStatus(kpi.k, kpi.v) : (kpi.status || "green")}
                      onClick={() => setSidePanel({ type: "kpi", kpi, prop, snap, snaps })} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* SWIMLANE 4 — Detailed Financials */}
          <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
            <div onClick={() => setShowFinancials(!showFinancials)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", cursor: "pointer", borderBottom: showFinancials ? "1px solid #e2eaf3" : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em" }}>Detailed Financial Statement</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { label: "Revenue", value: fmtCurrency((fin.baseRent + fin.recoveries + fin.otherIncome) * 1e6) },
                    { label: "Expenses", value: fmtCurrency((fin.utilities+fin.rm+fin.taxes+fin.insurance+fin.mgmtFee) * 1e6) },
                    { label: "NOI", value: fmtCurrency(fin.noi * 1e6), highlight: true },
                  ].map(s => (
                    <span key={s.label} style={{ fontSize: 10, color: s.highlight ? "#1d4ed8" : "#7c8fa8", background: s.highlight ? "#eff6ff" : "#f1f5f9", borderRadius: 4, padding: "2px 7px", fontFamily: "'DM Mono', monospace" }}>
                      {s.label}: <strong>{s.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{showFinancials ? "Collapse" : "Expand"}</span>
                <span style={{ fontSize: 14, color: "#94a3b8", transition: "transform 0.2s", display: "inline-block", transform: showFinancials ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              </div>
            </div>
            {showFinancials && <div style={{ padding: "0 0 4px" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Line Item", "TTM ($M)", "Budget ($M)", "Variance", "Var %", "Source"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #d1dae8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Base Rent",         actual: fin.baseRent,   budget: fin.baseRent * 1.03,   source: "Yardi PMS",    section: "REVENUE",   exp: false },
                  { label: "CAM / Recoveries",  actual: fin.recoveries, budget: fin.recoveries * 0.98, source: "Yardi PMS",    indent: true,         exp: false },
                  { label: "Other Income",       actual: fin.otherIncome,budget: fin.otherIncome * 1.05,source: "Yardi PMS",    indent: true,         exp: false },
                  { label: "TI Amortization",   actual: fin.baseRent*0.04, budget: fin.baseRent*0.035, source: "GL/ERP",       indent: true,         exp: false },
                  { label: "Total Revenue",      actual: fin.baseRent + fin.recoveries + fin.otherIncome, budget: (fin.baseRent*1.03+fin.recoveries*0.98+fin.otherIncome*1.05), source: "GL/ERP", bold: true, exp: false },
                  { label: "Utilities",          actual: fin.utilities,  budget: fin.utilities * 0.92,  source: "ESG/Utilities",section: "EXPENSES",  exp: true, indent: true },
                  { label: "Repairs & Maint.",   actual: fin.rm,         budget: fin.rm * 0.95,         source: "CMMS",         exp: true, indent: true },
                  { label: "Property Taxes",     actual: fin.taxes,      budget: fin.taxes,             source: "GL/ERP",       exp: true, indent: true },
                  { label: "Insurance",          actual: fin.insurance,  budget: fin.insurance,         source: "GL/ERP",       exp: true, indent: true },
                  { label: "Mgmt Fees",          actual: fin.mgmtFee,    budget: fin.mgmtFee,           source: "GL/ERP",       exp: true, indent: true },
                  { label: "Total Expenses",     actual: fin.utilities+fin.rm+fin.taxes+fin.insurance+fin.mgmtFee, budget: fin.utilities*0.92+fin.rm*0.95+fin.taxes+fin.insurance+fin.mgmtFee, source: "GL/ERP", bold: true, exp: true },
                  { label: "NOI",                actual: fin.noi,        budget: fin.noi*(1+snap.noiPlanPct/100*-1), source: "GL/ERP", bold: true, highlight: true },
                  { label: "EBITDA (proxy)",     actual: fin.noi*1.06,   budget: fin.noi*1.06*(1+snap.noiPlanPct/100*-0.9), source: "GL/ERP", bold: false },
                  { label: "A/R Aging 30+",      actual: fin.arAging30,  budget: 0, source: "Yardi",    section: "A/R & RISK" },
                  { label: "A/R Aging 60+",      actual: fin.arAging60,  budget: 0, source: "Yardi",    indent: true },
                  { label: "Bad Debt Reserve",   actual: fin.badDebt,    budget: 0, source: "GL/ERP",   indent: true },
                  { label: "TI Cost per SF",     actual: snap.tiCostPerSF * (prop.nra || 200000) / 1e6 / 10, budget: 0, source: "Leasing CRM", section: "LEASING ECONOMICS" },
                  { label: "LC as % of Rent",    actual: snap.lcPct / 100 * fin.baseRent, budget: 0, source: "Leasing CRM", indent: true },
                  { label: "Avg Free Rent",      actual: snap.freeRentMonths * fin.baseRent / 120, budget: 0, source: "Leasing CRM", indent: true },
                ].map((row, i) => {
                  const hasVar = row.budget !== 0;
                  const variance = hasVar ? row.actual - row.budget : 0;
                  const varPct = hasVar && row.budget ? (variance / Math.abs(row.budget)) * 100 : 0;
                  const isGood = row.exp ? variance <= 0 : variance >= 0;
                  const varColor = hasVar ? (isGood ? "#10b981" : "#ef4444") : "#94a3b8";
                  return (
                    <tr key={i} onClick={() => setSidePanel({ type: "financial", row, prop, snap })}
                      style={{ borderBottom: "1px solid #e2eaf3", cursor: "pointer", background: row.highlight ? "rgba(59,130,246,0.04)" : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = row.highlight ? "rgba(59,130,246,0.04)" : "transparent"}>
                      <td style={{ padding: "9px 14px", paddingLeft: row.indent ? 28 : 14, color: row.section ? "#3b82f6" : row.bold ? "#0f172a" : "#6b7a96", fontWeight: row.bold ? 700 : 400, fontSize: row.section ? 9 : 12 }}>
                        {row.section && <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>{row.section}</div>}
                        {row.label}
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", color: "#1e3a5f", fontWeight: row.bold ? 700 : 400 }}>{fmtCurrency(row.actual * 1e6)}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", color: "#7c8fa8" }}>{hasVar ? fmtCurrency(row.budget * 1e6) : "—"}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", color: varColor }}>{hasVar ? `${variance >= 0 ? "+" : ""}${fmtCurrency(variance * 1e6)}` : "—"}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", color: varColor }}>{hasVar ? `${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}%` : "—"}</td>
                      <td style={{ padding: "9px 14px", color: "#94a3b8", fontSize: 11 }}>{row.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>}
          </div>

          {/* SWIMLANE 5 — Simulation */}
          <div style={{ background: "#ffffff", border: "1px solid #8b5cf622", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.07em" }}>Simulation Workbench — Quick Preview</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Fast scenario estimates · For full simulation, open Simulation Agent tab</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onNavigateToSim && onNavigateToSim(selectedPropId)}
                  style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  ⚗ Open Simulation Agent
                </button>
                <button onClick={() => setShowMemo(!showMemo)}
                  style={{ background: "#f8fafc", border: "1px solid #94a3b8", borderRadius: 8, padding: "9px 18px", color: "#6b7a96", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {showMemo ? "Hide" : "Quick"} Memo
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 20 }}>
              {Object.entries(scenarios).map(([key, sc]) => (
                <div key={key} onClick={() => setActiveScenario(key)}
                  style={{ background: activeScenario === key ? "#eff6ff" : "#f8fafc", border: `1.5px solid ${activeScenario === key ? "#3b82f6" : "#d1dae8"}`, borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: activeScenario === key ? "#2563eb" : "#6b7a96", marginBottom: 10, lineHeight: 1.3 }}>{sc.label}</div>
                  {[
                    { lbl: "NOI Δ 12mo", v: sc.noi12, fmt: v => `${v >= 0 ? "+" : ""}${fmtCurrency(v * 1e6)}`, color: v => v >= 0 ? "#10b981" : "#ef4444" },
                    { lbl: "NOI Δ 24mo", v: sc.noi24, fmt: v => `${v >= 0 ? "+" : ""}${fmtCurrency(v * 1e6)}`, color: v => v >= 0 ? "#10b981" : "#ef4444" },
                    { lbl: "Occ Δ",      v: sc.occDelta, fmt: v => `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`, color: v => v >= 0 ? "#10b981" : "#ef4444" },
                    { lbl: "Breach %",   v: sc.covenantBreachProb, fmt: v => `${v}%`, color: v => v > 30 ? "#ef4444" : v > 15 ? "#f59e0b" : "#10b981" },
                  ].map(row => (
                    <div key={row.lbl} style={{ marginBottom: 5 }}>
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>{row.lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: row.color(row.v), fontFamily: "'DM Mono', monospace" }}>{row.fmt(row.v)}</div>
                    </div>
                  ))}
                  <StateBadge state={sc.health} />
                </div>
              ))}
            </div>
            {showMemo && (() => {
              const sc = scenarios[activeScenario];
              const isBaseline = activeScenario === "baseline";
              const altScenarios = Object.entries(scenarios).filter(([k]) => k !== activeScenario && k !== "baseline");
              const bestAlt = altScenarios.reduce((best, [k, s]) => s.noi24 > best[1].noi24 ? [k, s] : best, altScenarios[0] || ["none", { noi24: 0 }]);
              const noiDirection = sc.noi24 > 0 ? "improve" : sc.noi24 < 0 ? "decline" : "remain flat";
              const occDirection = sc.occDelta > 0 ? "increase" : sc.occDelta < 0 ? "decrease" : "remain stable";
              const stateTransition = sc.health !== health.health_state ? `transition from ${health.health_state} to ${sc.health}` : `remain at ${sc.health}`;
              const dataDate = snap.month;
              return (
                <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, overflow: "hidden" }}>
                  {/* Memo header */}
                  <div style={{ background: "#0f172a", padding: "18px 28px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Investment Committee Memorandum — Confidential</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em" }}>{prop.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{prop.type} · {prop.location} · {prop.strategy} · As of {dataDate}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <StateBadge state={health.health_state} />
                        <div style={{ fontSize: 22, fontWeight: 900, color: stateColor, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>{health.health_score}<span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}> / 100</span></div>
                      </div>
                    </div>
                    {/* Recommendation banner */}
                    <div style={{ marginTop: 14, background: "#1e3a5f", borderRadius: 7, padding: "10px 16px", borderLeft: "3px solid #3b82f6" }}>
                      <span style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recommended Action · </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{sc.label}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 12 }}>Projected NOI {sc.noi24 >= 0 ? "+" : ""}{fmtCurrency(sc.noi24 * 1e6)} over 24 months · Covenant breach risk: {sc.covenantBreachProb}%</span>
                    </div>
                  </div>

                  <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Left column */}
                    <div>
                      {/* Section 1: Current State */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 5, borderBottom: "2px solid #e2eaf3" }}>1. Current Situation</div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                          {prop.name} is a {fmtNum(prop.nra || (prop.units || 0) * 900)}{prop.type === "Multifamily" ? " unit" : " SF"} {prop.type.toLowerCase()} asset located in {prop.location}, currently classified as <strong style={{ color: stateColor }}>{health.health_state}</strong> with a Digital Twin health score of <strong>{health.health_score}/100</strong>. {health.top_drivers.length > 0 ? `The primary risk factors driving this assessment are: ${health.top_drivers.map(d => d.label.toLowerCase()).join(", ")}.` : "The asset is performing within expected parameters."} Current occupancy stands at <strong>{snap.occupancy.toFixed(1)}%</strong> with a WALE of <strong>{snap.wale.toFixed(1)} years</strong>. NOI for the trailing twelve months is <strong>{fmtCurrency(snap.noiTTM * 1e6)}</strong>, tracking <strong>{snap.noiPlanPct.toFixed(1)}%</strong> versus the approved budget. The DSCR of <strong>{snap.dscr.toFixed(2)}x</strong> provides <strong>{snap.covenantHeadroom.toFixed(0)} bps</strong> of headroom against the 1.15x covenant floor.
                        </p>
                      </div>

                      {/* Section 2: Recommended Scenario */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 5, borderBottom: "2px solid #e2eaf3" }}>2. Recommended Scenario: {sc.label}</div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: "0 0 10px 0" }}>
                          {isBaseline
                            ? `The baseline scenario maintains the current operating strategy with no structural changes. Under this trajectory, the asset's health state is expected to ${stateTransition}. NOI is projected to remain at current levels over the near-term horizon, with covenant breach probability at ${sc.covenantBreachProb}%.`
                            : `Execution of the ${sc.label} strategy is recommended as the optimal risk-adjusted path given current asset conditions. Under this scenario, NOI is projected to ${noiDirection} by ${fmtCurrency(Math.abs(sc.noi24) * 1e6)} over a 24-month horizon, with a near-term 12-month impact of ${sc.noi12 >= 0 ? "+" : ""}${fmtCurrency(sc.noi12 * 1e6)}. Occupancy is expected to ${occDirection}${Math.abs(sc.occDelta) > 0 ? ` by ${Math.abs(sc.occDelta).toFixed(1)} percentage points` : ""}, and the asset's health classification is expected to ${stateTransition}. The probability of covenant breach under this scenario is modelled at ${sc.covenantBreachProb}%, ${sc.covenantBreachProb < scenarios.baseline.covenantBreachProb ? `a material reduction from the baseline risk of ${scenarios.baseline.covenantBreachProb}%` : `compared to ${scenarios.baseline.covenantBreachProb}% under the baseline`}.`
                          }
                        </p>
                        {/* KPI impact grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                          {[
                            { label: "NOI Impact (12mo)", value: `${sc.noi12 >= 0 ? "+" : ""}${fmtCurrency(sc.noi12 * 1e6)}`, color: sc.noi12 >= 0 ? "#059669" : "#dc2626" },
                            { label: "NOI Impact (24mo)", value: `${sc.noi24 >= 0 ? "+" : ""}${fmtCurrency(sc.noi24 * 1e6)}`, color: sc.noi24 >= 0 ? "#059669" : "#dc2626" },
                            { label: "Occupancy Δ", value: `${sc.occDelta >= 0 ? "+" : ""}${sc.occDelta.toFixed(1)}pp`, color: sc.occDelta >= 0 ? "#059669" : "#dc2626" },
                            { label: "Covenant Breach Risk", value: `${sc.covenantBreachProb}%`, color: sc.covenantBreachProb > 30 ? "#dc2626" : sc.covenantBreachProb > 15 ? "#d97706" : "#059669" },
                            { label: "Projected State", value: sc.health, color: STATE_CONFIG[sc.health]?.color || "#374151" },
                            { label: "Current State", value: health.health_state, color: stateColor },
                          ].map(m => (
                            <div key={m.label} style={{ background: "#f8fafc", border: "1px solid #e2eaf3", borderRadius: 5, padding: "6px 10px" }}>
                              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: m.color, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right column */}
                    <div>
                      {/* Section 3: Alternatives Considered */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 5, borderBottom: "2px solid #e2eaf3" }}>3. Alternatives Considered</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {Object.entries(scenarios).filter(([k]) => k !== activeScenario).map(([k, s]) => {
                            const isBetter = s.noi24 > sc.noi24;
                            const isBaseline2 = k === "baseline";
                            return (
                              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f8fafc", borderRadius: 5, border: "1px solid #e2eaf3" }}>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{s.label}</span>
                                  {isBaseline2 && <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 5 }}>(do nothing)</span>}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: s.noi24 >= 0 ? "#059669" : "#dc2626", fontFamily: "'DM Mono', monospace" }}>{s.noi24 >= 0 ? "+" : ""}{fmtCurrency(s.noi24 * 1e6)}</span>
                                <span style={{ fontSize: 9, color: s.covenantBreachProb > 20 ? "#dc2626" : "#94a3b8" }}>{s.covenantBreachProb}% breach</span>
                                <span style={{ fontSize: 9, color: isBetter ? "#059669" : "#94a3b8", fontWeight: isBetter ? 700 : 400 }}>{isBetter ? "↑ Higher upside" : k === activeScenario ? "✓ Selected" : "↓ Lower"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 4: Recommended Actions */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 5, borderBottom: "2px solid #e2eaf3" }}>4. Required Actions</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {health.recommended_actions.map((a, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", background: "#f8fafc", borderRadius: 5, border: "1px solid #e2eaf3" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                              <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 5: Data Provenance */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 5, borderBottom: "2px solid #e2eaf3" }}>5. Data Provenance & Confidence</div>
                        <p style={{ fontSize: 11, color: "#6b7a96", lineHeight: 1.65, margin: "0 0 8px 0" }}>
                          All analysis is derived from live institutional data feeds as of <strong>{dataDate}</strong>. GL close data last reconciled {_systemStatus.gl ? timeAgo(_systemStatus.gl.lastRun) : "—"}; Yardi PMS last synced {_systemStatus.yardi ? timeAgo(_systemStatus.yardi.lastRun) : "—"}; Argus forecast last run {_systemStatus.forecast ? timeAgo(_systemStatus.forecast.lastRun) : "—"}; CoStar market comps refreshed {_systemStatus.market ? timeAgo(_systemStatus.market.lastRun) : "—"}.
                        </p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[["NOI / Financials", "GL/ERP"], ["Occupancy / Leasing", "Yardi PMS"], ["Capex Tracking", "CMMS"], ["Market Comps", "CoStar"]].map(([label, sys]) => (
                            <span key={label} style={{ fontSize: 9, color: "#6b7a96", background: "#f1f5f9", borderRadius: 3, padding: "2px 7px" }}>{label}: <strong>{sys}</strong></span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ background: "#f8fafc", borderTop: "1px solid #e2eaf3", padding: "10px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Generated by RealDT Digital Twin Engine · {dataDate} · For IC use only — Not for distribution</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Health Score: {health.health_score}/100 · Model version 2.4</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Side panel */}
      <SidePanel open={!!sidePanel} onClose={() => setSidePanel(null)} title={sidePanel?.kpi?.label || sidePanel?.row?.label || ""}>
        {sidePanel && (() => {
          const isKpi = sidePanel.type === "kpi";
          const spData = isKpi ? (sidePanel.kpi.sparkData || snaps.slice(-12).map(s => s.noiTTM)) : snaps.slice(-12).map(s => s.noiTTM);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 4 }}>Current Value</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{isKpi ? sidePanel.kpi.value : fmtCurrency((sidePanel.row?.actual || 0) * 1e6)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 8 }}>12-Month Trend</div>
                <Sparkline data={spData} color="#3b82f6" width={350} height={64} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Recent Signals</div>
                {getIngestItems().filter(i => i.propId === prop.id).slice(0, 5).map(it => (
                  <div key={it.id} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 6, marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#1e3a5f" }}>{it.label}</span>
                      <SensitivityBadge level={it.sensitivity} />
                    </div>
                    <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>{timeAgo(it.ts)} · {SYSTEMS.find(s => s.id === it.system)?.name}</div>
                  </div>
                ))}
                {getIngestItems().filter(i => i.propId === prop.id).length === 0 && (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Run batch to load signals</div>
                )}
              </div>
              <button onClick={() => { onNavigateToSource(prop.id); setSidePanel(null); }}
                style={{ background: "#f8fafc", border: "1px solid #94a3b8", borderRadius: 8, padding: "10px 14px", color: "#6b7a96", fontSize: 12, cursor: "pointer" }}>
                View Audit Trail in Source Systems →
              </button>
              <button onClick={() => { onNavigateToSim && onNavigateToSim(prop.id); setSidePanel(null); }}
                style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", border: "none", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ⚗ Open in Simulation Agent →
              </button>
            </div>
          );
        })()}
      </SidePanel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — SOURCE SYSTEMS
// ─────────────────────────────────────────────────────────────────────────────

function SourceSystems({ batchCount, onNavigateToAsset }) {
  const [selectedSystem, setSelectedSystem] = useState("yardi");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, [batchCount]);

  const sys = SYSTEMS.find(s => s.id === selectedSystem);
  const status = _systemStatus[selectedSystem];
  const items = getIngestItems().filter(i => i.system === selectedSystem).slice(0, 10);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1500, margin: "0 auto", display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
      <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, overflow: "hidden", alignSelf: "start" }}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid #d1dae8", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Source Systems</div>
        {SYSTEMS.map(s => {
          const st = _systemStatus[s.id];
          return (
            <div key={s.id} onClick={() => setSelectedSystem(s.id)}
              style={{ padding: "13px 16px", cursor: "pointer", borderBottom: "1px solid #e2eaf3", background: selectedSystem === s.id ? "#edf2fb" : "transparent", borderLeft: `3px solid ${selectedSystem === s.id ? s.color : "transparent"}`, transition: "all 0.1s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: selectedSystem === s.id ? "#0f172a" : "#6b7a96" }}>{s.name}</div>
                <SysStatusBadge status={st?.status || "success"} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#7c8fa8" }}>{s.freq}</span>
                <span style={{ fontSize: 10, color: "#d1dae8" }}>·</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{st ? timeAgo(st.lastRun) : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        {loading ? (
          <div style={{ display: "grid", gap: 12 }}><Skeleton height={130} /><Skeleton height={320} /></div>
        ) : sys && status ? (
          <>
            <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: sys.color }} />
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{sys.name}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 2 }}>{sys.category} · {sys.freq} refresh</div>
                </div>
                <SysStatusBadge status={status.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: "Last Run",           value: fmtTS(status.lastRun) },
                  { label: "Records (Last Run)", value: fmtNum(status.records) },
                  { label: "Next Run",           value: fmtTS(status.nextRun) },
                  { label: "Status",             value: status.status.charAt(0).toUpperCase() + status.status.slice(1) },
                ].map(m => (
                  <div key={m.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e3a5f" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #d1dae8", fontSize: 11, fontWeight: 700, color: "#6b7a96" }}>Last 10 Ingested Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {["Timestamp", "Property", "Data Type", "Sensitivity", "Description", "Impact"].map(h => (
                      <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #d1dae8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} style={{ borderBottom: "1px solid #e2eaf3", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "11px 16px", color: "#7c8fa8", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtTS(it.ts)}</td>
                      <td style={{ padding: "11px 16px", color: "#1e3a5f", fontWeight: 600 }}>{it.property}</td>
                      <td style={{ padding: "11px 16px", color: "#6b7a96" }}>{it.dataType.replace(/_/g, " ")}</td>
                      <td style={{ padding: "11px 16px" }}><SensitivityBadge level={it.sensitivity} /></td>
                      <td style={{ padding: "11px 16px", color: "#6b7a96" }}>{it.label}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <button onClick={() => onNavigateToAsset(it.propId)}
                          style={{ background: "none", border: "1px solid #dbeafe", borderRadius: 4, padding: "3px 10px", color: "#3b82f6", cursor: "pointer", fontSize: 11 }}>
                          View impact →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>No items yet — run batch to ingest</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — SIMULATION AGENT
// ─────────────────────────────────────────────────────────────────────────────

const SIM_HORIZONS = [6, 12, 24, 36];
const DISRUPTION_LEVELS = ["Low", "Medium", "High"];
const OWNER_COLORS = { "Asset Manager": "#3b82f6", "Property Manager": "#10b981", "Finance Partner": "#8b5cf6", "Risk": "#ef4444", "Treasury": "#f59e0b" };

function SimulationAgent({ initialPropId, onNavigateToAsset, onNavigateToSource }) {
  const [propId, setPropId] = useState(initialPropId || "prop-001");
  const [asOfIdx, setAsOfIdx] = useState(59); // latest
  const [selectedScenA, setSelectedScenA] = useState(null);
  const [selectedScenB, setSelectedScenB] = useState(null);
  const [activeSlot, setActiveSlot] = useState("A"); // which slot clicking a library tile fills
  const [inputsA, setInputsA] = useState({});
  const [inputsB, setInputsB] = useState({});
  const [constraintsA, setConstraintsA] = useState({ noBudgetOverrun: false, noCovenant: true, minDisruption: false });
  const [constraintsB, setConstraintsB] = useState({ noBudgetOverrun: false, noCovenant: true, minDisruption: false });
  const [builderStep, setBuilderStep] = useState(1); // 1-4
  const [projA, setProjA] = useState(null);
  const [projB, setProjB] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showMemo, setShowMemo] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const [expandedCat, setExpandedCat] = useState("featured");
  const [reRunToast, setReRunToast] = useState(false);
  const [activeBuilder, setActiveBuilder] = useState("A");
  const [memoText, setMemoText] = useState("");
  const [libCollapsed, setLibCollapsed] = useState(false);
  const [builderCollapsed, setBuilderCollapsed] = useState(false);

  const prop = ALL_PROPERTIES.find(p => p.id === propId) || DETAIL_PROPS[0];
  const snaps = getSnapshots(propId);
  const snap = snaps[Math.min(asOfIdx, snaps.length - 1)];
  const meta = getAssetMeta(propId);
  const confidence = computeConfidence(propId);
  const health = computeHealthState(snap);
  const stateColor = STATE_CONFIG[health.health_state]?.color || "#10b981";

  useEffect(() => { setPropId(initialPropId || "prop-001"); }, [initialPropId]);
  useEffect(() => {
    if (selectedScenA && Object.keys(inputsA).length === 0) setInputsA(getDefaultInputs(selectedScenA.id, snap, meta));
  }, [selectedScenA]);
  useEffect(() => {
    if (selectedScenB && Object.keys(inputsB).length === 0) setInputsB(getDefaultInputs(selectedScenB.id, snap, meta));
  }, [selectedScenB]);

  // Simulate new signal
  useEffect(() => {
    if (!hasRun) return;
    const t = setTimeout(() => setReRunToast(true), 22000);
    return () => clearTimeout(t);
  }, [hasRun]);

  const handleSelectScenario = (scen) => {
    if (activeSlot === "A") {
      setSelectedScenA(scen); setInputsA(getDefaultInputs(scen.id, snap, meta)); setBuilderStep(2); setActiveBuilder("A");
    } else {
      setSelectedScenB(scen); setInputsB(getDefaultInputs(scen.id, snap, meta)); setBuilderStep(2); setActiveBuilder("B");
    }
  };

  const handleRun = () => {
    if (!selectedScenA && !selectedScenB) return;
    setRunning(true);
    setTimeout(() => {
      const pA = selectedScenA ? runScenario(snap, selectedScenA.id, inputsA, constraintsA, meta) : null;
      const pB = selectedScenB ? runScenario(snap, selectedScenB.id, inputsB, constraintsB, meta) : null;
      setProjA(pA); setProjB(pB);
      const rec = recommendDecision(snap, null, pA, pB, constraintsA);
      setRecommendation(rec);
      setHasRun(true); setRunning(false); setBuilderStep(4);
      setReRunToast(false);
    }, 1400);
  };

  const handleReset = () => {
    setSelectedScenA(null); setSelectedScenB(null); setInputsA({}); setInputsB({});
    setProjA(null); setProjB(null); setHasRun(false); setRecommendation(null);
    setTasks([]); setShowMemo(false); setBuilderStep(1);
  };

  const handleGenerateTasks = () => {
    const scenId = recommendation?.recommended?.toLowerCase().includes("scenario a") || (!recommendation?.recommended?.includes("B") && selectedScenA)
      ? selectedScenA?.id : selectedScenB?.id || selectedScenA?.id;
    setTasks(generateTasks(recommendation || {}, prop, scenId));
  };

  const handleGenerateMemo = () => {
    const memo = generateDecisionMemo(prop, snap, meta, selectedScenA, projA, selectedScenB, projB, recommendation || { recommended: "Baseline", rationale: ["Insufficient data for recommendation"], tradeoffs: [] }, confidence);
    setMemoText(memo);
    setShowMemo(true);
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(memoText).then(() => { setMemoCopied(true); setTimeout(() => setMemoCopied(false), 2500); });
  };

  const allPeriods = [6, 12, 24, 36];
  const projPeriods = allPeriods.filter(p => p <= (inputsA.time_horizon_months || inputsB.time_horizon_months || 24));
  const projectedStatesA = projA ? projectHealthState(snap, projA, projPeriods) : [];
  const projectedStatesB = projB ? projectHealthState(snap, projB, projPeriods) : [];

  const inputSliders = (scenId, inputs, setInputs) => {
    if (!scenId) return null;
    const upd = (k, v) => setInputs(prev => ({ ...prev, [k]: v }));
    const num = (k, label, min, max, step = 1, prefix = "", suffix = "") => (
      <div key={k} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: "#6b7a96", fontWeight: 600 }}>{label}</label>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{prefix}{typeof inputs[k] === "number" ? inputs[k].toLocaleString() : (inputs[k] || min)}{suffix}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={inputs[k] || min}
          onChange={e => upd(k, parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "#3b82f6", height: 4, cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>{prefix}{min}{suffix}</span>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>{prefix}{max}{suffix}</span>
        </div>
      </div>
    );
    const sel = (k, label, opts) => (
      <div key={k} style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "#6b7a96", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
        <div style={{ display: "flex", gap: 6 }}>
          {opts.map(o => (
            <button key={o} onClick={() => upd(k, o)}
              style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1px solid ${inputs[k] === o ? "#3b82f6" : "#d1dae8"}`, background: inputs[k] === o ? "#dbeafe" : "#f8fafc", color: inputs[k] === o ? "#2563eb" : "#6b7a96", fontSize: 11, cursor: "pointer", fontWeight: inputs[k] === o ? 700 : 400 }}>{o}</button>
          ))}
        </div>
      </div>
    );
    const tog = (k, label) => (
      <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: "#6b7a96" }}>{label}</label>
        <button onClick={() => upd(k, !inputs[k])} style={{ width: 36, height: 20, borderRadius: 10, background: inputs[k] ? "#1d4ed8" : "#d1dae8", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <div style={{ position: "absolute", top: 2, left: inputs[k] ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>
    );

    switch (scenId) {
      case "capex_delay": return (<>{num("capex_project_cost","Capex Project Cost",500000,15000000,100000,"$")}{num("delay_months","Delay Duration (months)",3,36,1,"","mo")}{num("mitigation_cost_pm","Mitigation Cost / Month",5000,80000,1000,"$")}{sel("disruption_level","Tenant Disruption Level",DISRUPTION_LEVELS)}{num("failure_prob_pct","Failure Probability (%)",5,80,1,"","%")}</>);
      case "accel_capex": return (<>{num("capex_project_cost","Capex Project Cost",500000,15000000,100000,"$")}{num("accel_months","Acceleration (months)",2,18,1,"","mo")}{num("overtime_cost_pct","Overtime Premium (%)",5,35,1,"","%")}{num("occ_uplift_pct","Expected Occupancy Uplift",1,15,0.5,"","%")}</>);
      case "lease_restructure": return (<>{num("top_n_leases","Target Expiring Leases",1,10,1)}{num("renewal_prob_uplift_pct","Renewal Probability Uplift",5,60,5,"","%")}{num("rent_concession_pct","Rent Concession (%)",1,20,1,"","%")}{num("free_rent_months","Free Rent (months)",0,12,1,"","mo")}{num("ti_psf","TI Allowance ($/SF)",10,120,5,"$")}{num("term_extension_months","Term Extension (months)",12,120,6,"","mo")}</>);
      case "refinance_early": return (<>{num("new_rate_pct","New Interest Rate (%)",3,9,0.25,"","%")}{num("refi_costs","Transaction Costs",50000,2000000,25000,"$")}{num("term_years","New Term (years)",3,15,1,"","yr")}{num("io_months","Interest-Only Period",0,36,3,"","mo")}{tog("hedge_enabled","Enable Interest Rate Hedge")}{inputs.hedge_enabled && num("hedge_cost","Hedge Cost (annual)",10000,500000,10000,"$")}</>);
      case "energy_retrofit": return (<>{num("retrofit_cost","Retrofit Investment",100000,5000000,50000,"$")}{num("energy_savings_pct","Energy Savings (%)",5,50,1,"","%")}{num("impl_months","Implementation Duration",2,24,1,"","mo")}{num("rebates","Incentives / Rebates",0,500000,10000,"$")}{tog("mv_enabled","Enable M&V Monitoring")}</>);
      case "major_vacancy": return (<>{num("vacancy_pct","Vacancy Impact (%)",5,60,1,"","%")}{num("backfill_months","Backfill Timeline (months)",6,36,1,"","mo")}</>);
      case "rate_spike": return (<>{num("rate_delta_bps","Rate Increase (bps)",25,400,25,"","bps")}</>);
      case "recession_noi": return (<>{num("noi_decline_pct","NOI Decline (%)",5,40,1,"","%")}</>);
      default: return <div style={{ fontSize: 12, color: "#7c8fa8" }}>Select a scenario to configure inputs.</div>;
    }
  };

  const DeltaChip = ({ label, base, delta, fmt = v => v.toFixed(1), inverted = false, suffix = "", why }) => {
    const isPos = delta > 0;
    const isGood = inverted ? !isPos : isPos;
    const color = delta === 0 ? "#7c8fa8" : isGood ? "#10b981" : "#ef4444";
    return (
      <div style={{ background: "#f8fafc", border: "1px solid #d1dae8", borderRadius: 7, padding: "9px 12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ fontSize: 10, color: "#7c8fa8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
          {delta !== null && delta !== undefined && (
            <div style={{ fontSize: 11, fontWeight: 700, color }}>
              {delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "→ "}{fmt(Math.abs(delta))}{suffix}
            </div>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono', monospace", marginBottom: why ? 4 : 0 }}>{fmt(base)}{suffix}</div>
        {why && <div style={{ fontSize: 9, color: "#6b7a96", lineHeight: 1.4, borderTop: "1px solid #e2eaf3", paddingTop: 4 }}>{why}</div>}
      </div>
    );
  };

  const StateStrip = ({ projected, label, color }) => {
    if (!projected || projected.length === 0) return null;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 5, fontWeight: 700 }}>{label}</div>
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: 52, height: 28, borderRadius: 4, background: STATE_CONFIG[health.health_state]?.bg, border: `1px solid ${STATE_CONFIG[health.health_state]?.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: STATE_CONFIG[health.health_state]?.color }}>NOW</div>
            <div style={{ fontSize: 8, color: "#94a3b8" }}>Today</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", color: "#d1dae8", fontSize: 12 }}>→</div>
          {projected.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: 52, height: 28, borderRadius: 4, background: STATE_CONFIG[p.health]?.bg, border: `1.5px solid ${STATE_CONFIG[p.health]?.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: STATE_CONFIG[p.health]?.color }}>{p.score}</div>
                <div style={{ fontSize: 8, color: "#7c8fa8" }}>{p.period}mo</div>
              </div>
              {i < projected.length - 1 && <div style={{ color: "#d1dae8", fontSize: 11 }}>→</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "0 0 40px", maxWidth: 1600, margin: "0 auto" }}>
      {/* ── HEADER STRIP ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e2eaf3", padding: "10px 32px", position: "sticky", top: 54, zIndex: 200 }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          {/* Single row: property picker | meta pill | as-of | freshness dots | KPI chips | actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap", overflowX: "auto" }}>

            {/* Property select */}
            <select onChange={e => { if (e.target.value) { setPropId(e.target.value); handleReset(); } }} value={propId}
              style={{ background: "#f8fafc", border: "1px solid #d1dae8", borderRadius: 7, padding: "5px 10px", color: "#0f172a", fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none", maxWidth: 240, flexShrink: 0 }}>
              {DETAIL_PROPS.map(p => <option key={p.id} value={p.id}>{p.name} — {p.location}</option>)}
              <option disabled>──────</option>
              {ALL_PROPERTIES.slice(5).map(p => <option key={p.id} value={p.id}>{p.name} — {p.location}</option>)}
            </select>

            {/* Type · Strategy pill */}
            <span style={{ fontSize: 10, color: "#7c8fa8", background: "#f1f5f9", borderRadius: 4, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
              {prop.type} · {prop.strategy}
            </span>



            {/* Source freshness — just coloured dots with tooltip, no text labels */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {Object.entries(getSourceFreshness(propId)).map(([feed, ts]) => {
                const ageHrs = (Date.now() - new Date(ts).getTime()) / 3600000;
                const fc = ageHrs > 48 ? "#ef4444" : ageHrs > 24 ? "#f59e0b" : "#10b981";
                return <div key={feed} title={`${feed}: ${timeAgo(ts)}`} style={{ width: 6, height: 6, borderRadius: "50%", background: fc, cursor: "default" }} />;
              })}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "#e2eaf3", flexShrink: 0 }} />

            {/* KPI chips — inline, no wrap */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto", flex: 1 }}>
              {[
                { label: "Occ", value: fmtPct(snap.occupancy), k: "occupancy", v: snap.occupancy },
                { label: "NOI", value: fmtPct(snap.noiPlanPct, true), k: "noiPlanPct", v: snap.noiPlanPct },
                { label: "DSCR", value: `${snap.dscr.toFixed(2)}x`, k: "dscr", v: snap.dscr },
                { label: "WALE", value: `${snap.wale.toFixed(1)}yr`, k: "wale", v: snap.wale },
                { label: "LTV", value: fmtPct(snap.ltv), k: "ltv", v: snap.ltv },
                { label: "Roll", value: fmtPct(meta.leaseRollover12m), status: meta.leaseRollover12m > 20 ? "red" : meta.leaseRollover12m > 12 ? "amber" : "green" },
                { label: "State", value: health.health_state, customColor: stateColor },
              ].map(chip => {
                const st = chip.k ? kpiStatus(chip.k, chip.v) : chip.status || "green";
                const c = chip.customColor || STATUS_COLORS[st] || STATUS_COLORS.green;
                return (
                  <div key={chip.label} style={{ display: "flex", alignItems: "center", gap: 4, background: c + "10", border: `1px solid ${c}28`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
                    <span style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{chip.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: c, fontFamily: "'DM Mono', monospace" }}>{chip.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={handleReset} style={{ background: "#f8fafc", border: "1px solid #d1dae8", borderRadius: 6, padding: "5px 11px", color: "#6b7a96", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↺</button>
              <button onClick={handleRun} disabled={(!selectedScenA && !selectedScenB) || running}
                style={{ background: running ? "#eff6ff" : "#1d4ed8", border: "none", borderRadius: 6, padding: "5px 14px", color: running ? "#2563eb" : "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: (!selectedScenA && !selectedScenB) ? 0.4 : 1, whiteSpace: "nowrap" }}>
                {running ? <><div style={{ width: 9, height: 9, border: "2px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Running…</> : "▶ Run"}
              </button>
              <button onClick={handleGenerateMemo} disabled={!hasRun}
                style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 6, padding: "5px 11px", color: hasRun ? "#6b7a96" : "#94a3b8", fontSize: 11, fontWeight: 600, cursor: hasRun ? "pointer" : "not-allowed", opacity: hasRun ? 1 : 0.45 }}>📄</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN BODY ── */}
      <div style={{ display: "grid", gridTemplateColumns: `${libCollapsed ? "40px" : "300px"} ${builderCollapsed ? "40px" : "1fr"} 1fr`, gap: 0, minHeight: "calc(100vh - 200px)", transition: "grid-template-columns 0.2s ease" }}>

        {/* ═══ LEFT: SCENARIO LIBRARY ═══ */}
        <div style={{ borderRight: "1px solid #e2eaf3", overflowY: libCollapsed ? "hidden" : "auto", maxHeight: "calc(100vh - 200px)", position: "sticky", top: 200, overflow: "hidden" }}>
          {libCollapsed ? (
            /* Collapsed: just a thin strip with expand button */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 10 }}>
              <button onClick={() => setLibCollapsed(false)} title="Expand Scenario Library"
                style={{ background: "#f1f5f9", border: "1px solid #d1dae8", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, color: "#6b7a96" }}>›</button>
              <div style={{ writingMode: "vertical-rl", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", transform: "rotate(180deg)", marginTop: 8, userSelect: "none" }}>Library</div>
            </div>
          ) : (
            <>
              <div style={{ padding: "13px 16px 11px", borderBottom: "1px solid #e2eaf3", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, background: "#ffffff", zIndex: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>Scenario Library</div>
                <button onClick={() => setLibCollapsed(true)} title="Collapse library"
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 1px", display: "flex", alignItems: "center" }}>‹</button>
              </div>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2eaf3" }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {["A", "B"].map(slot => (
                    <button key={slot} onClick={() => setActiveSlot(slot)}
                      style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1.5px solid ${activeSlot === slot ? "#3b82f6" : "#d1dae8"}`, background: activeSlot === slot ? "#eff6ff" : "#f8fafc", color: activeSlot === slot ? "#2563eb" : "#7c8fa8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Slot {slot}{slot === "A" && selectedScenA ? ` · ${selectedScenA.label.split(" ")[0]}` : slot === "B" && selectedScenB ? ` · ${selectedScenB.label.split(" ")[0]}` : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 310px)" }}>
                {SIM_CATEGORIES.map(cat => {
                  const scenarios = SCENARIO_LIBRARY.filter(s => s.category === cat.id);
                  const isOpen = expandedCat === cat.id;
                  return (
                    <div key={cat.id}>
                      <button onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                        style={{ width: "100%", background: isOpen ? "#f8fafc" : "none", border: "none", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderBottom: "1px solid #edf1f7" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isOpen ? "#1e3a5f" : "#6b7a96" }}>{cat.label}</span>
                          <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", borderRadius: 3, padding: "1px 5px" }}>{scenarios.length}</span>
                        </div>
                        <span style={{ fontSize: 9, color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && scenarios.map(scen => {
                        const isSelA = selectedScenA?.id === scen.id;
                        const isSelB = selectedScenB?.id === scen.id;
                        return (
                          <div key={scen.id} onClick={() => handleSelectScenario(scen)}
                            style={{ padding: "9px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: isSelA || isSelB ? scen.color + "0d" : "transparent", borderLeft: `3px solid ${isSelA ? "#3b82f6" : isSelB ? "#8b5cf6" : "transparent"}`, transition: "background 0.1s" }}
                            onMouseEnter={e => { if (!isSelA && !isSelB) e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isSelA || isSelB ? scen.color + "0d" : "transparent"; }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.4 }}>{scen.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scen.label}</div>
                                  {(isSelA || isSelB) && <div style={{ fontSize: 9, fontWeight: 800, color: isSelA ? "#2563eb" : "#7c3aed", background: isSelA ? "#eff6ff" : "#f5f3ff", borderRadius: 3, padding: "1px 4px", flexShrink: 0 }}>{isSelA ? "A" : "B"}</div>}
                                </div>
                                <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.4, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scen.desc.slice(0, 70)}…</div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 8, color: "#7c8fa8", background: "#f1f5f9", borderRadius: 3, padding: "2px 5px" }}>⏱ {scen.timeToImpact}</span>
                                  <span style={{ fontSize: 8, color: "#7c8fa8", background: "#f1f5f9", borderRadius: 3, padding: "2px 5px" }}>{scen.cost}</span>
                                  <span style={{ fontSize: 8, color: scen.riskReduction === "High" ? "#059669" : scen.riskReduction === "Med" ? "#d97706" : "#dc2626", background: "#f1f5f9", borderRadius: 3, padding: "2px 5px" }}>↓ {scen.riskReduction}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ═══ CENTER: SCENARIO BUILDER ═══ */}
        <div style={{ borderRight: "1px solid #e2eaf3", overflowY: builderCollapsed ? "hidden" : "auto", maxHeight: "calc(100vh - 200px)", position: "sticky", top: 200, overflow: "hidden" }}>
          {builderCollapsed ? (
            /* Collapsed: thin strip with expand button */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 10 }}>
              <button onClick={() => setBuilderCollapsed(false)} title="Expand Builder"
                style={{ background: "#f1f5f9", border: "1px solid #d1dae8", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, color: "#6b7a96" }}>›</button>
              <div style={{ writingMode: "vertical-rl", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", transform: "rotate(180deg)", marginTop: 8, userSelect: "none" }}>Builder</div>
            </div>
          ) : (
            <div style={{ padding: "20px 22px", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
              {/* Header with collapse button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em" }}>Scenario Builder</div>
                <button onClick={() => setBuilderCollapsed(true)} title="Collapse builder"
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 1px", display: "flex", alignItems: "center" }}>‹</button>
              </div>

              {/* Slot tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {["A", "B"].map(slot => {
                  const scen = slot === "A" ? selectedScenA : selectedScenB;
                  return (
                    <button key={slot} onClick={() => setActiveBuilder(slot)}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${activeBuilder === slot ? (slot === "A" ? "#3b82f6" : "#8b5cf6") : "#d1dae8"}`, background: activeBuilder === slot ? (slot === "A" ? "#eff6ff" : "#f5f3ff") : "#f8fafc", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: activeBuilder === slot ? (slot === "A" ? "#2563eb" : "#7c3aed") : "#7c8fa8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Scenario {slot}</div>
                      <div style={{ fontSize: 11, color: scen ? "#1e3a5f" : "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scen ? scen.label : "Not selected"}</div>
                    </button>
                  );
                })}
              </div>

              {/* Steps */}
              {(() => {
                const scen = activeBuilder === "A" ? selectedScenA : selectedScenB;
                const inputs = activeBuilder === "A" ? inputsA : inputsB;
                const setInputs = activeBuilder === "A" ? setInputsA : setInputsB;
                const constraints = activeBuilder === "A" ? constraintsA : constraintsB;
                const setConstraints = activeBuilder === "A" ? setConstraintsA : setConstraintsB;

                if (!scen) return (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>←</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#7c8fa8" }}>Select a scenario from the library</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Click a tile to load it into Slot {activeBuilder}</div>
                  </div>
                );

                return (
                  <div>
                    {/* Step progress bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
                      {[{ n: 1, label: "Scenario" }, { n: 2, label: "Inputs" }, { n: 3, label: "Constraints" }, { n: 4, label: "Results" }].map((s, i) => {
                        const active = builderStep === s.n;
                        const done = builderStep > s.n;
                        return (
                          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "auto" }}>
                            <div onClick={() => setBuilderStep(s.n)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                              <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#10b981" : active ? "#3b82f6" : "#d1dae8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: done || active ? "#fff" : "#7c8fa8" }}>{done ? "✓" : s.n}</div>
                              <span style={{ fontSize: 10, color: active ? "#0f172a" : done ? "#10b981" : "#94a3b8", fontWeight: active ? 700 : 400 }}>{s.label}</span>
                            </div>
                            {i < 3 && <div style={{ flex: 1, height: 1, background: done ? "#10b981" : "#d1dae8", margin: "0 5px" }} />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Step 1: Overview */}
                    {builderStep >= 1 && (
                      <div style={{ background: "#f8fafc", border: `1px solid ${scen.color}33`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ fontSize: 22 }}>{scen.icon}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 3 }}>{scen.label}</div>
                            <div style={{ fontSize: 11, color: "#6b7a96", lineHeight: 1.55 }}>{scen.desc}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 9, color: "#7c8fa8", background: "#edf1f7", borderRadius: 4, padding: "3px 7px" }}>⏱ {scen.timeToImpact}</span>
                              <span style={{ fontSize: 9, color: "#7c8fa8", background: "#edf1f7", borderRadius: 4, padding: "3px 7px" }}>Cost: {scen.cost}</span>
                              <span style={{ fontSize: 9, color: scen.riskReduction === "High" ? "#059669" : "#d97706", background: "#edf1f7", borderRadius: 4, padding: "3px 7px" }}>Risk ↓: {scen.riskReduction}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setBuilderStep(2)} style={{ marginTop: 10, background: "#dbeafe", border: "none", borderRadius: 6, padding: "6px 16px", color: "#2563eb", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Configure inputs →</button>
                      </div>
                    )}

                    {/* Step 2: Inputs */}
                    {builderStep >= 2 && (
                      <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Step 2 — Inputs</div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, color: "#6b7a96", fontWeight: 600, display: "block", marginBottom: 5 }}>Time Horizon</label>
                          <div style={{ display: "flex", gap: 5 }}>
                            {SIM_HORIZONS.map(h => (
                              <button key={h} onClick={() => setInputs(p => ({ ...p, time_horizon_months: h }))}
                                style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1px solid ${inputs.time_horizon_months === h ? "#3b82f6" : "#d1dae8"}`, background: inputs.time_horizon_months === h ? "#eff6ff" : "#f8fafc", color: inputs.time_horizon_months === h ? "#2563eb" : "#7c8fa8", fontSize: 11, cursor: "pointer", fontWeight: inputs.time_horizon_months === h ? 700 : 400 }}>{h}mo</button>
                            ))}
                          </div>
                        </div>
                        {inputSliders(scen.id, inputs, setInputs)}
                        <button onClick={() => setBuilderStep(3)} style={{ marginTop: 4, background: "#dbeafe", border: "none", borderRadius: 6, padding: "6px 16px", color: "#2563eb", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Set constraints →</button>
                      </div>
                    )}

                    {/* Step 3: Constraints */}
                    {builderStep >= 3 && (
                      <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Step 3 — Constraints</div>
                        {[
                          { k: "noBudgetOverrun", label: "Do not exceed capex budget" },
                          { k: "noCovenant",      label: "No covenant breach allowed" },
                          { k: "minDisruption",   label: "Minimize occupancy disruption" },
                        ].map(c => (
                          <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: constraints[c.k] ? "#eff6ff" : "#f8fafc", border: `1px solid ${constraints[c.k] ? "#dbeafe" : "#e2eaf3"}`, borderRadius: 6, marginBottom: 6, cursor: "pointer" }}
                            onClick={() => setConstraints(p => ({ ...p, [c.k]: !p[c.k] }))}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: constraints[c.k] ? "#1d4ed8" : "#d1dae8", border: `1.5px solid ${constraints[c.k] ? "#3b82f6" : "#94a3b8"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>
                              {constraints[c.k] ? "✓" : ""}
                            </div>
                            <span style={{ fontSize: 12, color: constraints[c.k] ? "#1e3a5f" : "#6b7a96", fontWeight: constraints[c.k] ? 600 : 400 }}>{c.label}</span>
                          </div>
                        ))}
                        <button onClick={handleRun} disabled={running}
                          style={{ marginTop: 10, width: "100%", background: running ? "#e2eaf3" : "#1d4ed8", border: "none", borderRadius: 7, padding: "10px", color: running ? "#6b7a96" : "#fff", fontSize: 12, fontWeight: 700, cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          {running ? <><div style={{ width: 11, height: 11, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Simulating…</> : "▶ Run Simulation"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: RESULTS & DECISION ═══ */}
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 200px)", padding: "20px 24px" }}>
          {!hasRun ? (
            <div style={{ textAlign: "center", padding: "80px 24px", color: "#94a3b8" }}>
              {running ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 40, height: 40, border: "3px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>Running simulation engine…</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Applying rule-based deltas · Projecting health states</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📊</div>
                  <div style={{ fontSize: 13, color: "#7c8fa8", fontWeight: 600 }}>Results will appear here</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Select a scenario, configure inputs, then run simulation</div>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* ── COMPARISON CARDS ── */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Baseline vs Scenario Comparison</div>

              {/* NOI row */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${1 + (projA ? 1 : 0) + (projB ? 1 : 0)}, 1fr)`, gap: 10, marginBottom: 16 }}>
                {/* Baseline */}
                <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#7c8fa8", textTransform: "uppercase", marginBottom: 10 }}>Baseline</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <DeltaChip label="NOI TTM" base={snap.noiTTM * 1e6} delta={0} fmt={v => fmtCurrency(v)} suffix="" why={`Trailing 12-month NOI; ${snap.noiPlanPct > 0 ? "ahead of" : "behind"} plan by ${Math.abs(snap.noiPlanPct).toFixed(1)}%`} />
                    <DeltaChip label="Occupancy" base={snap.occupancy} delta={0} fmt={v => v.toFixed(1) + "%"} why={`Current occupancy; WALE ${snap.wale.toFixed(1)}yr · ${snap.tenantRetentionRate.toFixed(0)}% retention`} />
                    <DeltaChip label="DSCR" base={snap.dscr} delta={0} fmt={v => v.toFixed(2) + "x"} why={`${snap.covenantHeadroom.toFixed(0)}bps headroom above 1.15x covenant floor`} />
                    <DeltaChip label="Breach Prob" base={snap.dscr < 1.25 ? 28 : 8} delta={0} fmt={v => v + "%"} inverted />
                    <DeltaChip label="Energy YoY" base={snap.energyCostYoY} delta={0} fmt={v => v.toFixed(1) + "%"} inverted />
                  </div>
                  <StateStrip projected={[{ period: 12, health: health.health_state, score: health.health_score }]} label="Projected State (12mo)" />
                </div>
                {projA && selectedScenA && (
                  <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", marginBottom: 10 }}>Scenario A · {selectedScenA.label}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <DeltaChip label="NOI @ 24mo" base={snap.noiTTM * 1e6 + projA.noi24} delta={projA.noi24} fmt={v => fmtCurrency(v)} why={projA.drivers?.[0]} />
                      <DeltaChip label="Occupancy Δ" base={snap.occupancy + (projA.occDelta24 || 0)} delta={projA.occDelta24 || 0} fmt={v => v.toFixed(1) + "%"} why={projA.drivers?.[1]} />
                      <DeltaChip label="DSCR Δ" base={snap.dscr + (projA.dscrDelta24 || 0)} delta={projA.dscrDelta24 || 0} fmt={v => v.toFixed(2) + "x"} why={projA.drivers?.[2]} />
                      <DeltaChip label="Breach Prob" base={projA.breachProb24} delta={projA.breachProb24 - (snap.dscr < 1.25 ? 28 : 8)} fmt={v => v + "%"} inverted />
                      <DeltaChip label="Energy YoY" base={snap.energyCostYoY + (projA.energyDelta || 0)} delta={projA.energyDelta || 0} fmt={v => v.toFixed(1) + "%"} inverted />
                    </div>
                    <StateStrip projected={projectedStatesA} label="Projected State" color="#3b82f6" />
                  </div>
                )}
                {projB && selectedScenB && (
                  <div style={{ background: "#f5f3ff", border: "1px solid #ede9fe", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", marginBottom: 10 }}>Scenario B · {selectedScenB.label}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <DeltaChip label="NOI @ 24mo" base={snap.noiTTM * 1e6 + projB.noi24} delta={projB.noi24} fmt={v => fmtCurrency(v)} why={projB.drivers?.[0]} />
                      <DeltaChip label="Occupancy Δ" base={snap.occupancy + (projB.occDelta24 || 0)} delta={projB.occDelta24 || 0} fmt={v => v.toFixed(1) + "%"} why={projB.drivers?.[1]} />
                      <DeltaChip label="DSCR Δ" base={snap.dscr + (projB.dscrDelta24 || 0)} delta={projB.dscrDelta24 || 0} fmt={v => v.toFixed(2) + "x"} why={projB.drivers?.[2]} />
                      <DeltaChip label="Breach Prob" base={projB.breachProb24} delta={projB.breachProb24 - (snap.dscr < 1.25 ? 28 : 8)} fmt={v => v + "%"} inverted />
                      <DeltaChip label="Energy YoY" base={snap.energyCostYoY + (projB.energyDelta || 0)} delta={projB.energyDelta || 0} fmt={v => v.toFixed(1) + "%"} inverted />
                    </div>
                    <StateStrip projected={projectedStatesB} label="Projected State" color="#8b5cf6" />
                  </div>
                )}
              </div>



              {/* ── DECISION RECOMMENDATION ── */}
              {recommendation && (() => {
                const winnerScen = recommendation.recommended === (selectedScenA?.label) ? selectedScenA
                  : recommendation.recommended === (selectedScenB?.label) ? selectedScenB
                  : null;
                const winnerProj = winnerScen === selectedScenA ? projA : winnerScen === selectedScenB ? projB : null;
                const altScen = winnerScen === selectedScenA ? selectedScenB : selectedScenA;
                const altProj = altScen === selectedScenA ? projA : projB;
                const scenColor = winnerScen?.color || "#1d4ed8";
                const projFinal = winnerProj ? (projectedStatesA || projectedStatesB).slice(-1)[0] : null;
                const isBaseline = !winnerScen;
                return (
                <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                  {/* Header */}
                  <div style={{ background: "#0f172a", padding: "16px 20px" }}>
                    <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Decision Recommendation · {prop.name} · {snap.month}</div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em" }}>
                          {winnerScen ? winnerScen.icon + " " : ""}{recommendation.recommended}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                          {winnerScen ? winnerScen.desc : "Maintain current operating trajectory — no structural changes recommended."}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <StateBadge state={health.health_state} />
                        <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>Current: {health.health_score}/100</div>
                        {projFinal && <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Projected: {projFinal.score}/100 → {projFinal.health}</div>}
                      </div>
                    </div>
                    {/* KPI impact row */}
                    {winnerProj && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12 }}>
                        {[
                          { label: "NOI Δ 24mo", value: (winnerProj.noi24 >= 0 ? "+" : "") + fmtCurrency(winnerProj.noi24), color: winnerProj.noi24 >= 0 ? "#10b981" : "#ef4444" },
                          { label: "Occ Δ", value: (winnerProj.occDelta24 >= 0 ? "+" : "") + (winnerProj.occDelta24 || 0).toFixed(1) + "pp", color: (winnerProj.occDelta24 || 0) >= 0 ? "#10b981" : "#ef4444" },
                          { label: "DSCR Δ", value: (winnerProj.dscrDelta24 >= 0 ? "+" : "") + (winnerProj.dscrDelta24 || 0).toFixed(2) + "x", color: (winnerProj.dscrDelta24 || 0) >= 0 ? "#10b981" : "#ef4444" },
                          { label: "Breach Risk", value: winnerProj.breachProb24 + "%", color: winnerProj.breachProb24 > 30 ? "#ef4444" : winnerProj.breachProb24 > 15 ? "#f59e0b" : "#10b981" },
                        ].map(m => (
                          <div key={m.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 5, padding: "6px 10px" }}>
                            <div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: m.color, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Left */}
                    <div>
                      {/* Why this scenario */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 5, borderBottom: "2px solid #e2eaf3", marginBottom: 8 }}>1. Why This Recommendation</div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: "0 0 8px" }}>
                          {isBaseline
                            ? `Given current asset metrics — occupancy at ${snap.occupancy.toFixed(1)}%, DSCR ${snap.dscr.toFixed(2)}x and health score ${health.health_score}/100 — the baseline trajectory is assessed as the most appropriate near-term path. No structural intervention is warranted at this stage, though active monitoring is required.`
                            : `The ${recommendation.recommended} scenario scores highest on a composite metric weighting NOI recovery, DSCR improvement, covenant breach probability reduction, and occupancy trajectory. ${winnerProj ? `Over a 24-month horizon, this delivers a projected NOI change of ${(winnerProj.noi24 >= 0 ? "+" : "") + fmtCurrency(winnerProj.noi24)} against a current baseline of ${fmtCurrency(snap.noiTTM * 1e6)}, with occupancy expected to ${(winnerProj.occDelta24 || 0) >= 0 ? "improve" : "decline"} by ${Math.abs(winnerProj.occDelta24 || 0).toFixed(1)}pp.` : ""}`
                          }
                        </p>
                        {(recommendation.rationale || []).map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#1d4ed8", flexShrink: 0, width: 16 }}>{i+1}.</span>
                            <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>{r}</span>
                          </div>
                        ))}
                      </div>

                      {/* Vs alternative */}
                      {altScen && altProj && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 5, borderBottom: "2px solid #e2eaf3", marginBottom: 8 }}>2. vs Alternative: {altScen.label}</div>
                          <div style={{ background: "#f8fafc", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#374151", lineHeight: 1.6 }}>
                            {altScen.label} was evaluated but ranked lower primarily due to {
                              altProj.breachProb24 > (winnerProj?.breachProb24 || 50)
                                ? `higher covenant breach probability (${altProj.breachProb24}% vs ${winnerProj?.breachProb24}%)`
                                : altProj.noi24 < (winnerProj?.noi24 || 0)
                                  ? `lower 24-month NOI outcome (${fmtCurrency(altProj.noi24)} vs ${fmtCurrency(winnerProj?.noi24 || 0)})`
                                  : `a less favourable risk-adjusted return profile`
                            }. {altScen.desc}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div>
                      {/* Tradeoffs */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 5, borderBottom: "2px solid #e2eaf3", marginBottom: 8 }}>3. Key Tradeoffs & Risks</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {(recommendation.tradeoffs || []).map((t, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, padding: "5px 8px", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 5 }}>
                              <span style={{ color: "#d97706", fontSize: 11, flexShrink: 0 }}>⚠</span>
                              <span style={{ fontSize: 11, color: "#374151" }}>{t}</span>
                            </div>
                          ))}
                          {winnerScen?.deps?.length > 0 && (
                            <div style={{ display: "flex", gap: 8, padding: "5px 8px", background: "#f8fafc", border: "1px solid #e2eaf3", borderRadius: 5 }}>
                              <span style={{ fontSize: 11, flexShrink: 0 }}>🔒</span>
                              <span style={{ fontSize: 11, color: "#374151" }}>Sign-offs required: {winnerScen.deps.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Monitoring */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 5, borderBottom: "2px solid #e2eaf3", marginBottom: 8 }}>4. Monitoring Triggers</div>
                        {[
                          { kpi: "DSCR", threshold: "< 1.20x", freq: "Monthly" },
                          { kpi: "Occupancy", threshold: `< ${Math.max(70, snap.occupancy - 5).toFixed(0)}%`, freq: "Weekly" },
                          { kpi: "NOI vs Plan", threshold: "< −8%", freq: "GL close" },
                          { kpi: "Capex Progress", threshold: "< 80%", freq: "Bi-weekly" },
                        ].map(m => (
                          <div key={m.kpi} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f", width: 90, flexShrink: 0 }}>{m.kpi}</span>
                            <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "'DM Mono', monospace", flex: 1 }}>{m.threshold}</span>
                            <span style={{ fontSize: 9, color: "#94a3b8" }}>{m.freq}</span>
                          </div>
                        ))}
                      </div>

                      {/* Data sources */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 5, borderBottom: "2px solid #e2eaf3", marginBottom: 8 }}>5. Data Sources</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {Object.entries(getSourceFreshness(propId)).map(([feed, ts]) => {
                            const ageHrs = (Date.now() - new Date(ts).getTime()) / 3600000;
                            const fc = ageHrs > 48 ? "#ef4444" : ageHrs > 24 ? "#f59e0b" : "#10b981";
                            return (
                              <div key={feed} style={{ display: "flex", alignItems: "center", gap: 3, background: "#f8fafc", border: "1px solid #e2eaf3", borderRadius: 4, padding: "2px 7px" }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: fc, flexShrink: 0 }} />
                                <span style={{ fontSize: 9, color: "#6b7a96", fontWeight: 600 }}>{feed}</span>
                                <span style={{ fontSize: 9, color: "#94a3b8" }}>{timeAgo(ts)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2eaf3", display: "flex", gap: 8 }}>
                    <button onClick={handleGenerateTasks} style={{ flex: 1, background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 7, padding: "9px", color: "#374151", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✅ Generate Action Tasks</button>
                    <button onClick={handleGenerateMemo} style={{ flex: 1, background: "#0f172a", border: "none", borderRadius: 7, padding: "9px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📄 IC Decision Memo</button>
                  </div>
                </div>
                );
              })()}

              {/* ── TASKS ── */}
              {tasks.length > 0 && (
                <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a96", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Action Tasks</div>
                  {tasks.map((task, i) => (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "#f8fafc", borderRadius: 7, marginBottom: 6, border: `1px solid ${task.status === "created" ? "#10b981" : "#d1dae8"}` }}>
                      <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: t.status === "created" ? "pending" : "created" } : t))}
                        style={{ width: 18, height: 18, borderRadius: 4, background: task.status === "created" ? "#10b981" : "#d1dae8", border: `1.5px solid ${task.status === "created" ? "#10b981" : "#94a3b8"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
                        {task.status === "created" ? "✓" : ""}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: task.status === "created" ? "#7c8fa8" : "#1e3a5f", textDecoration: task.status === "created" ? "line-through" : "none" }}>{task.task}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Due: {task.due}</div>
                      </div>
                      <div style={{ background: OWNER_COLORS[task.owner] + "20", border: `1px solid ${OWNER_COLORS[task.owner]}44`, borderRadius: 4, padding: "2px 7px", fontSize: 9, color: OWNER_COLORS[task.owner], fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>{task.owner}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── IC DECISION MEMO ── */}
              {showMemo && (() => {
                const winnerScen = recommendation?.recommended === selectedScenA?.label ? selectedScenA
                  : recommendation?.recommended === selectedScenB?.label ? selectedScenB : null;
                const winnerProj = winnerScen === selectedScenA ? projA : projB;
                const altScen = winnerScen === selectedScenA ? selectedScenB : selectedScenA;
                const altProj = altScen === selectedScenA ? projA : projB;
                const dataDate = snap.month;
                const projFinalStates = winnerProj ? (winnerScen === selectedScenA ? projectedStatesA : projectedStatesB) : [];
                const finalState = projFinalStates.slice(-1)[0];
                return (
                <div style={{ background: "#ffffff", border: "1px solid #d1dae8", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                  {/* Memo header */}
                  <div style={{ background: "#0f172a", padding: "18px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Investment Committee Memorandum — Confidential</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em" }}>{prop.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{prop.type} · {prop.location} · {prop.strategy} · As of {dataDate}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <StateBadge state={health.health_state} />
                        <div style={{ fontSize: 22, fontWeight: 900, color: stateColor, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>{health.health_score}<span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}> / 100</span></div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, background: "#1e3a5f", borderRadius: 7, padding: "10px 16px", borderLeft: "3px solid #3b82f6" }}>
                      <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Recommended Action · </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{winnerScen ? winnerScen.icon + " " + recommendation?.recommended : "Maintain Baseline"}</span>
                      {winnerProj && <span style={{ fontSize: 10, color: "#64748b", marginLeft: 12 }}>NOI {winnerProj.noi24 >= 0 ? "+" : ""}{fmtCurrency(winnerProj.noi24)} / 24mo · Breach risk: {winnerProj.breachProb24}%</span>}
                    </div>
                  </div>

                  <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {/* Left col */}
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #e2eaf3", paddingBottom: 5, marginBottom: 8 }}>1. Current Situation</div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                          {prop.name} is a {fmtNum(prop.nra || (prop.units || 0) * 900)}{prop.type === "Multifamily" ? " unit" : " SF"} {prop.type.toLowerCase()} asset in {prop.location}, currently rated <strong style={{ color: stateColor }}>{health.health_state}</strong> with a Digital Twin health score of <strong>{health.health_score}/100</strong>. {health.top_drivers.length > 0 ? `Key risk factors are: ${health.top_drivers.map(d => d.label.toLowerCase()).join("; ")}.` : "The asset is performing within expected parameters."} Current occupancy is <strong>{snap.occupancy.toFixed(1)}%</strong>, WALE <strong>{snap.wale.toFixed(1)} years</strong>, and NOI TTM <strong>{fmtCurrency(snap.noiTTM * 1e6)}</strong> ({snap.noiPlanPct.toFixed(1)}% vs budget). DSCR of <strong>{snap.dscr.toFixed(2)}x</strong> provides <strong>{snap.covenantHeadroom.toFixed(0)}bps</strong> of covenant headroom.
                        </p>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #e2eaf3", paddingBottom: 5, marginBottom: 8 }}>2. Recommended Scenario</div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: "0 0 10px" }}>
                          {winnerScen
                            ? `Execution of ${recommendation?.recommended} is recommended as the optimal risk-adjusted strategy. ${winnerScen.desc} Over 24 months, NOI is projected to ${(winnerProj?.noi24 || 0) >= 0 ? "improve" : "decline"} by ${fmtCurrency(Math.abs(winnerProj?.noi24 || 0))}, occupancy is expected to ${(winnerProj?.occDelta24 || 0) >= 0 ? "increase" : "decrease"} by ${Math.abs(winnerProj?.occDelta24 || 0).toFixed(1)}pp, and the asset health classification is projected to ${finalState ? (finalState.health !== health.health_state ? `transition from ${health.health_state} to ${finalState.health}` : `remain at ${health.health_state}`) : `remain at ${health.health_state}`}.`
                            : `The baseline trajectory is recommended. No structural intervention is optimal at this time given the current covenant headroom of ${snap.covenantHeadroom.toFixed(0)}bps and asset health score of ${health.health_score}/100. Active monitoring against the triggers below is required.`
                          }
                        </p>
                        {winnerProj && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {[
                              { label: "NOI 12mo", v: (winnerProj.noi12 >= 0 ? "+" : "") + fmtCurrency(winnerProj.noi12 || 0), c: (winnerProj.noi12 || 0) >= 0 ? "#059669" : "#dc2626" },
                              { label: "NOI 24mo", v: (winnerProj.noi24 >= 0 ? "+" : "") + fmtCurrency(winnerProj.noi24), c: winnerProj.noi24 >= 0 ? "#059669" : "#dc2626" },
                              { label: "Occ Δ", v: (winnerProj.occDelta24 >= 0 ? "+" : "") + (winnerProj.occDelta24 || 0).toFixed(1) + "pp", c: (winnerProj.occDelta24 || 0) >= 0 ? "#059669" : "#dc2626" },
                              { label: "Covenant Risk", v: winnerProj.breachProb24 + "%", c: winnerProj.breachProb24 > 30 ? "#dc2626" : winnerProj.breachProb24 > 15 ? "#d97706" : "#059669" },
                              { label: "DSCR Δ", v: (winnerProj.dscrDelta24 >= 0 ? "+" : "") + (winnerProj.dscrDelta24 || 0).toFixed(2) + "x", c: (winnerProj.dscrDelta24 || 0) >= 0 ? "#059669" : "#dc2626" },
                              { label: "Projected State", v: finalState?.health || health.health_state, c: STATE_CONFIG[finalState?.health || health.health_state]?.color || "#374151" },
                            ].map(m => (
                              <div key={m.label} style={{ background: "#f8fafc", border: "1px solid #e2eaf3", borderRadius: 5, padding: "6px 9px" }}>
                                <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" }}>{m.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: m.c, fontFamily: "'DM Mono', monospace" }}>{m.v}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right col */}
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #e2eaf3", paddingBottom: 5, marginBottom: 8 }}>3. Alternatives Considered</div>
                        {[selectedScenA, selectedScenB].filter(Boolean).map((sc, idx) => {
                          const proj = idx === 0 ? projA : projB;
                          const isWinner = sc === winnerScen;
                          return proj ? (
                            <div key={sc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: isWinner ? "#f0fdf4" : "#f8fafc", border: `1px solid ${isWinner ? "#bbf7d0" : "#e2eaf3"}`, borderRadius: 6, marginBottom: 6 }}>
                              <span style={{ fontSize: 12 }}>{sc.icon}</span>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{sc.label}</span>
                                {isWinner && <span style={{ fontSize: 9, color: "#059669", marginLeft: 5, background: "#dcfce7", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>SELECTED</span>}
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: proj.noi24 >= 0 ? "#059669" : "#dc2626", fontFamily: "'DM Mono', monospace" }}>{proj.noi24 >= 0 ? "+" : ""}{fmtCurrency(proj.noi24)}</span>
                              <span style={{ fontSize: 9, color: proj.breachProb24 > 20 ? "#dc2626" : "#94a3b8" }}>{proj.breachProb24}% breach</span>
                            </div>
                          ) : null;
                        })}
                        {!selectedScenA && !selectedScenB && <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>No scenarios evaluated.</div>}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #e2eaf3", paddingBottom: 5, marginBottom: 8 }}>4. Required Actions</div>
                        {(health.recommended_actions || []).map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, padding: "6px 9px", background: "#f8fafc", border: "1px solid #e2eaf3", borderRadius: 5, marginBottom: 5 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", flexShrink: 0 }}>{i+1}.</span>
                            <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>{a}</span>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #e2eaf3", paddingBottom: 5, marginBottom: 8 }}>5. Data Provenance</div>
                        <p style={{ fontSize: 11, color: "#6b7a96", lineHeight: 1.6, margin: "0 0 8px" }}>
                          Analysis based on live data as of {dataDate}. Confidence: <strong>{confidence.level}</strong> ({confidence.score}/100).
                          {confidence.issues.length > 0 && ` Issues: ${confidence.issues.join(", ")}.`}
                        </p>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {Object.entries(getSourceFreshness(propId)).map(([feed, ts]) => {
                            const ageHrs = (Date.now() - new Date(ts).getTime()) / 3600000;
                            const fc = ageHrs > 48 ? "#ef4444" : ageHrs > 24 ? "#f59e0b" : "#10b981";
                            return (
                              <span key={feed} style={{ fontSize: 9, color: "#6b7a96", background: "#f1f5f9", borderRadius: 3, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                                <span style={{ width: 4, height: 4, borderRadius: "50%", background: fc, display: "inline-block" }} />
                                {feed}: {timeAgo(ts)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", borderTop: "1px solid #e2eaf3", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Generated by RealDT Digital Twin Engine · {dataDate} · IC use only</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleCopyMemo} style={{ background: memoCopied ? "#10b981" : "#e2eaf3", border: "none", borderRadius: 6, padding: "5px 12px", color: memoCopied ? "#fff" : "#374151", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        {memoCopied ? "✓ Copied!" : "📋 Copy"}
                      </button>
                      <button onClick={() => setShowMemo(false)} style={{ background: "none", border: "none", color: "#7c8fa8", fontSize: 16, cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Re-run toast — slim pill, stays out of the way */}
      {reRunToast && (
        <div style={{ position: "fixed", bottom: 16, right: 16, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 20, padding: "5px 10px 5px 8px", fontSize: 11, zIndex: 9999, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 2px 8px rgba(15,23,42,0.08)", animation: "slideIn 0.3s ease" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
          <span style={{ color: "#92400e", whiteSpace: "nowrap" }}>New signal</span>
          <button onClick={handleRun} style={{ background: "#f59e0b", border: "none", borderRadius: 10, padding: "2px 8px", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>Re-run</button>
          <button onClick={() => setReRunToast(false)} style={{ background: "none", border: "none", color: "#b45309", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0, marginLeft: -2 }}>×</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab]     = useState("cockpit");
  const [assetPropId, setAssetPropId] = useState("prop-001");
  const [simPropId,   setSimPropId]   = useState("prop-001");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshSecs, setRefreshSecs] = useState(0);
  const [batching, setBatching]       = useState(false);
  const [batchPct, setBatchPct]       = useState(0);
  const [batchMsg, setBatchMsg]       = useState("");
  const [batchCount, setBatchCount]   = useState(0);
  const [toasts, setToasts]           = useState([]);

  useEffect(() => {
    const t = setInterval(() => setRefreshSecs(Math.floor((Date.now() - lastRefresh) / 1000)), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  useEffect(() => {
    const t = setInterval(() => {
      const items = getIngestItems();
      if (items.length > 0) {
        const it = items[Math.floor(Math.random() * Math.min(8, items.length))];
        addToast(`Signal: ${it.label} — ${it.property}`);
      }
    }, 14000);
    return () => clearInterval(t);
  }, []);

  const addToast = useCallback(msg => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, msg }]);
  }, []);
  const removeToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const runBatch = async () => {
    if (batching) return;
    setBatching(true); setBatchPct(0);
    await ingestBatchRun((msg, pct) => { setBatchMsg(msg); setBatchPct(pct); });
    setBatching(false);
    setLastRefresh(Date.now());
    setBatchCount(c => c + 1);
    addToast("Batch complete — 145 assets refreshed");
  };

  const handleNavigateToAsset  = propId => { setAssetPropId(propId);  setActiveTab("asset"); };
  const handleNavigateToSource = ()     => setActiveTab("source");
  const handleNavigateToSim    = propId => { setSimPropId(propId || assetPropId); setActiveTab("sim"); };

  const formatSecs = s => s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ${s % 60}s ago`;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", color: "#1e3a5f", fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f0f4f9; }
        ::-webkit-scrollbar-thumb { background: #c4cdd8; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 currentColor}50%{opacity:.7;box-shadow:0 0 0 6px transparent} }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        @keyframes slideIn { from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        button:hover { opacity: 0.88; }
        select option { background: #ffffff; color: #1e3a5f; }
        input[type=range] { accent-color: #2563eb; }
        table { border-collapse: collapse; }
        tr:hover td { background: rgba(59,130,246,0.03) !important; }
      `}</style>

      {/* Header */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e2eaf3", padding: "0 32px", position: "sticky", top: 0, zIndex: 400, boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto", display: "flex", alignItems: "center", height: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>R</div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>RealDT</span>
            <span style={{ fontSize: 9, color: "#6b7a96", background: "#f1f5f9", padding: "2px 6px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.05em", border: "1px solid #e2eaf3" }}>INSTITUTIONAL</span>
          </div>

          <nav style={{ display: "flex", gap: 2, flex: 1 }}>
            {[
              { id: "cockpit", label: "Portfolio Cockpit" },
              { id: "asset",   label: "Asset Twin"        },
              { id: "sim",     label: "Simulation Agent"  },
              { id: "source",  label: "Source Systems"    },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ background: "none", border: "none", padding: "17px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: activeTab === tab.id ? "#0f172a" : "#94a3b8", borderBottom: activeTab === tab.id ? `2px solid ${tab.id === "sim" ? "#7c3aed" : "#1d4ed8"}` : "2px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                {tab.id === "sim" && <span style={{ marginRight: 5, opacity: 0.6 }}>⚗</span>}
                {tab.label}
              </button>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Refresh: <span style={{ color: "#6b7a96", fontFamily: "'DM Mono', monospace" }}>{formatSecs(refreshSecs)}</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Batch: <span style={{ color: "#6b7a96" }}>Daily/Weekly mix</span>
            </div>
            <button onClick={runBatch} disabled={batching}
              style={{ background: batching ? "#f1f5f9" : "#1d4ed8", border: `1px solid ${batching ? "#d1dae8" : "#1d4ed8"}`, borderRadius: 7, padding: "7px 16px", color: batching ? "#6b7a96" : "#fff", fontSize: 11, fontWeight: 700, cursor: batching ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              {batching ? (
                <>
                  <div style={{ width: 11, height: 11, border: "2px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  <span style={{ color: "#2563eb", fontFamily: "'DM Mono', monospace" }}>{batchPct}%</span>
                  <span style={{ color: "#7c8fa8", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{batchMsg}</span>
                </>
              ) : "⚡ Run Latest Batch"}
            </button>
          </div>
        </div>
      </header>

      {batching && (
        <div style={{ height: 2, background: "#e2eaf3" }}>
          <div style={{ height: "100%", width: `${batchPct}%`, background: "linear-gradient(to right, #1d4ed8, #7c3aed)", transition: "width 0.3s" }} />
        </div>
      )}

      <main style={{ minHeight: "calc(100vh - 56px)" }}>
        {activeTab === "cockpit" && <PortfolioCockpit onNavigateToAsset={handleNavigateToAsset} batchCount={batchCount} />}
        {activeTab === "asset"   && <AssetTwin initialPropId={assetPropId} batchCount={batchCount} onNavigateToSource={handleNavigateToSource} onNavigateToSim={handleNavigateToSim} />}
        {activeTab === "sim"     && <SimulationAgent initialPropId={simPropId} onNavigateToAsset={handleNavigateToAsset} onNavigateToSource={handleNavigateToSource} />}
        {activeTab === "source"  && <SourceSystems batchCount={batchCount} onNavigateToAsset={handleNavigateToAsset} />}
      </main>

      {toasts.map(t => <Toast key={t.id} message={t.msg} onClose={() => removeToast(t.id)} />)}
    </div>
  );
}