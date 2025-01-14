import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/Statistics.css';
import { useAuth } from '../auth';

const Statistics = () => {
  const [salesData, setSalesData] = useState([]);
  const [finalReports, setFinalReports] = useState([]);
  const [qualityReportsData, setQualityReportsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [salespersons, setSalespersons] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [dataSource, setDataSource] = useState('salesSpecification');
  const [managers, setManagers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalSales, setTotalSales] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);

  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        console.log("Ingen inloggad användare");
        return;
      }

      try {
        const usersQuerySnapshot = await getDocs(collection(db, 'users'));
        const usersDataArray = usersQuerySnapshot.docs.map(doc => {
          const userData = doc.data();
          return { id: doc.id, ...userData };
        });

        const salesManagers = usersDataArray.filter(user => user.role === 'sales-manager');
        setManagers(salesManagers);

        const salesSpecificationsArray = usersDataArray.flatMap(userData => {
          const salesSpecifications = userData.salesSpecifications || {};
          const extractedSpecifications = Object.entries(salesSpecifications).map(([period, details]) => ({
            period,
            totalApproved: details.totalApproved || 0,
            salesperson: `${userData.firstName} ${userData.lastName}`,
            salesId: userData.salesId,
            managerUid: userData.managerUid,
            date: period,
            type: 'Sales Specification',
          }));
          return extractedSpecifications;
        });

        const finalReportsQuerySnapshot = await getDocs(collection(db, 'finalReports'));
        const finalReportsArray = finalReportsQuerySnapshot.docs.flatMap(doc => {
          const data = doc.data();
          const reportId = doc.id;
          return Object.keys(data.salesData || {}).map(salesId => ({
            ...data.salesData[salesId],
            date: data.date,
            reportId: reportId,
            managerUid: data.managerUid,
            location: data.location || 'N/A',
            organisation: data.organisation || 'N/A',
            type: 'Final Report',
          }));
        });

        // Hämta kvalitetsrapporter
        const qualityReportsSnapshot = await getDocs(collection(db, 'qualityReports'));
        const qualityReportsArray = qualityReportsSnapshot.docs.flatMap(doc => {
          const data = doc.data();
          const reportId = doc.id;
          const date = data.date;
          const organisation = data.organisation || 'N/A';
          const managerUid = data.managerUid || ''; // Se till att managerUid är inkluderad
          const members = data.members || {};
          return Object.entries(members).map(([memberId, memberData]) => ({
            reportId,
            date,
            organisation,
            teamMember: memberData.name || 'N/A',
            salesId: memberData.salesId || 'N/A',
            regSales: memberData.regSales || 0,
            invalidAmount: memberData.invalidAmount || 0,
            outOfTarget: memberData.outOfTarget || 0,
            pending: memberData.pending || 0,
            total: memberData.total || 0,
            managerUid: managerUid, // Lägg till managerUid här
            assignedTo: data.assignedTo || [],
            type: 'Quality Report',
          }));
        });
        setQualityReportsData(qualityReportsArray);

        const periodsSet = new Set(salesSpecificationsArray.map(spec => spec.period));
        setPeriods([...periodsSet]);

        setSalesData(salesSpecificationsArray);
        setFinalReports(finalReportsArray);

        const salespersonsSet = new Set(
          [...salesSpecificationsArray, ...finalReportsArray, ...qualityReportsArray].map(
            data => data.name || data.salesperson || data.teamMember
          )
        );
        setSalespersons([...salespersonsSet]);

        const statusSet = new Set(finalReportsArray.map(item => item.status).filter(Boolean));
        setStatusOptions([...statusSet]);

        setFilteredData(salesSpecificationsArray);
        calculateTotalSales(salesSpecificationsArray);
      } catch (error) {
        console.error("Fel vid hämtning av data:", error);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleFilterChange = () => {
    let filtered;
    if (dataSource === 'salesSpecification') {
      filtered = [...salesData];
    } else if (dataSource === 'finalReport') {
      filtered = [...finalReports];
    } else if (dataSource === 'kvalité') {
      filtered = [...qualityReportsData];
    }

    if (selectedManager) {
      if (dataSource === 'kvalité') {
        // Filtrera baserat på managerUid
        filtered = filtered.filter(item => item.managerUid === selectedManager);
      } else {
        filtered = filtered.filter(item => item.managerUid === selectedManager);
      }
    }

    if (selectedSalesperson) {
      if (dataSource === 'kvalité') {
        filtered = filtered.filter(item => item.teamMember === selectedSalesperson);
      } else {
        filtered = filtered.filter(
          item => item.name === selectedSalesperson || item.salesperson === selectedSalesperson
        );
      }
    }

    if (selectedPeriod) filtered = filtered.filter(item => item.date === selectedPeriod);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    if (dataSource === 'finalReport' && selectedStatus) {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    setFilteredData(sortData(filtered));
    calculateTotalSales(filtered);
  };

  const calculateTotalSales = (data) => {
    const total = data.reduce((sum, item) => {
      const salesValue = item.totalApproved || item.sales || item.total || 0;
      return sum + parseFloat(salesValue);
    }, 0);
    setTotalSales(total);
  };

  const handleResetFilters = () => {
    setSelectedPeriod('');
    setSelectedSalesperson('');
    setSelectedManager('');
    setStartDate('');
    setEndDate('');
    setSelectedStatus('');
    let resetData;
    if (dataSource === 'salesSpecification') {
      resetData = salesData;
    } else if (dataSource === 'finalReport') {
      resetData = finalReports;
    } else if (dataSource === 'kvalité') {
      resetData = qualityReportsData;
    }
    setFilteredData(resetData);
    calculateTotalSales(resetData);
  };

  const sortData = (data) => {
    const sortedData = [...data];
    sortedData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedData;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setFilteredData(sortData(filteredData));
  };

  return (
    <div className="statistics-container">
      <h1>Admin Statistik</h1>

      <table className="filter-table">
        <tbody>
          <tr>
            <td><label htmlFor="data-source-select">Välj Datakälla:</label></td>
            <td>
              <select id="data-source-select" value={dataSource} onChange={(e) => {
                setDataSource(e.target.value);
                handleResetFilters(); // Återställ filter när datakällan ändras
              }}>
                <option value="salesSpecification">Säljspecifikation</option>
                <option value="finalReport">Slutrapport</option>
                <option value="kvalité">Kvalité</option>
              </select>
            </td>
            <td><label htmlFor="manager-select">Välj Försäljningschef:</label></td>
            <td>
              <select id="manager-select" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
                <option value="">Alla chefer</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td><label htmlFor="start-date">Startdatum:</label></td>
            <td><input type="date" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></td>
            <td><label htmlFor="end-date">Slutdatum:</label></td>
            <td><input type="date" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></td>
          </tr>
          <tr>
            <td><label htmlFor="period-select">Välj Period:</label></td>
            <td>
              <select id="period-select" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                <option value="">Alla perioder</option>
                {periods.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </td>
            <td><label htmlFor="salesperson-select">Välj Säljare:</label></td>
            <td>
              <select id="salesperson-select" value={selectedSalesperson} onChange={(e) => setSelectedSalesperson(e.target.value)}>
                <option value="">Alla</option>
                {salespersons.map(salesperson => (
                  <option key={salesperson} value={salesperson}>{salesperson}</option>
                ))}
              </select>
            </td>
          </tr>
          {dataSource === 'finalReport' && (
            <tr>
              <td><label htmlFor="status-select">Välj Status:</label></td>
              <td>
                <select id="status-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="">Alla</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </td>
              <td></td>
              <td></td>
            </tr>
          )}
          <tr>
            <td colSpan="4" style={{ textAlign: 'center' }}>
              <button className="filter-button" onClick={handleFilterChange}>Filtrera</button>
              <button className="reset-button" onClick={handleResetFilters}>Nollställ</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="total-sales">
        <h3>Totalt Försäljning: {totalSales}</h3>
      </div>

      <div className="table-container">
        <table className="statistics-table">
          <thead>
            <tr>
              {dataSource === 'kvalité' ? (
                <>
                  <th onClick={() => handleSort('date')}>
                    Datum {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Organisation</th>
                  <th>Teammedlem</th>
                  <th>Sales ID</th>
                  <th>Reg Sälj</th>
                  <th>Ogiltigt Belopp</th>
                  <th>Utanför målgrupp</th>
                  <th>Pending</th>
                  <th>Total</th>
                </>
              ) : (
                <>
                  <th>Säljare</th>
                  <th>{dataSource === 'finalReport' ? 'Sjuk Ledig' : 'Period'}</th>
                  <th onClick={() => handleSort('date')}>
                    Datum {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  {dataSource === 'finalReport' && <th>Organisation</th>}
                  <th>Försäljning</th>
                  <th>Typ</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={dataSource === 'kvalité' ? 9 : dataSource === 'finalReport' ? 6 : 5}>Ingen data tillgänglig</td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index}>
                  {dataSource === 'kvalité' ? (
                    <>
                      <td>{item.date || 'N/A'}</td>
                      <td>{item.organisation || 'N/A'}</td>
                      <td>{item.teamMember || 'N/A'}</td>
                      <td>{item.salesId || 'N/A'}</td>
                      <td>{item.regSales || 0}</td>
                      <td>{item.invalidAmount || 0}</td>
                      <td>{item.outOfTarget || 0}</td>
                      <td>{item.pending || 0}</td>
                      <td>{item.total || 0}</td>
                    </>
                  ) : (
                    <>
                      <td>{item.name || item.salesperson || 'N/A'}</td>
                      <td>{dataSource === 'finalReport' ? item.status || 'N/A' : item.period || 'N/A'}</td>
                      <td>{item.date || 'N/A'}</td>
                      {dataSource === 'finalReport' && <td>{item.organisation || 'N/A'}</td>}
                      <td>{item.totalApproved || item.sales || 'N/A'}</td>
                      <td>{item.type || 'Sales Specification'}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Statistics;