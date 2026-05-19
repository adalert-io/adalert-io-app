"use client";

import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH = 767;

export function useResponsiveSheetSide(): "right" | "bottom" {
  const [side, setSide] = useState<"right" | "bottom">("right");

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setSide(media.matches ? "bottom" : "right");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return side;
}
