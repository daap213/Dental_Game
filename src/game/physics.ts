import { Platform, Rect } from '../types';

export const checkRectCollide = (r1: Rect, r2: Rect): boolean => {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
};

/**
 * Si algo toca alguna plataforma. **Detección, no resolución.**
 *
 * Es lo que necesita un frasco que estalla al chocar: da igual por qué lado ha dado y no
 * hay que sacarlo de dentro de la pared, solo saber que ha llegado. Resolver la colisión
 * —empujarlo fuera, anular su velocidad, marcarlo apoyado— es lo que hace
 * `checkPlatformCollisions` para los cuerpos que sí siguen existiendo después, y es mucho
 * más trabajo del que un proyectil que va a reventar necesita.
 *
 * Además vale gratis para paredes y techos: un frasco tirado contra un muro estalla ahí.
 */
export const hitsAnyPlatform = (r: Rect, platforms: readonly Platform[]): boolean =>
  platforms.some((plat) => checkRectCollide(r, plat));
