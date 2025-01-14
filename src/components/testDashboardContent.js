import React from 'react';

const DashboardContent = ({ totalSales, averageSales, topUsers, topTeams }) => {
  return (
    <div className="user-dashboard-content">
      <h1 className="dashboard-title">My Sales Dashboard</h1>
      
      <div className="my-sales-stats">
        <h2>Mina försäljningsstatistik</h2>
        <p><strong>Totalt antal försäljningar:</strong> {totalSales}</p>
        <p><strong>Genomsnittlig försäljning per rapport:</strong> {averageSales.toFixed(2)}</p>
      </div>

      <div className="top-users">
        <h2>Top 10 Användare</h2>
        <ul>
          {topUsers.map((user, index) => (
            <li key={index}>
              {index + 1}. {user.userName}: {user.totalSales} försäljningar
            </li>
          ))}
        </ul>
      </div>

      <div className="top-sales-managers">
        <h2>Bästa team (Sales Managers)</h2>
        <ul>
          {topTeams.map((team, index) => (
            <li key={index}>
              {index + 1}. {team.managerName}: {team.totalSales} försäljningar
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardContent;