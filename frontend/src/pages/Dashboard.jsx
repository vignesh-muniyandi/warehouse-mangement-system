import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'User';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="max-w-5xl mx-auto">
        <div className="dashboard-header">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Welcome back, <span className="font-semibold text-slate-800">{fullName}</span></p>
        </div>

        <div className="welcome-banner">
          <h2>Welcome to your dashboard!</h2>
          <p>You are now logged in and can access all admin functionality.</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Full Name</h3>
            <div className="info-box">
              <div className="info-value">{user.fullname || 'N/A'}</div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Email Address</h3>
            <div className="info-box">
              <div className="info-value">{user.email || 'N/A'}</div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">User Role</h3>
            <div className="info-box">
              <div className="info-value capitalize font-medium">{user.role || 'admin'}</div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
