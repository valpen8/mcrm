import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserDashboard from './components/UserDashboard';
import SalesManagerDashboard from './components/SalesManagerDashboard';
import QualityDashboard from './components/QualityDashboard';
import QualityReporting from './components/QualityReporting';
import KvaliteStatistik from './components/KvaliteStatistik'; // Import för den nya komponenten
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
import UppdragsgivareDashboard from './components/UppdragsgivareDashboard'; // Importera Uppdragsgivare Dashboard
import ManageOrganizations from './components/ManageOrganizations';
import FactorDashboard from './components/FactorDashboard';  // Lägg till importen
import Hellofresh from './components/Hellofresh';
import ForgotPassword from './components/ForgotPassword'; // Import för "Glömt lösenord"-komponenten
import { AuthProvider } from './auth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Omdirigera till login om användaren går till root */}
          <Route path="/" element={<Navigate replace to="/login" />} />
          <Route path="/login" element={<Login />} />

          {/* Glömt lösenord */}
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Huvudlayout för inloggade användare */}
          <Route path="/" element={<MainLayout />}>
            {/* Admin Dashboard */}
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

            <Route 
              path="/uppdragsgivare/hellofresh" 
              element={
                <ProtectedRoute role={["user", "sales-manager", "admin", "uppdragsgivare"]}>
                 <Hellofresh />
               </ProtectedRoute>
               } 
            /> 

            {/* User Dashboard */}
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

            {/* Sales Manager Dashboard */}
            <Route 
              path="/sales-manager/dashboard" 
              element={
                <ProtectedRoute role="sales-manager">
                  <SalesManagerDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Quality Dashboard */}
            <Route 
              path="/quality/dashboard" 
              element={
                <ProtectedRoute role="quality">
                  <QualityDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Uppdragsgivare Dashboard */}
            <Route 
              path="/uppdragsgivare/dashboard" 
              element={
                <ProtectedRoute role="uppdragsgivare">
                  <UppdragsgivareDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Rapportering Kvalité */}
            <Route 
              path="/quality/reporting" 
              element={
                <ProtectedRoute role="quality">
                  <QualityReporting />
                </ProtectedRoute>
              } 
            />

            {/* Ny rutt för Kvalité Statistik */}
            <Route 
              path="/quality/statistics" 
              element={
                <ProtectedRoute role="quality">
                  <KvaliteStatistik />
                </ProtectedRoute>
              } 
            />

            {/* Admin kan lägga till valfria länkar */}
            <Route 
              path="/admin/additional-link" 
              element={
                <ProtectedRoute role="admin">
                  <div>Admin-specifik länk</div>
                </ProtectedRoute>
              } 
            />

            {/* Sales Manager och Admin kan lägga till användare */}
            <Route 
              path="/add-user" 
              element={
                <ProtectedRoute role={["admin", "sales-manager"]}>
                  <AddUser />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin kan se sales-info */}
            <Route 
              path="/sales-info" 
              element={
                <ProtectedRoute role="admin">
                  <SalesInfo />
                </ProtectedRoute>
              } 
            />

            {/* Admin kan se sales-specification */}
            <Route 
              path="/sales-specification" 
              element={
                <ProtectedRoute role="admin">
                  <SalesSpecification />
                </ProtectedRoute>
              } 
            />
            
            {/* User och sales-manager kan se sin egen sales-specification */}
            <Route 
              path="/user/sales-specification" 
              element={
                <ProtectedRoute role={["user", "sales-manager"]}>
                  <UserSalesSpecification />
                </ProtectedRoute>
              } 
            />
            
            {/* Profilsidan är tillgänglig för user, sales-manager, admin och quality */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute role={["user", "sales-manager", "admin", "quality", "uppdragsgivare"]}>
                  <UserProfilePage />
                </ProtectedRoute>
              } 
            />

            {/* Admin kan hantera alla användare */}
            <Route 
              path="/admin/manage-users" 
              element={
                <ProtectedRoute role="admin"> 
                  <ManageUsers />
                </ProtectedRoute>
              } 
            />

            {/* Sales Manager kan hantera sina användare */}
            <Route 
              path="/sales-manager/manage-users" 
              element={
                <ProtectedRoute role="sales-manager">
                  <ManageSalesManagerUsers />
                </ProtectedRoute>
              } 
            />

            {/* Rutt för att visa en specifik användarprofil baserat på ID */}
            <Route 
              path="/user-profile/:id" 
              element={
                <ProtectedRoute role={["admin", "sales-manager"]}>
                  <UserProfilePage />
                </ProtectedRoute>
              } 
            />

            {/* Ny rutt för Lönestatistik, endast för admin */}
            <Route 
              path="/admin/salary-statistics" 
              element={
                <ProtectedRoute role="admin">
                  <SalaryStatistics />
                </ProtectedRoute>
              } 
            />

            {/* Ny rutt för Sales Managers slutrapporter */}
            <Route 
              path="/sales-manager/final-report" 
              element={
                <ProtectedRoute role="sales-manager">
                  <FinalReport />
                </ProtectedRoute>
              } 
            />

            {/* Ny rutt för Admin Statistik */}
            <Route 
              path="/admin/statistics" 
              element={
                <ProtectedRoute role="admin">
                  <Statistics />
                </ProtectedRoute>
              } 
            />

            {/* Ny rutt för Sales Manager Statistik */}
            <Route 
              path="/sales-manager/statistics" 
              element={
                <ProtectedRoute role="sales-manager">
                  <SalesManagerStatistics />
                </ProtectedRoute>
              } 
            />

             {/* Ny rutt för användarens statistik */}
              <Route 
              path="/user/statistics" 
              element={
                <ProtectedRoute role="user">
                  <UserStatistics />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Unauthorized Access sida */}
          <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

          {/* 404 sida för odefinierade rutter */}
          <Route path="*" element={<div>404 - Page not found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
