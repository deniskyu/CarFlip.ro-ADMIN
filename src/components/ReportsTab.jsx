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

    // Acțiune distructivă pe un raport (Șterge / Banează) -> confirmare
    // { reportId, kind: 'delete' | 'ban', targetType }
    const [confirmAction, setConfirmAction] = useState(null);

    // ID-ul raportului în curs de procesare (blochează butoanele lui)
    const [processingId, setProcessingId] = useState(null);

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

    // "Rezolvat" — închide raportul fără să șteargă/baneze. Instant, fără popup.
    const handleResolve = async (reportId) => {
        if (processingId) return;
        setProcessingId(reportId);
        try {
            const { data } = await api.put(`/api/admin/reports/${reportId}`, { status: 'resolved' });
            if (data.success) {
                toast.success(data.message);
                setReports(prev => prev.filter(r => r._id !== reportId));
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Eroare la actualizare raport.');
        } finally {
            setProcessingId(null);
        }
    };

    // "Șterge" / "Banează" — acțiune distructivă; server-ul face acțiunea + auto-dismiss.
    const handleConfirmAction = async () => {
        if (!confirmAction) return;
        const { reportId } = confirmAction;
        setProcessingId(reportId);
        try {
            const { data } = await api.post(`/api/admin/reports/${reportId}/action`);
            if (data.success) {
                toast.success(data.message);
                setReports(prev => prev.filter(r => r._id !== reportId));
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la procesarea acțiunii.');
        } finally {
            setProcessingId(null);
            setConfirmAction(null);
        }
    };

    // Textul din popup-ul de confirmare pentru acțiunea distructivă
    const getConfirmActionText = () => {
        if (!confirmAction) return '';
        if (confirmAction.kind === 'ban') {
            return 'Banezi acest utilizator? Toate sesiunile lui vor fi invalidate, iar raportul va fi închis.';
        }
        switch (confirmAction.targetType) {
            case 'post':
                return 'Ștergi definitiv acest anunț împreună cu toate pozele și videoclipurile lui? Raportul va fi închis.';
            case 'comment':
                return 'Ștergi definitiv acest comentariu și toate răspunsurile lui? Raportul va fi închis.';
            case 'message':
                return 'Ștergi acest mesaj? Dacă are imagine, va fi eliminată definitiv. Raportul va fi închis.';
            default:
                return 'Confirmi această acțiune? Raportul va fi închis.';
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

            {/* BAN CONFIRM POPUP (din search) */}
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

            {/* ACȚIUNE RAPORT CONFIRM POPUP (Șterge / Banează) */}
            {confirmAction && (
                <div className="popup-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="popup" onClick={(e) => e.stopPropagation()}>
                        <p>{getConfirmActionText()}</p>
                        <div className="popup-actions">
                            <button
                                className="confirm-btn"
                                onClick={handleConfirmAction}
                                disabled={processingId === confirmAction.reportId}
                            >
                                {processingId === confirmAction.reportId ? '...' : 'Da'}
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => setConfirmAction(null)}
                                disabled={processingId === confirmAction.reportId}
                            >
                                Nu
                            </button>
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
                        {report.target && (
                            report.target_type === 'profile' ? (
                                <button
                                    className="ban-action-btn"
                                    disabled={processingId === report._id}
                                    onClick={() => setConfirmAction({ reportId: report._id, kind: 'ban', targetType: report.target_type })}
                                >
                                    Banează
                                </button>
                            ) : (
                                <button
                                    className="delete-action-btn"
                                    disabled={processingId === report._id}
                                    onClick={() => setConfirmAction({ reportId: report._id, kind: 'delete', targetType: report.target_type })}
                                >
                                    Șterge
                                </button>
                            )
                        )}
                        <button
                            className="resolve-btn"
                            disabled={processingId === report._id}
                            onClick={() => handleResolve(report._id)}
                        >
                            Rezolvat
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ReportsTab;
