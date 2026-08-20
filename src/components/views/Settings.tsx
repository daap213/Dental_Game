import React, { useEffect, useState } from 'react';
import { Gamepad2, Globe, Trash2, User, Volume2, X } from 'lucide-react';
import type { Language } from '../../types';
import { TEXT } from '../../i18n';
import { AUDIO_STEPS } from '../../game/data/audio';
import {
  ACTIONS,
  ACTION_SPECS,
  MAX_CODES_PER_ACTION,
  codeLabel,
  conflictsFor,
  canRelease,
  rebind,
  resetBindings,
  unbind,
  type Bindings,
  type GameAction,
} from '../../game/data/controls';
import { NICKNAME_MAX } from '../../storage/settings';
import { PixelButton, PixelKey, PixelLabel, PixelPanel } from '../ui/Pixel';
import { PixelTabs, type ChoiceOption } from '../ui/PixelChoice';
import { PixelField, PixelLevel } from '../ui/PixelForm';
import { PixelDialog } from '../ui/PixelDialog';

/**
 * Ajustes: apodo e idioma, teclas, audio y borrado de datos.
 *
 * Se abre desde el menú **y desde la pausa**, y eso último es lo que obliga a
 * que `App` sea el único dueño de `Escape`: sin ese cuidado, cerrar los ajustes
 * a mitad de partida quitaría también la pausa. Ver `overlayOpen` en `App.tsx`.
 */

type TabId = 'player' | 'controls' | 'audio';

interface SettingsProps {
  onClose: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  nickname: string;
  setNickname: (v: string) => void;
  bindings: Bindings;
  setBindings: (b: Bindings) => void;
  music: number;
  sfx: number;
  setMusic: (v: number) => void;
  setSfx: (v: number) => void;
  onErase: () => void;
  onPrivacy: () => void;
}

/** Una fila de reasignación: sus teclas y el botón de capturar. */
const BindRow: React.FC<{
  action: GameAction;
  bindings: Bindings;
  onChange: (b: Bindings) => void;
  capturing: boolean;
  onCapture: () => void;
  lang: Language;
}> = ({ action, bindings, onChange, capturing, onCapture, lang }) => {
  const t = TEXT[lang].settings;
  const codes = bindings[action];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 py-2">
      {/* Izquierda y derecha comparten rótulo —«Mover»—, así que sin la flecha
          la lista enseña dos filas idénticas y no se sabe cuál se reasigna. */}
      <span className="flex items-center gap-1.5 text-[9px] tracking-wider text-slate-300 uppercase">
        {TEXT[lang].menu[ACTION_SPECS[action].labelKey]}
        {(action === 'left' || action === 'right') && (
          <span aria-hidden className="text-slate-500">
            {action === 'left' ? '←' : '→'}
          </span>
        )}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {codes.map((code) => (
          <PixelButton
            key={code}
            onClick={() => onChange(unbind(bindings, action, code))}
            disabled={!canRelease(bindings, action)}
            title={codeLabel(code)}
            className="px-2 py-1"
          >
            {codeLabel(code)} ×
          </PixelButton>
        ))}
        <PixelButton
          onClick={onCapture}
          active={capturing}
          activeClass="bg-amber-600 border-amber-300 text-white"
          disabled={!capturing && codes.length >= MAX_CODES_PER_ACTION}
          className="px-2 py-1"
        >
          {capturing ? t.rebind : t.change}
        </PixelButton>
      </div>
    </div>
  );
};

