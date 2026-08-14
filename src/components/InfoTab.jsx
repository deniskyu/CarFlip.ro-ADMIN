import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const STORAGE_KEY = 'admin_stats_last_refresh';

const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

function InfoTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // Citim o singură dată, la montare — rămâne neschimbat cât timp stai pe pagină,
    // chiar dacă apeși refresh de mai multe ori.
    const [lastRefresh] = useState(() => {
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

                // Suprascriem cu valorile curente, ca la vizita viitoare
                // acestea să devină "ultima verificare".
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    totalSales: data.totalSales,
                    totalUsers: data.totalUsers,
                    timestamp: Date.now(),
                }));
            }
        } catch (err) {
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
                <button onClick={fetchStats} disabled={loading} className="refresh-btn">
                    {loading ? '...' : '↻'}
                </button>
            </div>

            {loading && !stats && <p className="loading-text">Se încarcă...</p>}

            {stats && (
                <div className="stats-cards">
                    <div className="stat-card">
                        <span className="stat-label">Anunțuri</span>
                        <span className="stat-value">{stats.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Utilizatori</span>
                        <span className="stat-value">{stats.totalUsers.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {lastRefresh && (
                <div className="stats-last-refresh">
                    <p className="last-refresh-label">
                        Ultima verificare: {formatDate(lastRefresh.timestamp)}
                    </p>
                    <div className="stats-cards">
                        <div className="stat-card">
                            <span className="stat-label">Anunțuri</span>
                            <span className="stat-value">{lastRefresh.totalSales.toLocaleString()}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Utilizatori</span>
                            <span className="stat-value">{lastRefresh.totalUsers.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfoTab;