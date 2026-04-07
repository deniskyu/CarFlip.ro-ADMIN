import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

function InfoTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/stats');
            if (data.success) setStats(data);
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
        </div>
    );
}

export default InfoTab;