import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const token = localStorage.getItem('adminToken');

  return (
    <BrowserRouter>
      <ToastContainer position="top-center" autoClose={3000} />
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;