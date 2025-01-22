import React, { useEffect, useState } from 'react';
import {
  doc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/FinalReport.css'; // Använder samma stil som FinalReport

const QualityReporting = () => {
  const [salesManagers, setSalesManagers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [reportDate, setReportDate] = useState('');
  const [reportOrganisation, setReportOrganisation] = useState('');
  const [memberData, setMemberData] = useState({});
  const [message, setMessage] = useState('');
  const [recentReports, setRecentReports] = useState([]); // För senaste rapporter
  const [editReportData, setEditReportData] = useState(null); // För redigering
  const [editMemberData, setEditMemberData] = useState({}); // För redigering

  // NY STATE: För att hålla alla organisationer från Firestore
  const [organizations, setOrganizations] = useState([]);

  // NY STATE: För att lagra salesData/status från finalReports
  const [finalReportSalesData, setFinalReportSalesData] = useState(null);

  useEffect(() => {
    fetchSalesManagers();
    fetchRecentReports();
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedManager) {
      fetchTeamMembers(selectedManager);
    } else {
      setTeamMembers([]);
    }
  }, [selectedManager]);

  // Hämta Sales Managers
  const fetchSalesManagers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'sales-manager'));
      const querySnapshot = await getDocs(q);
      const managers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSalesManagers(managers);
    } catch (error) {
      console.error('Fel vid hämtning av Sales Managers:', error);
    }
  };

  // Hämta teammedlemmar baserat på vald Sales Manager
  const fetchTeamMembers = async (managerId) => {
    try {
      const q = query(collection(db, 'users'), where('managerUid', '==', managerId));
      const querySnapshot = await getDocs(q);
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeamMembers(members);
    } catch (error) {
      console.error('Fel vid hämtning av teammedlemmar:', error);
    }
  };

  // NY FUNKTION: Hämta organisationer från collection "organizations"
  const fetchOrganizations = async () => {
    try {
      const orgRef = collection(db, 'organizations');
      const querySnapshot = await getDocs(orgRef);
      const orgList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrganizations(orgList);
    } catch (error) {
      console.error('Fel vid hämtning av organisationer:', error);
    }
  };

  // Hämta senaste rapporter
  const fetchRecentReports = async () => {
    try {
      const q = query(
        collection(db, 'qualityReports'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentReports(reports);
    } catch (error) {
      console.error('Fel vid hämtning av senaste rapporter:', error);
    }
  };

  // NY FUNKTION: Hämta salesData/status från "finalReports" baserat på valt datum, manager, organisation
  const fetchFinalReportForCurrentSelection = async () => {
    // Bara kör om vi har valt allt
    if (!reportDate || !selectedManager || !reportOrganisation) {
      setFinalReportSalesData(null);
      return;
    }
    try {
      const finalReportsRef = collection(db, 'finalReports');
      const qFinal = query(
        finalReportsRef,
        where('date', '==', reportDate),
        where('managerUid', '==', selectedManager),
        where('organisation', '==', reportOrganisation)
      );

      const querySnapshot = await getDocs(qFinal);

      if (!querySnapshot.empty) {
        // Tar första dokumentet (antas vara det rätta om du bara har ett)
        const docData = querySnapshot.docs[0].data();
        // "salesData" är ett objekt med [userId]: { name, sales, status, ... }
        setFinalReportSalesData(docData.salesData || {});
      } else {
        // Inget dokument hittades
        setFinalReportSalesData(null);
      }
    } catch (error) {
      console.error('Fel vid hämtning av finalReport:', error);
      setFinalReportSalesData(null);
    }
  };

  // Kör fetchFinalReportForCurrentSelection när man ändrar datum, manager eller organisation
  useEffect(() => {
    fetchFinalReportForCurrentSelection();
  }, [reportDate, selectedManager, reportOrganisation]);

  // Lägg till medlem i rapporten
  const handleAddMember = (e) => {
    const memberId = e.target.value;
    if (memberId && !selectedMembers.find(member => member.id === memberId)) {
      const member = teamMembers.find(member => member.id === memberId);
      setSelectedMembers([...selectedMembers, member]);
      setMemberData(prev => ({
        ...prev,
        [memberId]: { regSales: 0, invalidAmount: 0, outOfTarget: 0, pending: 0, total: 0 },
      }));
    }
  };

  // Ta bort en medlem från rapporten
  const handleRemoveMember = (memberId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== memberId));
    setMemberData(prev => {
      const { [memberId]: removed, ...rest } = prev;
      return rest;
    });
  };

  // Hantera förändringar i inmatningsfält för en viss teammedlem
  const handleFieldChange = (memberId, field, value) => {
    setMemberData(prev => {
      const updatedMember = { ...prev[memberId], [field]: parseFloat(value) || 0 };

      // Beräkna totalen
      updatedMember.total =
        updatedMember.regSales -
        updatedMember.invalidAmount -
        updatedMember.outOfTarget -
        updatedMember.pending;

      return { ...prev, [memberId]: updatedMember };
    });
  };

  // Spara en ny rapport
  const handleSubmit = async () => {
    if (!reportDate || !reportOrganisation) {
      alert('Datum och organisation är obligatoriska.');
      return;
    }

    if (!selectedManager && selectedMembers.length === 0) {
      alert('Välj minst en Sales Manager eller en Teammedlem.');
      return;
    }

    try {
      const assignedTo = selectedMembers.map(member => member.id);

      // Bygg data för varje medlem med namn och Sales ID
      const memberDataWithDetails = Object.fromEntries(
        selectedMembers.map(member => [
          member.id,
          {
            ...memberData[member.id],
            name: `${member.firstName} ${member.lastName}`,
            salesId: member.salesId || 'N/A',
          },
        ])
      );

      const reportData = {
        date: reportDate,
        organisation: reportOrganisation,
        members: memberDataWithDetails,
        assignedTo: selectedManager ? [selectedManager, ...assignedTo] : assignedTo,
        managerUid: selectedManager, // Lägger till managerUid
        createdAt: new Date().toISOString(),
      };

      // Spara rapporten i huvudsamlingen
      const docRef = await addDoc(collection(db, 'qualityReports'), reportData);

      // Spara varje medlems data i deras egen subkollektion
      for (const [memberId, data] of Object.entries(memberDataWithDetails)) {
        const userDocRef = doc(db, 'users', memberId);
        const userQualityReportsCollection = collection(userDocRef, 'qualityReports');

        const individualReportData = {
          date: reportDate,
          organisation: reportOrganisation,
          ...data, // Inkludera regSales, invalidAmount, outOfTarget, pending, total
          createdAt: new Date().toISOString(),
          reportId: docRef.id, // Lagra huvudrapportens ID
        };

        await addDoc(userQualityReportsCollection, individualReportData);
      }

      setMessage('Rapporten har skapats framgångsrikt.');
      setReportDate('');
      setReportOrganisation('');
      setSelectedMembers([]);
      setMemberData({});

      fetchRecentReports(); // Uppdatera listan med senaste rapporterna
    } catch (error) {
      console.error('Fel vid skapande av rapport:', error);
      setMessage('Ett fel uppstod vid skapandet av rapporten.');
    }
  };

  // Ta bort en rapport
  const handleDeleteReport = async (reportId) => {
    try {
      // Ta bort rapporten från huvudsamlingen
      await deleteDoc(doc(db, 'qualityReports', reportId));

      // Uppdatera lokala staten
      setRecentReports(recentReports.filter(report => report.id !== reportId));

      setMessage('Rapporten har tagits bort framgångsrikt.');
    } catch (error) {
      console.error('Fel vid borttagning av rapport:', error);
      setMessage('Ett fel uppstod vid borttagningen av rapporten.');
    }
  };

  // Starta redigering av en rapport
  const handleEditReport = (report) => {
    setEditReportData(report);
    setEditMemberData(report.members);
    setReportDate(report.date);
    setReportOrganisation(report.organisation);
  };

  // Hantera ändringar i redigeringsformuläret för en rapport
  const handleEditFieldChange = (memberId, field, value) => {
    setEditMemberData(prev => {
      const updatedMember = { ...prev[memberId], [field]: parseFloat(value) || 0 };

      // Beräkna totalen
      updatedMember.total =
        updatedMember.regSales -
        updatedMember.invalidAmount -
        updatedMember.outOfTarget -
        updatedMember.pending;

      return { ...prev, [memberId]: updatedMember };
    });
  };

  // Spara uppdateringar av en rapport
  const handleSaveEdit = async () => {
    try {
      const updatedReportData = {
        ...editReportData,
        date: reportDate,
        organisation: reportOrganisation,
        members: editMemberData,
        updatedAt: new Date().toISOString(),
      };

      // Uppdatera rapporten i huvudsamlingen
      await setDoc(doc(db, 'qualityReports', editReportData.id), updatedReportData);

      // Uppdatera varje medlems data i deras egen subkollektion
      for (const [memberId, data] of Object.entries(editMemberData)) {
        const userDocRef = doc(db, 'users', memberId);
        const userQualityReportsCollection = collection(userDocRef, 'qualityReports');

        // Hitta och uppdatera rapporten i subkollektionen
        const q = query(userQualityReportsCollection, where('reportId', '==', editReportData.id));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (docSnapshot) => {
          await setDoc(doc(userQualityReportsCollection, docSnapshot.id), {
            date: updatedReportData.date,
            organisation: updatedReportData.organisation,
            ...data,
            updatedAt: new Date().toISOString(),
            reportId: editReportData.id,
          });
        });
      }

      // Uppdatera lokala staten
      setRecentReports(prevReports =>
        prevReports.map(report =>
          report.id === editReportData.id ? updatedReportData : report
        )
      );

      setMessage('Rapporten har uppdaterats framgångsrikt.');
      setEditReportData(null);
      setEditMemberData({});
      setReportDate('');
      setReportOrganisation('');
    } catch (error) {
      console.error('Fel vid uppdatering av rapport:', error);
      setMessage('Ett fel uppstod vid uppdateringen av rapporten.');
    }
  };

  return (
    <div className="final-report-container">
      <h1>Rapportering Kvalité</h1>

      {/* Formulär för att skapa eller redigera rapport */}
      <div className="filter-container">
        <label>Datum:</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          required
        />

        <label>Organisation:</label>
        <select
          value={reportOrganisation}
          onChange={(e) => setReportOrganisation(e.target.value)}
          required
        >
          <option value="">Välj organisation</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.name}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Skapa ny rapport: endast om vi inte håller på att redigera befintlig rapport */}
      {!editReportData && (
        <>
          <div className="filter-container">
            <label>Välj Sales Manager:</label>
            <select
              onChange={(e) => setSelectedManager(e.target.value)}
              value={selectedManager || ''}
            >
              <option value="">Välj en Sales Manager</option>
              {salesManagers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName}
                </option>
              ))}
            </select>
          </div>

          {teamMembers.length > 0 && (
            <div className="dropdown-container">
              <label>Lägg till teammedlem:</label>
              <select onChange={handleAddMember}>
                <option value="">Välj teammedlem</option>
                {teamMembers
                  .filter(member => !selectedMembers.find(selected => selected.id === member.id))
                  .map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <table className="report-table">
            <thead>
              <tr>
                <th>Teammedlem</th>
                <th>Sales ID</th>
                <th>Reg Sälj</th>
                <th>Ogiltigt Belopp</th>
                <th>Utanför målgrupp</th>
                <th>Pending</th>
                <th>Total</th>
                <th>Status</th> {/* <-- Ny kolumn för status */}
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {selectedMembers.map(member => (
                <tr key={member.id}>
                  <td>{member.firstName} {member.lastName}</td>
                  <td>{member.salesId || 'N/A'}</td>
                  <td>
                    <input
                      type="number"
                      value={memberData[member.id]?.regSales || 0}
                      onChange={(e) => handleFieldChange(member.id, 'regSales', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={memberData[member.id]?.invalidAmount || 0}
                      onChange={(e) => handleFieldChange(member.id, 'invalidAmount', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={memberData[member.id]?.outOfTarget || 0}
                      onChange={(e) => handleFieldChange(member.id, 'outOfTarget', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={memberData[member.id]?.pending || 0}
                      onChange={(e) => handleFieldChange(member.id, 'pending', e.target.value)}
                    />
                  </td>
                  <td>{memberData[member.id]?.total || 0}</td>
                  {/* Visa status om den finns i finalReportSalesData */}
                  <td>
                    {finalReportSalesData
                      ? (finalReportSalesData[member.id]?.status || 'Ingen status')
                      : '–'}
                  </td>
                  <td>
                    <button className="remove-button" onClick={() => handleRemoveMember(member.id)}>Ta bort</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleSubmit} className="submit-button">Spara Rapport</button>
        </>
      )}

      {/* Formulär för att redigera befintlig rapport */}
      {editReportData && (
        <div className="edit-report">
          <h2>Ändra Rapport</h2>

          <table className="report-table">
            <thead>
              <tr>
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
              {Object.entries(editMemberData).map(([id, data]) => (
                <tr key={id}>
                  <td>{data.name || 'N/A'}</td>
                  <td>{data.salesId || 'N/A'}</td>
                  <td>
                    <input
                      type="number"
                      value={data.regSales || 0}
                      onChange={(e) => handleEditFieldChange(id, 'regSales', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={data.invalidAmount || 0}
                      onChange={(e) => handleEditFieldChange(id, 'invalidAmount', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={data.outOfTarget || 0}
                      onChange={(e) => handleEditFieldChange(id, 'outOfTarget', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={data.pending || 0}
                      onChange={(e) => handleEditFieldChange(id, 'pending', e.target.value)}
                    />
                  </td>
                  <td>{data.total || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleSaveEdit} className="submit-button">Spara Ändringar</button>
          <button onClick={() => setEditReportData(null)} className="cancel-button">Avbryt</button>
        </div>
      )}

      {message && <p className="message">{message}</p>}

      {/* Logg för senaste rapporterna */}
      <div className="recent-reports">
        <h2>Senaste Rapporter</h2>
        {recentReports.map(report => (
          <div key={report.id} className="report-log">
            <h3>{report.date} - {report.organisation}</h3>
            <button onClick={() => handleEditReport(report)} className="edit-button">Ändra</button>
            <button onClick={() => handleDeleteReport(report.id)} className="delete-button">Ta bort</button>
            <table className="report-table">
              <thead>
                <tr>
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
                {Object.entries(report.members || {}).map(([id, data]) => (
                  <tr key={id}>
                    <td>{data.name || 'N/A'}</td>
                    <td>{data.salesId || 'N/A'}</td>
                    <td>{data.regSales || 0}</td>
                    <td>{data.invalidAmount || 0}</td>
                    <td>{data.outOfTarget || 0}</td>
                    <td>{data.pending || 0}</td>
                    <td>{data.total || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QualityReporting;