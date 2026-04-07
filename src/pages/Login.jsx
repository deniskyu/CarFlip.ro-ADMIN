import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast.error('Completează câmpurile.');
        setLoading(true);
        try {
            const { data } = await api.post('/api/admin/login', { email, password });
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                navigate('/');
                window.location.reload();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Eroare la conectare.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin} className="login-form">
                <h2>Admin Panel</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Parolă"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Se conectează...' : 'Intră'}
                </button>
            </form>
        </div>
    );
}

export default Login;