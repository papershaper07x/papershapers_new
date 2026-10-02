import { useCallback, useMemo } from "react";

import {
  splitTypographyProps,
  usePageTypography,
  type PageTypographyProps,
} from "./pageTypography";
import { LandingPageFrame, type LandingPageProps } from "./LandingPageFrame";
export { LandingPageFrame, applyBackgroundPresentation } from "./LandingPageFrame";
export type { LandingPageFrameProps, LandingPageProps } from "./LandingPageFrame";
import {
  SYLVA_TYPOGRAPHY,
} from "./pageRecipes";

export type SylvaHeroProps = LandingPageProps & PageTypographyProps & { variant?: "living-green" };

const SYLVA_HERO_BASE_URL = "/landing-pages/inner-green-3d.html";

export function SylvaHero({ variant = "living-green", ...props }: SylvaHeroProps) {
  const [type, frame] = splitTypographyProps(props);
  const customization = usePageTypography(SYLVA_TYPOGRAPHY, type);

  return (
    <LandingPageFrame
      {...frame}
      key="living-green"
      customization={customization}
      title="Sylva — Into the living world"
      sourceUrl={SYLVA_HERO_BASE_URL}
      srcDoc={undefined}
    />
  );
}
