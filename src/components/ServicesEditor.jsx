import { useState } from 'react';
import { SERVICE_ICONS, ICON_NAMES, DEFAULT_ICON, SERVICE_SUGGESTIONS } from '../lib/parcPresets';

// ============================================================================
//  src/components/ServicesEditor.jsx
// ----------------------------------------------------------------------------
//  Editorul secțiunii „Servicii" de pe pagina de acasă.
//
//  Reguli impuse de interfață, nu doar de server:
//   • exact 3 sau niciunul — cu 2 rămâne un gol vizibil în grilă, cu 4 se rupe
//     pe două rânduri inegale;
//   • contoare de caractere vizibile, care devin roșii înainte de limită, nu
//     după — dacă afli că ai depășit abia la salvare, rescrii tot;
//   • iconița se alege dintr-o listă, nu se scrie. Libertate totală înseamnă
//     două stiluri diferite în aceeași secțiune, iar asta se vede imediat.
// ============================================================================

const MAX_TITLE = 40;
const MAX_TEXT = 180;

/** SVG inline din registrul comun. Conținut static, controlat de noi. */
export function ServiceIcon({ name, size = 22 }) {
    const icon = SERVICE_ICONS[name] || SERVICE_ICONS[DEFAULT_ICON];
    return (
        <svg
            width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.body }}
        />
    );
}

function Counter({ value, max }) {
    const len = (value || '').length;
    const cls = len > max ? 'over' : len > max * 0.85 ? 'near' : '';
    return <span className={`char-counter ${cls}`}>{len}/{max}</span>;
}

function IconPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const current = SERVICE_ICONS[value] || SERVICE_ICONS[DEFAULT_ICON];

    return (
        <div className="icon-picker">
            <button type="button" className="icon-picker-btn" onClick={() => setOpen((o) => !o)}>
                <ServiceIcon name={value} />
                <span>{current.label}</span>
                <span className="chev">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="icon-picker-grid">
                    {ICON_NAMES.map((n) => (
                        <button
                            type="button"
                            key={n}
                            className={`icon-opt ${n === value ? 'sel' : ''}`}
                            title={SERVICE_ICONS[n].label}
                            onClick={() => { onChange(n); setOpen(false); }}
                        >
                            <ServiceIcon name={n} size={20} />
                            <span>{SERVICE_ICONS[n].label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ServicesEditor({ services, onChange, accent = '#800000' }) {
    const active = Array.isArray(services) && services.length === 3;

    const enable = () => onChange(SERVICE_SUGGESTIONS.map((s) => ({ ...s })));
    const disable = () => onChange([]);

    const patch = (i, field, val) => {
        const next = services.map((s, idx) => (idx === i ? { ...s, [field]: val } : s));
        onChange(next);
    };

    if (!active) {
        return (
            <div className="services-off">
                <p>Secțiunea „Servicii" nu apare pe site.</p>
                <button type="button" className="ghost-btn" onClick={enable}>
                    Adaugă 3 servicii
                </button>
                <span className="hint">
                    Pornești de la trei sugestii pe care le poți rescrie complet.
                </span>
            </div>
        );
    }

    return (
        <div className="services-editor">
            {services.map((s, i) => (
                <div className="service-card" key={i} style={{ '--accent': accent }}>
                    <div className="service-card-head">
                        <span className="service-num">{i + 1}</span>
                        <IconPicker value={s.icon} onChange={(v) => patch(i, 'icon', v)} />
                    </div>

                    <label>
                        <span className="lbl">Titlu <Counter value={s.title} max={MAX_TITLE} /></span>
                        <input
                            type="text" value={s.title} maxLength={MAX_TITLE + 10}
                            placeholder="Garanție reală"
                            onChange={(e) => patch(i, 'title', e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="lbl">Descriere <Counter value={s.text} max={MAX_TEXT} /></span>
                        <textarea
                            rows={3} value={s.text} maxLength={MAX_TEXT + 40}
                            placeholder="O frază concretă, nu o promisiune generală."
                            onChange={(e) => patch(i, 'text', e.target.value)}
                        />
                    </label>

                    {/* Previzualizare fidelă: același SVG, aceeași culoare de
                        accent ca pe site. Ce vezi aici e ce se publică. */}
                    <div className="service-preview">
                        <span className="service-preview-icon"><ServiceIcon name={s.icon} size={20} /></span>
                        <div>
                            <strong>{s.title || 'Titlu serviciu'}</strong>
                            <p>{s.text || 'Descrierea serviciului apare aici.'}</p>
                        </div>
                    </div>
                </div>
            ))}

            <button type="button" className="ghost-btn danger" onClick={disable}>
                Elimină secțiunea de servicii
            </button>
        </div>
    );
}
