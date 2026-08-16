import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // El motor todavía usa mutación in-place y firmas laxas heredadas del
  // monolito de GameCanvas; se endurecen durante la migración a Phaser.
  {
    files: ['src/game/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // GameCanvas.tsx es el monolito del motor: guarda toda la simulación en un
  // ref y la muta por frame, que es justo lo que estas reglas prohíben. No se
  // arregla, se sustituye en la migración a Phaser (Fase 3 del plan), así que
  // aquí quedan como aviso para no bloquear el lint mientras tanto.
  {
    files: ['src/components/GameCanvas.tsx'],
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Desactiva las reglas de formato que chocan con Prettier. Debe ir la última.
  prettier
);
