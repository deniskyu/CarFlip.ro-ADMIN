import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getPreset } from '../lib/parcPresets';
import ParcForm from './ParcForm';

// ============================================================================
//  src/components/ParcuriTab.jsx
// ----------------------------------------------------------------------------
//  Lista site-urilor. Pe lângă administrare, e și tabloul de bord al retenției:
//  `days_since_post` arată exact care dealer a încetat să mai posteze. Un site
//  cu 4 mașini vechi de două luni nu vinde nimic și nu se reînnoiește — e cel
//  mai timpuriu semnal că pierzi un client, și apare aici fără niciun cost
//  suplimentar (vine din aceeași agregare care numără stocul).
//
//  Ștergerea are TREI forme, ordonate după cât de des se folosesc:
//  dezactivare (majoritatea cazurilor) · ștergere site · ștergere cu tot stocul.
// ============================================================================

function DeleteMenu({ parc, onDone }) {
    const [mode, setMode] = useState(null);   // 'site' | 'stock'
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            const { data } = mode === 'stock'
                ? await api.delete(`/api/admin/parcuri/${parc._id}/with-stock`, { data: { confirm } })
                : await api.delete(`/api/admin/parcuri/${parc._id}`);
            if (!data.success) return toast.error(data.message);
            toast.success(data.message);
            setMode(null);
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la ștergere.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button className="delete-x" onClick={() => setMode('site')} title="Șterge">✕</button>

            {mode && (
                <div className="popup-overlay" onClick={() => !busy && setMode(null)}>
                    <div className="popup" onClick={(e) => e.stopPropagation()}>
                        {mode === 'site' ? (
                            <>
                                <p>
                                    Ștergi site-ul <strong>{parc.subdomain}</strong>?<br />
                                    <span className="hint">
                                        Dispar documentul, logo-ul și bannerul. Subdomeniul se eliberează.
                                        <strong> Anunțurile și contul rămân neatinse.</strong>
                                    </span>
                                </p>
                                <div className="popup-actions">
                                    <button className="confirm-btn" onClick={run} disabled={busy}>
                                        {busy ? '...' : 'Șterge site-ul'}
                                    </button>
                                    <button className="cancel-btn" onClick={() => setMode(null)} disabled={busy}>
                                        Renunță
                                    </button>
                                </div>
                                <button className="link-danger" onClick={() => { setMode('stock'); setConfirm(''); }}>
                                    Șterge site-ul ȘI toate cele {parc.stock?.total ?? 0} anunțuri
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="danger-title">Ștergere definitivă</p>
                                <p>
                                    Se șterg <strong>{parc.stock?.total ?? 0} anunțuri</strong> cu toate fotografiile
                                    lor din R2, comentariile și postările sociale asociate.
                                    <br /><strong>Nu există recuperare.</strong>
                                    <br /><span className="hint">Contul de utilizator rămâne activ.</span>
                                </p>
                                <p className="hint">Scrie <code>{parc.subdomain}</code> ca să confirmi:</p>
                                <input
                                    autoFocus value={confirm} placeholder={parc.subdomain}
                                    onChange={(e) => setConfirm(e.target.value)}
                                />
                                <div className="popup-actions">
                                    <button
                                        className="confirm-btn" onClick={run}
                                        disabled={busy || confirm !== parc.subdomain}
                                    >
                                        {busy ? '...' : 'Șterge definitiv'}
                                    </button>
                                    <button className="cancel-btn" onClick={() => setMode(null)} disabled={busy}>
                                        Renunță
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function ParcCard({ parc, onEdit, onRefresh }) {
    const [busy, setBusy] = useState(false);
    const [showWhy, setShowWhy] = useState(false);
    const preset = getPreset(parc.preset);
    const stock = parc.stock || {};
    const check = parc.indexable_check || { ok: false, reasons: [] };

    const toggle = async () => {
        setBusy(true);
        try {
            const { data } = await api.post(`/api/admin/parcuri/${parc._id}/toggle`);
            if (!data.success) return toast.error(data.message);
            toast.success(data.message);
            onRefresh();
        } catch {
            toast.error('Eroare la schimbarea stării.');
        } finally { setBusy(false); }
    };

    return (
        <div className={`parc-card ${parc.active ? '' : 'inactive'}`}>
            <div className="parc-card-top">
                <img className="parc-logo" src={parc.logo_url} alt="" />
                <div className="parc-id">
                    <strong>{parc.display_name}</strong>
                    <a href={`https://${parc.subdomain}.car-flip.com`} target="_blank" rel="noopener noreferrer">
                        {parc.subdomain}.car-flip.com ↗
                    </a>
                    <span className="parc-user">{parc.user?.username || 'cont șters'}</span>
                </div>
                <DeleteMenu parc={parc} onDone={onRefresh} />
            </div>

            <div className="parc-badges">
                <span className={`pill ${parc.active ? 'ok' : 'off'}`}>
                    {parc.active ? 'activ' : 'dezactivat'}
                </span>
                <span className="pill">{stock.total ?? 0} mașini</span>
                {stock.days_since_post !== null && stock.days_since_post !== undefined && (
                    <span className={`pill ${stock.stale ? 'bad' : ''}`}>
                        ultima postare acum {stock.days_since_post} z
                    </span>
                )}
                <span
                    className={`pill ${check.ok ? 'ok' : 'warn'} clickable`}
                    onClick={() => setShowWhy((s) => !s)}
                >
                    {check.ok ? 'indexabil' : `neindexabil (${check.reasons.length})`}
                </span>
                <span className="pill" style={{ borderColor: parc.accent_color, color: parc.accent_color }}>
                    {preset.name}
                </span>
            </div>

            {showWhy && !check.ok && (
                <ul className="parc-reasons">
                    {check.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            )}

            {stock.stale && (
                <p className="parc-warn">
                    Nu a mai postat de {stock.days_since_post} de zile. Site-ul se răcește — merită un telefon.
                </p>
            )}

            <div className="parc-actions">
                <button className="ghost-btn" onClick={() => onEdit(parc)}>Editează</button>
                <button className="ghost-btn" onClick={toggle} disabled={busy}>
                    {parc.active ? 'Dezactivează' : 'Activează'}
                </button>
            </div>
        </div>
    );
}

export default function ParcuriTab() {
    const [parcuri, setParcuri] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null);   // obiect parc | 'new' | null

    const fetchAll = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/parcuri');
            if (data.success) setParcuri(data.parcuri);
        } catch {
            toast.error('Eroare la încărcarea parcurilor.');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    if (editing) {
        return (
            <ParcForm
                parc={editing === 'new' ? null : editing}
                onCancel={() => setEditing(null)}
                onSaved={() => { setEditing(null); fetchAll(); }}
            />
        );
    }

    const stale = parcuri.filter((p) => p.stock?.stale).length;

    return (
        <div className="parcuri-tab">
            <div className="add-section">
                <button onClick={() => setEditing('new')}>+ Site nou</button>
                <button onClick={fetchAll} disabled={loading} className="refresh-btn">
                    {loading ? '...' : '↻'}
                </button>
            </div>

            <div className="parcuri-header">
                <h3>Parcuri ({parcuri.length})</h3>
                {stale > 0 && <span className="pill bad">{stale} fără activitate</span>}
            </div>

            {loading && parcuri.length === 0 && <p className="loading-text">Se încarcă...</p>}
            {!loading && parcuri.length === 0 && (
                <p className="empty-text">Niciun site încă. Apasă „Site nou".</p>
            )}

            {parcuri.map((p) => (
                <ParcCard key={p._id} parc={p} onEdit={setEditing} onRefresh={fetchAll} />
            ))}
        </div>
    );
}
