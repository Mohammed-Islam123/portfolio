/**
 * Drop JPG, PNG, WebP, AVIF, MP4 or WebM files into src/assets/hero-journey/.
 * Files appear automatically after a rebuild. Add an entry here only when a
 * better description, caption, or crop is needed. Filenames are exact.
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
  {
    file: "robotics-workbench.png",
    description: "Robotics workbench with a wheeled prototype",
    caption: "Robotics workbench",
  },
  {
    file: "engineering-competition.png",
    description: "Engineering competition worktable",
    caption: "Competition day",
  },
  {
    file: "iot-prototype.png",
    description: "Connected sensor prototype on a workbench",
    caption: "Connected prototype",
  },
  {
    file: "development-workstation.png",
    description: "Software development workstation",
    caption: "Development work",
  },
  {
    file: "robotic-arm-prototype.png",
    description: "Robotic arm prototype in a lab",
    caption: "Robotic arm",
  },
  {
    file: "hackathon-prototype.png",
    description: "Hackathon electronics prototype",
    caption: "Prototype session",
  },
  {
    file: "robotics-motion-sample.mp4",
    description: "Animated view of a robotics workbench",
    caption: "Prototype motion",
  },
];
