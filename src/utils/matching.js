/**
 * Matching algorithm — scores each organization (0–100) against
 * a family's intake assessment answers.
 *
 * Factors:
 *  1. Support level alignment          (30 pts)
 *  2. Housing type preference          (25 pts)
 *  3. Location / region proximity      (20 pts)
 *  4. Skills & readiness score         (15 pts)
 *  5. Capacity / availability          (10 pts)
 */

export function computeReadinessScore(intake) {
  if (!intake) return 0;
  const skills = intake.skills || {};
  const levels = { independent: 4, reminders: 3, some_help: 2, full_support: 1 };

  const fields = ["cooking", "budgeting", "transit", "medication", "hygiene", "communication"];
  const total = fields.reduce((sum, f) => sum + (levels[skills[f]] || 1), 0);
  const max = fields.length * 4;
  return Math.round((total / max) * 100);
}

export function matchOrganizations(intake, organizations) {
  if (!intake || !organizations?.length) return [];

  const readiness = computeReadinessScore(intake);
  const supportMap = { low: 1, medium: 2, high: 3 };
  const familySupport = supportMap[intake.supportLevel] || 2;
  const familyRegion  = (intake.preferredRegion || "").toLowerCase();
  const familyHousing = intake.housingPreferences || [];

  return organizations
    .map((org) => {
      let score = 0;
      const orgSupport = supportMap[org.supportLevel] || 2;

      // 1. Support level (30 pts) — closer match = higher score
      const supportDiff = Math.abs(familySupport - orgSupport);
      score += supportDiff === 0 ? 30 : supportDiff === 1 ? 18 : 6;

      // 2. Housing type (25 pts)
      const orgTypes = org.housingTypes || [];
      const overlap = familyHousing.filter((h) => orgTypes.includes(h)).length;
      const maxOverlap = Math.max(familyHousing.length, 1);
      score += Math.round((overlap / maxOverlap) * 25);

      // 3. Location (20 pts)
      const orgRegions = (org.regions || []).map((r) => r.toLowerCase());
      const regionMatch =
        familyRegion &&
        orgRegions.some(
          (r) => r.includes(familyRegion) || familyRegion.includes(r)
        );
      score += regionMatch ? 20 : orgRegions.length === 0 ? 10 : 4;

      // 4. Readiness vs org minimum (15 pts)
      const minReadiness = org.minReadiness || 0;
      if (readiness >= minReadiness) {
        score += 15;
      } else {
        const gap = minReadiness - readiness;
        score += gap < 20 ? 10 : gap < 40 ? 5 : 0;
      }

      // 5. Availability (10 pts)
      score += org.hasOpenings ? 10 : 0;

      return { ...org, matchScore: Math.min(score, 100), readiness };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function generateTimeline(intake) {
  if (!intake) return [];
  const readiness = computeReadinessScore(intake);
  const supportMap = { low: "low", medium: "medium", high: "high" };
  const support = supportMap[intake.supportLevel] || "medium";

  const allMilestones = [
    {
      phase: "Phase 1 — Foundation",
      phaseKey: 1,
      items: [
        { id: "m1", title: "Complete intake assessment", desc: "Full profile created with goals, skills, and support needs", alwaysInclude: true },
        { id: "m2", title: "Register with DSO", desc: "Developmental Services Ontario registration submitted", alwaysInclude: true },
        { id: "m3", title: "Connect with Peer Navigator", desc: "Matched with a navigator who has lived the transition journey", alwaysInclude: true },
      ],
    },
    {
      phase: "Phase 2 — Skills Building",
      phaseKey: 2,
      items: [
        { id: "m4", title: "Budgeting & financial literacy", desc: "Complete Reena's 4-session financial literacy workshop", include: readiness < 80 },
        { id: "m5", title: "Transit independence practice", desc: "Route planning and solo travel with fading support", include: !intake.skills?.transit || intake.skills.transit !== "independent" },
        { id: "m6", title: "Cooking & meal prep skills", desc: "Weekly cooking sessions with a life skills coach", include: !intake.skills?.cooking || intake.skills.cooking !== "independent" },
        { id: "m7", title: "Medication self-management", desc: "Develop a supported routine for medications and health care", include: intake.skills?.medication !== "independent" },
        { id: "m8", title: "Establish Henson Trust", desc: "Work with legal aid to protect ODSP eligibility through a discretionary trust", alwaysInclude: true },
        { id: "m9", title: "Supported Decision-Making agreement", desc: "Formalize decision-making supports and legal planning", include: !intake.legalReady },
        { id: "m10", title: "Apply for ODSP", desc: "Support through the ODSP application process", include: !intake.odspRegistered },
      ],
    },
    {
      phase: "Phase 3 — Transition Ready",
      phaseKey: 3,
      items: [
        { id: "m11", title: "Placement match & site visits", desc: "Tour matched residences with a support worker and family", alwaysInclude: true },
        { id: "m12", title: "Trial stay (where available)", desc: "Short-term supported trial in matched residence", include: support === "high" },
        { id: "m13", title: "Move-in preparation", desc: "Packing, routines setup, and orientation to new home", alwaysInclude: true },
        { id: "m14", title: "Move-in & 30-day check-in", desc: "First 30 days with daily Reena staff check-ins", alwaysInclude: true },
        { id: "m15", title: "90-day stabilization review", desc: "Comprehensive review with family, caseworker, and individual", alwaysInclude: true },
      ],
    },
  ];

  return allMilestones.map((phase) => ({
    ...phase,
    items: phase.items
      .filter((m) => m.alwaysInclude || m.include)
      .map((m) => ({ ...m, status: "pending" })),
  }));
}

// Returns a map of { [milestoneId]: { status, auto, note } } for milestones
// that are verifiable directly from the intake form data.
export function getAutoStatuses(intake) {
  if (!intake) return {};
  const r = {};
  if (intake.status === "submitted")
    r["m1"] = { status: "done", auto: true, note: "Intake assessment submitted" };
  if (intake.hensonTrust === "yes")
    r["m8"] = { status: "done", auto: true, note: "Confirmed in intake: Henson Trust in place" };
  if (intake.sdmInPlace === "yes")
    r["m9"] = { status: "done", auto: true, note: "Confirmed in intake: SDM agreement in place" };
  return r;
}

// Overlays saved + auto statuses onto a generated timeline array.
// Auto milestones are marked locked=true so family users can't toggle them.
// Caseworker-set fields (caseworkerVerified) are preserved over auto values.
export function applyStatuses(generated, intake) {
  const saved = (intake && intake.milestoneStatuses) || {};
  const auto = getAutoStatuses(intake);
  return generated.map((phase) => ({
    ...phase,
    items: phase.items.map((item) => {
      const savedRaw = saved[item.id];
      const savedObj = savedRaw
        ? (typeof savedRaw === "string" ? { status: savedRaw } : savedRaw)
        : null;
      const autoObj = auto[item.id];
      if (autoObj) {
        return {
          ...item,
          ...autoObj,
          ...(savedObj?.caseworkerVerified ? { caseworkerVerified: true } : {}),
          locked: true,
        };
      }
      return { ...item, ...(savedObj || {}) };
    }),
  }));
}
