/**
 * Hero photos live in public/Images/Hero/. Keep captions empty until ready.
 */
export interface HeroJourneyMedia {
  type: "image" | "video";
  source: string;
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
  { file: "Afrobot_Participation.webp", caption: "" },
  { file: "AlphaAI.webp", caption: "" },
  { file: "Alphabit_Coding_Challenge.webp", caption: "" },
  { file: "Djezzy_INNOVTECH.webp", caption: "" },
  { file: "Event_Victory.webp", caption: "" },
  { file: "Fighting_Robot_Prep1.webp", caption: "" },
  { file: "Fighting_Robot_Prer2.webp", caption: "" },
  { file: "HIV_Awareness_Event.webp", caption: "" },
  { file: "SAHM_Project_Prep.webp", caption: "" },
  { file: "winning_idathon.webp", caption: "" },
];
