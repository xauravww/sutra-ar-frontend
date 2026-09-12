"use client";

import { useCallback, useState } from "react";

/** Reusable show/hide state for any password field. */
export function usePasswordToggle() {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  return {
    visible,
    toggle,
    type: visible ? ("text" as const) : ("password" as const),
  };
}
