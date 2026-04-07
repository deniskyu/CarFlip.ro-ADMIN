import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

function BrandsTab() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [expandedBrandId, setExpandedBrandId] = useState(null);
    const [automobiles, setAutomobiles] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [newModelName, setNewModelName] = useState('');

    const [confirmDelete, setConfirmDelete] = useState(null);
    // { type: 'brand', id: ..., name: ... } sau { type: 'automobile', id: ..., name: ..., brandId: ... }

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/brands');
            if (data.success) setBrands(data.brands);
        } catch (err) {
            toast.error('Eroare la încărcarea brandurilor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBrands(); }, []);

    const fetchAutomobiles = async (brandId) => {
        setLoadingModels(true);
        try {
            const { data } = await api.get(`/api/admin/brands/${brandId}/automobiles`);
            if (data.success) setAutomobiles(data.automobiles);
        } catch (err) {
            toast.error('Eroare la încărcarea modelelor.');
        } finally {
            setLoadingModels(false);
        }
    };

    const handleExpandBrand = (brandId) => {
        if (expandedBrandId === brandId) {
            setExpandedBrandId(null);
            setAutomobiles([]);
            setNewModelName('');
        } else {
            setExpandedBrandId(brandId);
            setNewModelName('');
            fetchAutomobiles(brandId);
        }
    };

    const handleAddBrand = async () => {
        if (!newBrandName.trim()) return toast.error('Introdu numele brandului.');
        try {
            const { data } = await api.post('/api/admin/brands', { name: newBrandName.trim() });
            if (data.success) {
                toast.success(data.message);
                setNewBrandName('');
                fetchBrands();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la adăugare.');
        }
    };

    const handleAddModel = async () => {
        if (!newModelName.trim()) return toast.error('Introdu numele modelului.');
        try {
            const { data } = await api.post('/api/admin/automobiles', {
                name: newModelName.trim(),
                brand_id: expandedBrandId,
            });
            if (data.success) {
                toast.success(data.message);
                setNewModelName('');
                fetchAutomobiles(expandedBrandId);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la adăugare.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'brand') {
                const { data } = await api.delete(`/api/admin/brands/${confirmDelete.id}`);
                if (data.success) {
                    toast.success(data.message);
                    if (expandedBrandId === confirmDelete.id) {
                        setExpandedBrandId(null);
                        setAutomobiles([]);
                    }
                    fetchBrands();
                } else {
                    toast.error(data.message);
                }
            } else {
                const { data } = await api.delete(`/api/admin/automobiles/${confirmDelete.id}`);
                if (data.success) {
                    toast.success(data.message);
                    fetchAutomobiles(confirmDelete.brandId);
                } else {
                    toast.error(data.message);
                }
            }
        } catch (err) {
            toast.error('Eroare la ștergere.');
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="brands-tab">
            {/* ADD BRAND */}
            <div className="add-section">
                <input
                    type="text"
                    placeholder="Nume brand nou..."
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
                />
                <button onClick={handleAddBrand}>Adaugă</button>
            </div>

            {/* REFRESH */}
            <div className="brands-header">
                <h3>Branduri ({brands.length})</h3>
                <button onClick={fetchBrands} disabled={loading} className="refresh-btn">
                    {loading ? '...' : '↻'}
                </button>
            </div>

            {loading && brands.length === 0 && <p className="loading-text">Se încarcă...</p>}

            {/* BRANDS LIST */}
            {brands.map((brand) => (
                <div key={brand.id} className="brand-card">
                    <div className="brand-row" onClick={() => handleExpandBrand(brand.id)}>
                        <span className="brand-name">
                            {expandedBrandId === brand.id ? '▼' : '▶'} {brand.name}
                        </span>
                        <button
                            className="delete-x"
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete({ type: 'brand', id: brand.id, name: brand.name });
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {expandedBrandId === brand.id && (
                        <div className="brand-expanded">
                            {/* ADD MODEL */}
                            <div className="add-model-row">
                                <input
                                    type="text"
                                    placeholder="Nume model nou..."
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                                />
                                <button onClick={handleAddModel}>Adaugă</button>
                            </div>

                            {loadingModels && <p className="loading-text">Se încarcă...</p>}

                            {!loadingModels && automobiles.length === 0 && (
                                <p className="empty-text">Niciun model.</p>
                            )}

                            {automobiles.map((auto) => (
                                <div key={auto.id} className="model-row">
                                    <span>{auto.name}</span>
                                    <button
                                        className="delete-x"
                                        onClick={() => setConfirmDelete({
                                            type: 'automobile',
                                            id: auto.id,
                                            name: auto.name,
                                            brandId: brand.id,
                                        })}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* DELETE CONFIRM POPUP */}
            {confirmDelete && (
                <div className="popup-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="popup" onClick={(e) => e.stopPropagation()}>
                        <p>
                            Ești sigur că vrei să ștergi <strong>{confirmDelete.name}</strong>
                            {confirmDelete.type === 'brand' ? ' și toate modelele asociate' : ''}?
                        </p>
                        <div className="popup-actions">
                            <button className="confirm-btn" onClick={handleConfirmDelete}>Da</button>
                            <button className="cancel-btn" onClick={() => setConfirmDelete(null)}>Nu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BrandsTab;