import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const STORAGE_KEY = 'admin_stats_last_refresh';

/** „acum 3 zile" e mai ușor de citit decât „12.08.2026, 14:30". */
const relTime = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 90) return 'acum câteva momente';
    const m = Math.floor(s / 60);
    if (m < 60) return `acum ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `acum ${h} ${h === 1 ? 'oră' : 'ore'}`;
    const d = Math.floor(h / 24);
    if (d < 30) return `acum ${d} ${d === 1 ? 'zi' : 'zile'}`;
    const mo = Math.floor(d / 30);
    return `acum ${mo} ${mo === 1 ? 'lună' : 'luni'}`;
};

const fullDate = (ts) =>
    new Date(ts).toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const fmt = (n) => Number(n ?? 0).toLocaleString('ro-RO');

/** Un card cu valoarea curentă și, dacă avem cu ce compara, diferența. */
function StatCard({ label, value, previous }) {
    const hasPrev = Number.isFinite(previous);
    const delta = hasPrev ? value - previous : null;
    const dir = delta === null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

    return (
        <div className="stat-card">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{fmt(value)}</span>
            {dir && (
                <span className={`stat-delta ${dir}`}>
                    {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'}
                    {dir === 'flat' ? ' fără schimbări' : ` ${fmt(Math.abs(delta))}`}
                </span>
            )}
        </div>
    );
}

function InfoTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // Citit O SINGURĂ DATĂ, la montare. Rămâne fix cât timp stai pe pagină,
    // chiar dacă apeși refresh de mai multe ori — altfel diferența ar deveni
    // zero imediat după prima reîmprospătare și n-ar mai spune nimic.
    const [baseline] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/stats');
            if (data.success) {
                setStats(data);
                // Suprascriem, ca la vizita următoare astea să devină reperul.
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    totalSales: data.totalSales,
                    totalUsers: data.totalUsers,
                    timestamp: Date.now(),
                }));
            }
        } catch {
            toast.error('Eroare la încărcarea statisticilor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    return (
        <div className="info-tab">
            <div className="info-header">
                <h3>Statistici</h3>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    className={`refresh-btn ${loading ? 'is-loading' : ''}`}
                    aria-label="Reîmprospătează"
                >
                    ↻
                </button>
            </div>

            {loading && !stats && <p className="loading-text">Se încarcă...</p>}

            {stats && (
                <>
                    <div className="stats-cards">
                        <StatCard label="Anunțuri" value={stats.totalSales} previous={baseline?.totalSales} />
                        <StatCard label="Utilizatori" value={stats.totalUsers} previous={baseline?.totalUsers} />
                    </div>

                    {baseline ? (
                        <p className="stats-meta">
                            față de <strong>{relTime(baseline.timestamp)}</strong>
                            <span className="stats-meta-date"> · {fullDate(baseline.timestamp)}</span>
                        </p>
                    ) : (
                        <p className="stats-meta">
                            Prima verificare — diferențele apar de la următoarea vizită.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

export default InfoTab;