interface Props {
  notice: { state: string; promptToLearner: string };
}

const HUMAN_LABEL: Record<string, string> = {
  awaiting_approach: "Plan your approach",
  awaiting_paraphrase: "Paraphrase before continuing",
  awaiting_attempt: "Take a guess first",
  ready: "Ready",
};

// Plain-language examples of what a learner can write to pass each gate. These
// help first-time and non-native-English learners who understand the rule but
// are unsure how to start; they model the move without giving the answer.
const EXAMPLE: Record<string, string> = {
  awaiting_approach:
    "e.g. \"I think I should look at the sign of the coefficient first, then check whether it's statistically significant. I'm not sure how to read the size.\"",
  awaiting_paraphrase:
    "e.g. \"So you're saying a negative coefficient means the two move in opposite directions, holding everything else constant.\"",
  awaiting_attempt:
    "e.g. \"My guess is that short-term obligations are harder to meet now, because the ratio fell.\"",
};

export function ScaffoldPrompt({ notice }: Props) {
  const label = HUMAN_LABEL[notice.state] ?? notice.state.replaceAll("_", " ");
  const example = EXAMPLE[notice.state];
  return (
    <aside
      role="status"
      className="animate-slide-down rounded-md border-l-4 border-primary bg-primary/5 p-3 text-sm"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
        Scaffold · {label}
      </p>
      <p className="mt-1 text-foreground">{notice.promptToLearner}</p>
      {example ? (
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          Not sure how to start? {example}
        </p>
      ) : null}
    </aside>
  );
}