export const Settings: React.FC<SettingsProps> = ({
  onClose,
  lang,
  setLang,
  nickname,
  setNickname,
  bindings,
  setBindings,
  music,
  sfx,
  setMusic,
  setSfx,
  onErase,
  onPrivacy,
}) => {
  const t = TEXT[lang].settings;
  const [tab, setTab] = useState<TabId>('player');
  const [capturing, setCapturing] = useState<GameAction | null>(null);
  const [conflict, setConflict] = useState<GameAction | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [draftName, setDraftName] = useState(nickname);

  /**
   * Captura de tecla.
   *
   * Va en fase de captura y come el evento: mientras se está asignando, el juego
   * y el navegador no pueden verlo. **`Tab` se ignora a propósito** —es la única
   * vía de escape del teclado y robarla dejaría atrapado a quien navegue así— y
   * `Escape` cancela en vez de asignarse.
   */
  useEffect(() => {
    if (!capturing) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab') return;
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setCapturing(null);
        setConflict(null);
        return;
      }

      const holder = conflictsFor(bindings, e.code, capturing);
      const next = rebind(bindings, capturing, e.code);
      if (next === bindings && holder) {
        // Se rechazó porque dejaría a la otra acción sin ninguna tecla.
        setConflict(holder);
        return;
      }
      setBindings(next);
      setCapturing(null);
      setConflict(null);
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, bindings, setBindings]);

  const tabs: readonly ChoiceOption<TabId>[] = [
    {
      id: 'player',
      label: t.tab_player,
      icon: <User className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-emerald-300 bg-emerald-700 text-white',
    },
    {
      id: 'controls',
      label: t.tab_controls,
      icon: <Gamepad2 className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-blue-300 bg-blue-700 text-white',
    },
    {
      id: 'audio',
      label: t.tab_audio,
      icon: <Volume2 className="h-3 w-3" strokeWidth={3} />,
      accent: 'border-violet-300 bg-violet-700 text-white',
    },
  ];

  return (
    <div className="pixel-crt absolute inset-0 z-[60] flex flex-col bg-slate-900 p-3 md:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col gap-3">
        <header className="flex items-center justify-between gap-3 border-b-4 border-slate-700 pb-2">
          <h2 className="text-[11px] tracking-[0.2em] text-cyan-300 uppercase md:text-sm">
            {t.title}
          </h2>
          <PixelButton
            onClick={onClose}
            variant="primary"
            className="p-1.5"
            aria-label={t.close}
            title={t.close}
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </PixelButton>
        </header>

        <PixelTabs options={tabs} value={tab} onSelect={setTab} label={t.title} marker />

        <div className="pixel-scroll flex flex-col gap-3 pb-4">
          {tab === 'player' && (
            <>
              <PixelPanel title={t.nickname} accent="border-emerald-700" bodyClassName="p-3">
                <PixelField
                  label={t.nickname}
                  value={draftName}
                  onChange={setDraftName}
                  onSubmit={() => setNickname(draftName)}
                  maxLength={NICKNAME_MAX}
                  placeholder={t.nickname_placeholder}
                  hint={
                    <>
                      {t.nickname_hint}{' '}
                      <button type="button" onClick={onPrivacy} className="pixel-link">
                        {TEXT[lang].records.privacy_link}
                      </button>
                    </>
                  }
                />
                <div className="mt-2 flex justify-end">
                  <PixelButton
                    onClick={() => setNickname(draftName)}
                    disabled={draftName === nickname}
                    className="px-3 py-1.5"
                  >
                    {TEXT[lang].records.submit}
                  </PixelButton>
                </div>
              </PixelPanel>

              <PixelPanel title={t.language} accent="border-slate-600" bodyClassName="p-3">
                <PixelButton
                  onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <Globe className="h-3.5 w-3.5" strokeWidth={3} />
                  {lang === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
                </PixelButton>
              </PixelPanel>
            </>
          )}

          {tab === 'controls' && (
            <>
              <PixelPanel title={t.tab_controls} accent="border-blue-700" bodyClassName="p-3">
                {ACTIONS.map((action) => (
                  <BindRow
                    key={action}
                    action={action}
                    bindings={bindings}
                    onChange={setBindings}
                    capturing={capturing === action}
                    onCapture={() => {
                      setConflict(null);
                      setCapturing(capturing === action ? null : action);
                    }}
                    lang={lang}
                  />
                ))}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <PixelLabel>{capturing ? t.rebind_cancel : ''}</PixelLabel>
                  <PixelButton
                    onClick={() => {
                      setBindings(resetBindings());
                      setCapturing(null);
                      setConflict(null);
                    }}
                    className="px-3 py-1.5"
                  >
                    {t.reset}
                  </PixelButton>
                </div>
                {conflict && (
                  <p className="mt-2 text-[8px] text-amber-300">
                    {t.conflict} {TEXT[lang].menu[ACTION_SPECS[conflict].labelKey]}
                  </p>
                )}
              </PixelPanel>

              {/* Lo que no se puede reasignar, dicho en voz alta: si no está,
                  la pantalla parece incompleta y el jugador busca dónde. */}
              <PixelPanel title={t.fixed_title} accent="border-slate-600" bodyClassName="p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-300 uppercase">{t.fixed_shoot}</span>
                    <PixelKey>{t.mouse_left}</PixelKey>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-300 uppercase">{t.fixed_dash}</span>
                    <PixelKey>{t.mouse_right}</PixelKey>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-300 uppercase">{t.fixed_pause}</span>
                    <PixelKey>{codeLabel('Escape')}</PixelKey>
                  </div>
                </div>
              </PixelPanel>
            </>
          )}

          {tab === 'audio' && (
            <>
              <PixelPanel title={t.tab_audio} accent="border-violet-700" bodyClassName="p-3">
                <div className="flex flex-col gap-4">
                  <PixelLevel
                    label={t.music}
                    value={music}
                    onChange={setMusic}
                    steps={AUDIO_STEPS}
                  />
                  <PixelLevel label={t.sfx} value={sfx} onChange={setSfx} steps={AUDIO_STEPS} />
                </div>
              </PixelPanel>

              <PixelPanel title={t.data_title} accent="border-red-800" bodyClassName="p-3">
                <p className="text-[8px] leading-relaxed text-slate-400">{t.data_desc}</p>
                <div className="mt-3">
                  <PixelButton
                    onClick={() => setConfirmErase(true)}
                    variant="danger"
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={3} />
                    {t.erase}
                  </PixelButton>
                </div>
              </PixelPanel>
            </>
          )}
        </div>
      </div>

      {confirmErase && (
        <PixelDialog
          onClose={() => setConfirmErase(false)}
          label={t.erase_title}
          closeOnBackdrop={false}
        >
          <h3 className="text-[11px] tracking-[0.2em] text-red-300 uppercase">{t.erase_title}</h3>
          <p className="mt-3 text-[8px] leading-relaxed text-slate-300">{t.erase_warning}</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <PixelButton onClick={() => setConfirmErase(false)} className="px-3 py-2">
              {t.cancel}
            </PixelButton>
            <PixelButton
              onClick={() => {
                onErase();
                setDraftName('');
                setConfirmErase(false);
              }}
              variant="primary"
              className="px-3 py-2"
            >
              {t.confirm}
            </PixelButton>
          </div>
        </PixelDialog>
      )}
    </div>
  );
};
