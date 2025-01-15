import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/SalesManagerDashboard.css';

const SalesManagerDashboard = () => {
  const [userReports, setUserReports] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [averageSales, setAverageSales] = useState(0);
  const [totalTeamSales, setTotalTeamSales] = useState(0);  // Total försäljning för teamet
  const [averageTeamSales, setAverageTeamSales] = useState(0);  // Genomsnittlig försäljning för teamet
  const [teamMembers, setTeamMembers] = useState([]); // Teammedlemmar med försäljning
  const [topUsers, setTopUsers] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [loading, setLoading] = useState(true); // Laddningsstatus
  const { currentUser } = useAuth();

  // Funktion för att räkna ut perioden mellan 18:e till 17:e
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
    setLoading(true); // Sätt till laddningsläge
    await Promise.all([fetchReports(), fetchTeamData(), fetchTopUsers(), fetchTopTeams()]);
    setLoading(false); // Avsluta laddningsläge
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

  // Hämtar statistik för hela teamet
  const fetchTeamData = async () => {
    if (!currentUser) return;
    const { start, end } = getCurrentPeriod();

    try {
      // Hämta alla teammedlemmar (användare som manager hanterar)
      const teamQuery = query(collection(db, 'users'), where('managerUid', '==', currentUser.uid));
      const teamSnapshot = await getDocs(teamQuery);

      const teamData = await Promise.all(
        teamSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;
          const userName = `${userDoc.data().firstName} ${userDoc.data().lastName}`;

          // Hämta rapporter för varje teammedlem
          const reportsQuery = query(
            collection(db, `users/${userId}/reports`),
            where('date', '>=', start.toISOString()),
            where('date', '<=', end.toISOString())
          );
          const reportsSnapshot = await getDocs(reportsQuery);

          // Summera försäljningen för varje medlem
          const totalSales = reportsSnapshot.docs.reduce((sum, report) => {
            const reportData = report.data();
            return sum + parseFloat(reportData.sales || 0);
          }, 0);

          return { userName, totalSales };
        })
      );

      // Summera total försäljning för hela teamet
      const totalSalesForTeam = teamData.reduce((sum, member) => sum + member.totalSales, 0);
      const averageSalesForTeam = teamData.length > 0 ? totalSalesForTeam / teamData.length : 0;

      setTeamMembers(teamData);
      setTotalTeamSales(totalSalesForTeam);
      setAverageTeamSales(averageSalesForTeam);
    } catch (error) {
      console.error("Error fetching team data:", error);
    }
  };

  const fetchTopUsers = async () => {
    const { start, end } = getCurrentPeriod();
    try {
      // Hämta alla användare
      const usersSnapshot = await getDocs(collection(db, 'users'));
  
      const allUsers = usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userName = `${userData.firstName} ${userData.lastName}`;
  
        // Hämta rapporter för varje användare
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
  
      // Vänta tills alla användares data är hämtad och bearbetad
      const resolvedUsers = await Promise.all(allUsers);
  
      // Sortera användarna efter total försäljning och välj topp 10
      const topUsers = resolvedUsers
        .filter(user => user.totalSales > 0) // Exkludera användare med noll försäljning
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
    <div className="sales-manager-dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <button className="refresh-btn" onClick={fetchData}>Uppdatera Data</button>

      {loading ? (
        <p>Laddar...</p>
      ) : (
        <>
          <div className="team-sales-stats">
            <h2>Team Statistik</h2>
            <p><strong>Totalt antal avtal för teamet:</strong> {totalTeamSales}</p>
            <p><strong>Genomsnittlig försäljning per medlem:</strong> {averageTeamSales.toFixed(2)}</p>
          </div>

          <div className="my-sales-stats">
            <h2>Mina försäljningsstatistik</h2>
            <p><strong>Totalt antal avtal:</strong> {totalSales}</p>
            <p><strong>Genomsnittlig avtal per rapport:</strong> {averageSales.toFixed(2)}</p>
          </div>

          <div className="top-users">
            <h2>Top 10 säljare</h2>
            <ul>
              {topUsers.map((user, index) => (
                <li key={index}>
                  {index + 1}. {user.userName}: {user.totalSales} avtal
                </li>
              ))}
            </ul>
          </div>

          <div className="top-sales-managers">
            <h2>Bästa team </h2>
            <ul>
              {topTeams.map((team, index) => (
                <li key={index}>
                  {index + 1}. {team.managerName}: {team.totalSales} avtal
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesManagerDashboard;