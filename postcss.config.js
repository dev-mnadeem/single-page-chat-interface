/**
 * Tailwind v4 reads its theme from `src/index.css` (the `@theme` block) and
 * handles vendor prefixing itself, so this is the whole PostCSS pipeline -
 * no `tailwind.config.js` and no separate autoprefixer pass.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
