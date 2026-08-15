import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { PRESETS, getPreset, SERVICE_SUGGESTIONS } from '../lib/parcPresets';
import { compressImage, parseMapsUrl, formatBytes } from '../lib/imageTools';
import ImageCropper from './ImageCropper';
import ServicesEditor from './ServicesEditor';
import ScheduleEditor from './ScheduleEditor';
import AccentPicker from './AccentPicker';

// ============================================================================
//  src/components/ParcForm.jsx
// ----------------------------------------------------------------------------
//  Formularul care creează un site întreg. ~30 de câmpuri, grupate în secțiuni
//  pliabile ca să nu fie un perete de inputuri.
//
//  Trei lucruri care scurtează timpul per client de la o oră la câteva minute:
//   • verificarea subdomeniului în timp real, cu debounce;
//   • lipirea unui link Google Maps completează automat lat/lng;
//   • crearea contului de dealer direct de aici, cu parolă generată.
//
//  Imaginile se comprimă ÎN BROWSER înainte de trimitere. Bannerul trece
//  obligatoriu prin cropper la 3:1 — nu poate ieși prost pentru că nu poate
//  salva altceva decât cadrul.
// ============================================================================

const DEFAULT_FORM = {
    subdomain: '', user_id: '', display_name: '',
    preset: 0, accent_color: PRESETS[0].accents[0],
    hero_title: '', hero_subtitle: '', about_title: 'Despre noi', about_text: '', contact_intro: '',
    services_title: 'Ce oferim', services: [],
    phone: '', whatsapp: '', email: '', address: '', city: '', county: '', lat: '', lng: '',
    schedule: [],
    facebook_url: '', instagram_url: '', tiktok_url: '',
    company_name: '', company_cui: '', company_reg: '', company_address: '',
    seo_keywords: [], seo_service_area: [], founded_year: '', meta_description: '',
    notes: '',
};

/**
 * Text pe rânduri → array curat.
 * Se apelează la FIECARE tastă, dar NU modifică textul afișat — acela stă în
 * starea `raw`. Așa rândurile goale supraviețuiesc cât timp scrii, iar la
 * salvare ajunge doar ce e util.
 */
const splitLines = (text, max) =>
    String(text || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max);

const LIMITS = {
    display_name: 40, hero_title: 60, hero_subtitle: 140,
    about_title: 60, about_text: 1200, contact_intro: 300,
    services_title: 60, meta_description: 160,
};

function Section({ title, subtitle, open, onToggle, done, children }) {
    return (
        <div className={`form-section ${open ? 'open' : ''}`}>
            <button type="button" className="form-section-head" onClick={onToggle}>
                <span className={`sec-dot ${done ? 'ok' : ''}`} />
                <span className="sec-title">{title}</span>
                {subtitle && <span className="sec-sub">{subtitle}</span>}
                <span className="chev">{open ? '▲' : '▼'}</span>
            </button>
            {open && <div className="form-section-body">{children}</div>}
        </div>
    );
}

function Field({ label, hint, value, max, children }) {
    const len = String(value ?? '').length;
    const cls = max ? (len > max ? 'over' : len > max * 0.85 ? 'near' : '') : '';
    return (
        <label className="field">
            <span className="lbl">
                {label}
                {max && <span className={`char-counter ${cls}`}>{len}/{max}</span>}
            </span>
            {children}
            {hint && <span className="hint">{hint}</span>}
        </label>
    );
}

