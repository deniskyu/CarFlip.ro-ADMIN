import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportsTab from '../components/ReportsTab';
import BrandsTab from '../components/BrandsTab';
import InfoTab from '../components/InfoTab';

function Dashboard() {
    const [activeTab, setActiveTab] = useState('reports');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
        window.location.reload();
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>CarFlip Admin</h2>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>

            <div className="tabs">
                <button
                    className={activeTab === 'reports' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('reports')}
                >
                    Rapoarte
                </button>
                <button
                    className={activeTab === 'brands' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('brands')}
                >
                    Branduri
                </button>
                <button
                    className={activeTab === 'info' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('info')}
                >
                    Info
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'reports' && <ReportsTab />}
                {activeTab === 'brands' && <BrandsTab />}
                {activeTab === 'info' && <InfoTab />}
            </div>
        </div>
    );
}

export default Dashboard;