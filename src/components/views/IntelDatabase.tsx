import React from 'react';
import { Crosshair, Gift, Skull, ShieldAlert, Star, Trophy, X, Image } from 'lucide-react';
import type { Language } from '../../types';
import { TEXT } from '../../i18n';
import { enemyText, bossText, weaponText, groupTitle, previewLabel } from '../../i18n/subjects';
import { ENEMY_SPAWN_TABLE, STAGE_BOSSES, HIDDEN_BOSS, enemyHpForStage } from '../../game/data/enemies';
import { getWeaponStats, MAX_LEVEL } from '../../game/data/weapons';
import { PERK_DEFINITIONS } from '../../game/perks';
import {
  previewGroups,
  previewItem,
  WEAPON_TYPES,
  type PreviewGroupId,
  type PreviewItem,
} from '../../game/render/preview';
import { PixelCanvas } from '../PixelCanvas';
import type { CommonEnemy } from '../../i18n/subjects';

/**
 * Ficha de información del juego.
 *
 * Cada sección **se deriva de los datos** (`data/enemies.ts`, `data/weapons.ts`,
 * `game/perks.ts`) y muestra el **arte real** a través del catálogo de vistas
 * previas. Antes eran listas escritas a mano con iconos de librería, y por eso ya
 * se había desincronizado tres veces del juego: anunciaba un máximo de nivel que no
 * era, una progresión de bajas que no era, y le faltaba el jefe oculto.
 *
 * La consecuencia práctica: para añadir un enemigo ya no hay que acordarse de tocar
 * esta pantalla, y si se olvida su texto, el test lo canta.
 */

const groupScale: Partial<Record<PreviewGroupId, number>> = {
  characters: 2,
  enemies: 2,
  items: 2,
  effects: 2,
  materials: 1,
};

const Preview: React.FC<{ item: PreviewItem; scale?: number; label?: string }> = ({
  item,
  scale = 1,
  label,
}) => (
  <PixelCanvas
    w={item.w}
    h={item.h}
    scale={scale}
    draw={item.draw}
    animated
    label={label ?? item.key}
  />
);

/** Vista previa por id, tolerante: si falta, no rompe la ficha. */
const PreviewById: React.FC<{ id: string; scale?: number; label?: string }> = ({
  id,
  scale = 1,
  label,
}) => {
  const item = previewItem(id);
  if (!item) return null;
  return <Preview item={item} scale={scale} label={label} />;
};

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, icon, accent, children, wide }) => (
  <section
    className={`pixel-frame pixel-dither border-slate-600 bg-slate-800 p-4 ${wide ? 'lg:col-span-2' : ''}`}
  >
    <h3
      className={`mb-4 flex items-center gap-2 border-b border-slate-700 pb-2 text-lg font-bold ${accent}`}
    >
      {icon} {title}
    </h3>
    {children}
  </section>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="pixel-inset border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[8px] text-slate-300">
    <span className="text-slate-500">{label}</span> {value}
  </span>
);

