import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/QualityDashboard.css';

const QualityDashboard = () => {
  const [summary, setSummary] = useState({
    regSales: 0,
    invalidAmount: 0,
    outOfTarget: 0,
    pending: 0,
  });
  const [organizationStats, setOrganizationStats] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPeriodTotals();
  }, []);

  const fetchPeriodTotals = async () => {
    try {
      const currentDate = new Date();
      const startOfPeriod = new Date(
        currentDate.getDate() >= 18
          ? currentDate.getFullYear()
          : currentDate.getFullYear(),
        currentDate.getDate() >= 18
          ? currentDate.getMonth()
          : currentDate.getMonth() - 1,
        18
      );
      const endOfPeriod = new Date(
        startOfPeriod.getFullYear(),
        startOfPeriod.getMonth() + 1,
        17,
        23,
        59,
        59
      );

      const q = query(
        collection(db, 'qualityReports'),
        where('createdAt', '>=', startOfPeriod.toISOString()),
        where('createdAt', '<=', endOfPeriod.toISOString())
      );

      const querySnapshot = await getDocs(q);

      const periodTotals = { regSales: 0, invalidAmount: 0, outOfTarget: 0, pending: 0 };
      const orgStats = {};

      querySnapshot.docs.forEach(doc => {
        const report = doc.data();
        const organization = report.organisation || 'Okänd Organisation';

        if (!orgStats[organization]) {
          orgStats[organization] = { regSales: 0, invalidAmount: 0, outOfTarget: 0, pending: 0 };
        }

        Object.values(report.members || {}).forEach(memberData => {
          periodTotals.regSales += memberData.regSales || 0;
          periodTotals.invalidAmount += memberData.invalidAmount || 0;
          periodTotals.outOfTarget += memberData.outOfTarget || 0;
          periodTotals.pending += memberData.pending || 0;

          orgStats[organization].regSales += memberData.regSales || 0;
          orgStats[organization].invalidAmount += memberData.invalidAmount || 0;
          orgStats[organization].outOfTarget += memberData.outOfTarget || 0;
          orgStats[organization].pending += memberData.pending || 0;
        });
      });

      setSummary(periodTotals);
      setOrganizationStats(Object.entries(orgStats));
    } catch (error) {
      setMessage('Fel vid hämtning av data.');
      console.error('Error fetching period totals:', error);
    }
  };

  return (
    <div className="quality-dashboard">
      <h1>Dashboard</h1>
      <button className="update-button" onClick={fetchPeriodTotals}>
        Uppdatera Data
      </button>

      {message && <p className="error-message">{message}</p>}

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Reg Sälj</h3>
          <p>{summary.regSales}</p>
        </div>
        <div className="summary-card">
          <h3>Ogiltigt Belopp</h3>
          <p>{summary.invalidAmount}</p>
        </div>
        <div className="summary-card">
          <h3>Utanför målgrupp</h3>
          <p>{summary.outOfTarget}</p>
        </div>
        <div className="summary-card">
          <h3>Pending</h3>
          <p>{summary.pending}</p>
        </div>
      </div>

      <h2>Statistik per Organisation</h2>
      <div className="organization-stats">
        {organizationStats.map(([orgName, stats]) => (
          <div key={orgName} className="organization-card">
            <h3>{orgName}</h3>
            <p><strong>Reg Sälj:</strong> {stats.regSales}</p>
            <p><strong>Ogiltigt Belopp:</strong> {stats.invalidAmount}</p>
            <p><strong>Utanför målgrupp:</strong> {stats.outOfTarget}</p>
            <p><strong>Pending:</strong> {stats.pending}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QualityDashboard;