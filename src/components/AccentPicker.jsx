import { useState, useEffect } from 'react';

// ============================================================================
//  src/components/AccentPicker.jsx
// ----------------------------------------------------------------------------
//  Alegerea culorii de accent: cele 6 accente pre-validate ale presetării,
//  plus opțiunea de a alege orice culoare manual.
//
//  ── DE CE EXISTĂ VERIFICAREA DE CONTRAST ──────────────────────────────────
//  Serverul are deja o gardă (`theme.js`) care întunecă automat un accent
//  ilizibil până trece pragul WCAG. Deci nu se poate strica nimic.
//
//  Dar dacă alegi galben aprins și site-ul afișează maro-oliv, pare un bug.
//  Componenta asta îți spune ÎNAINTE de salvare că va fi ajustată, și îți
//  arată exact ce culoare va ieși. Nicio surpriză la publicare.
// ============================================================================

const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
};
const toHex = ({ r, g, b }) =>
    '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** Luminanță relativă, formula WCAG 2.1 — identică cu cea din theme.js */
const luminance = ({ r, g, b }) => {
    const f = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
    const l1 = luminance(a), l2 = luminance(b);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
};

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 17, g: 17, b: 17 };
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });

/**
 * Reproduce EXACT logica din src/site/theme.js.
 * Dacă modifici una, modific-o pe amândouă — altfel previzualizarea minte.
 */
const evaluate = (hex, presetBg) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const bg = hexToRgb(presetBg) || WHITE;

    // Direcția depinde de fundal: pe presetare întunecată luminăm, pe una
    // deschisă întunecăm. Identic cu theme.js.
    const target = luminance(bg) < 0.25 ? WHITE : BLACK;
    let final = rgb;
    let steps = 0;
    while (steps < 14 && contrast(final, bg) < 3) {
        final = mix(final, target, 0.12);
        steps++;
    }
    const onAccent = contrast(final, WHITE) >= contrast(final, BLACK) ? '#ffffff' : '#111111';

    return {
        final: toHex(final),
        onAccent,
        adjusted: steps > 0,
        ratioBg: contrast(final, bg),
        ratioText: contrast(final, hexToRgb(onAccent)),
    };
};

export default function AccentPicker({ preset, value, onChange }) {
    const isPreset = preset.accents.includes(value);
    const [mode, setMode] = useState(isPreset ? 'preset' : 'custom');
    const [text, setText] = useState(value || preset.accents[0]);

    // La schimbarea presetării, resetăm la primul accent al ei.
    useEffect(() => {
        if (preset.accents.includes(value)) {
            setMode('preset');
            setText(value);
        }
    }, [preset.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const evalRes = evaluate(value, preset.bg);

    const applyText = (raw) => {
        let v = raw.trim();
        if (v && !v.startsWith('#')) v = '#' + v;
        setText(v);
        if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
    };

    return (
        <div className="accent-picker">
            <div className="accent-modes">
                <button
                    type="button"
                    className={`accent-mode ${mode === 'preset' ? 'sel' : ''}`}
                    onClick={() => { setMode('preset'); onChange(preset.accents[0]); }}
                >
                    Din presetare
                </button>
                <button
                    type="button"
                    className={`accent-mode ${mode === 'custom' ? 'sel' : ''}`}
                    onClick={() => setMode('custom')}
                >
                    Culoare proprie
                </button>
            </div>

            {mode === 'preset' ? (
                <>
                    <div className="accent-row">
                        {preset.accents.map((c) => (
                            <button
                                type="button" key={c}
                                className={`accent-opt ${value === c ? 'sel' : ''}`}
                                style={{ background: c }} title={c}
                                onClick={() => { onChange(c); setText(c); }}
                                aria-label={`Accent ${c}`}
                            />
                        ))}
                    </div>
                    <span className="hint">
                        Pre-validate pentru contrast în presetarea <strong>{preset.name}</strong>.
                    </span>
                </>
            ) : (
                <>
                    <div className="accent-custom">
                        <input
                            type="color"
                            className="accent-native"
                            value={/^#[0-9a-fA-F]{6}$/.test(text) ? text : '#800000'}
                            onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
                            aria-label="Alege culoarea"
                        />
                        <input
                            type="text"
                            className="accent-hex"
                            value={text}
                            onChange={(e) => applyText(e.target.value)}
                            placeholder="#800000"
                            maxLength={7}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                        />
                    </div>

                    {evalRes && (
                        <div className="accent-check">
                            <div
                                className="accent-preview"
                                style={{ background: evalRes.final, color: evalRes.onAccent }}
                            >
                                Buton
                            </div>
                            <div className="accent-info">
                                {evalRes.adjusted ? (
                                    <>
                                        <span className="accent-warn">
                                            Prea deschisă pentru fundalul presetării — va fi
                                            întunecată automat la <code>{evalRes.final}</code>.
                                        </span>
                                        <span className="hint">
                                            Site-ul va arăta culoarea de mai sus, nu pe cea aleasă.
                                        </span>
                                    </>
                                ) : (
                                    <span className="accent-ok">
                                        Contrast bun · text {evalRes.ratioText.toFixed(1)}:1 ·
                                        fundal {evalRes.ratioBg.toFixed(1)}:1
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
