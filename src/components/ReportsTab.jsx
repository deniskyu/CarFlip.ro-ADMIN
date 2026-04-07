import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

function ReportsTab() {
    const [reports, setReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [searchUsername, setSearchUsername] = useState('');
    const [searchedUser, setSearchedUser] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [confirmBan, setConfirmBan] = useState(false);
    const [confirmReportId, setConfirmReportId] = useState(null);
    const [confirmReportStatus, setConfirmReportStatus] = useState(null);

    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const { data } = await api.get('/api/admin/reports');
            if (data.success) setReports(data.reports);
        } catch (err) {
            toast.error('Eroare la încărcarea rapoartelor.');
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    const handleSearch = async () => {
        if (!searchUsername.trim()) return toast.error('Introdu un username.');
        setSearchLoading(true);
        setSearchedUser(null);
        try {
            const { data } = await api.get(`/api/admin/user/search?username=${searchUsername.trim()}`);
            if (data.success) {
                setSearchedUser(data.user);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Eroare la căutare.');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleBanToggle = async () => {
        if (!searchedUser) return;
        try {
            const { data } = await api.put(`/api/admin/user/ban/${searchedUser._id}`);
            if (data.success) {
                toast.success(data.message);
                setSearchedUser({ ...searchedUser, isBanned: data.isBanned });
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Eroare la ban/unban.');
        } finally {
            setConfirmBan(false);
        }
    };

    const handleReportStatus = async () => {
        if (!confirmReportId || !confirmReportStatus) return;
        try {
            const { data } = await api.put(`/api/admin/reports/${confirmReportId}`, { status: confirmReportStatus });
            if (data.success) {
                toast.success(data.message);
                setReports(reports.filter(r => r._id !== confirmReportId));
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Eroare la actualizare raport.');
        } finally {
            setConfirmReportId(null);
            setConfirmReportStatus(null);
        }
    };

    const renderTarget = (report) => {
        if (!report.target) return <p className="report-deleted">Conținutul a fost șters.</p>;

        if (report.target_type === 'post') {
            return (
                <div className="report-target">
                    <p><strong>Utilizator:</strong> {report.target.user_name || 'N/A'}</p>
                    <p><strong>Brand:</strong> {report.target.brand?.name} — {report.target.model?.name}</p>
                    <p><strong>Preț:</strong> {report.target.price?.toLocaleString()} €</p>
                    <p><strong>Descriere:</strong> {report.target.description || 'Fără descriere'}</p>
                    {report.target.media?.map((m, i) => (
                        m.type === 'image' ? (
                            <img key={i} src={m.url} alt="media" className="report-image" />
                        ) : (
                            <video key={i} src={m.url} controls className="report-image" />
                        )
                    ))}
                </div>
            );
        }

        if (report.target_type === 'comment') {
            return (
                <div className="report-target">
                    <p><strong>Utilizator:</strong> {report.target.username}</p>
                    <p><strong>Comentariu:</strong> {report.target.text}</p>
                </div>
            );
        }

        if (report.target_type === 'profile') {
            return (
                <div className="report-target">
                    <p><strong>Utilizator:</strong> {report.target.username}</p>
                    {report.target.icon && <img src={report.target.icon} alt="icon" className="report-avatar" />}
                </div>
            );
        }

        if (report.target_type === 'message') {
            return (
                <div className="report-target">
                    <p><strong>Utilizator:</strong> {report.target.username}</p>
                    {report.target.type === 'text' && <p><strong>Mesaj:</strong> {report.target.text}</p>}
                    {report.target.type === 'image' && <img src={report.target.image_url} alt="mesaj" className="report-image" />}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="reports-tab">
            {/* SEARCH USER + BAN */}
            <div className="search-section">
                <div className="search-row">
                    <input
                        type="text"
                        placeholder="Caută username..."
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={searchLoading}>
                        {searchLoading ? '...' : 'Caută'}
                    </button>
                </div>

                {searchedUser && (
                    <div className="searched-user">
                        <img src={searchedUser.icon} alt="avatar" className="user-avatar" />
                        <div className="user-info">
                            <p><strong>{searchedUser.username}</strong></p>
                            <p>{searchedUser.email}</p>
                            <p className={searchedUser.isBanned ? 'status-banned' : 'status-active'}>
                                {searchedUser.isBanned ? 'BANAT' : 'ACTIV'}
                            </p>
                        </div>
                        <button
                            className={searchedUser.isBanned ? 'unban-btn' : 'ban-btn'}
                            onClick={() => setConfirmBan(true)}
                        >
                            {searchedUser.isBanned ? 'Debanează' : 'Banează'}
                        </button>
                    </div>
                )}
            </div>

            {/* BAN CONFIRM POPUP */}
            {confirmBan && (
                <div className="popup-overlay" onClick={() => setConfirmBan(false)}>
                    <div className="popup" onClick={(e) => e.stopPropagation()}>
                        <p>Ești sigur că vrei să {searchedUser?.isBanned ? 'debanezi' : 'banezi'} pe <strong>{searchedUser?.username}</strong>?</p>
                        <div className="popup-actions">
                            <button className="confirm-btn" onClick={handleBanToggle}>Da</button>
                            <button className="cancel-btn" onClick={() => setConfirmBan(false)}>Nu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* REPORT STATUS CONFIRM POPUP */}
            {confirmReportId && (
                <div className="popup-overlay" onClick={() => { setConfirmReportId(null); setConfirmReportStatus(null); }}>
                    <div className="popup" onClick={(e) => e.stopPropagation()}>
                        <p>Marchezi raportul ca <strong>{confirmReportStatus}</strong>?</p>
                        <div className="popup-actions">
                            <button className="confirm-btn" onClick={handleReportStatus}>Da</button>
                            <button className="cancel-btn" onClick={() => { setConfirmReportId(null); setConfirmReportStatus(null); }}>Nu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* REPORTS LIST */}
            <div className="reports-header">
                <h3>Rapoarte ({reports.length})</h3>
                <button onClick={fetchReports} disabled={loadingReports} className="refresh-btn">
                    {loadingReports ? '...' : '↻'}
                </button>
            </div>

            {loadingReports && reports.length === 0 && <p className="loading-text">Se încarcă...</p>}

            {!loadingReports && reports.length === 0 && <p className="empty-text">Niciun raport pending.</p>}

            {reports.map((report) => (
                <div key={report._id} className="report-card">
                    <div className="report-type">{report.target_type.toUpperCase()}</div>
                    <p className="report-reporter">Raportat de: <strong>{report.reporter_name}</strong></p>

                    {renderTarget(report)}

                    <div className="report-reason">
                        <strong>Motiv:</strong> {report.reason}
                    </div>

                    <div className="report-actions">
                        <button
                            className="resolve-btn"
                            onClick={() => { setConfirmReportId(report._id); setConfirmReportStatus('resolved'); }}
                        >
                            Resolved
                        </button>
                        <button
                            className="dismiss-btn"
                            onClick={() => { setConfirmReportId(report._id); setConfirmReportStatus('dismissed'); }}
                        >
                            Dismissed
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ReportsTab;