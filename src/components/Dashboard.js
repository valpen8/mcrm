import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/Dashboard.css';

const Dashboard = () => {
  // Befintliga states
  const [totalSales, setTotalSales] = useState(0);
  const [averageSales, setAverageSales] = useState(0);
  const [topUsers, setTopUsers] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [orgStats, setOrgStats] = useState([]);
  const [yesterdayStats, setYesterdayStats] = useState([]);
  const [yesterdayOrgStats, setYesterdayOrgStats] = useState([]);
  const [finalReportsStatus, setFinalReportsStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  // För försäljningsjämförelse (procentindikator)
  const [partialSales, setPartialSales] = useState(0);
  const [previousPartialSales, setPreviousPartialSales] = useState(0);
  const [percentageChange, setPercentageChange] = useState(0);

  // --- Popup-state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ sellers: [], totalSales: 0 });
  const [modalManagerName, setModalManagerName] = useState('');
  // --- SLUT Popup-state ---

  // --- Ny dropdown för att välja datum (för slutrapporter) ---
  const [availableReportDates, setAvailableReportDates] = useState([]);
  const [selectedReportDate, setSelectedReportDate] = useState("");
  // --- SLUT Ny dropdown ---

  // --- Ny state för aktiva säljare under period ---
  // Vi sparar här både säljarnamn och vilken sales manager de tillhör.
  const [activeSellerStartDate, setActiveSellerStartDate] = useState('');
  const [activeSellerEndDate, setActiveSellerEndDate] = useState('');
  const [activeSellers, setActiveSellers] = useState([]);
  // --- SLUT Ny state ---

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

  // Beräknar antal dagar som gått i nuvarande period (18:e → i dag, eller 17:e om perioden redan är slut)
  const getDaysElapsedInCurrentPeriod = (currentStart, currentEnd) => {
    const today = new Date();
    const effectiveToday = today > currentEnd ? currentEnd : today;
    if (effectiveToday < currentStart) return 0;
    const diffTime = effectiveToday.getTime() - currentStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Hämta total försäljning mellan två datum
  const fetchPartialSales = async (startDate, endDate) => {
    const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
    const reportsData = reportsSnapshot.docs
      .map(doc => doc.data())
      .filter(report => {
        const reportDate = new Date(report.date);
        return reportDate >= startDate && reportDate <= endDate;
      });
    const total = reportsData.reduce((sum, report) => {
      return sum + parseFloat(report.totalSales || 0);
    }, 0);
    return total;
  };

  // Hämtar unika datum från finalRapporter och sätter availableReportDates
  const fetchAvailableReportDates = async () => {
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const dates = reportsSnapshot.docs.map(doc => doc.data().date);
      const uniqueDates = [...new Set(dates)];
      // Sortera så att senaste datumet kommer först (förväntat format "YYYY-MM-DD")
      uniqueDates.sort((a, b) => b.localeCompare(a));
      setAvailableReportDates(uniqueDates);
      if (!selectedReportDate && uniqueDates.length > 0) {
        setSelectedReportDate(uniqueDates[0]);
      }
    } catch (error) {
      console.error("Error fetching available report dates:", error);
    }
  };

  // Kör fetchAvailableReportDates en gång vid första renderingen
  useEffect(() => {
    fetchAvailableReportDates();
  }, []);

  // Hämta all övrig data (utom slutrapporter)
  useEffect(() => {
    fetchData();
  }, []);

  // När endast datumet ändras, uppdateras endast listan med slutrapporter
  useEffect(() => {
    if (selectedReportDate) {
      fetchFinalReportsStatus();
    }
  }, [selectedReportDate]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTotalSales(),
      fetchTopUsers(),
      fetchTopTeams(),
      fetchOrgStats(),
      fetchYesterdayStats(),
      fetchYesterdayOrgStats()
      // Notera: fetchFinalReportsStatus körs separat vid datumändring
    ]);
    setLoading(false);
  };

  // Hämtar total försäljning, partiell försäljning och procentuell skillnad
  const fetchTotalSales = async () => {
    const { start: currentStart, end: currentEnd } = getCurrentPeriod();
    try {
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= currentStart && reportDate <= currentEnd;
        });
      const total = reportsData.reduce((sum, report) => sum + parseFloat(report.totalSales || 0), 0);
      const avg = reportsData.length > 0 ? total / reportsData.length : 0;
      setTotalSales(total);
      setAverageSales(avg);

      const daysElapsed = getDaysElapsedInCurrentPeriod(currentStart, currentEnd);
      const partialEndCurrent = new Date(currentStart.getTime() + (daysElapsed * 24 * 60 * 60 * 1000));
      if (partialEndCurrent > currentEnd) {
        partialEndCurrent.setTime(currentEnd.getTime());
      }
      partialEndCurrent.setHours(23, 59, 59, 999);
      const currentPartial = await fetchPartialSales(currentStart, partialEndCurrent);
      setPartialSales(currentPartial);

      const previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
      const previousEnd = new Date(currentEnd);
      previousEnd.setMonth(previousEnd.getMonth() - 1);
      const partialEndPrevious = new Date(previousStart.getTime() + (daysElapsed * 24 * 60 * 60 * 1000));
      if (partialEndPrevious > previousEnd) {
        partialEndPrevious.setTime(previousEnd.getTime());
      }
      partialEndPrevious.setHours(23, 59, 59, 999);
      const prevPartial = await fetchPartialSales(previousStart, partialEndPrevious);
      setPreviousPartialSales(prevPartial);

      let change = 0;
      if (prevPartial > 0) {
        change = ((currentPartial - prevPartial) / prevPartial) * 100;
      }
      setPercentageChange(change);
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
        return { managerId, managerName, totalSales };
      });
      const resolvedTeams = await Promise.all(teamPromises);
      const sortedTeams = resolvedTeams.sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
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
      const teamStats = {};
      reportsData.forEach(report => {
        const team = report.managerName || 'Okänt team';
        if (!teamStats[team]) {
          teamStats[team] = 0;
        }
        teamStats[team] += parseFloat(report.totalSales || 0);
      });
      const stats = Object.entries(teamStats).map(([team, totalSales]) => ({
        team,
        totalSales,
      }));
      stats.sort((a, b) => b.totalSales - a.totalSales);
      setYesterdayStats(stats);
    } catch (error) {
      console.error("Error fetching yesterday's stats:", error);
    }
  };

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

  // === Uppdaterad fetchFinalReportsStatus ===
  // Hämtar ALLA sales managers från "users" med role "sales-manager", oavsett om de lämnat in en rapport för det valda datumet.
  // Om en manager lämnar in flera rapporter sparas alla i en array i egenskapen "reports".
  const fetchFinalReportsStatus = async () => {
    try {
      // Hämta alla rapporter från finalReports med datum som matchar selectedReportDate
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(report => report.date === selectedReportDate);
      
      // Gruppera rapporterna per managerUid – varje manager får en array med rapporter
      const reportsByManager = {};
      reportsData.forEach(report => {
        if (!reportsByManager[report.managerUid]) {
          reportsByManager[report.managerUid] = [];
        }
        reportsByManager[report.managerUid].push(report);
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
          reports: reportsByManager[doc.id] || []
        };
      });
      setFinalReportsStatus(salesManagers);
    } catch (error) {
      console.error("Error fetching final report status:", error);
    }
  };
  // === SLUT Uppdaterad fetchFinalReportsStatus ===

  // === Funktion för att hämta aktiva säljare under en vald period ===
  // Här sparar vi inte bara säljarnamnet utan även vilken sales manager de tillhör.
  const fetchActiveSellers = async () => {
    try {
      if (!activeSellerStartDate || !activeSellerEndDate) {
        console.error("Båda datum måste väljas");
        return;
      }
      
      // Konvertera datumsträngarna till Date-objekt
      const start = new Date(activeSellerStartDate);
      const end = new Date(activeSellerEndDate);
      end.setHours(23, 59, 59, 999);
      
      // Hämta alla rapporter från finalReports
      const reportsSnapshot = await getDocs(collection(db, 'finalReports'));
      const reportsData = reportsSnapshot.docs
        .map(doc => doc.data())
        .filter(report => {
          const reportDate = new Date(report.date);
          return reportDate >= start && reportDate <= end;
        });

      // Använd en Map för att spara unika säljare tillsammans med tillhörande sales manager
      const sellersMap = new Map();
      reportsData.forEach(report => {
        if (report.salesData) {
          Object.values(report.salesData).forEach(seller => {
            if (seller.name) {
              if (!sellersMap.has(seller.name)) {
                sellersMap.set(seller.name, {
                  sellerName: seller.name,
                  managerName: report.managerName,
                  managerUid: report.managerUid
                });
              }
            }
          });
        }
      });
      
      setActiveSellers(Array.from(sellersMap.values()));
    } catch (error) {
      console.error("Error fetching active sellers:", error);
    }
  };

  // === Popup: Öppna modal med säljarinformation från finalrapport(er) för en sales manager ===
  const openModal = async (managerId, managerName) => {
    try {
      // Hämta alla rapporter från finalReports för den specifika managern och det valda datumet
      const reportQuery = query(
        collection(db, 'finalReports'),
        where('managerUid', '==', managerId),
        where('date', '==', selectedReportDate)
      );
      const reportSnapshot = await getDocs(reportQuery);
      const reports = reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModalData(reports);
      setModalManagerName(managerName);
      setModalOpen(true);
    } catch (error) {
      console.error("Error fetching report details:", error);
    }
  };
  // === SLUT Popup ===

  const { start: currentStart, end: currentEnd } = getCurrentPeriod();
  const totalDaysInPeriod = Math.floor((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = getDaysElapsedInCurrentPeriod(currentStart, currentEnd);
  const timeProgress = totalDaysInPeriod > 0 ? (daysElapsed / totalDaysInPeriod) * 100 : 0;

  return (
    <div className="dashboard-content">
      <h1 className="dashboard-title">Dashboard</h1>
      <button className="refresh-btn" onClick={fetchData}>Uppdatera Data</button>
      {loading ? (
        <p>Laddar...</p>
      ) : (
        <div className="dashboard-grid">
          {/* TOTAL SALES-STATS */}
          <div className="total-sales-stats" style={{ position: 'relative' }}>
            <h2>Total Statistik</h2>
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
              {percentageChange > 0 && (
                <span style={{ color: 'green' }}>
                  ▲ {percentageChange.toFixed(2)}%
                </span>
              )}
              {percentageChange < 0 && (
                <span style={{ color: 'red' }}>
                  ▼ {Math.abs(percentageChange).toFixed(2)}%
                </span>
              )}
              {percentageChange === 0 && <span>0%</span>}
            </div>
            <p><strong>Totalt antal Avtal:</strong> {totalSales}</p>
            <p><strong>Genomsnittlig Avtal per rapport:</strong> {averageSales.toFixed(2)}</p>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${timeProgress.toFixed(1)}%` }} />
            </div>
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
                <li key={index}
                    onClick={() => team.totalSales > 0 && openModal(team.managerId, team.managerName)}
                    style={{ cursor: team.totalSales > 0 ? 'pointer' : 'default' }}>
                  {index + 1}. {team.managerName}: {team.totalSales} avtal
                </li>
              ))}
            </ul>
          </div>

          {/* ORG STATS */}
          <div className="org-sales-stats">
            <h2>Organisation Statistik</h2>
            <ul>
              {orgStats.map((org, index) => (
                <li key={index}>
                  {index + 1}. {org.orgName}: {org.totalSales} avtal 
                  (Genomsnitt: {org.avgSales.toFixed(2)})
                </li>
              ))}
            </ul>
          </div>

          {/* YESTERDAY STATS */}
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

          {/* YESTERDAY ORG STATS */}
          <div className="yesterday-org-stats">
            <h2>Gårdagens Statistiska Organisationer</h2>
            <ul>
              {yesterdayOrgStats.map((org, index) => (
                <li key={index}>
                  {index + 1}. {org.orgName}: {org.totalSales} avtal
                </li>
              ))}
            </ul>
          </div>

          {/* Slutrapporter: Dropdown och lista */}
          <div className="final-reports">
            <div className="report-date-dropdown" style={{ marginBottom: '10px', textAlign: 'center' }}>
              <label htmlFor="reportDate">Välj datum: </label>
              <select
                id="reportDate"
                value={selectedReportDate}
                onChange={(e) => setSelectedReportDate(e.target.value)}
              >
                {availableReportDates.map((date, idx) => (
                  <option key={idx} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <h2>Slutrapporter</h2>
            <ul>
              {finalReportsStatus.map((manager, index) => (
                <li key={index}
                    onClick={() => openModal(manager.managerId, manager.managerName)}
                    style={{ cursor: 'pointer' }}>
                  {manager.managerName}{' '}
                  {(manager.reports || []).length > 0 ? (
                    <span style={{ color: 'green' }}>
                      ✔️ {new Date(manager.reports[0].date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ color: 'red' }}>❌</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* --- Nytt avsnitt för Aktiva säljare under period --- */}
          <div className="active-sellers">
            <h2>Aktiva säljare under period</h2>
            <div className="date-picker-container">
              <label htmlFor="activeSellerStartDate">Startdatum: </label>
              <input
                type="date"
                id="activeSellerStartDate"
                value={activeSellerStartDate}
                onChange={(e) => setActiveSellerStartDate(e.target.value)}
              />
              <label htmlFor="activeSellerEndDate">Slutdatum: </label>
              <input
                type="date"
                id="activeSellerEndDate"
                value={activeSellerEndDate}
                onChange={(e) => setActiveSellerEndDate(e.target.value)}
              />
              <button onClick={fetchActiveSellers}>Hämta aktiva säljare</button>
              <button onClick={() => setActiveSellers([])}>Rensa</button>
            </div>
            <ul>
              {activeSellers.length > 0 ? (
                activeSellers.map((seller, idx) => (
                  <li key={idx}>
                    {seller.sellerName} - {seller.managerName}
                  </li>
                ))
              ) : (
                <li>Inga aktiva säljare hittades under vald period.</li>
              )}
            </ul>
          </div>
          {/* --- SLUT nytt avsnitt --- */}
        </div>
      )}
      
      {/* Popup Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{modalManagerName} - Säljarinformation</h2>
            {modalData.length > 0 ? (
              modalData.map((report, idx) => (
                <div key={idx} className="report-item">
                  <p><strong>Datum:</strong> {new Date(report.date).toLocaleDateString()}</p>
                  <p><strong>Organisation:</strong> {report.organisation}</p>
                  <p><strong>Total försäljning:</strong> {report.totalSales}</p>
                  {report.salesData ? (
                    <ul>
                      {Object.values(report.salesData).map((seller, sIdx) => (
                        <li key={sIdx}>
                          {seller.name} – {seller.sales} avtal – Status: {seller.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Inga säljaruppgifter finns.</p>
                  )}
                </div>
              ))
            ) : (
              <p>Inga rapporter hittades.</p>
            )}
            <button className="refresh-btn" onClick={() => setModalOpen(false)}>Stäng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;