"use client";

import { useEffect, useState } from "react";

export function useOrientation() {
  const [isPortrait, setIsPortrait] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");

    const updateOrientation = () => {
      setIsPortrait(mediaQuery.matches);
    };

    updateOrientation();

    mediaQuery.addEventListener("change", updateOrientation);

    return () => {
      mediaQuery.removeEventListener("change", updateOrientation);
    };
  }, []);

  return isPortrait;
}
