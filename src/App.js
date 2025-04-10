// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserDashboard from './components/UserDashboard';
import SalesManagerDashboard from './components/SalesManagerDashboard';
import QualityDashboard from './components/QualityDashboard';
import QualityReporting from './components/QualityReporting';
import KvaliteStatistik from './components/KvaliteStatistik';
import AddUser from './components/AddUser';
import SalesInfo from './components/SalesInfo';
import SalesSpecification from './components/SalesSpecification';
import UserSalesSpecification from './components/UserSalesSpecification';
import UserProfilePage from './components/UserProfilePage';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ManageUsers from './components/ManageUsers';
import ManageSalesManagerUsers from './components/ManageSalesManagerUsers';
import SalaryStatistics from './components/SalaryStatistics';
import FinalReport from './components/FinalReport';
import Statistics from './components/Statistics';
import SalesManagerStatistics from './components/SalesManagerStatistics';
import UserStatistics from './components/UserStatistics';
import UppdragsgivareDashboard from './components/UppdragsgivareDashboard';
import ManageOrganizations from './components/ManageOrganizations';
import FactorDashboard from './components/FactorDashboard';
import Hellofresh from './components/Hellofresh';
import ForgotPassword from './components/ForgotPassword';
import { AuthProvider } from './auth';
import ManageMaterialAdmin from './components/ManageMaterialAdmin';

// Lägg till import för din nya komponent
import ManageMaterial from './components/ManageMaterial';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default route visar login-sidan (utan omedelbar redirect) */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Skyddade rutter inom MainLayout */}
          <Route path="/" element={<MainLayout />}>
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute role="admin">
                  <Dashboard />
                </ProtectedRoute>
              } 
              
            />
            <Route
              path="/uppdragsgivare/factor-dashboard"
              element={
                <ProtectedRoute role="uppdragsgivare">
                  <FactorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Ny route för ManageMaterialAdmin för admin */}
            <Route
              path="/admin/manage-material"
              element={
                <ProtectedRoute role="admin">
                  <ManageMaterialAdmin />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/uppdragsgivare/hellofresh" 
              element={
                <ProtectedRoute role={["user", "sales-manager", "admin", "uppdragsgivare"]}>
                  <Hellofresh />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/dashboard" 
              element={
                <ProtectedRoute role={["user", "sales-manager"]}>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-organizations" 
              element={
                <ProtectedRoute role={["admin", "quality"]}>
                  <ManageOrganizations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-manager/dashboard" 
              element={
                <ProtectedRoute role="sales-manager">
                  <SalesManagerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quality/dashboard" 
              element={
                <ProtectedRoute role="quality">
                  <QualityDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/uppdragsgivare/dashboard" 
              element={
                <ProtectedRoute role="uppdragsgivare">
                  <UppdragsgivareDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quality/reporting" 
              element={
                <ProtectedRoute role="quality">
                  <QualityReporting />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quality/statistics" 
              element={
                <ProtectedRoute role="quality">
                  <KvaliteStatistik />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/additional-link" 
              element={
                <ProtectedRoute role="admin">
                  <div>Admin-specifik länk</div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/add-user" 
              element={
                <ProtectedRoute role={["admin", "sales-manager"]}>
                  <AddUser />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-info" 
              element={
                <ProtectedRoute role="admin">
                  <SalesInfo />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-specification" 
              element={
                <ProtectedRoute role="admin">
                  <SalesSpecification />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/sales-specification" 
              element={
                <ProtectedRoute role={["user", "sales-manager"]}>
                  <UserSalesSpecification />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute role={["user", "sales-manager", "admin", "quality", "uppdragsgivare"]}>
                  <UserProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/manage-users" 
              element={
                <ProtectedRoute role="admin">
                  <ManageUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-manager/manage-users" 
              element={
                <ProtectedRoute role="sales-manager">
                  <ManageSalesManagerUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user-profile/:id" 
              element={
                <ProtectedRoute role={["admin", "sales-manager"]}>
                  <UserProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/salary-statistics" 
              element={
                <ProtectedRoute role="admin">
                  <SalaryStatistics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-manager/final-report" 
              element={
                <ProtectedRoute role="sales-manager">
                  <FinalReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/statistics" 
              element={
                <ProtectedRoute role="admin">
                  <Statistics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-manager/statistics" 
              element={
                <ProtectedRoute role="sales-manager">
                  <SalesManagerStatistics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/statistics" 
              element={
                <ProtectedRoute role="user">
                  <UserStatistics />
                </ProtectedRoute>
              } 
            />

            {/* 
              Ny route för ManageMaterial - endast åtkomlig för sales-manager 
            */}
            <Route
              path="/sales-manager/material"
              element={
                <ProtectedRoute role="sales-manager">
                  <ManageMaterial />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
          <Route path="*" element={<div>404 - Page not found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;