export const IntelDatabase: React.FC<{ onClose: () => void; lang: Language }> = ({
  onClose,
  lang,
}) => {
  const t = TEXT[lang].database;
  const pn = TEXT[lang].perk_names;
  const groups = previewGroups();

  return (
    <div className="pixel-crt absolute inset-0 z-50 overflow-y-auto bg-slate-900 p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="sticky top-0 z-10 mb-6 flex items-center justify-between border-b-4 border-slate-700 bg-slate-900 pt-2 pb-3">
          <h2 className="flex items-center gap-3 text-xl font-bold tracking-widest text-green-400 md:text-2xl">
            <ShieldAlert className="h-6 w-6" />
            {t.title}
          </h2>
          <button
            onClick={onClose}
            className="pixel-btn border-red-300 bg-red-600 p-2 text-white hover:bg-red-500"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 pb-10 lg:grid-cols-2">
          {/* GALERÍA: lo que pedía la pantalla, todo el arte de un vistazo. */}
          <Section
            title={t.gallery_title}
            icon={<Image className="h-5 w-5" />}
            accent="text-cyan-300"
            wide
          >
            <p className="mb-4 text-[10px] text-slate-400">{t.gallery_desc}</p>
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id}>
                  <h4 className="mb-2 font-mono text-[9px] tracking-widest text-slate-500">
                    {groupTitle(lang, group.id)}
                  </h4>
                  <div className="flex flex-wrap items-end gap-3">
                    {group.items.map((item) => (
                      <figure key={item.id} className="flex flex-col items-center gap-1">
                        <div className="pixel-inset border-slate-700 bg-slate-950 p-1">
                          <Preview
                            item={item}
                            scale={groupScale[group.id] ?? 1}
                            label={previewLabel(lang, group.id, item.key)}
                          />
                        </div>
                        <figcaption className="max-w-[9rem] truncate text-center text-[7px] text-slate-400">
                          {previewLabel(lang, group.id, item.key)}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ARSENAL: cada arma con su sprite, su ráfaga real y sus números. */}
          <Section
            title={t.arsenal_title}
            icon={<Crosshair className="h-5 w-5" />}
            accent="text-blue-300"
            wide
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {WEAPON_TYPES.map((weapon) => {
                const low = getWeaponStats(weapon, 1);
                const high = getWeaponStats(weapon, MAX_LEVEL);
                const text = weaponText(lang, weapon);
                const rate = (frames: number) => (60 / frames).toFixed(1);

                return (
                  <article
                    key={weapon}
                    className="pixel-inset flex gap-3 border-slate-700 bg-slate-900 p-2"
                  >
                    <div className="pixel-inset shrink-0 border-slate-800 bg-slate-950 p-1">
                      <PreviewById id={`weapon:${weapon}`} label={text.name} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-bold text-blue-200">{text.name}</h4>
                      <p className="mb-1 text-[8px] leading-relaxed text-slate-400">{text.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        <Stat label={t.stat_damage} value={`${low.damage}→${high.damage}`} />
                        <Stat
                          label={t.stat_rate}
                          value={`${rate(low.cooldownFrames)}→${rate(high.cooldownFrames)}`}
                        />
                        <Stat
                          label={t.stat_shots}
                          value={`${low.projectileCount}→${high.projectileCount}`}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>

          {/* MÁS BUSCADOS: sale de los datos, así que el jefe oculto ya aparece. */}
          <Section
            title={t.bosses_title}
            icon={<Skull className="h-5 w-5" />}
            accent="text-red-400"
            wide
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[...STAGE_BOSSES, HIDDEN_BOSS].map((boss, index) => {
                const text = bossText(lang, boss.nameKey);
                const hidden = boss.variant === HIDDEN_BOSS.variant;

                return (
                  <article
                    key={boss.variant}
                    className="pixel-inset flex items-start gap-3 border-slate-700 bg-slate-900 p-2"
                  >
                    <div className="pixel-inset shrink-0 border-slate-800 bg-slate-950 p-1">
                      <PreviewById id={`boss:${boss.variant}`} label={text.name} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold text-red-300">
                        {text.name}
                        {hidden && (
                          <span className="pixel-inset border-yellow-700 bg-yellow-500 px-1 text-[7px] text-black">
                            {t.hidden_label}
                          </span>
                        )}
                      </h4>
                      <p className="mb-1 text-[8px] leading-relaxed text-slate-400">{text.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {!hidden && <Stat label={TEXT[lang].hud.stage} value={`${index + 1}`} />}
                        <Stat label={t.stat_hp} value={`${boss.maxHp}`} />
                        <Stat label={t.stat_touch} value={`${boss.contactDamage}`} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>

          {/* AMENAZAS COMUNES: la tabla de aparición, con su vida real por fase. */}
          <Section
            title={t.enemies_title}
            icon={<ShieldAlert className="h-5 w-5" />}
            accent="text-yellow-300"
            wide
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ENEMY_SPAWN_TABLE.map((entry) => {
                const text = enemyText(lang, entry.subType as CommonEnemy);
                return (
                  <article
                    key={entry.subType}
                    className="pixel-inset flex flex-col items-center gap-2 border-slate-700 bg-slate-900 p-2 text-center"
                  >
                    <div className="pixel-inset border-slate-800 bg-slate-950 p-1">
                      <PreviewById id={`enemy:${entry.subType}`} scale={2} label={text.name} />
                    </div>
                    <h4 className="text-[9px] font-bold text-yellow-200">{text.name}</h4>
                    <p className="text-[8px] leading-relaxed text-slate-400">{text.desc}</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      <Stat
                        label={t.stat_hp}
                        value={`${enemyHpForStage(entry, 1)}→${enemyHpForStage(entry, 5)}`}
                      />
                      <Stat label={t.stat_touch} value={`${entry.contactDamage}`} />
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>

          {/* MEJORAS: las diez de PERK_DEFINITIONS, no ocho a mano. */}
          <Section title={t.rewards_title} icon={<Gift className="h-5 w-5" />} accent="text-pink-400">
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
                    <p className="text-[8px] leading-relaxed text-slate-400">{text.desc}</p>
                    <span className="mt-1 inline-block font-mono text-[7px] text-slate-500">
                      {rarity}
                    </span>
                  </article>
                );
              })}
            </div>
          </Section>

          {/* LOGROS: los umbrales, que ahora sí coinciden con progression.ts. */}
          <Section title={t.achievements_title} icon={<Trophy className="h-5 w-5" />} accent="text-yellow-400">
            <p className="mb-3 text-[10px] text-slate-400">{t.achievements_desc}</p>
            <div className="space-y-2">
              {[
                { icon: <Star className="h-3 w-3" />, title: t.ach_score_title, desc: t.ach_score_desc },
                { icon: <Skull className="h-3 w-3" />, title: t.ach_kill_title, desc: t.ach_kill_desc },
                { icon: <Trophy className="h-3 w-3" />, title: t.ach_boss_title, desc: t.ach_boss_desc },
              ].map((row) => (
                <div
                  key={row.title}
                  className="pixel-inset flex items-start gap-2 border-slate-700 bg-slate-900 p-2"
                >
                  <span className="mt-0.5 text-yellow-200">{row.icon}</span>
                  <div>
                    <h4 className="text-[9px] font-bold text-yellow-100">{row.title}</h4>
                    <p className="text-[8px] text-slate-400">{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="pb-8 text-center">
          <button
            onClick={onClose}
            className="pixel-btn border-slate-500 bg-slate-700 px-6 py-2 text-[10px] text-white hover:bg-slate-600"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