export default function ParcForm({ parc, onSaved, onCancel }) {
    const isEdit = !!parc;
    const [f, setF] = useState(DEFAULT_FORM);
    const [open, setOpen] = useState({ id: true });
    const [saving, setSaving] = useState(false);

    // Branding
    const [logoFile, setLogoFile] = useState(null);
    const [logoPrev, setLogoPrev] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPrev, setBannerPrev] = useState(null);
    const [cropSrc, setCropSrc] = useState(null);

    // ── Text BRUT pentru câmpurile scrise pe rânduri ────────────────────────
    // Fără asta, `.filter(Boolean)` din onChange șterge rândul gol creat de
    // Enter, iar `value={array.join('\n')}` îl scrie înapoi fără el — deci
    // tasta Enter nu are niciun efect vizibil. Textarea afișează acum exact ce
    // ai tastat; array-ul se derivă din el.
    const [kwRaw, setKwRaw] = useState('');
    const [areaRaw, setAreaRaw] = useState('');

    // Subdomeniu
    const [subState, setSubState] = useState({ checking: false, ok: null, msg: '' });
    const subTimer = useRef(null);

    // Utilizator
    const [userQ, setUserQ] = useState('');
    const [userList, setUserList] = useState([]);
    const [selUser, setSelUser] = useState(null);
    const [newUser, setNewUser] = useState({ username: '', email: '' });
    const [creatingUser, setCreatingUser] = useState(false);
    const userTimer = useRef(null);

    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    // ── Prepopulare la editare ──────────────────────────────────────────────
    useEffect(() => {
        if (!parc) return;
        setF({
            ...DEFAULT_FORM,
            ...Object.fromEntries(Object.keys(DEFAULT_FORM).map((k) => [k, parc[k] ?? DEFAULT_FORM[k]])),
            user_id: parc.user_id || '',
            lat: parc.lat ?? '', lng: parc.lng ?? '',
            founded_year: parc.founded_year ?? '',
        });
        setKwRaw((parc.seo_keywords || []).join('\n'));
        setAreaRaw((parc.seo_service_area || []).join('\n'));
        setLogoPrev(parc.logo_url || null);
        setBannerPrev(parc.banner_url || null);
        if (parc.user) setSelUser({ _id: parc.user_id, username: parc.user.username, email: parc.user.email });
    }, [parc]);

    // ── Verificare subdomeniu, cu debounce ──────────────────────────────────
    useEffect(() => {
        const v = f.subdomain.trim();
        if (!v) return setSubState({ checking: false, ok: null, msg: '' });
        if (isEdit && v === parc?.subdomain) {
            return setSubState({ checking: false, ok: true, msg: 'Subdomeniul actual.' });
        }
        setSubState({ checking: true, ok: null, msg: '' });
        clearTimeout(subTimer.current);
        subTimer.current = setTimeout(async () => {
            try {
                const q = new URLSearchParams({ sub: v });
                if (isEdit) q.set('exclude', parc._id);
                const { data } = await api.get(`/api/admin/parcuri/check-subdomain?${q}`);
                setSubState({ checking: false, ok: !!data.available, msg: data.message || '' });
            } catch {
                setSubState({ checking: false, ok: null, msg: 'Nu am putut verifica.' });
            }
        }, 400);
        return () => clearTimeout(subTimer.current);
    }, [f.subdomain, isEdit, parc]);

    // ── Căutare utilizatori ─────────────────────────────────────────────────
    useEffect(() => {
        if (userQ.trim().length < 2) return setUserList([]);
        clearTimeout(userTimer.current);
        userTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get(`/api/admin/parcuri/users?q=${encodeURIComponent(userQ.trim())}`);
                setUserList(data.users || []);
            } catch { setUserList([]); }
        }, 350);
        return () => clearTimeout(userTimer.current);
    }, [userQ]);

    const handleCreateUser = async () => {
        if (!newUser.username.trim() || !newUser.email.trim()) {
            return toast.error('Completează username și email.');
        }
        setCreatingUser(true);
        try {
            const { data } = await api.post('/api/admin/parcuri/create-user', newUser);
            if (!data.success) return toast.error(data.message);
            setSelUser(data.user);
            set('user_id', data.user._id);
            // Parola se afișează O SINGURĂ DATĂ. Nu se poate recupera ulterior.
            window.prompt(
                `Cont creat. COPIAZĂ PAROLA ACUM — nu mai poate fi afișată:`,
                data.password
            );
            toast.success('Cont creat.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la crearea contului.');
        } finally {
            setCreatingUser(false);
        }
    };

    // ── Imagini ─────────────────────────────────────────────────────────────
    const pickLogo = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            // Logo-ul nu se decupează: se afișează cu `contain` într-un container
            // rotunjit, deci orice tăiere ar strica logo-urile late.
            const out = await compressImage(file, { maxW: 800, maxH: 800, quality: 0.9 });
            setLogoFile(out);
            setLogoPrev(URL.createObjectURL(out));
        } catch (err) { toast.error(err.message); }
    };

    const pickBanner = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) setCropSrc(file);
    };

    const onCropDone = (file) => {
        setBannerFile(file);
        setBannerPrev(URL.createObjectURL(file));
        setCropSrc(null);
    };

    // ── Google Maps → lat/lng ───────────────────────────────────────────────
    const handleMapsPaste = (raw) => {
        const c = parseMapsUrl(raw);
        if (!c) {
            return toast.error('Nu am găsit coordonate. Linkurile scurte (maps.app.goo.gl) trebuie deschise întâi în browser.');
        }
        setF((p) => ({ ...p, lat: c.lat, lng: c.lng }));
        toast.success(`Coordonate: ${c.lat}, ${c.lng}`);
    };

    // ── Validare locală ─────────────────────────────────────────────────────
    const validate = () => {
        const e = [];
        if (!f.subdomain.trim()) e.push('Subdomeniul lipsește.');
        if (subState.ok === false) e.push('Subdomeniul nu este disponibil.');
        if (!f.user_id) e.push('Selectează utilizatorul.');
        if (!f.display_name.trim()) e.push('Numele afișat lipsește.');
        if (!isEdit && !logoFile) e.push('Logo-ul este obligatoriu.');
        if (!isEdit && !bannerFile) e.push('Bannerul este obligatoriu.');
        if (!f.phone.trim() || !f.whatsapp.trim()) e.push('Telefonul și WhatsApp-ul sunt obligatorii.');
        if (!f.address.trim() || !f.city.trim() || !f.county.trim()) e.push('Adresa, orașul și județul sunt obligatorii.');
        if (f.lat === '' || f.lng === '') e.push('Coordonatele lipsesc.');
        if (!f.company_name.trim() || !f.company_cui.trim() || !f.company_reg.trim() || !f.company_address.trim()) {
            e.push('Datele de firmă sunt obligatorii (cerință legală).');
        }
        for (const [k, max] of Object.entries(LIMITS)) {
            if (String(f[k] ?? '').length > max) e.push(`Câmpul „${k}" depășește ${max} de caractere.`);
        }
        if (f.services.length && f.services.length !== 3) e.push('Serviciile trebuie să fie exact 3 sau niciunul.');
        return e;
    };

    const submit = async () => {
        const errs = validate();
        if (errs.length) return toast.error(errs[0]);

        setSaving(true);
        const fd = new FormData();
        for (const [k, v] of Object.entries(f)) {
            if (v === '' || v === null || v === undefined) continue;
            fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
        }
        if (f.schedule?.length) fd.set('schedule', JSON.stringify(f.schedule));
        if (logoFile) fd.append('logo', logoFile);
        if (bannerFile) fd.append('banner', bannerFile);

        try {
            const { data } = isEdit
                ? await api.put(`/api/admin/parcuri/${parc._id}`, fd)
                : await api.post('/api/admin/parcuri', fd);

            if (!data.success) return toast.error(data.message);
            toast.success(data.message);
            if (data.indexable_check && !data.indexable_check.ok) {
                toast.info(`Încă neindexabil: ${data.indexable_check.reasons[0]}`, { autoClose: 6000 });
            }
            onSaved(data.parc);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la salvare.');
        } finally {
            setSaving(false);
        }
    };

    const preset = getPreset(f.preset);
    const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));

    return (
        <div className="parc-form">
            {cropSrc && (
                <ImageCropper
                    file={cropSrc} aspect={3} outW={1920} outH={640}
                    label="Încadrează bannerul (3:1)"
                    onCancel={() => setCropSrc(null)} onDone={onCropDone}
                />
            )}

            <div className="parc-form-head">
                <h3>{isEdit ? `Editează ${parc.subdomain}` : 'Site nou'}</h3>
                <button className="cancel-btn" onClick={onCancel}>Închide</button>
            </div>

            {/* ── IDENTITATE ─────────────────────────────────────────────── */}
            <Section title="Identitate" subtitle="subdomeniu · cont"
                open={open.id} onToggle={() => toggle('id')}
                done={!!f.subdomain && !!f.user_id && subState.ok !== false}>

                <Field label="Subdomeniu" hint={`Site-ul va fi la ${f.subdomain || '...'}.car-flip.com`}>
                    <input
                        type="text" value={f.subdomain} placeholder="parcbogdan"
                        onChange={(e) => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                </Field>
                {f.subdomain && (
                    <p className={`sub-status ${subState.ok === true ? 'ok' : subState.ok === false ? 'bad' : ''}`}>
                        {subState.checking ? 'Se verifică...' : subState.msg}
                    </p>
                )}

                <div className="user-block">
                    <span className="lbl">Cont dealer</span>
                    {selUser ? (
                        <div className="user-sel">
                            <div>
                                <strong>{selUser.username}</strong>
                                <span>{selUser.email}</span>
                            </div>
                            <button type="button" className="ghost-btn"
                                onClick={() => { setSelUser(null); set('user_id', ''); }}>
                                Schimbă
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text" placeholder="Caută după username sau email..."
                                value={userQ} onChange={(e) => setUserQ(e.target.value)}
                            />
                            {userList.map((u) => (
                                <button
                                    type="button" key={u._id}
                                    className={`user-opt ${u.existing_parc ? 'taken' : ''}`}
                                    disabled={!!u.existing_parc}
                                    onClick={() => { setSelUser(u); set('user_id', u._id); setUserQ(''); setUserList([]); }}
                                >
                                    <strong>{u.username}</strong>
                                    <span>{u.email}</span>
                                    <span className="tagpill">{u.active_sales} anunțuri</span>
                                    {u.existing_parc && <span className="tagpill bad">are {u.existing_parc}</span>}
                                </button>
                            ))}

                            <div className="new-user">
                                <span className="hint">Sau creează un cont nou, deja verificat:</span>
                                <div className="row">
                                    <input placeholder="username" value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                                    <input placeholder="email" value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                                    <button type="button" onClick={handleCreateUser} disabled={creatingUser}>
                                        {creatingUser ? '...' : 'Creează'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <Field label="Nume afișat" value={f.display_name} max={LIMITS.display_name}>
                    <input type="text" value={f.display_name} placeholder="Parc Auto Bogdan"
                        onChange={(e) => set('display_name', e.target.value)} />
                </Field>
            </Section>

            {/* ── BRANDING ───────────────────────────────────────────────── */}
            <Section title="Branding" subtitle="logo · banner · stil"
                open={open.brand} onToggle={() => toggle('brand')}
                done={(!!logoFile || !!logoPrev) && (!!bannerFile || !!bannerPrev)}>

                <div className="upload-row">
                    <div className="upload-box">
                        <span className="lbl">Logo</span>
                        {logoPrev
                            ? <img className="logo-prev" src={logoPrev} alt="" />
                            : <div className="upload-empty">fără logo</div>}
                        <label className="ghost-btn file">
                            {logoPrev ? 'Schimbă' : 'Alege fișier'}
                            <input type="file" accept="image/*" onChange={pickLogo} hidden />
                        </label>
                        {logoFile && <span className="hint">{formatBytes(logoFile.size)} după compresie</span>}
                    </div>

                    <div className="upload-box wide">
                        <span className="lbl">Banner (3:1)</span>
                        {bannerPrev
                            ? <img className="banner-prev" src={bannerPrev} alt="" />
                            : <div className="upload-empty">fără banner</div>}
                        <label className="ghost-btn file">
                            {bannerPrev ? 'Schimbă' : 'Alege fișier'}
                            <input type="file" accept="image/*" onChange={pickBanner} hidden />
                        </label>
                        {bannerFile && <span className="hint">{formatBytes(bannerFile.size)} după decupare</span>}
                    </div>
                </div>

                <span className="lbl">Presetare de design</span>
                <div className="preset-grid">
                    {PRESETS.map((p) => (
                        <button
                            type="button" key={p.id}
                            className={`preset-opt ${f.preset === p.id ? 'sel' : ''}`}
                            style={{ background: p.bg, color: p.fg }}
                            onClick={() => setF((s) => ({ ...s, preset: p.id, accent_color: p.accents[0] }))}
                        >
                            <strong>{p.name}</strong>
                            <span>{p.summary}</span>
                            <span className="preset-dots">
                                {p.accents.slice(0, 4).map((c) => (
                                    <i key={c} style={{ background: c }} />
                                ))}
                            </span>
                        </button>
                    ))}
                </div>
                <p className="hint">{preset.detail}</p>

                <span className="lbl">Culoare de accent</span>
                <AccentPicker
                    preset={preset}
                    value={f.accent_color}
                    onChange={(c) => set('accent_color', c)}
                />
            </Section>

            {/* ── TEXTE ──────────────────────────────────────────────────── */}
            <Section title="Texte" subtitle="hero · despre noi"
                open={open.text} onToggle={() => toggle('text')} done={!!f.hero_title}>
                <Field label="Titlu principal (hero)" value={f.hero_title} max={LIMITS.hero_title}>
                    <input type="text" value={f.hero_title} placeholder="Mașini verificate, fără surprize"
                        onChange={(e) => set('hero_title', e.target.value)} />
                </Field>
                <Field label="Subtitlu" value={f.hero_subtitle} max={LIMITS.hero_subtitle}
                    hint="Numărul de mașini se adaugă automat dedesubt.">
                    <textarea rows={2} value={f.hero_subtitle}
                        onChange={(e) => set('hero_subtitle', e.target.value)} />
                </Field>
                <Field label="Titlu „Despre noi”" value={f.about_title} max={LIMITS.about_title}>
                    <input type="text" value={f.about_title} onChange={(e) => set('about_title', e.target.value)} />
                </Field>
                <Field label="Text „Despre noi”" value={f.about_text} max={LIMITS.about_text}
                    hint="Dacă îl lași gol, se generează automat din datele parcului.">
                    <textarea rows={5} value={f.about_text} onChange={(e) => set('about_text', e.target.value)} />
                </Field>
                <Field label="Intro pagina de contact" value={f.contact_intro} max={LIMITS.contact_intro}>
                    <textarea rows={2} value={f.contact_intro} onChange={(e) => set('contact_intro', e.target.value)} />
                </Field>
            </Section>

            {/* ── SERVICII ───────────────────────────────────────────────── */}
            <Section title="Servicii" subtitle={f.services.length ? '3 active' : 'dezactivat'}
                open={open.serv} onToggle={() => toggle('serv')} done={f.services.length === 3}>
                <Field label="Titlu secțiune" value={f.services_title} max={LIMITS.services_title}>
                    <input type="text" value={f.services_title} onChange={(e) => set('services_title', e.target.value)} />
                </Field>
                <ServicesEditor
                    services={f.services} accent={f.accent_color}
                    onChange={(v) => set('services', v)}
                />
            </Section>

            {/* ── CONTACT ────────────────────────────────────────────────── */}
            <Section title="Contact" subtitle="telefon · adresă · program"
                open={open.contact} onToggle={() => toggle('contact')}
                done={!!f.phone && !!f.address && f.lat !== ''}>
                <div className="row">
                    <Field label="Telefon"><input value={f.phone} placeholder="0761930497"
                        onChange={(e) => set('phone', e.target.value)} /></Field>
                    <Field label="WhatsApp"><input value={f.whatsapp} placeholder="0761930497"
                        onChange={(e) => set('whatsapp', e.target.value)} /></Field>
                </div>
                <span className="hint">Se normalizează automat la format internațional (40761930497).</span>

                <Field label="Email"><input value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
                <Field label="Adresă"><input value={f.address} placeholder="Strada Caracal 123"
                    onChange={(e) => set('address', e.target.value)} /></Field>
                <div className="row">
                    <Field label="Oraș"><input value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
                    <Field label="Județ"><input value={f.county} onChange={(e) => set('county', e.target.value)} /></Field>
                </div>

                <Field label="Coordonate" hint="Lipește linkul din Google Maps și se completează singure.">
                    <input placeholder="Lipește link Google Maps aici..."
                        onPaste={(e) => setTimeout(() => handleMapsPaste(e.target.value), 0)}
                        onChange={(e) => e.target.value.length > 20 && handleMapsPaste(e.target.value)} />
                </Field>
                <div className="row">
                    <Field label="Lat"><input value={f.lat} onChange={(e) => set('lat', e.target.value)} /></Field>
                    <Field label="Lng"><input value={f.lng} onChange={(e) => set('lng', e.target.value)} /></Field>
                </div>

                <span className="lbl">Program</span>
                <ScheduleEditor schedule={f.schedule} onChange={(v) => set('schedule', v)} />

                <div className="row">
                    <Field label="Facebook"><input value={f.facebook_url}
                        onChange={(e) => set('facebook_url', e.target.value)} /></Field>
                    <Field label="TikTok"><input value={f.tiktok_url}
                        onChange={(e) => set('tiktok_url', e.target.value)} /></Field>
                </div>
            </Section>

            {/* ── FIRMĂ ──────────────────────────────────────────────────── */}
            <Section title="Date de firmă" subtitle="obligatoriu legal"
                open={open.firm} onToggle={() => toggle('firm')}
                done={!!f.company_name && !!f.company_cui && !!f.company_reg && !!f.company_address}>
                <p className="hint">
                    Apar doar în footer, cu font mic. Sunt informații publice — le poți căuta
                    online după denumire, dar confirmă-le cu dealerul.
                </p>
                <Field label="Denumire"><input value={f.company_name} placeholder="AUTO BOGDAN SRL"
                    onChange={(e) => set('company_name', e.target.value)} /></Field>
                <div className="row">
                    <Field label="CUI"><input value={f.company_cui} placeholder="RO12345678"
                        onChange={(e) => set('company_cui', e.target.value)} /></Field>
                    <Field label="Nr. Reg. Com."><input value={f.company_reg} placeholder="J16/1234/2020"
                        onChange={(e) => set('company_reg', e.target.value)} /></Field>
                </div>
                <Field label="Sediu social"><input value={f.company_address}
                    onChange={(e) => set('company_address', e.target.value)} /></Field>
            </Section>

            {/* ── SEO ────────────────────────────────────────────────────── */}
            <Section title="SEO" subtitle="cuvinte cheie · zonă deservită"
                open={open.seo} onToggle={() => toggle('seo')} done={f.seo_keywords.length > 0}>
                <p className="hint">
                    Cuvintele cheie NU produc un meta tag (Google îl ignoră din 2009). Ele
                    alimentează textele generate: subtitluri, „Despre noi”, intro-urile
                    paginilor de marcă și descrierile meta.
                </p>
                <Field label={`Cuvinte cheie (${f.seo_keywords.length}/8, câte unul pe linie)`}>
                    <textarea rows={5} value={kwRaw}
                        placeholder={'mașini second hand Craiova\nauto rulate Dolj\nrate fără avans'}
                        onChange={(e) => {
                            setKwRaw(e.target.value);
                            set('seo_keywords', splitLines(e.target.value, 8));
                        }}
                        onBlur={() => setKwRaw(f.seo_keywords.join('\n'))} />
                    <span className="hint">
                        Apasă Enter pentru fiecare frază nouă. Rândurile goale se ignoră la salvare.
                    </span>
                </Field>
                <Field label={`Localități deservite (${f.seo_service_area.length}/10)`}
                    hint="Prind căutări din localitățile din jur, unde competiția e aproape zero.">
                    <textarea rows={4} value={areaRaw}
                        placeholder={'Craiova\nFiliași\nSegarcea'}
                        onChange={(e) => {
                            setAreaRaw(e.target.value);
                            set('seo_service_area', splitLines(e.target.value, 10));
                        }}
                        onBlur={() => setAreaRaw(f.seo_service_area.join('\n'))} />
                </Field>
                <div className="row">
                    <Field label="Anul înființării"><input value={f.founded_year} placeholder="2009"
                        onChange={(e) => set('founded_year', e.target.value.replace(/\D/g, ''))} /></Field>
                </div>
                <Field label="Meta description (opțional)" value={f.meta_description} max={LIMITS.meta_description}
                    hint="Gol → se generează automat din datele parcului.">
                    <textarea rows={2} value={f.meta_description}
                        onChange={(e) => set('meta_description', e.target.value)} />
                </Field>
                <Field label="Note interne" hint="Invizibile public. Doar pentru tine.">
                    <textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
                </Field>
            </Section>

            <div className="parc-form-actions">
                <button className="confirm-btn" onClick={submit} disabled={saving}>
                    {saving ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Creează site-ul'}
                </button>
                <button className="cancel-btn" onClick={onCancel} disabled={saving}>Renunță</button>
            </div>
        </div>
    );
}
