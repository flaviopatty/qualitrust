
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Evaluations from './pages/Evaluations';
import NewEvaluation from './pages/NewEvaluation';
import ContractDetails from './pages/ContractDetails';
import Admin from './pages/Admin';

import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="new-evaluation" element={<NewEvaluation />} />
            <Route path="edit-evaluation/:id" element={<NewEvaluation />} />
            <Route path="view-evaluation/:id" element={<NewEvaluation />} />
            <Route path="contracts" element={<ContractDetails />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
