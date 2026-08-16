/**
 * SITE CONFIG — global identity, contact, and status.
 * Edit here, reflects everywhere.
 */

export type SocialLink = {
  label: string;
  href: string;
  /** icon key consumed by <SocialIcon /> — github | linkedin | whatsapp | email */
  icon: "github" | "linkedin" | "whatsapp" | "email";
};

export const siteConfig = {
  name: "Mohamed Islam Benyahkem",
  fullName: "Mohamed Islam Benyahkem",
  role: "Backend Engineer",
  roleKeywords: "back-end engineering · system design · distributed systems",
  location: "algiers, dz",
  timezone: "Africa/Algiers",
  tzLabel: "alg, dz",
  tzOffset: "+01:00",
  status: {
    label: "open to work",
    available: true,
  },
  email: "hello@mohamedislam.dev", // placeholder — replace with real
  /** CV download — drop the real file in /public to make the button work. */
  cvUrl: "/cv-mohamed-islam.pdf",
  socials: [
    { label: "github", href: "https://github.com", icon: "github" },
    { label: "linkedin", href: "https://www.linkedin.com", icon: "linkedin" },
    { label: "whatsapp", href: "https://wa.me/213000000000", icon: "whatsapp" },
    { label: "email", href: "mailto:hello@mohamedislam.dev", icon: "email" },
  ] as SocialLink[],
  /**
   * Hero greeting rotates through these on a timer.
   * Algiers is trilingual territory — Arabic, French, English.
   */
  greetings: [
    { lang: "en", text: "hello" },
    { lang: "fr", text: "bonjour" },
    { lang: "ar", text: "مرحبا" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
