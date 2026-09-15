/**
 * Shiki themes — "Engineered Calm" with restrained semantic color.
 *
 * Two variants because the palette is theme-dependent (white numerals
 * on dark paper become near-black on light paper). With
 * `defaultColor: false`, every token carries both colors as CSS vars
 * and global.css picks the active one via html.dark / html.light.
 */

const darkSettings = [
  // base / plain
  { settings: { foreground: '#D4D1CA' } },
  { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#87847E', fontStyle: 'italic' } },
  { scope: ['string', 'punctuation.definition.string', 'string.quoted'], settings: { foreground: '#D8B476' } },
  { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#C9A5D6' } },
  { scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.new'], settings: { foreground: '#8FB5D4' } },
  { scope: ['entity.name.type', 'support.type', 'entity.name.class', 'entity.name.enum', 'support.class'], settings: { foreground: '#83BBB4' } },
  { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#E4DEF4' } },
  { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#AAA7A0' } },
  { scope: ['entity.name.tag', 'meta.tag'], settings: { foreground: '#C5A9D9' } },
  { scope: ['variable', 'variable.other', 'meta.variable'], settings: { foreground: '#D4D1CA' } },
  { scope: ['entity.name.section'], settings: { foreground: '#F7F4ED' } },
];

const lightSettings = [
  { settings: { foreground: '#3C3B35' } },
  { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#827F76', fontStyle: 'italic' } },
  { scope: ['string', 'punctuation.definition.string', 'string.quoted'], settings: { foreground: '#8A5C25' } },
  { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#755087' } },
  { scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.new'], settings: { foreground: '#315F86' } },
  { scope: ['entity.name.type', 'support.type', 'entity.name.class', 'entity.name.enum', 'support.class'], settings: { foreground: '#1D6D68' } },
  { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#53497E' } },
  { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#69675F' } },
  { scope: ['entity.name.tag', 'meta.tag'], settings: { foreground: '#754D89' } },
  { scope: ['variable', 'variable.other', 'meta.variable'], settings: { foreground: '#3C3B35' } },
  { scope: ['entity.name.section'], settings: { foreground: '#1E1D18' } },
];

export const shikiDark = {
  name: 'engineered-calm-dark',
  type: 'dark' as const,
  colors: {
    'editor.background': '#181818', // --surface-2 (code blocks)
  },
  settings: darkSettings,
};

export const shikiLight = {
  name: 'engineered-calm-light',
  type: 'light' as const,
  colors: {
    'editor.background': '#F7F5F1', // --surface-2 (light)
  },
  settings: lightSettings,
};
