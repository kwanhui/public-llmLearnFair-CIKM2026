import { ChatClient } from "@/components/chat/chat-client";
import { DEFAULT_COHORT_CONFIG, type CohortConfig } from "@/lib/cohort/defaults";

export const dynamic = "force-dynamic";

// On /demo the scenarios are ordered to lead with the regression walkthrough
// (paper Scenario 1, the figure in the manuscript), then the two strongest
// fairness-audit triggers, then the writing and methodology examples. Each
// entry spotlights a different SAGE ability rather than repeating one task type.
const DEMO_SCENARIO_ORDER = [
  "regression-interpretation",
  "credit-feature-fairness",
  "liquidity-ratio",
  "exec-summary-writing",
  "ab-test-design",
  "hr-attrition-prediction",
];

const DEMO_CONFIG: CohortConfig = {
  ...DEFAULT_COHORT_CONFIG,
  scenarios: {
    allowed: DEMO_SCENARIO_ORDER.filter((id) =>
      DEFAULT_COHORT_CONFIG.scenarios.allowed.includes(id),
    ),
  },
  ui: {
    sideBySide: true,
    counterfactualSwap: true,
    scenarioPicker: true,
  },
};

export default function DemoPage() {
  return (
    <ChatClient
      cohortName="Public demo"
      config={DEMO_CONFIG}
      demoBanner
      typewriter
      showStepStrip
    />
  );
}
