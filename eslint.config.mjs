import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
    ...nextCoreWebVitals.map((config) =>
        config.name === 'next/typescript'
            ? {
                  ...config,
                  rules: {
                      ...config.rules,
                      '@typescript-eslint/no-explicit-any': 'off',
                      '@typescript-eslint/no-unused-vars': 'warn',
                      'react-hooks/set-state-in-effect': 'warn',
                      'react/no-unescaped-entities': 'warn',
                  },
              }
            : config
    ),
    {
        ignores: [
            'contracts/artifacts/**',
            'contracts/cache/**',
            'contracts/typechain-types/**',
        ],
    },
];

export default eslintConfig;
