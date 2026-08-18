import next from 'eslint-config-next'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'scratch/**',
      'components/**', // stray duplicate outside src/, pending removal
      'next-env.d.ts',
      'src/components/ui/**', // vendored shadcn primitives
      'src/hooks/use-mobile.tsx', // vendored shadcn
      'src/hooks/use-toast.ts', // vendored shadcn
    ],
  },
  ...next,
  ...nextTypescript,
  {
    // Config files legitimately use require() for plugin loading.
    // Must come after the shared configs, which enable the rule globally.
    files: ['**/*.config.{ts,mjs,js}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    rules: {
      // Money, auth and member data all flow through server actions. An `any`
      // reaching Prisma is how unvalidated client input gets persisted, so make
      // it visible rather than silent.
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]
