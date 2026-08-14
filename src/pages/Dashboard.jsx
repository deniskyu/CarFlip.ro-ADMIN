import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportsTab from '../components/ReportsTab';
import BrandsTab from '../components/BrandsTab';
import InfoTab from '../components/InfoTab';
import ParcuriTab from '../components/ParcuriTab';

// ============================================================================
//  src/pages/Dashboard.jsx
// ----------------------------------------------------------------------------
//  Modificat față de versiunea existentă:
//   • tab nou „Parcuri";
//   • containerul se lărgește DOAR pe acest tab.
//
//  Restul panoului e gândit pentru mobil (max-width 500px), și e corect așa —
//  moderarea rapoartelor se face de pe telefon. Dar formularul de parc are ~30
//  de câmpuri, un cropper și o grilă de presetări: la 500px devine o coloană
//  interminabilă. Crearea unui site e o operațiune de birou, nu de telefon.
//
//  Tab-urile trec pe două rânduri când sunt patru — de aceea `flex-wrap` în CSS.
// ============================================================================

function Dashboard() {
    const [activeTab, setActiveTab] = useState('reports');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
        window.location.reload();
    };

    const tabs = [
        { id: 'reports', label: 'Rapoarte' },
        { id: 'brands', label: 'Branduri' },
        { id: 'parcuri', label: 'Parcuri' },
        { id: 'info', label: 'Info' },
    ];

    return (
        <div className={`dashboard-container ${activeTab === 'parcuri' ? 'wide' : ''}`}>
            <div className="dashboard-header">
                <h2>CarFlip Admin</h2>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>

            <div className="tabs">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        className={activeTab === t.id ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 'reports' && <ReportsTab />}
                {activeTab === 'brands' && <BrandsTab />}
                {activeTab === 'parcuri' && <ParcuriTab />}
                {activeTab === 'info' && <InfoTab />}
            </div>
        </div>
    );
}

export default Dashboard;
