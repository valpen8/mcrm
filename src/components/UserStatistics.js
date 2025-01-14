import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/UserStatistics.css';

const UserStatistics = () => {
  const [userReports, setUserReports] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalSales, setTotalSales] = useState(0);

  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchUserReports = async () => {
      if (!currentUser) {
        console.log("Ingen inloggad användare.");
        return;
      }

      try {
        // Hämtar rapporter från den inloggade användarens "reports" subkollektion
        const userReportsRef = collection(db, 'users', currentUser.uid, 'reports');
        const querySnapshot = await getDocs(userReportsRef);

        if (querySnapshot.empty) {
          console.log("Inga rapporter hittades i användarens reports-samling.");
          return;
        }

        const reportsArray = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            reportId: doc.id,
          };
        });

        setUserReports(reportsArray);
        setFilteredData(reportsArray);
        calculateTotalSales(reportsArray);
      } catch (error) {
        console.error("Fel vid hämtning av data:", error);
      }
    };

    fetchUserReports();
  }, [currentUser]);

  const handleFilterChange = () => {
    let filtered = [...userReports];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    setFilteredData(filtered);
    calculateTotalSales(filtered);
  };

  const calculateTotalSales = (data) => {
    const total = data.reduce((sum, item) => {
      const salesValue = item.sales || 0;
      return sum + parseFloat(salesValue);
    }, 0);
    setTotalSales(total);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilteredData(userReports);
    calculateTotalSales(userReports);
  };

  return (
    <div className="user-statistics-container">
      <h1>Min Statistik</h1>

      <div className="filter-container">
        <div className="filter-group">
          <label htmlFor="start-date">Startdatum:</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="end-date">Slutdatum:</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button className="filter-button" onClick={handleFilterChange}>
            Filtrera
          </button>
          <button className="reset-button" onClick={handleResetFilters}>
            Nollställ
          </button>
        </div>
      </div>

      <div className="total-sales">
        <h3>Totalt Försäljning: {totalSales}</h3>
      </div>

      <div className="table-container">
        <table className="user-statistics-table">
          <thead>
            <tr>
              <th>Dag</th>
              <th>Kampanj</th>
              <th>Organisation</th>
              <th>Antal Försäljningar</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="4">Ingen data tillgänglig</td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index}>
                  <td>{item.date || 'N/A'}</td>
                  <td>{item.location || 'N/A'}</td>
                  <td>{item.organisation || 'N/A'}</td>
                  <td>{item.sales || '0'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserStatistics;