import { describe, it, expect } from 'vitest';
import packageJsonRaw from '../../package.json?raw';
import { ATTRIBUTIONS } from './attributions';

/**
 * `package.json` entra como texto con `?raw` y no con `import` ni con `node:fs`:
 * `tsconfig.json` no tiene `resolveJsonModule`, y sus `types` son solo
 * `["vite/client"]`, así que los tipos de Node no existen en esta capa —y meterlos
 * expondría `process` y compañía a todo el código de la aplicación—.
 */
const packageJson = JSON.parse(packageJsonRaw) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

/**
 * Tailwind es dependencia de desarrollo, pero su CSS generado **sí** se
 * distribuye, así que su aviso es obligatorio igual. El resto de devDependencies
 * (Vite, TypeScript, ESLint, Prettier, Vitest) no viaja con el juego y por eso
 * está deliberadamente exento: no las añadas aquí "por completitud".
 */
const SHIPPED_DEV_DEPS = ['tailwindcss'];

describe('atribuciones de terceros', () => {
  it('toda dependencia de ejecución tiene su aviso', () => {
    // Éste es el punto del fichero: añadir un paquete y olvidar su aviso deja la
    // suite en rojo. Sin esto es un fallo invisible, y además un incumplimiento
    // de licencia, porque Vite borra los comentarios de licencia al empaquetar.
    const declared = Object.keys(packageJson.dependencies);
    const covered = ATTRIBUTIONS.map((a) => a.pkg);

    expect(declared.filter((pkg) => !covered.includes(pkg))).toEqual([]);
  });

  it('no hay avisos huérfanos', () => {
    const known = [...Object.keys(packageJson.dependencies), ...SHIPPED_DEV_DEPS];
    expect(ATTRIBUTIONS.map((a) => a.pkg).filter((pkg) => !known.includes(pkg))).toEqual([]);
  });

  it('las dependencias de desarrollo que se distribuyen siguen declaradas', () => {
    for (const pkg of SHIPPED_DEV_DEPS) {
      expect(packageJson.devDependencies, `${pkg} ya no es devDependency`).toHaveProperty(pkg);
      expect(
        ATTRIBUTIONS.map((a) => a.pkg),
        `${pkg} sin aviso`
      ).toContain(pkg);
    }
  });

  it('ningún aviso está a medias', () => {
    for (const entry of ATTRIBUTIONS) {
      expect(entry.version.trim(), `${entry.pkg}: versión`).not.toBe('');
      expect(entry.license.trim(), `${entry.pkg}: licencia`).not.toBe('');
      expect(entry.copyright.trim(), `${entry.pkg}: copyright`).not.toBe('');
      expect(entry.licenseUrl, `${entry.pkg}: licenseUrl`).toMatch(/^https:\/\//);
      expect(entry.url, `${entry.pkg}: url`).toMatch(/^https:\/\//);
    }
  });

  it('no hay paquetes repetidos', () => {
    const pkgs = ATTRIBUTIONS.map((a) => a.pkg);
    expect(new Set(pkgs).size).toBe(pkgs.length);
  });

  it('el aviso de la tipografía es literal', () => {
    // La OFL 1.1, cláusula 2, exige que este aviso —exactamente éste— acompañe a
    // los ficheros de fuente que el sitio sirve a cada visitante. Es la única
    // obligación aquí que ya se estaba incumpliendo, así que se fija a carácter.
    const font = ATTRIBUTIONS.find((a) => a.pkg === '@fontsource/press-start-2p');
    expect(font).toBeDefined();
    expect(font?.license).toBe('OFL-1.1');
    expect(font?.redistributed).toBe(true);
    expect(font?.copyright).toBe(
      'Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P"'
    );
  });

  it('lucide conserva el doble aviso', () => {
    // Es ISC con un bloque MIT para lo heredado de Feather. Reproducir solo el
    // primero deja fuera a Cole Bemis, que es justo lo que los escáneres pierden.
    const lucide = ATTRIBUTIONS.find((a) => a.pkg === 'lucide-react');
    expect(lucide?.license).toBe('ISC');
    expect(lucide?.copyright).toContain('Cole Bemis');
    expect(lucide?.copyright).toContain('Lucide Contributors');
  });
});
