import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/Dashboard.css';

const Dashboard = () => {
  const [totalSales, setTotalSales] = useState(0);
  const [averageSales, setAverageSales] = useState(0);
  const [topUsers, setTopUsers] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [orgStats, setOrgStats] = useState([]);
  const [yesterdayStats, setYesterdayStats] = useState([]);
  const [yesterdayOrgStats, setYesterdayOrgStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const getCurrentPeriod = () => {
    const today = new Date();
    let start, end;
    if (today.getDate() >= 18) {
      start = new Date(today.getFullYear(), today.getMonth(), 18);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 17);
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 18);
      end = new Date(today.getFullYear(), today.getMonth(), 17);
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getYesterdayPeriod = () => {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);

    start.setDate(today.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    end.setDate(today.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTotalSales(),
      fetchTopUsers(),
      fetchTopTeams(),
      fetchOrgStats(),
      fetchYesterdayStats(),
      fetchYesterdayOrgStats()  // Nytt anrop för gårdagens organisationsstatistik
    ]);
    setLoading(false);
  };

  const fetchTotalSales = async () => {
    const { start, end } = getCurrentPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      const total = reportsData.reduce((sum, report) => sum + parseFloat(report.totalSales || 0), 0);
      const avg = reportsData.length > 0 ? total / reportsData.length : 0;

      setTotalSales(total);
      setAverageSales(avg);
    } catch (error) {
      console.error("Error fetching total sales:", error);
    }
  };

  const fetchTopUsers = async () => {
    const { start, end } = getCurrentPeriod();
    try {
      const usersQuery = collection(db, 'users');
      const usersSnapshot = await getDocs(usersQuery);

      const allUsers = usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userName = `${userData.firstName} ${userData.lastName}`;

        const reportsQuery = query(
          collection(db, `users/${userId}/reports`),
          where('date', '>=', start.toISOString()),
          where('date', '<=', end.toISOString())
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const totalSales = reportsSnapshot.docs.reduce((sum, report) => {
          const reportData = report.data();
          return sum + parseFloat(reportData.sales || 0);
        }, 0);

        return { userName, totalSales };
      });

      const resolvedUsers = await Promise.all(allUsers);
      const topUsers = resolvedUsers
        .filter(user => user.totalSales > 0)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10);

      setTopUsers(topUsers);
    } catch (error) {
      console.error("Error fetching top users:", error);
    }
  };

  const fetchTopTeams = async () => {
    const { start, end } = getCurrentPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      const teams = {};
      reportsData.forEach(data => {
        const managerId = data.managerUid;
        if (!teams[managerId]) {
          teams[managerId] = 0;
        }
        teams[managerId] += parseFloat(data.totalSales || 0);
      });

      const teamPromises = Object.entries(teams).map(async ([managerId, totalSales]) => {
        const managerDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', managerId)));
        const managerData = managerDoc.docs[0]?.data();
        const managerName = managerData ? `${managerData.firstName} ${managerData.lastName}` : managerId;
        return { managerName, totalSales };
      });

      const resolvedTeams = await Promise.all(teamPromises);
      const sortedTeams = resolvedTeams
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5);

      setTopTeams(sortedTeams);
    } catch (error) {
      console.error("Error fetching top teams:", error);
    }
  };

  const fetchOrgStats = async () => {
    const { start, end } = getCurrentPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      const organizations = {};
      reportsData.forEach(report => {
        const orgName = report.organisation;
        if (!organizations[orgName]) {
          organizations[orgName] = { totalSales: 0, reportCount: 0 };
        }
        organizations[orgName].totalSales += parseFloat(report.totalSales || 0);
        organizations[orgName].reportCount += 1;
      });

      const orgStats = Object.entries(organizations).map(([orgName, stats]) => ({
        orgName,
        totalSales: stats.totalSales,
        avgSales: stats.reportCount > 0 ? stats.totalSales / stats.reportCount : 0
      }));

      setOrgStats(orgStats);
    } catch (error) {
      console.error("Error fetching organization stats:", error);
    }
  };

  const fetchYesterdayStats = async () => {
    const { start, end } = getYesterdayPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      // Summera totalSales per managerName
      const teamStats = {};
      reportsData.forEach(report => {
        const team = report.managerName || 'Okänt team';
        if (!teamStats[team]) {
          teamStats[team] = 0;
        }
        teamStats[team] += parseFloat(report.totalSales || 0);
      });

      // Omvandla till array och sortera fallande
      const stats = Object.entries(teamStats).map(([team, totalSales]) => ({
        team,
        totalSales
      }));
      stats.sort((a, b) => b.totalSales - a.totalSales);

      setYesterdayStats(stats);
    } catch (error) {
      console.error("Error fetching yesterday's stats:", error);
    }
  };

  // Ny funktion: Hämtar gårdagens statistik per organisation
  const fetchYesterdayOrgStats = async () => {
    const { start, end } = getYesterdayPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      const organizations = {};
      reportsData.forEach(report => {
        const orgName = report.organisation || "Okänd organisation";
        if (!organizations[orgName]) {
          organizations[orgName] = 0;
        }
        organizations[orgName] += parseFloat(report.totalSales || 0);
      });

      const yesterdayOrgStats = Object.entries(organizations).map(([orgName, totalSales]) => ({
        orgName,
        totalSales,
      }));
      yesterdayOrgStats.sort((a, b) => b.totalSales - a.totalSales);

      setYesterdayOrgStats(yesterdayOrgStats);
    } catch (error) {
      console.error("Error fetching yesterday's organization stats:", error);
    }
  };

  return (
    <div className="dashboard-content">
      <h1 className="dashboard-title">Dashboard</h1>
      <button className="refresh-btn" onClick={fetchData}>Uppdatera Data</button>

      {loading ? (
        <p>Laddar...</p>
      ) : (
        <div className="dashboard-grid">
          <div className="total-sales-stats">
            <h2>Total Statistik</h2>
            <p><strong>Totalt antal Avtal:</strong> {totalSales}</p>
            <p><strong>Genomsnittlig Avtal per rapport:</strong> {averageSales.toFixed(2)}</p>
          </div>

          <div className="top-users">
            <h2>Top 10 Säljare</h2>
            <ul>
              {topUsers.map((user, index) => (
                <li key={index}>
                  {index + 1}. {user.userName}: {user.totalSales} Avtal
                </li>
              ))}
            </ul>
          </div>

          <div className="top-sales-managers">
            <h2>Bästa Team</h2>
            <ul>
              {topTeams.map((team, index) => (
                <li key={index}>
                  {index + 1}. {team.managerName}: {team.totalSales} Avtal
                </li>
              ))}
            </ul>
          </div>

          <div className="org-sales-stats">
            <h2>Organisation Statistik</h2>
            <ul>
              {orgStats.map((org, index) => (
                <li key={index}>
                  {index + 1}. {org.orgName}: {org.totalSales} Avtal (Genomsnitt: {org.avgSales.toFixed(2)})
                </li>
              ))}
            </ul>
          </div>

          <div className="yesterday-stats">
            <h2>Gårdagens Statistik</h2>
            <ul>
              {yesterdayStats.map((stat, index) => (
                <li key={index}>
                  {index + 1}. {stat.team}: {stat.totalSales} Avtal
                </li>
              ))}
            </ul>
          </div>

          <div className="yesterday-org-stats">
            <h2>Gårdagens Statistiska Organisationer</h2>
            <ul>
              {yesterdayOrgStats.map((org, index) => (
                <li key={index}>
                  {index + 1}. {org.orgName}: {org.totalSales} Avtal
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;