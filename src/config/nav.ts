/**
 * NAV CONFIG — navigation items + section ids.
 * Used by the nav bar (centered) and scrollspy.
 *
 */

export type NavItem = {
  id: string;
  label: string;
  href: string;
};

export const navItems: NavItem[] = [
  { id: "about", label: "about", href: "#about" },
  { id: "projects", label: "projects", href: "#projects" },
  { id: "toolkit", label: "toolkit", href: "#toolkit" },
  { id: "values", label: "values", href: "#values" },
  { id: "contact", label: "contact", href: "#contact" },
];

/** ids the scrollspy should observe (in document order, anchors only) */
export const sectionIds = navItems
  .map((n) => n.id);
