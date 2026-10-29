/**
 * Hero photos live in public/Images/Hero/. Keep captions empty until ready.
 */
export interface HeroJourneyMedia {
  type: "image" | "video";
  source: string;
  thumbnail?: string;
  description: string;
  caption?: string;
  cropPosition?: string;
}

export const heroJourneySettings = {
  durationMs: 12_000,
  preloadConcurrency: 2,
} as const;

type HeroJourneyDetail = { file: string } &
  Partial<Pick<HeroJourneyMedia, "description" | "caption" | "cropPosition">>;

export const heroJourneyDetails: HeroJourneyDetail[] = [
  { file: "AlphaAI.webp", caption: "At the AlphaAI event" },
  { file: "Afrobot_Participation.webp", caption: "Our first robot combat competition" },
  { file: "Alphabit_Coding_Challenge.webp", caption: "Taking part in the Coding Challenge event by Alphabit" },
  { file: "Djezzy_INNOVTECH.webp", caption: "At Djezzy INNOVTECH" },
  { file: "Event_Victory.webp", caption: "First place in the smart city competition in Tlemcen" },
  { file: "Fighting_Robot_Prep1.webp", caption: "Preparing our robot for combat" },
  { file: "Fighting_Robot_Prer2.webp", caption: "Getting our robot ready for competition" },
  { file: "HIV_Awareness_Event.webp", caption: "HIV awareness day at our university" },
  { file: "SAHM_Project_Prep.webp", caption: "Preparing SAHM, the delivery robot" },
  { file: "winning_idathon.webp", caption: "First place in the Jisr Al Nomow (جسر النمو) Ideathon" },
];
