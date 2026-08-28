// Message catalogues. `en` is the source of truth: its shape defines MessageKey,
// so a missing German string is a type error rather than a silent fallback.

export const en = {
  common: {
    appName: 'Tools Collection',
    tagline: 'A collection of useful tools for everyday tasks',
    searchPlaceholder: 'Search tools by name or description…',
    searchLabel: 'Search tools',
    clearSearch: 'Clear search',
    gridView: 'Grid view',
    listView: 'List view',
    noResults: 'No tools match your search.',
    signIn: 'Sign In',
    profile: 'Profile',
    tools: 'Tools',
    openMenu: 'Open tools menu',
    language: 'Language',
    switchToGerman: 'Auf Deutsch umschalten',
    switchToEnglish: 'Switch to English',
  },

  nav: {
    dice: 'Dice',
    fatLoss: 'Fat',
    n26: 'N26',
    bloodLevel: 'Blood Level',
    timeline: 'Timeline',
    training: 'Training',
    elterngeld: 'Elterngeld',
  },

  tools: {
    fatLoss: {
      title: 'Fat Loss Calculator',
      description:
        'Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss.',
    },
    n26: {
      title: 'N26 Transaction Analyzer',
      description:
        'Analyze your N26 bank transactions, view spending patterns, and get insights into your financial data.',
    },
    dice: {
      title: 'Dice Roller',
      description: 'Roll dice with various options including advantage/disadvantage and custom dice types.',
    },
    bloodLevel: {
      title: 'Blood Level Calculator',
      description: 'Calculate substance elimination and blood levels over time using pharmacokinetic models.',
    },
    training: {
      title: 'Training Tracker',
      description: 'Track workouts with physics-based energy calculation and muscle activation heat maps.',
    },
    timeline: {
      title: 'Timeline Builder',
      description:
        'Create editable visual timelines with stages, markers, range blocks, presets, and export options.',
    },
    elterngeld: {
      title: 'Elterngeld Optimizer',
      description:
        'Decide whether declaring a higher profit — and paying more income tax — pays for itself through higher Elterngeld.',
      shortDescription:
        'Weigh a higher declared profit and its income tax against the higher German Elterngeld it buys.',
    },
  },

  eg: {
    // ── Input sections ──
    household: 'Household',
    filingLegend: 'Assessment (Veranlagung)',
    single: 'Single',
    married: 'Married (Splitting)',
    baseYear: 'Assessment year',
    baseYearHint: 'Bemessungszeitraum',
    leaveYear: 'Leave year',
    partnerIncome: 'Partner income',
    assessmentYr: 'assessment yr',
    leaveYr: 'leave yr',
    ownIncome: 'Your other income',
    prepaidBase: 'Tax already paid',
    prepaidBaseHint: 'Lohnsteuer + Vorauszahlungen, assessment yr',
    prepaidLeave: 'Tax already paid',
    prepaidLeaveHint: 'leave yr',

    options: 'The two options',
    deltaLegend: 'What creates the profit difference?',
    timing: 'Write-off timing',
    cash: 'Real extra earnings',
    timingHint:
      'Depreciation is non-cash: the same money is in your account either way, only the taxable profit moves — and the write-off returns in a later year.',
    cashHint: 'The extra profit is real money you actually earned on top.',
    lowerProfit: 'Lower profit',
    higherProfit: 'Higher profit',
    perYear: '€/yr',
    employmentGross: 'Employment gross',
    employmentGrossHint: 'Bruttoarbeitslohn, § 2c BEEG',
    relief: 'Later relief on postponed write-offs',
    reliefHint: 'marginal rate when the deduction lands',
    loadExample: 'Load Kindertagespflege example',

    insurance: 'Insurance & leave',
    insuranceLegend: 'Compulsory insurance',
    insuranceLegendHint: '§ 2f BEEG flat deductions',
    health: 'Health 9 %',
    pension: 'Pension 10 %',
    unemployment: 'Unemployment 2 %',
    childless: 'Childless',
    healthAria: 'Compulsory health insurance',
    pensionAria: 'Compulsory pension insurance',
    unemploymentAria: 'Compulsory unemployment insurance',
    childlessAria: 'Childless surcharge on long-term care insurance',
    basisMonths: 'Basiselterngeld',
    plusMonths: 'ElterngeldPlus',
    months: 'months',
    duringLeave: 'Net income during leave',
    perMonth: '€/month',
    multiples: 'Extra children',
    multiplesHint: 'multiple birth',
    siblingBonus: 'Geschwisterbonus applies',
    siblingBonusAria: 'Sibling bonus applies',

    childrenSection: 'Children & Mutterschaftsgeld',
    children: 'Children',
    childrenHint: 'for Kindergeld / Kinderfreibetrag',
    maternityElected: 'Krankengeld elected (§ 44 Abs. 2 SGB V)',
    maternityElectedAria: 'Krankengeld entitlement elected, which unlocks Mutterschaftsgeld',
    maternityHint:
      'Self-employed people only receive Mutterschaftsgeld after electing the Krankengeld entitlement, which raises the contribution rate by 0.6 pp and binds for years.',
    weeksBefore: 'Weeks before birth',
    weeksBeforeHint: '§ 3 (1) MuSchG',
    weeksAfter: 'Weeks after birth',
    weeksAfterHint: '8, or 12 for multiples',
    weeks: 'wk',
    extraContribution: 'Extra contributions',
    extraContributionHint: 'total over the binding period',

    // ── Verdict ──
    recommendation: 'Recommendation',
    verdictWash:
      'Both routes land within €50 of each other — the choice is essentially a wash. Pick the simpler filing.',
    verdictHigher:
      'Declaring the higher profit of {profit} leaves you better off. You pay {tax} more income tax and gain {benefit} more in benefits.',
    verdictLower:
      'Keeping the lower profit of {profit} wins. The extra {tax} of income tax outweighs the {benefit} difference in benefits.',

    // ── Comparison table ──
    sideBySide: 'Side by side',
    tableCaption:
      'Comparison of the lower and higher declared profit across the assessment year and the leave year',
    colLower: 'Lower profit',
    colHigher: 'Higher profit',
    secAssessment: 'Assessment year (Bemessungszeitraum)',
    rowProfit: 'Declared profit (Gewinn)',
    rowNetto: 'Elterngeld-Netto per month',
    rowRate: 'Replacement rate',
    rowBaseTax: 'Income tax + SolZ',
    rowBaseSettlement: 'Refund (+) or back-payment (−)',
    secLeave: 'Parental leave',
    rowBasisMonthly: 'Basiselterngeld per month',
    rowPlusMonthly: 'ElterngeldPlus per month',
    rowElterngeldGross: 'Elterngeld before crediting',
    rowMaternity: 'Mutterschaftsgeld (14 wks)',
    rowCredited: 'Elterngeld credited away (§ 3 BEEG)',
    rowContributions: 'Extra health-insurance contributions',
    rowBenefits: 'Benefits received in total',
    rowProgression: 'Progressionsvorbehalt (§ 32b EStG)',
    rowDeferred: 'Later relief on postponed write-offs',
    rowNet: 'Net position across both years',

    // ── Warnings ──
    warnIncomeLimit:
      'A taxable household income above {limit} removes the Elterngeld claim entirely (§ 1 Abs. 8 BEEG).',
    warnCap:
      'Elterngeld-Netto above {cap} is ignored (§ 2 Abs. 1 Satz 3 BEEG), so profit beyond that point buys no extra Elterngeld.',
    warnRelief:
      'Postponed write-offs are valued at zero. They are not lost — they lower a later year’s tax. Set a later-relief rate to count them.',

    // ── Filing advice ──
    filingTitle: 'File together or separately?',
    filingIntro:
      'Splitting pulls towards a joint assessment whenever the two incomes differ a lot. Progressionsvorbehalt pulls the other way, because filing separately confines the rate increase from {benefits} of tax-free benefits to the recipient’s own income.',
    filingJoint: 'File together (Zusammenveranlagung)',
    filingSeparate: 'File separately (Einzelveranlagung)',
    filingTie: 'Both routes cost the same here — take the joint assessment for the simpler paperwork.',
    filingSaves: 'It saves {amount} of leave-year tax.',
    filingCaption: 'Leave-year tax under joint and separate assessment',
    filingTogether: 'Together',
    filingSeparately: 'Separately',
    filingParent: 'Parent on leave',
    filingPartner: 'Partner',
    filingTotal: 'Leave-year tax',

    // ── Chart ──
    optimumTitle: 'Where the optimum sits',
    optimumIntro:
      'Net position across both years for every declared profit between the two options, extended 30 % either side.',
    chartAria: 'Net position by declared profit. Best result at {profit}.',
    chartNoData: 'Not enough data to plot the trade-off.',
    chartLower: 'lower',
    chartHigher: 'higher',
    chartBest: 'best {profit}',

    // ── Method notes ──
    reasoningTitle: 'The reasoning & the equations',
    intro:
      'Elterngeld for a self-employed parent is derived from the profit of the last completed tax year before the birth (§ 2b Abs. 2 BEEG), not from the months right before it. That single year is what the write-off decision turns on.',
    step1: '1 · From profit to Elterngeld-Netto (§§ 2c–2f BEEG)',
    step2: '2 · The replacement rate (§ 2 Abs. 2 BEEG)',
    step2Note:
      'This is why the gain flattens out. Past €1.240 of Elterngeld-Netto every additional euro is replaced at only 65 %, and past {cap} (§ 2 Abs. 1 Satz 3 BEEG) it is not replaced at all.',
    step3: '3 · The monthly amount (§ 2, § 2a, § 4a BEEG)',
    step4: '4 · Mutterschaftsgeld and the § 3 BEEG credit',
    step4Note:
      'The asymmetry is what makes this worth doing. § 3 Abs. 1 BEEG only credits maternity benefits “ab dem Tag der Geburt”, so the six weeks paid before the birth fall outside every Lebensmonat and are kept on top of the Elterngeld. The weeks after the birth merely replace Elterngeld euro for euro — and because the credit can only push Elterngeld down to zero, never below, anything above it is kept too. There is no 300 € exemption here: § 3 Abs. 2 BEEG excludes it where Mutterschaftsleistungen are credited.',
    step4Note2:
      'Since the benefit scales with the declared profit, electing Krankengeld makes the case for the higher profit stronger, not weaker.',
    step5: '5 · The cost side — and why it is smaller than it looks',
    step5NoteTiming:
      'Depreciation elections are a timing difference, not a permanent one. Skipping a write-off this year does not destroy it — it lands in a later year instead. If that later year falls inside parental leave, when the marginal rate is low, the deduction is worth less then, which argues further for taking the profit now. The “later relief” input prices this in.',
    step5NoteCash:
      'You entered this as genuine extra earnings, so the additional profit is real money in hand and is counted as such in the bottom line.',
    step6: '6 · Progressionsvorbehalt (§ 32b EStG)',
    step6Note:
      'Both Elterngeld and Mutterschaftsgeld are tax-free, but they lift the rate applied to every other euro the household earns in the leave year. With no other income in that year it costs nothing — which is exactly why a partner’s salary matters here, and why the joint-or-separate question above is worth checking.',
    step7: '7 · The bottom line',
    step7Note:
      'The higher profit buys {benefit} of extra Elterngeld for {tax} of extra income tax.',
    step7NoteMaternity: ', plus {amount} more from the Mutterschaftsgeld',
    disclaimer:
      'Not tax advice. The § 2e step reproduces the Lohnsteuer procedure the Elterngeldstelle applies, but the binding figure is the one in your Elterngeldbescheid, and depreciation elections are only open in the year of acquisition. Everything is calculated in your browser — no figure entered here is sent anywhere.',

    // ── Sources ──
    sourcesTitle: 'Sources',
    sourcesIntro:
      'Every rule above is taken from the statute rather than a summary. The figures for 2025 and 2026 are hard-coded from these texts:',

    // ── Errors ──
    errNegative: 'Declared profit cannot be negative.',
    errIdentical: 'Enter two different profit figures to compare.',
  },
} as const;

