import type { SsgoiConfig } from "@ssgoi/react/types";
import { axis, drill, fade, sheet } from "@ssgoi/react/view-transitions";
import type {
  PageTransitionMode,
  PageTransitionRule,
} from "./page-transition-rules";
import { getPageTransitionRules } from "./page-transition-rules";

const FAST_FADE_OPTIONS = {
  physics: {
    spring: {
      stiffness: 260,
      damping: 28,
      doubleSpring: true,
    },
  },
};

function createTransition(rule: PageTransitionRule) {
  switch (rule.kind) {
    case "fade":
      return fade({
        paths: rule.paths,
        options: rule.speed === "fast" ? FAST_FADE_OPTIONS : {},
      } as Parameters<typeof fade>[0]);
    case "axis":
      if (rule.type === "x") {
        return axis({
          paths: rule.paths,
          type: "x",
          variant: rule.variant,
        });
      }
      if (rule.type === "y") {
        return axis({
          paths: rule.paths,
          type: "y",
          variant: rule.variant,
        });
      }
      return axis({
        paths: rule.paths,
        type: "z",
        variant: rule.variant,
      });
    case "sheet":
      return sheet({
        enter: rule.enter,
        exit: rule.exit,
        type: rule.type === "scale" ? "scale" : "static",
      });
    case "drill":
      return drill({
        enter: rule.enter,
        exit: rule.exit,
        type: rule.type === "slide" ? "slide" : "parallax",
      });
  }
}

export function createPageTransitionConfig(
  mode: PageTransitionMode,
): SsgoiConfig {
  return {
    transitions: getPageTransitionRules(mode).map(createTransition),
  };
}
