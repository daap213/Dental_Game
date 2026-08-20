import React, { useEffect, useState } from 'react';
import { Crosshair, Gift, Skull, ShieldAlert, Star, Trophy, Users, X } from 'lucide-react';
import type { CharacterType, Language } from '../../types';
import { TEXT } from '../../i18n';
import { enemyText, bossText, weaponText } from '../../i18n/subjects';
import {
  ENEMY_SPAWN_TABLE,
  STAGE_BOSSES,
  HIDDEN_BOSS,
  enemyHpForStage,
} from '../../game/data/enemies';
import { getWeaponStats, MAX_LEVEL, WEAPONS } from '../../game/data/weapons';
import { CHARACTER_PROFILES, characterSummary } from '../../game/data/characters';
import { killMilestones, scoreMilestones } from '../../game/progression';
import { PERK_DEFINITIONS } from '../../game/perks';
import { previewItem } from '../../game/render/preview';
import { PixelCanvas } from '../PixelCanvas';
import { PixelButton, PixelKey, PixelPanel } from '../ui/Pixel';
import { PixelTabs, type ChoiceOption } from '../ui/PixelChoice';
import type { CommonEnemy } from '../../i18n/subjects';

/**
 * Ficha de información del juego.
 *
 * Cada sección **se deriva de los datos** (`data/enemies.ts`, `data/weapons.ts`,
 * `data/characters.ts`, `game/perks.ts`, `game/progression.ts`) y muestra el **arte real** a
 * través del catálogo de vistas previas. Antes eran listas escritas a mano, y por eso ya se había
 * desincronizado tres veces del juego.
 *
 * ## Por qué es de pestañas, y por qué ya no lleva galería
 *
 * Era **un scroll único de seis paneles**, cuatro de ellos a todo lo ancho, encabezado por una
 * galería que pintaba los diez grupos del catálogo. Eso significaba:
 *
 * - **Todo por duplicado, y las armas por triplicado.** La galería etiquetaba cada enemigo con su
 *   nombre y dibujaba su sprite a escala 2 —exactamente lo que hace la sección de amenazas—; los
 *   jefes, igual; y el nombre de cada arma salía tres veces, porque el grupo de objetos también
 *   rotula los botes con el nombre del arma que sueltan.
 * - **106 lienzos animados a la vez**, todos suscritos al mismo reloj y repintándose cada frame,
 *   entre ellos treinta y una rampas de material, cinco fondos de fase de 800×450 y la escena de
 *   créditos. Eso es contenido de desarrollo, y ya tiene su sitio: `?sprites=<grupo>`.
 *
 * Ahora hay cinco pestañas y **cada cosa se dice una vez**: nombre, descripción, sprite y números
 * viven juntos en la sección de su tema y en ningún otro lado. De la galería solo se ha quedado lo
 * que no tenía otra casa —las cuatro clases— y con su perfil real en vez de un rótulo suelto.
 */

/** Estadística en una tapa de tecla, con su rótulo delante. */
const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <PixelKey>
    <span className="text-slate-500">{label}</span> {value}
  </PixelKey>
);

/**
 * Vista previa por id.
 *
 * **No recibe etiqueta.** Cada tarjeta escribe el nombre justo al lado en un encabezado, y pasarlo
 * además como `aria-label` del lienzo hacía que un lector de pantalla dijese el mismo nombre dos
 * veces por ficha. El lienzo es decorativo aquí: lo que informa es el texto.
 */
const Art: React.FC<{ id: string; scale?: number }> = ({ id, scale = 1 }) => {
  const item = previewItem(id);
  if (!item) return null;
  return (
    <div className="pixel-inset shrink-0 border-slate-800 bg-slate-950 p-1">
      <PixelCanvas w={item.w} h={item.h} scale={scale} draw={item.draw} animated />
    </div>
  );
};

/** Tarjeta de ficha: arte a un lado y texto al otro. */
const Card: React.FC<{
  art: React.ReactNode;
  title: React.ReactNode;
  titleClass: string;
  desc: string;
  stats?: React.ReactNode;
  stacked?: boolean;
  style?: React.CSSProperties;
}> = ({ art, title, titleClass, desc, stats, stacked, style }) => (
  <article
    className={`pixel-inset border-slate-700 bg-slate-900 p-2 ${
      stacked ? 'flex flex-col items-center gap-2 text-center' : 'flex items-start gap-3'
    }`}
    style={style}
  >
    {art}
    <div className="min-w-0">
      <h4 className={`text-[9px] font-bold ${titleClass}`}>{title}</h4>
      <p className="mt-1 text-[8px] leading-relaxed text-slate-400">{desc}</p>
      {stats && (
        <div className={`mt-1.5 flex flex-wrap gap-1 ${stacked ? 'justify-center' : ''}`}>
          {stats}
        </div>
      )}
    </div>
  </article>
);

