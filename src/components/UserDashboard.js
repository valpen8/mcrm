import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/UserDashboard.css'; // Förutsätter att du har lagt in den nya CSS-koden i denna fil

const UserDashboard = () => {
  const [userReports, setUserReports] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [averageSales, setAverageSales] = useState(0);
  const [topUsers, setTopUsers] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

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

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchReports(), fetchTopUsers(), fetchTopTeams()]);
    setLoading(false);
  };

  const fetchReports = async () => {
    if (!currentUser) return;
    const { start, end } = getCurrentPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, `users/${currentUser.uid}/reports`));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      const total = reportsData.reduce((sum, report) => sum + parseFloat(report.sales || 0), 0);
      const avg = reportsData.length > 0 ? total / reportsData.length : 0;

      setUserReports(reportsData);
      setTotalSales(total);
      setAverageSales(avg);
    } catch (error) {
      console.error("Error fetching user reports:", error);
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

        const reportsQueryRef = query(
          collection(db, `users/${userId}/reports`),
          where('date', '>=', start.toISOString()),
          where('date', '<=', end.toISOString())
        );
        const reportsSnapshot = await getDocs(reportsQueryRef);
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
      for (const data of reportsData) {
        const managerId = data.managerUid;
        if (!teams[managerId]) {
          teams[managerId] = 0;
        }
        teams[managerId] += parseFloat(data.totalSales || 0);
      }

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

  return (
    <div className="dashboard-content"> 
      {/* Huvudcontainer enligt din nya CSS-klasser */}

      <h1 className="dashboard-title">My Sales Dashboard</h1>

      <button className="refresh-btn" onClick={fetchData}>
        {loading ? 'Laddar...' : 'Uppdatera Data'}
      </button>

      {loading ? (
        <p>Laddar...</p> 
      ) : (
        <div className="dashboard-grid">
          {/* Grid-layout för dina sektioner */}

          <div className="total-sales-stats">
            <h2>Mina försäljningsstatistik</h2>
            <p><strong>Totalt antal Avtal:</strong> {totalSales}</p>
            <p><strong>Genomsnittlig Avtal per rapport:</strong> {averageSales.toFixed(2)}</p>
          </div>

          <div className="top-users">
            <h2>Top 10 säljare</h2>
            <ul>
              {topUsers.map((user, index) => (
                <li key={index}>
                  {index + 1}. {user.userName}: {user.totalSales} Avtal
                </li>
              ))}
            </ul>
          </div>

          <div className="top-sales-managers">
            <h2>Bästa team (Sales Managers)</h2>
            <ul>
              {topTeams.map((team, index) => (
                <li key={index}>
                  {index + 1}. {team.managerName}: {team.totalSales} Avtal
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;