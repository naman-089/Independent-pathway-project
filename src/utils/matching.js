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

export function generateTimeline(intake, t) {
  if (!intake) return [];
  const readiness = computeReadinessScore(intake);
  const supportMap = { low: "low", medium: "medium", high: "high" };
  const support = supportMap[intake.supportLevel] || "medium";

  const allMilestones = [
    {
      phase: t("timeline.phase1"),
      phaseKey: 1,
      items: [
        { id: "m1", title: t("timeline.m1Title"), desc: t("timeline.m1Desc"), alwaysInclude: true },
        { id: "m2",  title: t("timeline.m2Title"),  desc: t("timeline.m2Desc"),  alwaysInclude: true },
        { id: "m16", title: t("timeline.m16Title"), desc: t("timeline.m16Desc"), alwaysInclude: true },
        { id: "m3",  title: t("timeline.m3Title"),  desc: t("timeline.m3Desc"),  alwaysInclude: true },
      ],
    },
    {
      phase: t("timeline.phase2"),
      phaseKey: 2,
      items: [
        { id: "m4", title: t("timeline.m4Title"), desc: t("timeline.m4Desc"), include: readiness < 80 },
        { id: "m5", title: t("timeline.m5Title"), desc: t("timeline.m5Desc"), include: !intake.skills?.transit || intake.skills.transit !== "independent" },
        { id: "m6", title: t("timeline.m6Title"), desc: t("timeline.m6Desc"), include: !intake.skills?.cooking || intake.skills.cooking !== "independent" },
        { id: "m7", title: t("timeline.m7Title"), desc: t("timeline.m7Desc"), include: intake.skills?.medication !== "independent" },
        { id: "m8", title: t("timeline.m8Title"), desc: t("timeline.m8Desc"), alwaysInclude: true },
        { id: "m9",  title: t("timeline.m9Title"),  desc: t("timeline.m9Desc"),  include: !intake.legalReady },
        { id: "m18", title: t("timeline.m18Title"), desc: t("timeline.m18Desc"), include: intake.sdmInPlace !== "yes" },
        { id: "m10", title: t("timeline.m10Title"), desc: t("timeline.m10Desc"), include: !intake.odspRegistered },
        { id: "m17", title: t("timeline.m17Title"), desc: t("timeline.m17Desc"), alwaysInclude: true },
      ],
    },
    {
      phase: t("timeline.phase3"),
      phaseKey: 3,
      items: [
        { id: "m11", title: t("timeline.m11Title"), desc: t("timeline.m11Desc"), alwaysInclude: true },
        { id: "m12", title: t("timeline.m12Title"), desc: t("timeline.m12Desc"), include: support === "high" },
        { id: "m13", title: t("timeline.m13Title"), desc: t("timeline.m13Desc"), alwaysInclude: true },
        { id: "m14", title: t("timeline.m14Title"), desc: t("timeline.m14Desc"), alwaysInclude: true },
        { id: "m15", title: t("timeline.m15Title"), desc: t("timeline.m15Desc"), alwaysInclude: true },
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
export function getAutoStatuses(intake, t) {
  if (!intake) return {};
  const r = {};
  if (intake.status === "submitted")
    r["m1"] = { status: "done", auto: true, note: t("timeline.autoNoteIntake") };
  if (intake.hensonTrust === "yes")
    r["m8"] = { status: "done", auto: true, note: t("timeline.autoNoteHenson") };
  if (intake.sdmInPlace === "yes")
    r["m9"] = { status: "done", auto: true, note: t("timeline.autoNoteSdm") };
  return r;
}

// Overlays saved + auto statuses onto a generated timeline array.
// Auto milestones are marked locked=true so family users can't toggle them.
// Caseworker-set fields (caseworkerVerified) are preserved over auto values.
export function applyStatuses(generated, intake, t) {
  const saved = (intake && intake.milestoneStatuses) || {};
  const auto = getAutoStatuses(intake, t);
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
