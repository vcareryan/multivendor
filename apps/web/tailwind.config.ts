import type { Config } from 'tailwindcss';
import preset from '../../packages/config/tailwind.preset.js';

const config: Config = {
  presets: [preset as Partial<Config>],
  content: [
    './src/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
