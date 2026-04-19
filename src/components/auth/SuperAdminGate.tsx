import React from 'react';
import { Navigate } from 'react-router-dom';

const SuperAdminGate = ({ children }) => {
    const isSuperAdmin = // logic to determine if user is a super admin

    if (!isSuperAdmin) {
        return <Navigate to="/unauthorized" />;
    }

    return children;
};

export default SuperAdminGate;