export const DEPOT = {
  operator: "Rail Intelligence",
  title: "Inspection Bay",
  bay: "C151 DT",
  train: "Kawasaki Heavy Industries C151",
  city: "Singapore",
  question: "What is the problem?",
  answerLead: "Latest analysis per subsystem.",
  timeline: [
    {
      id: "arriving",
      label: "Train Arriving",
      detail: "C151 driving trailer on the inspection stand.",
      atMs: 0,
    },
    {
      id: "positioning",
      label: "Positioning",
      detail: "Orbiting the saloon. HVAC, doors, bogies and rails are pickable.",
      atMs: 1800,
    },
    {
      id: "ready",
      label: "Ready for Inspection",
      detail: "Wayside models handshake with the latest analyses.",
      atMs: 3600,
    },
    {
      id: "results",
      label: "View Results",
      detail: "Open a hotspot or a subsystem card to inspect the evidence.",
      atMs: 5200,
    },
  ],
} as const;

export const DEPOT_RAIL_WIDTH = 212;
export const DEPOT_BREAKPOINT = 760;
export const DEPOT_STAGE_RATIO = 470 / 910;
