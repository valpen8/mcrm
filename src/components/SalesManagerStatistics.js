import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/SalesManagerStatistics.css';

const SalesManagerStatistics = () => {
  const [reportType, setReportType] = useState('Final Report'); // Vald rapporttyp
  const [finalReports, setFinalReports] = useState([]);
  const [qualityReports, setQualityReports] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [salespersons, setSalespersons] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalSales, setTotalSales] = useState(0);

  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    fetchFinalReports();
    fetchQualityReports();
  }, [currentUser]);

  const fetchFinalReports = async () => {
    try {
      const finalReportsQuery = query(
        collection(db, 'finalReports'),
        where('managerUid', '==', currentUser.uid)
      );
      const finalReportsSnapshot = await getDocs(finalReportsQuery);
      const reportsArray = finalReportsSnapshot.docs.flatMap((doc) => {
        const data = doc.data();
        return Object.keys(data.salesData || {}).map(salesId => ({
          ...data.salesData[salesId],
          date: data.date,
          reportId: doc.id,
          location: data.location || 'N/A',
          managerName: data.managerName,
          status: data.salesData[salesId].status || 'N/A',
          organisation: data.organisation || 'N/A',
          type: 'Final Report',
        }));
      });

      setFinalReports(reportsArray);
    } catch (error) {
      console.error("Fel vid hämtning av slutrapporter:", error);
    }
  };

  const fetchQualityReports = async () => {
    try {
      const qualityReportsQuery = query(
        collection(db, 'qualityReports'),
        where('assignedTo', 'array-contains', currentUser.uid)
      );
      const qualityReportsSnapshot = await getDocs(qualityReportsQuery);
      const reportsArray = qualityReportsSnapshot.docs.flatMap((doc) => {
        const data = doc.data();
        return Object.keys(data.members || {}).map(memberId => ({
          ...data.members[memberId],
          date: data.date,
          reportId: doc.id,
          organisation: data.organisation || 'N/A',
          teamMember: `${data.members[memberId].name || 'N/A'}`,
          salesId: data.members[memberId].salesId || 'N/A',
          regSales: data.members[memberId].regSales || 0,
          invalidAmount: data.members[memberId].invalidAmount || 0,
          outOfTarget: data.members[memberId].outOfTarget || 0,
          pending: data.members[memberId].pending || 0,
          total: data.members[memberId].total || 0,
          type: 'Quality',
        }));
      });

      setQualityReports(reportsArray);
    } catch (error) {
      console.error("Fel vid hämtning av kvalitetsrapporter:", error);
    }
  };

  const handleFilterChange = () => {
    let reports = reportType === 'Final Report' ? finalReports : qualityReports;
    let filtered = [...reports];

    if (selectedSalesperson) {
      filtered = filtered.filter(item => item.name === selectedSalesperson || item.teamMember === selectedSalesperson);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    setFilteredData(filtered);
    calculateTotalSales(filtered);
  };

  const calculateTotalSales = (data) => {
    const total = data.reduce((sum, item) => {
      const salesValue = item.sales || item.regSales || 0;
      return sum + parseFloat(salesValue);
    }, 0);
    setTotalSales(total);
  };

  useEffect(() => {
    const reports = reportType === 'Final Report' ? finalReports : qualityReports;
    setFilteredData(reports);
    calculateTotalSales(reports);

    const salespersonsSet = new Set(reports.map(item => item.name || item.teamMember));
    setSalespersons([...salespersonsSet]);
  }, [reportType, finalReports, qualityReports]);

  return (
    <div className="statistics-container">
      <h1>Försäljningschefens Statistik</h1>

      {/* Filtersektion */}
      <div className="filter-container">
        <div>
          <label>Välj Rapporttyp:</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="Final Report">Slutrapport</option>
            <option value="Quality">Kvalité</option>
          </select>
        </div>
        <div>
          <label>Välj Säljare:</label>
          <select value={selectedSalesperson} onChange={(e) => setSelectedSalesperson(e.target.value)}>
            <option value="">Alla</option>
            {salespersons.map((salesperson, index) => (
              <option key={index} value={salesperson}>{salesperson}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Startdatum:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label>Slutdatum:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="filter-button" onClick={handleFilterChange}>Filtrera</button>
      </div>

      {/* Totalsumma */}
      <div className="total-sales">
        <h3>Totalt Försäljning: {totalSales}</h3>
      </div>

      {/* Tabell för att visa resultat */}
      <div className="table-container">
        <table className="statistics-table">
          <thead>
            {reportType === 'Final Report' ? (
              <tr>
                <th>Säljare</th>
                <th>Datum</th>
                <th>Plats</th>
                <th>Organisation</th>
                <th>Försäljning</th>
                <th>Status</th>
              </tr>
            ) : (
              <tr>
                <th>Datum</th>
                <th>Organisation</th>
                <th>Teammedlem</th>
                <th>Sales ID</th>
                <th>Reg Sälj</th>
                <th>Ogiltigt Belopp</th>
                <th>Utanför målgrupp</th>
                <th>Pending</th>
                <th>Total</th>
              </tr>
            )}
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={reportType === 'Final Report' ? 6 : 9}>Ingen data tillgänglig</td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index}>
                  {reportType === 'Final Report' ? (
                    <>
                      <td>{item.name}</td>
                      <td>{item.date}</td>
                      <td>{item.location}</td>
                      <td>{item.organisation}</td>
                      <td>{item.sales || 'N/A'}</td>
                      <td>{item.status}</td>
                    </>
                  ) : (
                    <>
                      <td>{item.date}</td>
                      <td>{item.organisation}</td>
                      <td>{item.teamMember}</td>
                      <td>{item.salesId}</td>
                      <td>{item.regSales}</td>
                      <td>{item.invalidAmount}</td>
                      <td>{item.outOfTarget}</td>
                      <td>{item.pending}</td>
                      <td>{item.total}</td>
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

export default SalesManagerStatistics;