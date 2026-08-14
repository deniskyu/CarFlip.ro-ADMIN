// ============================================================================
//  src/lib/parcPresets.js   (panoul de admin)
// ----------------------------------------------------------------------------
//  Metadatele presetărilor de design și oglinda setului de iconițe.
//
//  ⚠️ SINCRONIZARE: `SERVICE_ICONS` de mai jos e o COPIE a fișierului
//  `src/utils/serviceIcons.js` din backend. Panoul de admin e o aplicație
//  separată și nu poate importa din backend. Dacă adaugi o iconiță acolo,
//  adaug-o și aici — altfel dropdown-ul nu o arată, iar validarea serverului
//  o respinge.
//
//  Presetările sunt definite aici ÎNAINTE de a exista componentele reale
//  (Batch 6/7), pentru că formularul are nevoie de ele acum. Numele, descrierile
//  și paletele de accent stabilite aici sunt cele care se vor implementa.
// ============================================================================

/**
 * Cele 6 presetări.
 *
 * Fiecare e un STIL COMPLET — header, hero, card, footer, paletă, fonturi,
 * spațiere, radius ȘI animații, alese să meargă împreună. Nu se combină între
 * ele: un header centrat cu logo mare peste un hero cu text centrat arată
 * dezechilibrat, iar un card dens lângă un hero minimalist sunt două limbaje
 * vizuale care se ceartă.
 *
 * `accents` sunt culorile pre-validate pentru contrast în interiorul acelei
 * presetări. De asta nu există color picker liber: un accent galben pe fundal
 * alb e ilizibil, indiferent cât de mult îi place dealerului.
 */
export const PRESETS = [
    {
        id: 0,
        name: 'Clar',
        summary: 'Luminos și aerisit, tipografie mare',
        detail: 'Fundal alb, mult spațiu, titluri groase. Cea mai sigură alegere pentru orice dealer.',
        bg: '#ffffff',
        fg: '#111827',
        accents: ['#800000', '#0f4c81', '#1f7a4d', '#b45309', '#6d28d9', '#be123c'],
    },
    {
        id: 1,
        name: 'Nocturn',
        summary: 'Întunecat premium, accente calde',
        detail: 'Fundal aproape negru, imagini scoase în evidență. Potrivit pentru mașini scumpe.',
        bg: '#0d0d0f',
        fg: '#f5f5f4',
        accents: ['#e9b44c', '#d4d4d8', '#f97316', '#22d3ee', '#a3e635', '#f43f5e'],
    },
    {
        id: 2,
        name: 'Compact',
        summary: 'Dens, orientat pe specificații',
        detail: 'Multe date vizibile fără scroll. Pentru dealeri cu stoc mare, unde contează comparația.',
        bg: '#f4f4f5',
        fg: '#18181b',
        accents: ['#1d4ed8', '#0f766e', '#7c2d12', '#4338ca', '#a21caf', '#166534'],
    },
    {
        id: 3,
        name: 'Editorial',
        summary: 'Serif la titluri, elegant',
        detail: 'Mult spațiu alb, titluri cu serif, ritm calm. Pentru parcuri care vor să pară de încredere.',
        bg: '#fdfcf9',
        fg: '#1c1917',
        accents: ['#7c2d12', '#134e4a', '#3f3f46', '#831843', '#1e3a5f', '#713f12'],
    },
    {
        id: 4,
        name: 'Industrial',
        summary: 'Contrast puternic, colțuri drepte',
        detail: 'Borduri groase, zero rotunjiri, tipografie condensată. Puternic și direct.',
        bg: '#fafafa',
        fg: '#0a0a0a',
        accents: ['#dc2626', '#ea580c', '#0284c7', '#16a34a', '#0a0a0a', '#7c3aed'],
    },
    {
        id: 5,
        name: 'Cald',
        summary: 'Tonuri calde, colțuri rotunjite',
        detail: 'Prietenos și apropiat. Merge bine pentru parcuri mici, de familie.',
        bg: '#fffbf5',
        fg: '#292524',
        accents: ['#c2410c', '#a16207', '#15803d', '#9f1239', '#0e7490', '#6d28d9'],
    },
];

export const getPreset = (id) => PRESETS.find((p) => p.id === Number(id)) || PRESETS[0];

