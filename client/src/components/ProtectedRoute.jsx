import React from 'react';
import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import AuthStore from '../stores/AuthStore.js';

const ProtectedRoute = observer(({ children, adminOnly = false }) => {
  if (!AuthStore.isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && !AuthStore.isAdmin) {
    return <Navigate to="/chat" />;
  }
  
  return children;
});

export default ProtectedRoute;
