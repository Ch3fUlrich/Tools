// `next/font/google` is a build-time transform: Next rewrites the call site and
// self-hosts the font files. Vitest never runs that transform, so the real module
// exports a placeholder and calling it throws "Inter is not a function".
//
// Aliased in vitest.config.ts. Add an export here for any further font used in
// app/layout.tsx.

export interface MockFont {
  className: string;
  variable: string;
  style: { fontFamily: string };
}

function mockFont(family: string) {
  return (): MockFont => ({
    className: `mock-font-${family.toLowerCase()}`,
    variable: `--font-${family.toLowerCase()}`,
    style: { fontFamily: family },
  });
}

export const Inter = mockFont('Inter');