type TabId = 'classes' | 'arsenal' | 'threats' | 'bosses' | 'upgrades';

export const IntelDatabase: React.FC<{ onClose: () => void; lang: Language }> = ({
  onClose,
  lang,
}) => {
  const t = TEXT[lang].database;
  const pn = TEXT[lang].perk_names;
  const [tab, setTab] = useState<TabId>('classes');

  /**
   * Escape cierra.
   *
   * No lo hacía, y era la única pantalla a pantalla completa del juego sin salida por teclado: se
   * abría desde el menú con el ratón y solo se cerraba con el ratón.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabs: readonly ChoiceOption<TabId>[] = [
    {
      id: 'classes',
      label: t.group_characters,
      icon: <Users className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-green-300 bg-green-700 text-white',
    },
    {
      id: 'arsenal',
      label: t.arsenal_title,
      icon: <Crosshair className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-blue-300 bg-blue-700 text-white',
    },
    {
      id: 'threats',
      label: t.enemies_title,
      icon: <ShieldAlert className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-yellow-300 bg-yellow-700 text-white',
    },
    {
      id: 'bosses',
      label: t.bosses_title,
      icon: <Skull className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-red-300 bg-red-700 text-white',
    },
    {
      id: 'upgrades',
      label: t.rewards_title,
      icon: <Gift className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-pink-300 bg-pink-700 text-white',
    },
  ];

  const rate = (frames: number) => (60 / frames).toFixed(1);
  const list = (numbers: readonly number[]) =>
    numbers.map((n) => n.toLocaleString(lang)).join(' · ');

  return (
    <div className="pixel-crt absolute inset-0 z-50 flex flex-col bg-slate-900 p-3 md:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col gap-3">
        <header className="flex items-center justify-between gap-3 border-b-4 border-slate-700 pb-2">
          <h2 className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-green-400 uppercase md:text-sm">
            <ShieldAlert className="h-4 w-4" strokeWidth={3} />
            {t.title}
          </h2>
          <PixelButton
            onClick={onClose}
            className="border-red-300 bg-red-600 p-1.5 text-white"
            title={t.close}
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </PixelButton>
        </header>

        {/* Las pestañas: una fila, sin scroll, y la abierta se marca con el cursor ▶. */}
        <PixelTabs options={tabs} value={tab} onSelect={setTab} label={t.title} marker />

        {/* Solo el contenido de la pestaña desplaza, así que la cabecera nunca se va. */}
        <div className="pixel-scroll pb-4">
          {tab === 'classes' && (
            <PixelPanel title={t.group_characters} accent="border-green-700">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(CHARACTER_PROFILES) as CharacterType[]).map((character) => (
                  <Card
                    key={character}
                    art={<Art id={`character:${character}`} scale={2} />}
                    title={TEXT[lang].characters[character]}
                    titleClass="text-green-200"
                    /**
                     * El perfil sale de `characterSummary`, el mismo que usa el menú: nada de
                     * textos traducidos nuevos que puedan dejar de coincidir con la tabla.
                     */
                    desc={characterSummary(character)}
                  />
                ))}
              </div>
            </PixelPanel>
          )}

          {tab === 'arsenal' && (
            <PixelPanel title={t.arsenal_title} accent="border-blue-800">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {WEAPONS.map((weapon) => {
                  const low = getWeaponStats(weapon, 1);
                  const high = getWeaponStats(weapon, MAX_LEVEL);
                  const text = weaponText(lang, weapon);

                  return (
                    <Card
                      key={weapon}
                      art={<Art id={`weapon:${weapon}`} />}
                      title={text.name}
                      titleClass="text-blue-200"
                      desc={text.desc}
                      stats={
                        <>
                          <Stat label={t.stat_damage} value={`${low.damage}→${high.damage}`} />
                          <Stat
                            label={t.stat_rate}
                            value={`${rate(low.cooldownFrames)}→${rate(high.cooldownFrames)}`}
                          />
                          <Stat
                            label={t.stat_shots}
                            value={`${low.projectileCount}→${high.projectileCount}`}
                          />
                        </>
                      }
                    />
                  );
                })}
              </div>
              {/*
               * El nivel máximo se **lee** de `MAX_LEVEL`. Estaba escrito dentro del título
               * traducido —«ARSENAL (Level Up Max 5)»— en los dos idiomas, que son dos sitios más
               * donde un número puede quedarse viejo.
               */}
              <p className="mt-2 text-right font-mono text-[7px] text-slate-500">
                {TEXT[lang].hud.lvl} 1 → {MAX_LEVEL}
              </p>
            </PixelPanel>
          )}

          {tab === 'threats' && (
            <PixelPanel title={t.enemies_title} accent="border-amber-700">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {/*
                 * De más común a más raro. La tabla está ordenada por umbral descendente, o sea al
                 * revés: la ficha abría con el absceso —el más raro y el más duro— y cerraba con la
                 * bacteria, que es lo primero que se ve al empezar a jugar.
                 */}
                {[...ENEMY_SPAWN_TABLE]
                  .sort((a, b) => a.threshold - b.threshold)
                  .map((entry) => {
                    const text = enemyText(lang, entry.subType as CommonEnemy);
                    return (
                      <Card
                        key={entry.subType}
                        stacked
                        art={<Art id={`enemy:${entry.subType}`} scale={2} />}
                        title={text.name}
                        titleClass="text-yellow-200"
                        desc={text.desc}
                        stats={
                          <>
                            <Stat
                              label={t.stat_hp}
                              value={`${enemyHpForStage(entry, 1)}→${enemyHpForStage(entry, 5)}`}
                            />
                            <Stat label={t.stat_touch} value={`${entry.contactDamage}`} />
                          </>
                        }
                      />
                    );
                  })}
              </div>
            </PixelPanel>
          )}

          {tab === 'bosses' && (
            <PixelPanel title={t.bosses_title} accent="border-red-800">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[...STAGE_BOSSES, HIDDEN_BOSS].map((boss, index) => {
                  const text = bossText(lang, boss.nameKey);
                  const hidden = boss.variant === HIDDEN_BOSS.variant;

                  return (
                    <Card
                      key={boss.variant}
                      art={<Art id={`boss:${boss.variant}`} />}
                      titleClass="text-red-300"
                      title={
                        <span className="flex items-center gap-2">
                          {text.name}
                          {hidden && (
                            <span className="pixel-inset border-yellow-700 bg-yellow-500 px-1 text-[7px] text-black">
                              {t.hidden_label}
                            </span>
                          )}
                        </span>
                      }
                      desc={text.desc}
                      stats={
                        <>
                          {!hidden && <Stat label={TEXT[lang].hud.stage} value={`${index + 1}`} />}
                          <Stat label={t.stat_hp} value={`${boss.maxHp}`} />
                          <Stat label={t.stat_touch} value={`${boss.contactDamage}`} />
                        </>
                      }
                    />
                  );
                })}
              </div>
            </PixelPanel>
          )}

          {tab === 'upgrades' && (
            <div className="space-y-3">
              {/*
               * Los logros van **con** las mejoras y no en un panel aparte: son cómo se consiguen,
               * y su propio texto lo dice («completa objetivos para activar la selección»).
               */}
              <PixelPanel title={t.achievements_title} accent="border-yellow-700">
                <p className="mb-2 text-[8px] leading-relaxed text-slate-400">
                  {t.achievements_desc}
                </p>
                <div className="space-y-1.5">
                  {[
                    {
                      icon: <Star className="h-3 w-3" strokeWidth={3} />,
                      title: t.ach_score_title,
                      /**
                       * Los umbrales se **calculan** con `progression.ts`. Eran dos frases
                       * traducidas con los números escritos a mano, y ya se enviaron mal: el menú
                       * prometía 20, 30, 50, 80 bajas mientras el juego daba 20, 40, 70, 110.
                       */
                      desc: `${list(scoreMilestones(3))} …`,
                    },
                    {
                      icon: <Skull className="h-3 w-3" strokeWidth={3} />,
                      title: t.ach_kill_title,
                      desc: `${list(killMilestones(5))} …`,
                    },
                    {
                      icon: <Trophy className="h-3 w-3" strokeWidth={3} />,
                      title: t.ach_boss_title,
                      desc: t.ach_boss_desc,
                    },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="pixel-inset flex items-center gap-2 border-slate-700 bg-slate-900 p-2"
                    >
                      <span className="text-yellow-200">{row.icon}</span>
                      <h4 className="text-[8px] font-bold text-yellow-100">{row.title}</h4>
                      <span className="ml-auto font-mono text-[8px] text-slate-400">
                        {row.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </PixelPanel>

              <PixelPanel title={t.rewards_title} accent="border-pink-700">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PERK_DEFINITIONS.map((perk) => {
                    const text = pn[perk.id as keyof typeof pn];
                    const rarity =
                      perk.rarity === 'legendary'
                        ? t.rarity_legendary
                        : perk.rarity === 'rare'
                          ? t.rarity_rare
                          : t.rarity_common;

                    return (
                      <article
                        key={perk.id}
                        className="pixel-inset border-slate-700 bg-slate-900 p-2"
                        style={{ borderColor: perk.color }}
                      >
                        <h4 className="text-[9px] font-bold" style={{ color: perk.color }}>
                          {text.name}
                        </h4>
                        <p className="mt-1 text-[8px] leading-relaxed text-slate-400">
                          {text.desc}
                        </p>
                        <span className="mt-1 inline-block font-mono text-[7px] text-slate-500">
                          {rarity}
                        </span>
                      </article>
                    );
                  })}
                </div>
              </PixelPanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
