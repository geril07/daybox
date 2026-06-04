/** @type {import("prettier").Config} */
export default {
  trailingComma: 'all',
  singleQuote: true,
  semi: false,
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  importOrder: ['<THIRD_PARTY_MODULES>', '^@/(.*)$', '^[./]'],
  importOrderSeparation: true,
  tailwindFunctions: ['clsx', 'cn', 'cva'],
}
