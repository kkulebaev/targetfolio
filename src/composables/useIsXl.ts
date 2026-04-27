import { useMediaQuery } from "@vueuse/core";

const XL_BREAKPOINT = "(min-width: 1280px)";

export function useIsXl() {
  return useMediaQuery(XL_BREAKPOINT);
}
