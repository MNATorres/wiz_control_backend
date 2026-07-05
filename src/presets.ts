export interface PresetColor {
  r: number;
  g: number;
  b: number;
  dimming: number;
}

export interface Preset {
  key: string;
  name: string;
  colors: PresetColor[];
}

export const PRESETS: Preset[] = [
  {
    key: "soft-pastels",
    name: "Soft Pastels",
    colors: [
      { r: 255, g: 214, b: 170, dimming: 45 },
      { r: 255, g: 200, b: 220, dimming: 45 },
      { r: 214, g: 200, b: 255, dimming: 45 },
    ],
  },
  {
    key: "blues",
    name: "Blues",
    colors: [
      { r: 80, g: 140, b: 255, dimming: 40 },
      { r: 40, g: 80, b: 200, dimming: 40 },
      { r: 60, g: 160, b: 200, dimming: 40 },
    ],
  },
  {
    key: "blue-red-mix",
    name: "Blue & Red Mix",
    colors: [
      { r: 60, g: 90, b: 200, dimming: 40 },
      { r: 200, g: 60, b: 70, dimming: 40 },
    ],
  },
];

export function getPreset(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}

export function colorForIndex(preset: Preset, index: number): PresetColor {
  return preset.colors[index % preset.colors.length];
}
