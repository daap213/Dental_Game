import React, { useState } from 'react';
import type { Language } from '../../types';
import { TEXT } from '../../i18n';
import { NICKNAME_MAX } from '../../storage/settings';
import { ANON_NICKNAME } from '../../storage/scores';
import { PixelButton, PixelLabel } from '../ui/Pixel';
import { PixelField } from '../ui/PixelForm';
import { PixelDialog } from '../ui/PixelDialog';

/**
 * Se pide el apodo **una sola vez**, al terminar la primera partida.
 *
 * Saltarlo guarda con un apodo anónimo y no se vuelve a preguntar: la
 * alternativa —no guardar esa partida— pierde un récord por un despiste y
 * además rompe el "una sola vez", porque volvería a salir la próxima.
 *
 * El aviso del campo no es adorno: la política de privacidad promete
 * explícitamente que ahí se dice que no se ponga el nombre real.
 */
interface NicknameDialogProps {
  score: number;
  lang: Language;
  onSubmit: (nickname: string) => void;
  onPrivacy: () => void;
}

export const NicknameDialog: React.FC<NicknameDialogProps> = ({
  score,
  lang,
  onSubmit,
  onPrivacy,
}) => {
  const t = TEXT[lang].records;
  const ts = TEXT[lang].settings;
  const [value, setValue] = useState('');

  const submit = () => onSubmit(value.trim() || ANON_NICKNAME);

  return (
    // Sin cierre por fondo ni por Escape hacia la nada: la pregunta se responde
    // o se salta, y las dos salidas guardan la partida.
    <PixelDialog onClose={submit} label={t.ask_title} closeOnBackdrop={false}>
      <h3 className="text-[11px] tracking-[0.2em] text-yellow-300 uppercase">{t.ask_title}</h3>
      <p className="mt-2 text-[8px] leading-relaxed text-slate-400">{t.ask_desc}</p>

      <div className="pixel-inset mt-3 border-slate-700 bg-slate-950 p-3 text-center">
        <PixelLabel>{t.your_run}</PixelLabel>
        <p className="pixel-text-shadow mt-1 text-xl tracking-[0.15em] text-yellow-400">
          {score.toString().padStart(6, '0')}
        </p>
      </div>

      <div className="mt-4">
        <PixelField
          label={ts.nickname}
          value={value}
          onChange={setValue}
          onSubmit={submit}
          maxLength={NICKNAME_MAX}
          placeholder={ts.nickname_placeholder}
          autoFocus
          hint={
            <>
              {ts.nickname_hint}{' '}
              <button type="button" onClick={onPrivacy} className="pixel-link">
                {t.privacy_link}
              </button>
            </>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <PixelButton onClick={() => onSubmit(ANON_NICKNAME)} className="px-3 py-2">
          {t.skip}
        </PixelButton>
        <PixelButton onClick={submit} variant="primary" className="px-4 py-2">
          {t.submit}
        </PixelButton>
      </div>
    </PixelDialog>
  );
};