/**
 * `en` is `as const`, so every value is a string *literal* type. Widening those to
 * `string` lets a translation differ in wording while still failing the build if a
 * key is missing, misspelled or left over.
 */
type Translated<T> = T extends string ? string : { [K in keyof T]: Translated<T[K]> };

export const de: Translated<typeof en> = {
  common: {
    appName: 'Tools Collection',
    tagline: 'Eine Sammlung nützlicher Werkzeuge für den Alltag',
    searchPlaceholder: 'Werkzeuge nach Name oder Beschreibung suchen…',
    searchLabel: 'Werkzeuge suchen',
    clearSearch: 'Suche zurücksetzen',
    gridView: 'Kachelansicht',
    listView: 'Listenansicht',
    noResults: 'Keine Werkzeuge gefunden.',
    signIn: 'Anmelden',
    profile: 'Profil',
    tools: 'Werkzeuge',
    openMenu: 'Menü öffnen',
    language: 'Sprache',
    switchToGerman: 'Auf Deutsch umschalten',
    switchToEnglish: 'Switch to English',
  },

  nav: {
    dice: 'Würfel',
    fatLoss: 'Fett',
    n26: 'N26',
    bloodLevel: 'Blutspiegel',
    timeline: 'Zeitstrahl',
    training: 'Training',
    elterngeld: 'Elterngeld',
  },

  tools: {
    fatLoss: {
      title: 'Fettabbau-Rechner',
      description:
        'Berechnet den Anteil von Fett- und Muskelabbau anhand von Kaloriendefizit und Gewichtsverlust.',
    },
    n26: {
      title: 'N26-Umsatzanalyse',
      description:
        'Analysiert N26-Kontoumsätze, zeigt Ausgabemuster und liefert Auswertungen zu den eigenen Finanzdaten.',
    },
    dice: {
      title: 'Würfel-Roller',
      description: 'Würfelt mit Vorteil/Nachteil, Wiederholungen und beliebigen Würfeltypen.',
    },
    bloodLevel: {
      title: 'Blutspiegel-Rechner',
      description: 'Berechnet Abbau und Blutspiegel über die Zeit mit pharmakokinetischen Modellen.',
    },
    training: {
      title: 'Trainings-Tracker',
      description:
        'Erfasst Workouts mit physikalischer Energieberechnung und Heatmaps der Muskelaktivierung.',
    },
    timeline: {
      title: 'Zeitstrahl-Editor',
      description:
        'Erstellt bearbeitbare Zeitstrahlen mit Phasen, Markern, Zeitblöcken, Vorlagen und Export.',
    },
    elterngeld: {
      title: 'Elterngeld-Optimierer',
      description:
        'Lohnt es sich, einen höheren Gewinn auszuweisen und mehr Einkommensteuer zu zahlen, um mehr Elterngeld zu bekommen?',
      shortDescription:
        'Vergleicht einen höheren ausgewiesenen Gewinn und dessen Steuer mit dem dadurch höheren Elterngeld.',
    },
  },

  eg: {
    household: 'Haushalt',
    filingLegend: 'Veranlagung',
    single: 'Einzeln',
    married: 'Verheiratet (Splitting)',
    baseYear: 'Bemessungsjahr',
    baseYearHint: 'Bemessungszeitraum',
    leaveYear: 'Bezugsjahr',
    partnerIncome: 'Einkommen Partner',
    assessmentYr: 'Bemessungsjahr',
    leaveYr: 'Bezugsjahr',
    ownIncome: 'Eigenes weiteres Einkommen',
    prepaidBase: 'Bereits gezahlte Steuer',
    prepaidBaseHint: 'Lohnsteuer + Vorauszahlungen, Bemessungsjahr',
    prepaidLeave: 'Bereits gezahlte Steuer',
    prepaidLeaveHint: 'Bezugsjahr',

    options: 'Die beiden Varianten',
    deltaLegend: 'Woher kommt der Gewinnunterschied?',
    timing: 'Abschreibungs-Zeitpunkt',
    cash: 'Echter Mehrverdienst',
    timingHint:
      'Abschreibungen sind nicht zahlungswirksam: Das Geld liegt so oder so auf dem Konto, nur der steuerliche Gewinn verschiebt sich — und die Abschreibung kommt in einem späteren Jahr zurück.',
    cashHint: 'Der Mehrgewinn ist echtes zusätzlich verdientes Geld.',
    lowerProfit: 'Niedrigerer Gewinn',
    higherProfit: 'Höherer Gewinn',
    perYear: '€/Jahr',
    employmentGross: 'Bruttoarbeitslohn',
    employmentGrossHint: '§ 2c BEEG',
    relief: 'Spätere Entlastung für verschobene Abschreibungen',
    reliefHint: 'Grenzsteuersatz im Jahr der Nachholung',
    loadExample: 'Beispiel Kindertagespflege laden',

    insurance: 'Versicherung & Bezug',
    insuranceLegend: 'Versicherungspflicht',
    insuranceLegendHint: 'pauschale Abzüge nach § 2f BEEG',
    health: 'Kranken 9 %',
    pension: 'Rente 10 %',
    unemployment: 'Arbeitslos 2 %',
    childless: 'Kinderlos',
    healthAria: 'Versicherungspflicht in der gesetzlichen Krankenversicherung',
    pensionAria: 'Versicherungspflicht in der gesetzlichen Rentenversicherung',
    unemploymentAria: 'Versicherungspflicht nach SGB III',
    childlessAria: 'Kinderlosenzuschlag in der Pflegeversicherung',
    basisMonths: 'Basiselterngeld',
    plusMonths: 'ElterngeldPlus',
    months: 'Monate',
    duringLeave: 'Nettoeinkommen im Bezug',
    perMonth: '€/Monat',
    multiples: 'Weitere Kinder',
    multiplesHint: 'Mehrlingsgeburt',
    siblingBonus: 'Geschwisterbonus trifft zu',
    siblingBonusAria: 'Geschwisterbonus trifft zu',

    childrenSection: 'Kinder & Mutterschaftsgeld',
    children: 'Kinder',
    childrenHint: 'für Kindergeld / Kinderfreibetrag',
    maternityElected: 'Krankengeld gewählt (§ 44 Abs. 2 SGB V)',
    maternityElectedAria: 'Krankengeldwahlerklärung abgegeben, dadurch Anspruch auf Mutterschaftsgeld',
    maternityHint:
      'Selbstständige erhalten Mutterschaftsgeld nur mit Krankengeldwahlerklärung. Sie erhöht den Beitragssatz um 0,6 Prozentpunkte und bindet für mehrere Jahre.',
    weeksBefore: 'Wochen vor der Geburt',
    weeksBeforeHint: '§ 3 Abs. 1 MuSchG',
    weeksAfter: 'Wochen nach der Geburt',
    weeksAfterHint: '8, bei Mehrlingen 12',
    weeks: 'Wo',
    extraContribution: 'Mehrbeiträge',
    extraContributionHint: 'gesamt über die Bindungsfrist',

    recommendation: 'Empfehlung',
    verdictWash:
      'Beide Varianten liegen weniger als 50 € auseinander — die Wahl ist praktisch egal. Nimm die einfachere.',
    verdictHigher:
      'Der höhere Gewinn von {profit} lohnt sich. Du zahlst {tax} mehr Einkommensteuer und bekommst {benefit} mehr an Leistungen.',
    verdictLower:
      'Der niedrigere Gewinn von {profit} lohnt sich. Die zusätzlichen {tax} Einkommensteuer wiegen schwerer als die {benefit} Unterschied bei den Leistungen.',

    sideBySide: 'Gegenüberstellung',
    tableCaption:
      'Vergleich des niedrigeren und höheren ausgewiesenen Gewinns über Bemessungs- und Bezugsjahr',
    colLower: 'Niedrigerer Gewinn',
    colHigher: 'Höherer Gewinn',
    secAssessment: 'Bemessungsjahr (Bemessungszeitraum)',
    rowProfit: 'Ausgewiesener Gewinn',
    rowNetto: 'Elterngeld-Netto pro Monat',
    rowRate: 'Ersatzrate',
    rowBaseTax: 'Einkommensteuer + SolZ',
    rowBaseSettlement: 'Erstattung (+) oder Nachzahlung (−)',
    secLeave: 'Elternzeit',
    rowBasisMonthly: 'Basiselterngeld pro Monat',
    rowPlusMonthly: 'ElterngeldPlus pro Monat',
    rowElterngeldGross: 'Elterngeld vor Anrechnung',
    rowMaternity: 'Mutterschaftsgeld (14 Wochen)',
    rowCredited: 'Angerechnetes Elterngeld (§ 3 BEEG)',
    rowContributions: 'Mehrbeiträge Krankenversicherung',
    rowBenefits: 'Leistungen insgesamt',
    rowProgression: 'Progressionsvorbehalt (§ 32b EStG)',
    rowDeferred: 'Spätere Entlastung für verschobene Abschreibungen',
    rowNet: 'Ergebnis über beide Jahre',

    warnIncomeLimit:
      'Ab einem zu versteuernden Haushaltseinkommen über {limit} entfällt der Elterngeldanspruch vollständig (§ 1 Abs. 8 BEEG).',
    warnCap:
      'Elterngeld-Netto über {cap} bleibt unberücksichtigt (§ 2 Abs. 1 Satz 3 BEEG) — darüber bringt mehr Gewinn kein zusätzliches Elterngeld.',
    warnRelief:
      'Verschobene Abschreibungen sind mit null bewertet. Sie sind nicht verloren — sie mindern die Steuer eines späteren Jahres. Trage einen Entlastungssatz ein, um sie zu berücksichtigen.',

    filingTitle: 'Zusammen oder getrennt veranlagen?',
    filingIntro:
      'Das Splitting spricht für die Zusammenveranlagung, sobald die Einkommen weit auseinanderliegen. Der Progressionsvorbehalt spricht dagegen, denn bei getrennter Veranlagung erhöht sich der Steuersatz nur beim Elternteil, der die {benefits} steuerfreien Leistungen bezogen hat.',
    filingJoint: 'Zusammen veranlagen (Zusammenveranlagung)',
    filingSeparate: 'Getrennt veranlagen (Einzelveranlagung)',
    filingTie: 'Beide Varianten kosten hier gleich viel — nimm die Zusammenveranlagung, das ist weniger Aufwand.',
    filingSaves: 'Das spart {amount} Steuer im Bezugsjahr.',
    filingCaption: 'Steuer im Bezugsjahr bei Zusammen- und Einzelveranlagung',
    filingTogether: 'Zusammen',
    filingSeparately: 'Getrennt',
    filingParent: 'Elternteil in Elternzeit',
    filingPartner: 'Partner',
    filingTotal: 'Steuer im Bezugsjahr',

    optimumTitle: 'Wo das Optimum liegt',
    optimumIntro:
      'Ergebnis über beide Jahre für jeden ausgewiesenen Gewinn zwischen den beiden Varianten, um 30 % nach beiden Seiten erweitert.',
    chartAria: 'Ergebnis nach ausgewiesenem Gewinn. Bestes Ergebnis bei {profit}.',
    chartNoData: 'Zu wenig Daten für die Darstellung.',
    chartLower: 'niedriger',
    chartHigher: 'höher',
    chartBest: 'best {profit}',

    reasoningTitle: 'Begründung & Formeln',
    intro:
      'Das Elterngeld Selbstständiger bemisst sich nach dem Gewinn des letzten abgeschlossenen steuerlichen Veranlagungszeitraums vor der Geburt (§ 2b Abs. 2 BEEG), nicht nach den Monaten unmittelbar davor. Genau um dieses eine Jahr geht es bei der Abschreibungsentscheidung.',
    step1: '1 · Vom Gewinn zum Elterngeld-Netto (§§ 2c–2f BEEG)',
    step2: '2 · Die Ersatzrate (§ 2 Abs. 2 BEEG)',
    step2Note:
      'Deshalb flacht der Gewinn ab: Über 1.240 € Elterngeld-Netto wird jeder weitere Euro nur noch mit 65 % ersetzt, und über {cap} (§ 2 Abs. 1 Satz 3 BEEG) gar nicht mehr.',
    step3: '3 · Der Monatsbetrag (§ 2, § 2a, § 4a BEEG)',
    step4: '4 · Mutterschaftsgeld und die Anrechnung nach § 3 BEEG',
    step4Note:
      'Die Asymmetrie ist der entscheidende Punkt. § 3 Abs. 1 BEEG rechnet Mutterschaftsleistungen erst „ab dem Tag der Geburt“ an. Die sechs Wochen vor der Geburt fallen daher in keinen Lebensmonat und bleiben zusätzlich zum Elterngeld erhalten. Die Wochen nach der Geburt ersetzen das Elterngeld nur Euro für Euro — und da die Anrechnung das Elterngeld höchstens auf null drückt, bleibt ein darüber hinausgehender Betrag ebenfalls erhalten. Ein Freibetrag von 300 € gilt hier nicht: § 3 Abs. 2 BEEG schließt ihn aus, wenn Mutterschaftsleistungen angerechnet werden.',
    step4Note2:
      'Da die Leistung mit dem ausgewiesenen Gewinn steigt, spricht die Krankengeldwahl zusätzlich für den höheren Gewinn.',
    step5: '5 · Die Kostenseite — und warum sie kleiner ist als sie aussieht',
    step5NoteTiming:
      'Abschreibungswahlrechte verschieben nur den Zeitpunkt, sie vernichten nichts. Eine dieses Jahr nicht genutzte Abschreibung landet in einem späteren Jahr. Fällt dieses Jahr in die Elternzeit, ist der Grenzsteuersatz niedrig und die Abschreibung dort weniger wert — was zusätzlich dafür spricht, den Gewinn jetzt auszuweisen. Das Feld „spätere Entlastung“ bewertet genau das.',
    step5NoteCash:
      'Du hast dies als echten Mehrverdienst eingetragen; der Mehrgewinn ist also tatsächlich vorhandenes Geld und wird im Ergebnis so behandelt.',
    step6: '6 · Progressionsvorbehalt (§ 32b EStG)',
    step6Note:
      'Elterngeld und Mutterschaftsgeld sind steuerfrei, erhöhen aber den Steuersatz auf jeden anderen Euro, den der Haushalt im Bezugsjahr verdient. Ohne weiteres Einkommen kostet das nichts — genau deshalb ist das Gehalt des Partners hier entscheidend und die Frage nach der Veranlagungsart oben relevant.',
    step7: '7 · Das Ergebnis',
    step7Note:
      'Der höhere Gewinn bringt {benefit} mehr Elterngeld und kostet {tax} mehr Einkommensteuer.',
    step7NoteMaternity: ', dazu {amount} mehr aus dem Mutterschaftsgeld',
    disclaimer:
      'Keine Steuerberatung. Der Schritt nach § 2e bildet das Lohnsteuerverfahren der Elterngeldstelle nach, verbindlich ist aber allein der Elterngeldbescheid; Abschreibungswahlrechte bestehen zudem nur im Jahr der Anschaffung. Alles wird im Browser berechnet — keine hier eingetragene Zahl verlässt das Gerät.',

    sourcesTitle: 'Quellen',
    sourcesIntro:
      'Alle Regeln stammen aus dem Gesetzestext, nicht aus Zusammenfassungen. Die Werte für 2025 und 2026 sind aus diesen Fassungen übernommen:',

    errNegative: 'Der ausgewiesene Gewinn darf nicht negativ sein.',
    errIdentical: 'Trage zwei unterschiedliche Gewinne ein, um sie zu vergleichen.',
  },
};

export const MESSAGES = { en, de };

type Leaves<T> = T extends string
  ? ''
  : { [K in keyof T & string]: Leaves<T[K]> extends '' ? K : `${K}.${Leaves<T[K]>}` }[keyof T & string];

export type MessageKey = Leaves<typeof en>;
