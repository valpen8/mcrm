import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/SalesManagerDashboard.css';

const SalesManagerDashboard = () => {
  const [userReports, setUserReports] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [averageSales, setAverageSales] = useState(0);
  const [totalTeamSales, setTotalTeamSales] = useState(0);
  const [averageTeamSales, setAverageTeamSales] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [yesterdayStats, setYesterdayStats] = useState([]);
  const [yesterdayOrgStats, setYesterdayOrgStats] = useState([]); // Ny state
  const [loading, setLoading] = useState(true);
  const [teamPercentageChange, setTeamPercentageChange] = useState(0);
  
  // === NYTT: State för slutrapporter ===
  const [finalReportsStatus, setFinalReportsStatus] = useState([]);
  // === SLUT NYTT ===

  const { currentUser } = useAuth();

  // Returnerar start och slut för nuvarande period (18:e → 17:e)
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

  // Returnerar datumintervall för "igår"
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

  // Beräknar antal dagar som gått i nuvarande period
  const getDaysElapsedInCurrentPeriod = (currentStart, currentEnd) => {
    const today = new Date();
    const effectiveToday = today > currentEnd ? currentEnd : today;
    if (effectiveToday < currentStart) return 0;
    const diffTime = effectiveToday.getTime() - currentStart.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Hjälpfunktion för att hämta partiell försäljning för en teammedlem
  const fetchPartialSalesForTeamMember = async (userId, startDate, endDate) => {
    const reportsQuery = query(
      collection(db, `users/${userId}/reports`),
      where('date', '>=', startDate.toISOString()),
      where('date', '<=', endDate.toISOString())
    );
    const reportsSnapshot = await getDocs(reportsQuery);
    const total = reportsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + parseFloat(data.sales || 0);
    }, 0);
    return total;
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchReports(),
      fetchTeamData(),
      fetchTopUsers(),
      fetchTopTeams(),
      fetchYesterdayStats(),
      fetchYesterdayOrgStats(), // Lagt till här
      fetchFinalReportsStatus()   // Hämtar slutrapporter-status med datum
    ]);
    setLoading(false);
  };

  // Hämtar gårdagens data från finalReports
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

      // Gruppera efter managerName
      const teamStats = {};
      reportsData.forEach(report => {
        const team = report.managerName || 'Okänt team';
        if (!teamStats[team]) {
          teamStats[team] = 0;
        }
        teamStats[team] += parseFloat(report.totalSales || 0);
      });

      const statsArray = Object.entries(teamStats).map(([team, totalSales]) => ({
        team,
        totalSales,
      }));
      statsArray.sort((a, b) => b.totalSales - a.totalSales);
      setYesterdayStats(statsArray);
    } catch (error) {
      console.error("Error fetching yesterday's stats:", error);
    }
  };

  // Hämtar gårdagens organisationsstatistik
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
      const orgStats = Object.entries(organizations).map(([orgName, totalSales]) => ({
        orgName,
        totalSales,
      }));
      orgStats.sort((a, b) => b.totalSales - a.totalSales);
      setYesterdayOrgStats(orgStats);
    } catch (error) {
      console.error("Error fetching yesterday's organization stats:", error);
    }
  };

  // Hämtar inloggad användares rapporter
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

  // Hämtar data för hela teamet
  const fetchTeamData = async () => {
    if (!currentUser) return;
    const { start, end } = getCurrentPeriod();
    try {
      const teamQuery = query(collection(db, 'users'), where('managerUid', '==', currentUser.uid));
      const teamSnapshot = await getDocs(teamQuery);

      const teamData = await Promise.all(
        teamSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;
          const userName = `${userDoc.data().firstName} ${userDoc.data().lastName}`;
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
          return { userId, userName, totalSales };
        })
      );

      const totalSalesForTeam = teamData.reduce((sum, member) => sum + member.totalSales, 0);
      const averageSalesForTeam = teamData.length > 0 ? totalSalesForTeam / teamData.length : 0;
      setTeamMembers(teamData);
      setTotalTeamSales(totalSalesForTeam);
      setAverageTeamSales(averageSalesForTeam);

      const daysElapsed = getDaysElapsedInCurrentPeriod(start, end);
      const partialEndCurrent = new Date(start.getTime() + (daysElapsed * 24 * 60 * 60 * 1000));
      if (partialEndCurrent > end) {
        partialEndCurrent.setTime(end.getTime());
      }
      partialEndCurrent.setHours(23, 59, 59, 999);

      const previousStart = new Date(start);
      previousStart.setMonth(previousStart.getMonth() - 1);
      const previousEnd = new Date(end);
      previousEnd.setMonth(previousEnd.getMonth() - 1);
      const partialEndPrevious = new Date(previousStart.getTime() + (daysElapsed * 24 * 60 * 60 * 1000));
      if (partialEndPrevious > previousEnd) {
        partialEndPrevious.setTime(previousEnd.getTime());
      }
      partialEndPrevious.setHours(23, 59, 59, 999);

      const partialSalesPromises = teamData.map(async (member) => {
        const currentPartial = await fetchPartialSalesForTeamMember(member.userId, start, partialEndCurrent);
        const previousPartial = await fetchPartialSalesForTeamMember(member.userId, previousStart, partialEndPrevious);
        return { currentPartial, previousPartial };
      });
      const partialSalesResults = await Promise.all(partialSalesPromises);
      const currentPartialTeamSales = partialSalesResults.reduce((sum, r) => sum + r.currentPartial, 0);
      const previousPartialTeamSales = partialSalesResults.reduce((sum, r) => sum + r.previousPartial, 0);
      
      let change = 0;
      if (previousPartialTeamSales > 0) {
        change = ((currentPartialTeamSales - previousPartialTeamSales) / previousPartialTeamSales) * 100;
      }
      setTeamPercentageChange(change);

    } catch (error) {
      console.error("Error fetching team data:", error);
    }
  };

  // Hämtar topp 10 användare
  const fetchTopUsers = async () => {
    const { start, end } = getCurrentPeriod();
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
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

  // Hämtar topp 5 team
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
        const managerName = managerData
          ? `${managerData.firstName} ${managerData.lastName}`
          : managerId;
        return { managerId, managerName, totalSales };
      });
      const resolvedTeams = await Promise.all(teamPromises);
      const sortedTeams = resolvedTeams.sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
      setTopTeams(sortedTeams);
    } catch (error) {
      console.error("Error fetching top teams:", error);
    }
  };

  // Hämtar organisationsstatistik
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

  // === Uppdaterad fetchFinalReportsStatus ===
  // Hämtar ALLA sales managers från "users" där role är "sales-manager", oavsett om de lämnat in en rapport igår.
  // Markerar med grönt om de har rapporterat igår, annars rött kryss.
  const fetchFinalReportsStatus = async () => {
    const { start, end } = getYesterdayPeriod();
    try {
      // Hämta alla rapporter från igår
      const yesterdaySnapshot = await getDocs(collection(db, 'finalReports'));
      const yesterdayData = yesterdaySnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });
      
      // Skapa en karta: managerUid -> rapportdatum från igår
      const reportedReportsMap = new Map();
      yesterdayData.forEach(report => {
        reportedReportsMap.set(report.managerUid, report.date);
      });
      
      // Hämta alla sales managers från "users" med role "sales-manager"
      const salesManagersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'sales-manager')
      );
      const salesManagersSnapshot = await getDocs(salesManagersQuery);
      const salesManagers = salesManagersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          managerId: doc.id,
          managerName: `${data.firstName} ${data.lastName}`,
          reportedYesterday: reportedReportsMap.has(doc.id),
          reportDate: reportedReportsMap.get(doc.id) || null
        };
      });
      setFinalReportsStatus(salesManagers);
    } catch (error) {
      console.error("Error fetching final report status:", error);
    }
  };
  // === SLUT Uppdaterad fetchFinalReportsStatus ===

  const { start: currentStart, end: currentEnd } = getCurrentPeriod();
  const totalDaysInPeriod = Math.floor((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = getDaysElapsedInCurrentPeriod(currentStart, currentEnd);
  const timeProgress = totalDaysInPeriod > 0 ? (daysElapsed / totalDaysInPeriod) * 100 : 0;

  return (
    <div className="sales-manager-dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <button className="refresh-btn" onClick={fetchData}>Uppdatera Data</button>

      {loading ? (
        <p>Laddar...</p>
      ) : (
        <>
          {/* TEAM STATISTIK-BOX */}
          <div className="team-sales-stats" style={{ position: 'relative' }}>
            <h2>Team Statistik</h2>
            <div 
              className="percentage-indicator"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              {teamPercentageChange > 0 && (
                <span style={{ color: 'green' }}>
                  ▲ {teamPercentageChange.toFixed(2)}%
                </span>
              )}
              {teamPercentageChange < 0 && (
                <span style={{ color: 'red' }}>
                  ▼ {Math.abs(teamPercentageChange).toFixed(2)}%
                </span>
              )}
              {teamPercentageChange === 0 && <span>0%</span>}
            </div>
            <p><strong>Totalt antal avtal för teamet:</strong> {totalTeamSales}</p>
            <p><strong>Genomsnittlig försäljning per medlem:</strong> {averageTeamSales.toFixed(2)}</p>
          </div>

          {/* Mina försäljningsstatistik */}
          <div className="my-sales-stats">
            <h2>Mina försäljningsstatistik</h2>
            <p><strong>Totalt antal avtal:</strong> {totalSales}</p>
            <p><strong>Genomsnittlig avtal per rapport:</strong> {averageSales.toFixed(2)}</p>
          </div>

          {/* TOP 10 SÄLJARE */}
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

          {/* BÄSTA TEAM */}
          <div className="top-sales-managers">
            <h2>Bästa team</h2>
            <ul>
              {topTeams.map((team, index) => (
                <li 
                  key={index}
                  onClick={() => team.totalSales > 0 && openModal(team.managerId, team.managerName)}
                  style={{ cursor: team.totalSales > 0 ? 'pointer' : 'default' }}
                >
                  {index + 1}. {team.managerName}: {team.totalSales} avtal
                </li>
              ))}
            </ul>
          </div>

          {/* GÅRDAGENS STATISTIK */}
          <div className="yesterday-stats">
            <h2>Gårdagens Statistik</h2>
            <ul>
              {yesterdayStats.map((stat, index) => (
                <li key={index}>
                  {index + 1}. {stat.team}: {stat.totalSales} avtal
                </li>
              ))}
            </ul>
          </div>

          {/* SLUTRAPPORTER */}
          <div className="final-reports">
            <h2>Slutrapporter</h2>
            <ul>
              {finalReportsStatus.map((manager, index) => (
                <li key={index}>
                  {manager.managerName}{' '}
                  {manager.reportedYesterday ? (
                    <span style={{ color: 'green' }}>
                      ✔️ {new Date(manager.reportDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ color: 'red' }}>❌</span>
                  )}
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