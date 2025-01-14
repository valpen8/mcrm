import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/KvaliteStatistik.css';

const KvaliteStatistik = () => {
  const [salesManagers, setSalesManagers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totals, setTotals] = useState({
    totalSales: 0,
    invalidAmount: 0,
    outOfTarget: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchSalesManagers();
    fetchReports();
  }, []);

  useEffect(() => {
    if (selectedManager) {
      fetchTeamMembers(selectedManager);
    } else {
      setTeamMembers([]);
      setSelectedUser('');
    }
  }, [selectedManager]);

  const fetchSalesManagers = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'sales-manager'));
    const querySnapshot = await getDocs(q);
    const managers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setSalesManagers(managers);
  };

  const fetchTeamMembers = async (managerId) => {
    const q = query(collection(db, 'users'), where('managerUid', '==', managerId));
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTeamMembers(members);
  };

  const fetchReports = async () => {
    const q = query(collection(db, 'qualityReports'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const allReports = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setReports(allReports);
    setFilteredReports(allReports);
    calculateTotals(allReports);
  };

  const filterReports = () => {
    let filtered = reports;

    if (selectedManager) {
      filtered = filtered.filter((report) =>
        report.assignedTo.includes(selectedManager)
      );
    }

    if (selectedUser) {
      filtered = filtered.filter((report) =>
        Object.keys(report.members || {}).includes(selectedUser)
      );
    }

    if (startDate) {
      filtered = filtered.filter((report) => report.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((report) => report.date <= endDate);
    }

    setFilteredReports(filtered);
    calculateTotals(filtered);
  };

  const resetFilters = () => {
    setSelectedManager('');
    setSelectedUser('');
    setStartDate('');
    setEndDate('');
    setFilteredReports(reports);
    calculateTotals(reports);
  };

  const calculateTotals = (reportData) => {
    const totals = reportData.reduce(
      (acc, report) => {
        Object.values(report.members || {}).forEach((member) => {
          acc.totalSales += member.total || 0;
          acc.invalidAmount += member.invalidAmount || 0;
          acc.outOfTarget += member.outOfTarget || 0;
          acc.pending += member.pending || 0;
        });
        return acc;
      },
      { totalSales: 0, invalidAmount: 0, outOfTarget: 0, pending: 0 }
    );
    setTotals(totals);
  };

  return (
    <div className="statistics-container">
      <h1>Kvalité Statistik</h1>

      {/* Filter Sektion */}
      <table className="filter-table">
        <tbody>
          <tr>
            <td>
              <label>Sales Manager:</label>
              <select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
              >
                <option value="">Välj Sales Manager</option>
                {salesManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <label>Användare:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                disabled={!teamMembers.length}
              >
                <option value="">Välj Användare</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <label>Startdatum:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </td>
            <td>
              <label>Slutdatum:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </td>
            <td>
              <button className="filter-button" onClick={filterReports}>
                Filtrera
              </button>
              <button className="reset-button" onClick={resetFilters}>
                Återställ
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="total-sales">
        <p>Total Försäljning: {totals.totalSales} </p>
        <p>Ogiltigt Belopp: {totals.invalidAmount} </p>
        <p>Utanför målgrupp: {totals.outOfTarget} </p>
        <p>Pending: {totals.pending} </p>
      </div>

      {/* Statistik Tabell */}
      <div className="table-container">
        <table className="statistics-table">
          <thead>
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
          </thead>
          <tbody>
            {filteredReports.map((report) =>
              Object.entries(report.members || {}).map(([id, data]) => (
                <tr key={`${report.id}-${id}`}>
                  <td>{report.date}</td>
                  <td>{report.organisation}</td>
                  <td>{data.name || 'N/A'}</td>
                  <td>{data.salesId || 'N/A'}</td>
                  <td>{data.regSales || 0}</td>
                  <td>{data.invalidAmount || 0}</td>
                  <td>{data.outOfTarget || 0}</td>
                  <td>{data.pending || 0}</td>
                  <td>{data.total || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KvaliteStatistik;