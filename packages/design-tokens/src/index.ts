export const colors = {
  canvas: "#ffffff",
  surfaceSoft: "#f7f7f7",
  surfaceStrong: "#f2f2f2",
  ink: "#222222",
  body: "#3f3f3f",
  muted: "#6a6a6a",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
  primary: "#ff385c",
  primaryActive: "#e00b41",
  primaryDisabled: "#ffd1da",
  onPrimary: "#ffffff",
  scrim: "rgba(0, 0, 0, 0.5)",
} as const;

export const radii = {
  button: "8px", // 按钮圆角
  card: "14px", // 卡片圆角
  pill: "9999px", // 药丸形圆角
  section: "32px", // 区块圆角
} as const;

export const spacing = {
  xxs: "2px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  base: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  section: "64px",
} as const;

export const shadows = {
  none: "none",
  float:
    "rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px 0, rgba(0, 0, 0, 0.1) 0 4px 8px 0",
} as const;

export const typography = {
  displayXl: "28px",
  displayLg: "22px",
  titleMd: "16px",
  bodyMd: "16px",
  bodySm: "14px",
  caption: "13px",
} as const;

export const cssVariables = {
  "--color-canvas": colors.canvas,
  "--color-surface-soft": colors.surfaceSoft,
  "--color-surface-strong": colors.surfaceStrong,
  "--color-ink": colors.ink,
  "--color-body": colors.body,
  "--color-muted": colors.muted,
  "--color-hairline": colors.hairline,
  "--color-hairline-soft": colors.hairlineSoft,
  "--color-primary": colors.primary,
  "--color-primary-active": colors.primaryActive,
  "--color-primary-disabled": colors.primaryDisabled,
  "--color-on-primary": colors.onPrimary,
  "--color-scrim": colors.scrim,
  "--radius-button": radii.button,
  "--radius-card": radii.card,
  "--radius-pill": radii.pill,
  "--radius-section": radii.section,
  "--shadow-float": shadows.float,
} as const;
