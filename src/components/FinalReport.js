import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/FinalReport.css';

const FinalReport = () => {
  const { currentUser } = useAuth();

  // --- Dina existerande state-variabler ---
  const [managerData, setManagerData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [salesData, setSalesData] = useState({});
  const [statusData, setStatusData] = useState({});
  const [location, setLocation] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [absentMembers, setAbsentMembers] = useState('');
  const [totalSales, setTotalSales] = useState(0);
  const [goal, setGoal] = useState('');
  const [date, setDate] = useState('');
  const [finalReports, setFinalReports] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);

  // --- NY STATE: Hämta organisationer från Firestore ---
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    console.log('Inloggad användare:', currentUser);
    if (currentUser) {
      fetchManagerData();
      fetchTeamMembers();
      fetchFinalReports();
      // Hämta organisationer när komponenten laddas (om användaren är inloggad)
      fetchOrganizations();
    } else {
      console.log('Ingen inloggad användare.');
    }
  }, [currentUser]);

  const fetchManagerData = async () => {
    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setManagerData(docSnap.data());
        } else {
          console.log('Ingen sådan användare!');
        }
      } catch (error) {
        console.error('Fel vid hämtning av managerdata:', error);
      }
    }
  };

  const fetchTeamMembers = async () => {
    if (currentUser) {
      try {
        const q = query(collection(db, 'users'), where('managerUid', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const membersData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setTeamMembers(membersData);
      } catch (error) {
        console.error('Fel vid hämtning av teammedlemmar:', error);
      }
    }
  };

  const fetchFinalReports = async () => {
    if (currentUser) {
      try {
        const q = query(collection(db, 'finalReports'), where('managerUid', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const reportsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setFinalReports(reportsData);
      } catch (error) {
        console.error('Fel vid hämtning av slutrapporter:', error);
      }
    }
  };

  // --- NY FUNKTION: Hämta organisationer från "organizations"-samlingen ---
  const fetchOrganizations = async () => {
    try {
      const orgCollectionRef = collection(db, 'organizations');
      const orgSnapshot = await getDocs(orgCollectionRef);
      const orgList = orgSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrganizations(orgList);
    } catch (error) {
      console.error('Fel vid hämtning av organization:', error);
    }
  };

  const handleInputChange = (e, memberId) => {
    const { value } = e.target;
    const parsedValue = value.replace(/[^0-9+\-]/g, '');
    setSalesData(prevData => ({
      ...prevData,
      [memberId]: parsedValue,
    }));

    const total = Object.values({ ...salesData, [memberId]: parsedValue })
      .map(item => parseInt(item.replace(/[^\d]/g, '')) || 0)
      .reduce((acc, num) => acc + num, 0);
    setTotalSales(total);
  };

  const handleStatusChange = (e, memberId) => {
    const { value } = e.target;
    setStatusData(prevData => ({
      ...prevData,
      [memberId]: value,
    }));
  };

  const handleAddMember = (e) => {
    const memberId = e.target.value;
    if (memberId && !selectedMembers.find(member => member.id === memberId)) {
      const member = teamMembers.find(member => member.id === memberId);
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handleRemoveMember = (memberId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== memberId));
    setSalesData((prevData) => {
      const { [memberId]: removed, ...rest } = prevData;
      return rest;
    });
    setStatusData((prevData) => {
      const { [memberId]: removed, ...rest } = prevData;
      return rest;
    });
  };

  const handleSubmit = async () => {
    try {
      // Förbereder data för slutrapport
      const reportData = {
        managerUid: currentUser.uid,
        managerName: managerData ? `${managerData.firstName} ${managerData.lastName}` : currentUser.email,
        date,
        organisation,
        location,
        absentMembers,
        totalSales,
        goal,
        salesData: selectedMembers.reduce((acc, member) => {
          acc[member.id] = {
            sales: salesData[member.id] || '0',
            status: statusData[member.id] || 'Närvarande',
            name: `${member.firstName} ${member.lastName}`,
            salesId: member.salesId || 'N/A',
          };
          return acc;
        }, {}),
        createdAt: new Date().toISOString(),
      };
  
      console.log('Skapar rapport med data:', reportData);
  
      // Skapa rapport i finalReports-samlingen
      const reportRef = await addDoc(collection(db, 'finalReports'), reportData);
      console.log('Rapport tillagd i finalReports-samlingen:', reportRef.id);
  
      // Spara information till varje användares reports-samling
      for (const member of selectedMembers) {
        const userDocRef = doc(db, 'users', member.id);
        const userReportsCollectionRef = collection(userDocRef, 'reports'); // Subsamlingen 'reports'
        
        const userReportData = {
          finalReportId: reportRef.id, // Referens till slutrapport
          managerUid: currentUser.uid,
          date,
          organisation,
          location,
          sales: salesData[member.id] || '0',
          status: statusData[member.id] || 'Närvarande',
          createdBy: currentUser.uid,
          createdAt: new Date().toISOString(),
        };
  
        console.log(`Sparar rapport till användarens reports: ${member.id}`, userReportData);
  
        await addDoc(userReportsCollectionRef, userReportData);
      }
  
      alert('Rapport sparad och användarens rapporter uppdaterade!');
    } catch (error) {
      console.error('Fel vid sparande av rapport:', error);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const reportDocRef = doc(db, 'finalReports', reportId);
      const reportDocSnap = await getDoc(reportDocRef);
  
      if (reportDocSnap.exists()) {
        const reportData = reportDocSnap.data();
        const salesData = reportData.salesData;
  
        // Kontrollera varje användares rapporter och ta bort
        for (const [userId, userReport] of Object.entries(salesData)) {
          try {
            const userReportsCollectionRef = collection(db, `users/${userId}/reports`);
  
            // Hämta dokument för att säkerställa åtkomst
            const q = query(userReportsCollectionRef, where('finalReportId', '==', reportId));
            const querySnapshot = await getDocs(q);
  
            // Logga dokument som hittats
            if (querySnapshot.empty) {
              console.log(`Inga rapporter att ta bort för användare ${userId}`);
              continue;
            }
  
            querySnapshot.forEach(async (docSnap) => {
              console.log(`Tar bort rapport för användare ${userId} med rapport-id: ${docSnap.id}`);
              await deleteDoc(docSnap.ref);
            });
          } catch (error) {
            console.error(`Fel vid borttagning av rapport för användare ${userId}:`, error);
          }
        }
  
        // Ta bort rapport från finalReports
        await deleteDoc(reportDocRef);
        setFinalReports((prevReports) => prevReports.filter((report) => report.id !== reportId));
        alert('Rapporten och dess relaterade användarrapporter har tagits bort.');
      } else {
        console.log('Ingen rapport funnen att ta bort!');
      }
    } catch (error) {
      console.error('Fel vid borttagning av rapport:', error);
    }
  };

  return (
    <div className="final-report-container">
      <h1>Slutrapport för teamet</h1>

      <div className="filter-container">
        <label>Datum:</label>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          required 
        />

        <label>Organisation:</label>
        {/* Ersätt textfältet med en dropdown som läser från organizations */}
        <select
          value={organisation}
          onChange={(e) => setOrganisation(e.target.value)}
          required
        >
          <option value="">Välj organisation</option>
          {organizations.map((org) => (
            // Anta att varje dokument i "organizations" har fältet "name".
            <option key={org.id} value={org.name}>
              {org.name}
            </option>
          ))}
        </select>

        <label>Plats:</label>
        <input
          type="text"
          placeholder="Ange plats..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

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

      <table className="report-table">
        <thead>
          <tr>
            <th>Teammedlem</th>
            <th>Status</th>
            <th>Antal försäljningar</th>
            <th>Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {selectedMembers.map(member => (
            <tr key={member.id}>
              <td>{member.firstName} {member.lastName}</td>
              <td>
                <select
                  value={statusData[member.id] || 'Närvarande'}
                  onChange={(e) => handleStatusChange(e, member.id)}
                >
                  <option value="Närvarande">Närvarande</option>
                  <option value="Sjuk">Sjuk</option>
                  <option value="Ledig">Ledig</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={salesData[member.id] || ''}
                  onChange={(e) => handleInputChange(e, member.id)}
                  placeholder="0"
                />
              </td>
              <td>
                <button 
                  className="remove-button" 
                  onClick={() => handleRemoveMember(member.id)}
                >
                  Ta bort
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="additional-info">
        <div className="input-group">
          <label>Totalt:</label>
          <span className="total-sales">{totalSales}</span>
        </div>

        <div className="input-group">
          <label>Måluppfyllnad:</label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Ange mål..."
          />
        </div>
      </div>

      <button onClick={handleSubmit} className="submit-button">Spara Rapport</button>

      <div className="report-list-container">
        <h2>Tidigare Rapporter</h2>
        {finalReports.length > 0 ? (
          <div className="previous-reports-table-wrapper">
            <table className="previous-reports-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Organisation</th>
                  <th>Plats</th>
                  <th>Totalt Försäljningar</th>
                  <th>Mål</th>
                  <th>Sjuka/Lediga</th>
                  <th>Skapad av</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {finalReports.map(report => (
                  <React.Fragment key={report.id}>
                    <tr>
                      <td data-label="Datum">{report.date}</td>
                      <td data-label="Organisation">{report.organisation || '-'}</td>
                      <td data-label="Plats">{report.location}</td>
                      <td data-label="Totalt Försäljningar">{report.totalSales}</td>
                      <td data-label="Mål">{report.goal}</td>
                      <td data-label="Sjuka/Lediga">{report.absentMembers || '-'}</td>
                      <td data-label="Skapad av">{report.managerName}</td>
                      <td data-label="Åtgärder">
                        <button
                          onClick={() =>
                            setExpandedReportId(expandedReportId === report.id ? null : report.id)
                          }
                        >
                          {expandedReportId === report.id ? 'Dölj' : 'Visa'}
                        </button>
                        <button 
                          onClick={() => handleDeleteReport(report.id)} 
                          className="delete-button"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                    {expandedReportId === report.id && (
                      <tr className="expanded-row">
                        <td colSpan="8">
                          <h4>Teammedlemmars försäljning:</h4>
                          <ul>
                            {Object.values(report.salesData).map((data, index) => (
                              <li key={index}>
                                {data.name} - Sälj ID: {data.salesId} - Försäljning: {data.sales}{' '}
                                - Status: {data.status}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Inga tidigare rapporter hittades.</p>
        )}
      </div>
    </div>
  );
};

export default FinalReport;