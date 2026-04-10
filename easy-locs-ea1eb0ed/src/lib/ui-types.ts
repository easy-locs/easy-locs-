/**
 * Shared UI type helper for Radix-based shadcn components.
 * React 19 + newer Radix versions may strip className/style/children from ComponentPropsWithoutRef.
 */
import * as React from "react";

export type RadixPropsExtension = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  disabled?: boolean;
  asChild?: boolean;
  id?: string;
  onClick?: React.MouseEventHandler<any>;
  'aria-label'?: string;
};
