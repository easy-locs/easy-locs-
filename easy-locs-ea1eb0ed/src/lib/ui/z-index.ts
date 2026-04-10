export const Z = {
  base: 1,
  content: 10,
  overlay: 20,
  controls: 30,
  dropdown: 40,
  popover: 50,
  modal: 60,
  toast: 70,
  tooltip: 80,
  max: 100,
} as const;

export type ZLayer = keyof typeof Z;
