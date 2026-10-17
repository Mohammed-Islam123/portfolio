import type { Locale } from "../lib/i18n.ts";
import { localizedPath } from "../lib/i18n.ts";
import { useTranslations } from "./i18n.ts";

/**
 * SITE CONFIG — global identity, contact, and status.
 * Edit here, reflects everywhere.
 */

export type SocialLink = {
  label: string;
  href: string;
  /** icon key consumed by <SocialIcon /> or <UiIcon /> */
  icon: "github" | "linkedin" | "whatsapp" | "email" | "telegram" | "portfolio";
};

export type ContactPlatform = {
  id: "whatsapp" | "linkedin" | "email" | "telegram";
  label: string;
  href: string;
  icon: "whatsapp" | "linkedin" | "email" | "telegram";
  colorRgb: string;
  colorHex: string;
};

const firstName = "Mohamed Islam";
const contactEmail = "mohammedislam.benyahkem@gmail.com";
const contactMessageTemplate = `Hi ${firstName}, I came across your portfolio and would like to connect.`;
const emailSubject = "Exploring a Potential Opportunity";
const emailBodyTemplate = `Dear ${firstName},\n\nI came across your portfolio and would like to get in touch regarding a potential opportunity. Please let me know if you would be available to discuss it.\n\nKind regards,\n[Your name]`;
const emailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyTemplate)}`;

export const siteConfig = {
  firstName,
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
  email: contactEmail,
  /** CV download link (fallback default). */
  cvUrl: "https://drive.google.com/file/d/1OCHshP7_AzqbUmh7aO0TILqjLTiscK8i/view?usp=drive_link",
  /** CV download links by language */
  cvVersions: [
    {
      id: "en",
      code: "EN",
      label: "English Version",
      url: "https://drive.google.com/file/d/1OCHshP7_AzqbUmh7aO0TILqjLTiscK8i/view?usp=drive_link",
    },
    {
      id: "fr",
      code: "FR",
      label: "French Version",
      url: "https://drive.google.com/file/d/111GwxHHjCAlrPzsKJZMRMxYuKdpP2RyY/view?usp=drive_link",
    },
    {
      id: "ar",
      code: "AR",
      label: "Arabic Version",
      url: "https://drive.google.com/file/d/13EhGSVlEsrOL5AY791uPD9r03l7wpKvY/view?usp=drive_link",
    },
  ],
  contactCopy: {
    headline: "if you've made it this far,",
    action: "Say hi",
    profiles: "or find me on",
  },
  /** Prefilled messages for the contact links */
  contactMessageTemplate,
  emailSubject,
  emailBodyTemplate,
  /** Platforms available in the interactive contact selector */
  contactPlatforms: [
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/213794839435?text=${encodeURIComponent(contactMessageTemplate)}`,
      icon: "whatsapp",
      colorRgb: "37, 211, 102",
      colorHex: "#25D366",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/islam-benyahkem",
      icon: "linkedin",
      colorRgb: "10, 102, 194",
      colorHex: "#0A66C2",
    },
    {
      id: "email",
      label: "Email",
      href: emailHref,
      icon: "email",
      colorRgb: "234, 67, 53",
      colorHex: "#EA4335",
    },
    {
      id: "telegram",
      label: "Telegram",
      href: "https://t.me/ExtraIslam",
      icon: "telegram",
      colorRgb: "36, 161, 222",
      colorHex: "#24A1DE",
    },
  ] as ContactPlatform[],
  /** Secondary social profiles displayed below the CTA */
  socialProfiles: [
    { label: "GitHub", href: "https://github.com/Mohammed-Islam123", icon: "github" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/islam-benyahkem", icon: "linkedin" },
    { label: "Portfolio", href: "/", icon: "portfolio" },
  ] as SocialLink[],
  socials: [
    { label: "github", href: "https://github.com/Mohammed-Islam123", icon: "github" },
    { label: "linkedin", href: "https://www.linkedin.com/in/islam-benyahkem", icon: "linkedin" },
    { label: "whatsapp", href: "https://wa.me/213794839435", icon: "whatsapp" },
    { label: "email", href: `mailto:${contactEmail}`, icon: "email" },
    { label: "telegram", href: "https://t.me/ExtraIslam", icon: "telegram" },
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

export function getSiteConfig(locale: Locale) {
  const t = useTranslations(locale);
  const emailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(t(emailSubject))}&body=${encodeURIComponent(t(emailBodyTemplate))}`;
  return {
    ...siteConfig,
    role: t(siteConfig.role),
    roleKeywords: t(siteConfig.roleKeywords),
    status: { ...siteConfig.status, label: t(siteConfig.status.label) },
    cvVersions: siteConfig.cvVersions.map((cv) => ({
      ...cv,
      label: t(cv.label),
    })),
    contactCopy: { headline: t(siteConfig.contactCopy.headline), action: t(siteConfig.contactCopy.action), profiles: t(siteConfig.contactCopy.profiles) },
    contactPlatforms: siteConfig.contactPlatforms.map((platform) => ({ ...platform, label: t(platform.label), href: platform.id === "email" ? emailHref : platform.id === "whatsapp" ? `https://wa.me/213794839435?text=${encodeURIComponent(t(contactMessageTemplate))}` : platform.href })),
    socialProfiles: siteConfig.socialProfiles.map((profile) => ({ ...profile, label: t(profile.label), href: profile.href === "/" ? localizedPath(locale) : profile.href })),
  };
}