// ─── Oglinda iconițelor din backend ─────────────────────────────────────────
export const SERVICE_ICONS = {
    shield: { label: "Garanție", body: `<path d="M12 3 4 6.2v5.6c0 4.9 8 9.2 8 9.2s8-4.3 8-9.2V6.2L12 3z"/><path d="m8.8 12 2.2 2.2 4.2-4.2"/>` },
    card: { label: "Finanțare / rate", body: `<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h3"/>` },
    swap: { label: "Buy-back / schimb", body: `<path d="M3.5 8.5h14"/><path d="m14.5 5.5 3 3-3 3"/><path d="M20.5 15.5h-14"/><path d="m9.5 12.5-3 3 3 3"/>` },
    wrench: { label: "Service / verificare tehnică", body: `<path d="M15.6 3.4a5.2 5.2 0 0 0-5.4 8.3l-6.5 6.5a1.9 1.9 0 0 0 2.7 2.7l6.5-6.5a5.2 5.2 0 0 0 6.3-7.4l-2.9 2.9-2.9-.7-.7-2.9 2.9-2.9z"/>` },
    truck: { label: "Transport / livrare", body: `<path d="M2.6 6.4h10.2v9.2H2.6z"/><path d="M12.8 9.6h3.9l3.3 3.3v2.7h-7.2z"/><circle cx="6.6" cy="17.6" r="1.6"/><circle cx="16.6" cy="17.6" r="1.6"/>` },
    file: { label: "Acte / înmatriculare", body: `<path d="M13.5 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5.5-5.5z"/><path d="M13.5 2.5V8H19"/><path d="M8.5 13h7"/><path d="M8.5 16.5h5"/>` },
    umbrella: { label: "Asigurări RCA / CASCO", body: `<path d="M3 12.5a9 9 0 0 1 18 0z"/><path d="M12 12.5v6a2.5 2.5 0 0 0 5 0"/>` },
    key: { label: "Test drive", body: `<circle cx="7.5" cy="16.5" r="3.5"/><path d="m10 14 8.5-8.5"/><path d="m15.5 9 2 2"/><path d="m18 6.5 2.5 2.5"/>` },
    gauge: { label: "Kilometraj verificat", body: `<path d="M4 17.5a9 9 0 1 1 16 0"/><path d="m12 14 4-4"/><circle cx="12" cy="15.5" r="1.4"/>` },
    check: { label: "Mașini verificate", body: `<circle cx="12" cy="12" r="9"/><path d="m8 12 2.8 2.8L16 9.5"/>` },
    car: { label: "Stoc variat", body: `<path d="M5 12.2 6.9 7.6A2 2 0 0 1 8.75 6.4h6.5a2 2 0 0 1 1.85 1.2l1.9 4.6"/><path d="M3.4 12.2h17.2v3.9a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="17.6" r="1.6"/><circle cx="16.5" cy="17.6" r="1.6"/>` },
    clock: { label: "Program prelungit", body: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.5 2"/>` },
    phone: { label: "Consultanță", body: `<path d="M8.5 3.5h-3a2 2 0 0 0-2 2.2c.6 6.5 5.3 11.2 11.8 11.8a2 2 0 0 0 2.2-2v-3l-3.5-1.2-1.8 1.8a13 13 0 0 1-4.3-4.3l1.8-1.8L8.5 3.5z"/>` },
    users: { label: "Echipă cu experiență", body: `<circle cx="9" cy="8" r="3.3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.4"/><path d="M17.5 14.8a5.5 5.5 0 0 1 3 4.7"/>` },
    tag: { label: "Prețuri corecte", body: `<path d="M20.5 12.7 12.8 20.4a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1-.6-1.4V4.5a1 1 0 0 1 1-1h8.1a2 2 0 0 1 1.4.6l6.4 6.4a1.5 1.5 0 0 1 0 2.2z"/><circle cx="8" cy="8" r="1.4"/>` },
    pin: { label: "Locație accesibilă", body: `<path d="M12 21.5s7-6.3 7-11.2a7 7 0 1 0-14 0c0 4.9 7 11.2 7 11.2z"/><circle cx="12" cy="10" r="2.6"/>` },
};

export const ICON_NAMES = Object.keys(SERVICE_ICONS);
export const DEFAULT_ICON = 'shield';

/** Sugestii pre-completate pentru cele 3 servicii — de acceptat sau înlocuit. */
export const SERVICE_SUGGESTIONS = [
    {
        icon: 'shield',
        title: 'Garanție reală',
        text: 'Toate mașinile din stoc vin cu garanție scrisă pentru motor și cutia de viteze.',
    },
    {
        icon: 'card',
        title: 'Finanțare pe loc',
        text: 'Lucrăm cu mai multe bănci. Afli în 30 de minute dacă ești eligibil, fără drum la bancă.',
    },
    {
        icon: 'swap',
        title: 'Preluăm mașina ta',
        text: 'Evaluăm gratuit mașina ta și o preluăm în schimb, cu plata diferenței pe loc.',
    },
];

export default { PRESETS, getPreset, SERVICE_ICONS, ICON_NAMES, DEFAULT_ICON, SERVICE_SUGGESTIONS };
