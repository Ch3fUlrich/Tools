"use client";

import React from 'react';
import { useTranslation } from '@/components/i18n/LanguageProvider';

interface Source {
  /** The provision as it is cited in the tool. */
  cite: string;
  /** What this tool actually takes from it. */
  used: string;
  href: string;
}

const GESETZE = 'https://www.gesetze-im-internet.de';

const GROUPS: { heading: string; sources: Source[] }[] = [
  {
    heading: 'BEEG — Bundeselterngeld- und Elternzeitgesetz',
    sources: [
      { cite: '§ 1 Abs. 8', used: 'the 175,000 € entitlement cut-off', href: `${GESETZE}/beeg/__1.html` },
      { cite: '§ 2', used: '67 % rate, the sliding scale, 300/1,800 €, the 2,770 € cap', href: `${GESETZE}/beeg/__2.html` },
      { cite: '§ 2a', used: 'Geschwisterbonus (+10 %, min. 75 €) and Mehrlingszuschlag (300 €)', href: `${GESETZE}/beeg/__2a.html` },
      { cite: '§ 2b', used: 'the assessment period — the last completed tax year for the self-employed', href: `${GESETZE}/beeg/__2b.html` },
      { cite: '§ 2c', used: 'employment income and the Arbeitnehmer-Pauschbetrag condition', href: `${GESETZE}/beeg/__2c.html` },
      { cite: '§ 2d', used: 'profit taken from the Einkommensteuerbescheid', href: `${GESETZE}/beeg/__2d.html` },
      { cite: '§ 2e', used: 'the tax deduction and Steuerklasse IV', href: `${GESETZE}/beeg/__2e.html` },
      { cite: '§ 2f', used: 'the flat 9 % / 10 % / 2 % social-contribution deductions', href: `${GESETZE}/beeg/__2f.html` },
      { cite: '§ 3', used: 'crediting Mutterschaftsgeld, and only from the day of birth', href: `${GESETZE}/beeg/__3.html` },
      { cite: '§ 4', used: '12 months plus 2 Partnermonate', href: `${GESETZE}/beeg/__4.html` },
      { cite: '§ 4a', used: 'ElterngeldPlus — half the amount, twice the duration, 150/900 €', href: `${GESETZE}/beeg/__4a.html` },
    ],
  },
  {
    heading: 'EStG / SolZG — income tax',
    sources: [
      { cite: '§ 32a EStG', used: 'the tariff formula and Ehegattensplitting', href: `${GESETZE}/estg/__32a.html` },
      { cite: '§ 32b EStG', used: 'Progressionsvorbehalt on Elterngeld and Mutterschaftsgeld', href: `${GESETZE}/estg/__32b.html` },
      { cite: '§ 31 EStG', used: 'the Günstigerprüfung between Kindergeld and Kinderfreibetrag', href: `${GESETZE}/estg/__31.html` },
      { cite: '§ 32 Abs. 6 EStG', used: 'the Kinderfreibetrag and its split between parents', href: `${GESETZE}/estg/__32.html` },
      { cite: '§ 51a Abs. 2a EStG', used: 'the SolZ always uses the Kinderfreibetrag base', href: `${GESETZE}/estg/__51a.html` },
      { cite: '§ 39b Abs. 2 EStG', used: 'the Vorsorgepauschale used inside the § 2e simulation', href: `${GESETZE}/estg/__39b.html` },
      { cite: '§ 9a EStG', used: 'the Arbeitnehmer-Pauschbetrag', href: `${GESETZE}/estg/__9a.html` },
      { cite: '§ 4 SolZG 1995', used: 'the Freigrenze and the 11.9 % Milderungszone', href: `${GESETZE}/solzg_1995/__4.html` },
    ],
  },
  {
    heading: 'Social insurance',
    sources: [
      { cite: '§ 24i SGB V', used: 'entitlement to Mutterschaftsgeld', href: `${GESETZE}/sgb_5/__24i.html` },
      { cite: '§ 44 Abs. 2 SGB V', used: 'the Krankengeld election that self-employed people need', href: `${GESETZE}/sgb_5/__44.html` },
      { cite: '§ 47 SGB V', used: '70 % of the contributory income per calendar day', href: `${GESETZE}/sgb_5/__47.html` },
      { cite: '§ 3 MuSchG', used: 'the 6 weeks before and 8 (or 12) weeks after the birth', href: `${GESETZE}/muschg_2018/__3.html` },
      { cite: '§ 2 Satz 1 Nr. 3 SGB VI', used: 'why a Kindertagespflegeperson is compulsorily pension-insured', href: `${GESETZE}/sgb_6/__2.html` },
    ],
  },
];

/**
 * Every rule the tool applies, linked to the statute it comes from, so a claim can be
 * checked without taking this page's word for it.
 */
export default function Sources() {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-sm" style={{ color: 'var(--muted)', margin: '0 0 0.875rem' }}>
        {t('eg.sourcesIntro')}
      </p>

      {GROUPS.map((group) => (
        <div key={group.heading} style={{ marginBottom: '1rem' }}>
          <h3
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--fg-secondary)',
              fontWeight: 700,
              margin: '0 0 0.5rem',
            }}
          >
            {group.heading}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.sources.map((source) => (
              <li
                key={source.cite}
                className="text-sm"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.375rem',
                  padding: '0.3rem 0',
                  borderBottom: '1px solid var(--card-border)',
                  color: 'var(--muted)',
                }}
              >
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  {source.cite}
                </a>
                <span>— {source.used}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-sm" style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>
        Kindertagespflege operating-expense flat rate (400 € per child per month):{' '}
        <a
          href="https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Einkommensteuer/2023-04-06-ertragsteuerliche-behandlung-der-kindertagespflege.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
        >
          BMF-Schreiben vom 6.4.2023
        </a>
        .
      </p>
    </div>
  );
}
