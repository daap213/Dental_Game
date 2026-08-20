import { LEGAL_LINKS } from './links';
import {
  BRAND,
  CONTACT_EMAIL,
  JURISDICTION_CITY,
  JURISDICTION_COUNTRY,
  LEGAL_UPDATED,
  SITE_DOMAIN,
  SITE_NAME,
} from './identity';
import type { LegalPack } from './types';

export const legalEn: LegalPack = {
  terms: {
    id: 'terms',
    title: 'Legal notice and terms of use',
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: 'who',
        title: 'Who publishes this game',
        blocks: [
          {
            kind: 'p',
            spans: [
              `${SITE_NAME} is published by `,
              { strong: BRAND },
              `, a personal brand with no corporate form, from ${JURISDICTION_COUNTRY}. You can write to `,
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              ' about anything related to these terms.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `The game is distributed only at ${SITE_DOMAIN}. Any copy hosted elsewhere is unauthorised and outside our control.`,
            ],
          },
        ],
      },
      {
        id: 'object',
        title: 'What this is, and what it is not',
        blocks: [
          {
            kind: 'p',
            spans: [
              'It is a free video game that runs entirely in your browser. There is no sign-up, no account, no payment, no in-game purchase, no advertising and no subscription.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Nothing is sold and nothing is asked of you in exchange for playing. Equally, there is no obligation to keep it online forever.',
            ],
          },
        ],
      },
      {
        id: 'acceptance',
        title: 'Acceptance',
        blocks: [
          {
            kind: 'p',
            spans: [
              'By visiting the site and playing, you accept these terms. If you disagree with any of them, the remedy is simple: do not use the game.',
            ],
          },
        ],
      },
      {
        id: 'use',
        title: 'Permitted use',
        blocks: [
          {
            kind: 'p',
            spans: [
              'You may play as much as you like, for personal and non-commercial purposes, and share the link with anyone.',
            ],
          },
          { kind: 'p', spans: ['You may not:'] },
          {
            kind: 'ul',
            items: [
              ['decompile, disassemble or reverse-engineer the game;'],
              ['extract, copy or reuse its code, its sprites or its music;'],
              ['host your own copy, even on a non-profit basis;'],
              ['embed it in another site within a frame without written permission;'],
              ['use it commercially, or charge for access to it;'],
              ['interfere with the service or attempt to degrade it.'],
            ],
          },
        ],
      },
      {
        id: 'ip',
        title: 'Intellectual property',
        blocks: [
          {
            kind: 'p',
            spans: [
              'All of the game art is ',
              { strong: 'procedural and original' },
              ': there is not a single image file. Every tooth, enemy, background and effect is drawn by our own code in real time, and every sound is synthesised in the browser.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `The source code, level design, texts, characters and audio are the work of ${BRAND}. `,
              { strong: 'All rights reserved.' },
              ' The sole exception is the third-party software and the typeface, which keep their own licences and are listed on the licences tab.',
            ],
          },
          {
            kind: 'p',
            spans: [{ strong: 'Playing grants no licence' }, ' over the code or the artwork.'],
          },
        ],
      },
      {
        id: 'ai',
        title: 'Use of artificial intelligence',
        blocks: [
          {
            kind: 'p',
            spans: [
              "Part of this project's code and art was produced with the assistance of generative AI tools, always under human direction and review. Authorship of the resulting work is claimed by us and is covered by the section above.",
            ],
          },
          {
            kind: 'p',
            spans: [
              'The game as published today ',
              { strong: 'runs no AI at all' },
              ': there are no calls to any service, during play or otherwise.',
            ],
          },
        ],
      },
      {
        id: 'parody',
        title: 'This is not dental advice',
        blocks: [
          {
            kind: 'note',
            spans: [
              { strong: 'This is a parody.' },
              ' Nothing in the game is health information, diagnosis or treatment.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'The "Medical Diagnosis" on the game-over screen, the enemy names (gingivitis, cavities, tartar, abscess) and the "weapons" (fluoride, floss, mouthwash, toothbrush) are humour, not dentistry. They are exaggerated, simplified and in many cases simply invented.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Do not make any decision about your health based on this game. That is what your dentist is for, and your dentist is real.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `${BRAND} has no relationship, sponsorship or affiliation with any dental association, clinic, brand or product.`,
            ],
          },
        ],
      },
      {
        id: 'photosensitivity',
        title: 'Photosensitivity warning',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The game contains flashing, blinking and, in the later stages, rapid distortion effects. A very small proportion of people may experience seizures when exposed to light stimuli of this kind.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'If you feel dizzy, disoriented, notice altered vision or any involuntary movement, stop playing and consult a professional. The game honours the system "reduce motion" preference on its animated screens.',
            ],
          },
        ],
      },
      {
        id: 'age',
        title: 'Age and audience',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Suitable for a general audience. There is fantasy violence against non-human creatures — bacteria, cavities and the like — with no realistic blood, no offensive language and no sexual content.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'It is not specifically directed at children. Because ',
              { strong: 'no data is collected from anyone' },
              ', minors included, there is no parental consent mechanism to apply. Supervision of younger players is still recommended.',
            ],
          },
        ],
      },
      {
        id: 'availability',
        title: 'Availability',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The game is offered free of charge and "as is". It may be interrupted, changed, lose features or be withdrawn at any time without notice. No continuity, freedom from defects, or preservation of any saved game is guaranteed.',
            ],
          },
        ],
      },
      {
        id: 'warranty',
        title: 'Warranties and liability',
        blocks: [
          {
            kind: 'p',
            spans: [
              'To the fullest extent permitted by applicable law, the game is provided without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose and non-infringement.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `${BRAND} is not liable for indirect, incidental or consequential damages arising from the use of, or inability to use, the game, including the loss of data stored locally in your browser.`,
            ],
          },
          {
            kind: 'p',
            spans: [
              'None of the above limits any rights you have as a consumer where the law does not permit them to be limited.',
            ],
          },
        ],
      },
      {
        id: 'links',
        title: 'Third-party links',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The only external links on the site point to licence texts and third-party privacy policies, and they live on the licences and privacy tabs. We do not control their content and are not responsible for it.',
            ],
          },
        ],
      },
      {
        id: 'changes',
        title: 'Changes to these terms',
        blocks: [
          {
            kind: 'p',
            spans: [
              'These terms may be updated. The version in force is always the one published on this page, with its last-updated date above. Continuing to play after a change means accepting it.',
            ],
          },
        ],
      },
      {
        id: 'law',
        title: 'Governing law and jurisdiction',
        blocks: [
          {
            kind: 'p',
            spans: [
              `These terms are governed by the law of the Republic of ${JURISDICTION_COUNTRY}. For any dispute, the parties submit to the courts of ${JURISDICTION_CITY}, ${JURISDICTION_COUNTRY}.`,
            ],
          },
          {
            kind: 'p',
            spans: [
              { strong: 'Consumer carve-out: ' },
              'if you reside in the European Union, or in any other country whose law grants you a forum of your own or mandatory consumer protection, that protection is unaffected by the clause above.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: 'Contact',
        blocks: [
          {
            kind: 'p',
            spans: [
              'For questions, legal notices or licensing enquiries: ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy policy',
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: 'summary',
        title: 'Summary',
        blocks: [
          {
            kind: 'note',
            spans: [
              { strong: 'This game collects no personal data.' },
              ' No cookies. No analytics. No accounts. No advertising. Nothing you do leaves your device.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'The rest of this page explains why that is literally true, and what the one honest exception is: the server that delivers the page to you.',
            ],
          },
        ],
      },
      {
        id: 'controller',
        title: 'Data controller',
        blocks: [
          {
            kind: 'p',
            spans: [
              { strong: BRAND },
              `, a personal brand with no corporate form, based in ${JURISDICTION_COUNTRY}. Contact: `,
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
      {
        id: 'scope',
        title: 'Scope',
        blocks: [
          {
            kind: 'p',
            spans: [
              `This policy covers ${SITE_DOMAIN} and the game that runs on it. It does not cover any other site you may reach from here.`,
            ],
          },
        ],
      },
      {
        id: 'nodata',
        title: 'What data we process',
        blocks: [
          { kind: 'p', spans: ['None. Specifically, we do not process:'] },
          {
            kind: 'ul',
            items: [
              ['name, email address or any contact details;'],
              ['user accounts, passwords or session identifiers;'],
              ['location, whether approximate or precise;'],
              ['advertising identifiers or device fingerprints;'],
              ['behavioural profiles or automated decision-making;'],
              ['health data, despite the theme of the game.'],
            ],
          },
          {
            kind: 'p',
            spans: [
              'The game has ',
              { strong: 'not a single text field' },
              ': there is no way to enter information even if you wanted to.',
            ],
          },
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies',
        blocks: [
          {
            kind: 'p',
            spans: [
              'We use no cookies. Not first-party, not third-party, not technical, not of any kind.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'That is why ',
              { strong: 'you will not see a consent banner' },
              ': there is nothing to consent to. A banner here would be a false statement about our own site.',
            ],
          },
        ],
      },
      {
        id: 'local',
        title: 'Local storage',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Today the game ',
              { strong: 'stores nothing' },
              ' in your browser: no local storage, no session storage, no databases. Reload the page and everything starts over.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'In future the game may store, ',
              { strong: 'on your device only' },
              ', your preferences (language, difficulty, class, loadout, controls and sound) and a nickname you choose, along with your scores.',
            ],
          },
          {
            kind: 'ul',
            items: [
              ['That information is never sent to any server and we cannot see it.'],
              [
                'It is not used for advertising, for profiling, or for anything other than remembering your game.',
              ],
              [
                'The nickname is a free-form field: ',
                { strong: 'do not enter your real name' },
                ' or anything that identifies you.',
              ],
              [
                'You will be able to erase it from within the game, or at any time by clearing site data in your browser.',
              ],
            ],
          },
          {
            kind: 'p',
            spans: [
              'Because it never leaves your device and is strictly necessary to provide the functionality you asked for, that storage requires no prior consent. It is nevertheless declared here, which is the part that is mandatory.',
            ],
          },
        ],
      },
      {
        id: 'hosting',
        title: 'Hosting',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The site is served by ',
              { strong: 'Cloudflare Pages' },
              ' (Cloudflare, Inc.). Like every web server in the world, in order to deliver the page and protect it from abuse it processes connection data: your IP address, the browser you use and the time of the request.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `This is the only processing that genuinely happens, and that is why it is here: without this section, saying "we collect nothing" would be false. ${BRAND} does not consult those logs, does not download them, and has no analytics of any kind enabled.`,
            ],
          },
          {
            kind: 'p',
            spans: [
              'The legal basis is the legitimate interest in providing and protecting the service. You can read ',
              { link: "Cloudflare's privacy policy", href: LEGAL_LINKS.cloudflarePrivacy },
              '.',
            ],
          },
        ],
      },
      {
        id: 'thirdparty',
        title: 'Third parties',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Apart from hosting, ',
              { strong: 'the game talks to nobody' },
              ': no analytics, no ads, no social buttons, no maps, no embedded video, no external CDNs.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'The typeface is served from our own domain rather than from Google Fonts, precisely so that loading the page does not disclose your IP address to a third party. The game loads no images either: all the art is drawn by code in your browser.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'There used to be an AI integration that sent your score to a third party when you died. ',
              { strong: 'It was removed' },
              ', and with it the only outbound network request the game made.',
            ],
          },
        ],
      },
      {
        id: 'transfers',
        title: 'International transfers',
        blocks: [
          {
            kind: 'p',
            spans: [
              `The controller is in ${JURISDICTION_COUNTRY}. The page is served from Cloudflare's delivery network, so it may be delivered from a server near you anywhere in the world. There is no data processed by us to transfer.`,
            ],
          },
        ],
      },
      {
        id: 'retention',
        title: 'Retention',
        blocks: [
          {
            kind: 'p',
            spans: [
              'We retain nothing, because we collect nothing. The hosting provider manages its technical logs under its own policy. Anything stored locally in future lives in your browser until you delete it.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        blocks: [
          {
            kind: 'p',
            spans: [
              'You have the rights of access, rectification, erasure, objection, portability, restriction of processing, and not to be subject to automated decisions, under the Ecuadorian Organic Law on Personal Data Protection and, if you reside in the European Union, under the General Data Protection Regulation.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'You can exercise them by writing to ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '. We will reply within the statutory period. In all honesty: since we process no data that identifies you, there will normally be nothing to locate, and that is exactly what we will tell you.',
            ],
          },
        ],
      },
      {
        id: 'authority',
        title: 'Supervisory authority',
        blocks: [
          {
            kind: 'p',
            spans: [
              'If you believe we have not handled your request properly, you may complain to the ',
              {
                link: 'Superintendency for Personal Data Protection of Ecuador',
                href: LEGAL_LINKS.dataAuthority,
              },
              '. If you reside in the European Union, you may also complain to your national supervisory authority.',
            ],
          },
        ],
      },
      {
        id: 'minors',
        title: 'Minors',
        blocks: [
          {
            kind: 'p',
            spans: [
              'We collect data from nobody, and therefore from no minors either. We do not ask for age because no processing depends on it.',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: 'Security',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The whole site is served over HTTPS. The strongest security measure in this project, however, is structural: ',
              { strong: 'there is no database and no application server to compromise' },
              '. The game is a static file that runs in your browser.',
            ],
          },
        ],
      },
      {
        id: 'changes',
        title: 'Changes',
        blocks: [
          {
            kind: 'p',
            spans: [
              'If the game ever begins to process data — for instance if an online leaderboard appears — this policy will be updated before that happens, and you will see the new date above.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: 'Contact',
        blocks: [
          {
            kind: 'p',
            spans: [
              'For any privacy question: ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
    ],
  },

  licenses: {
    id: 'licenses',
    title: 'Licences and attributions',
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: 'own',
        title: 'This game',
        blocks: [
          {
            kind: 'p',
            spans: [
              `${SITE_NAME} and all of its original content are the property of ${BRAND}. `,
              { strong: 'All rights reserved.' },
            ],
          },
          {
            kind: 'p',
            spans: [
              'The code and the art are not open source and are not reusable. For any use other than playing, write to ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
      {
        id: 'assets',
        title: 'No third-party assets',
        blocks: [
          {
            kind: 'note',
            spans: [
              'No ',
              { strong: 'third-party image or audio file' },
              ' is distributed. All the art is drawn by code and all the sound is synthesised in the browser.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'That removes almost the entire licensing surface a video game usually carries. The only binary files served are the two variants of the typeface, and the next section is devoted to them.',
            ],
          },
        ],
      },
      {
        id: 'font',
        title: 'Typeface: Press Start 2P',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The game typeface is Press Start 2P, distributed under the ',
              { strong: 'SIL Open Font License, version 1.1' },
              '.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P"',
            ],
          },
          {
            kind: 'p',
            spans: [
              'This site redistributes the font files to every visitor, so the licence requires its full text to accompany them: ',
              { link: 'full OFL text', href: LEGAL_LINKS.ofl },
              ' — ',
              { link: 'about the licence', href: LEGAL_LINKS.oflInfo },
              '.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'The font is redistributed unmodified, is not sold on its own, and its Reserved Font Name is not used for any modified version.',
            ],
          },
        ],
      },
      {
        id: 'software',
        title: 'Third-party software',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The game includes the following open-source libraries. Their licences require the copyright notice to travel with distributed copies, and that is what this table does.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'The full texts of these licences are in ',
              { link: 'THIRD-PARTY.txt', href: LEGAL_LINKS.thirdParty },
              '.',
            ],
          },
        ],
      },
      {
        id: 'build',
        title: 'Build tooling',
        blocks: [
          {
            kind: 'p',
            spans: [
              'The project is built with Vite, TypeScript, ESLint, Prettier and Vitest, all MIT-licensed. They are not distributed with the game and impose no notice obligation, so they are not listed one by one: such a list only goes stale.',
            ],
          },
        ],
      },
      {
        id: 'ai',
        title: 'AI assistance',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Part of the development was carried out with generative AI tools, whose output was reviewed and adapted by hand. The published game runs no AI and contacts no service.',
            ],
          },
        ],
      },
      {
        id: 'trademarks',
        title: 'Trademarks',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Any names and trademarks mentioned belong to their respective holders. Such mention is purely descriptive and implies no affiliation or endorsement.',
            ],
          },
        ],
      },
    ],
  },
};
