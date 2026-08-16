/**
 * VALUES CONFIG — blur-focus vertical list.
 *
 * Each value has a short imperative title and a 1-2 sentence reasoning.
 * The focused (hovered/active) value is sharp; the others blur + dim.
 * Reduced-motion: all shown plainly, no blur.
 */

export type Value = {
  index: string; // "01".."06"
  title: string;
  description: string;
};

export const values: Value[] = [
  {
    index: "01",
    title: "bytes over magic",
    description:
      "Abstractions are useful until they hide the cost. I'd rather read the spec and the bytes than trust a library that 'just works' — until it doesn't.",
  },
  {
    index: "02",
    title: "learning out loud",
    description:
      "I write to figure things out. 'I don't know yet' is not a weakness — it's the starting point of every good backend.",
  },
  {
    index: "03",
    title: "team before ego",
    description:
      "The best commit is the one the team owns. I'd rather make the PR small and the reviewer smart than be the hero of a 2,000-line diff.",
  },
  {
    index: "04",
    title: "why before what",
    description:
      "Before I ship the feature, I want the sentence: 'we're doing this because ___.' If the blank is empty, the feature is premature.",
  },
  {
    index: "05",
    title: "calm is a feature",
    description:
      "Cool dashboards break at 3am. I design the boring path first — logs, retries, idempotency — then add the interesting parts.",
  },
  {
    index: "06",
    title: "help is a skill",
    description:
      "Helping isn't answering — it's making the next person able to answer themselves. A good comment today saves a Slack thread tomorrow.",
  },
];
