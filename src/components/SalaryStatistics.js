import React, { useEffect, useState } from 'react';
import { 
  collection, 
  collectionGroup, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/SalaryStatistics.css';
import * as XLSX from 'xlsx'; // Importera xlsx-biblioteket
import { useAuth } from '../auth';

const SalaryStatistics = () => {
  const [users, setUsers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [periods, setPeriods] = useState([]); // Håller unika löneperioder
  const [totalSalary, setTotalSalary] = useState(0); // Total summa för den valda perioden

  // Hämta löneperioder från subkollektionen salesSpecifications under varje användare
  const fetchPeriods = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const periodSet = new Set();
      // För varje användare hämtar vi subkollektionen "salesSpecifications"
      const periodPromises = usersSnapshot.docs.map(async (userDoc) => {
        const salesSpecsCollection = collection(userDoc.ref, 'salesSpecifications');
        const salesSpecsSnapshot = await getDocs(salesSpecsCollection);
        salesSpecsSnapshot.forEach((specDoc) => {
          // Eftersom det inte finns ett specifikt fält "period" använder vi dokumentets id
          periodSet.add(specDoc.id);
        });
      });
      await Promise.all(periodPromises);

      const periodList = Array.from(periodSet).map((period) => ({
        id: period,
        label: period,
      }));
      setPeriods(periodList);
    } catch (error) {
      console.error('Fel vid hämtning av löneperioder:', error);
    }
  };

  // Hämta användare (och löneinformation) för den valda perioden
  const fetchUsers = async () => {
    if (!selectedPeriod) return;
    try {
      // Hämta alla användardokument för att kunna mappa in användarinformation
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersMap = {};
      usersSnapshot.docs.forEach((doc) => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() };
      });

      // Hämta alla dokument från subkollektionen salesSpecifications (utan att filtrera i queryn)
      const specsQuery = query(collectionGroup(db, 'salesSpecifications'));
      const specsSnapshot = await getDocs(specsQuery);
      
      // Filtrera lokalt: välj endast de dokument vars id matchar den valda perioden
      const filteredSpecs = specsSnapshot.docs.filter(
        (specDoc) => specDoc.id === selectedPeriod
      );
      
      const usersList = [];
      let total = 0;
      filteredSpecs.forEach((specDoc) => {
        const specData = specDoc.data();
        total += specData.salary || 0;
        // Hämta användardokumentet (föräldern) från subkollektionen
        const parentRef = specDoc.ref.parent.parent;
        const parentId = parentRef ? parentRef.id : null;
        const userData = usersMap[parentId] || {};
        // Kombinera användardata med löneinformationen från detta salesSpecifications‑dokument
        usersList.push({
          ...userData,
          salesSpecifications: { [selectedPeriod]: specData },
        });
      });
      
      setUsers(usersList);
      setTotalSalary(total);
    } catch (error) {
      console.error('Fel vid hämtning av användardata:', error);
    }
  };

  // Hantera export av tabellen till en Excel-fil
  const handleExport = () => {
    const data = users.map((user) => ({
      Namn: user.name,
      Personnummer: user.personnummer,
      'Sälj ID': user.salesId || 'N/A',
      Gatuadress: user.gatuadress,
      'Postnummer & Ort': user.postnummerOrt,
      Bank: user.bank,
      Clearingnummer: user.clearingnummer,
      Kontonummer: user.kontonummer,
      Epost: user.email,
      Telefon: user.telefon,
      Startdatum: user.startDatum,
      'Sista arbetsdag': user.sistaArbetsdag || 'N/A',
      'Lön för perioden': user.salesSpecifications[selectedPeriod]?.salary || 'N/A',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lönestatistik');
    XLSX.writeFile(wb, `Lönestatistik_${selectedPeriod}.xlsx`);
  };

  useEffect(() => {
    fetchPeriods(); // Hämta löneperioder när komponenten laddas
  }, []);

  return (
    <div className="salary-statistics-container">
      <h1>Lönestatistik</h1>

      {/* Visning av total lön för perioden */}
      <div className="total-salary-container">
        <h3>
          Total lön för perioden: <span className="total-salary">{totalSalary} SEK</span>
        </h3>
      </div>

      {/* Filter för att välja löneperiod */}
      <div className="filter-container">
        <label htmlFor="salary-period-select">Välj Löneperiod:</label>
        <select
          id="salary-period-select"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="">Välj en period</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
            </option>
          ))}
        </select>
        <button onClick={fetchUsers} className="fetch-button">
          Visa Lönestatistik
        </button>
        <button onClick={handleExport} className="export-button">
          Exportera till Excel
        </button>
      </div>

      {/* Tabellens container för att hantera responsivitet */}
      <div className="salary-table-container">
        <table className="salary-table">
          <thead>
            <tr>
              <th>Namn</th>
              <th>Personnummer</th>
              <th>Sälj ID</th>
              <th>Gatuadress</th>
              <th>Postnummer & Ort</th>
              <th>Bank</th>
              <th>Clearingnummer</th>
              <th>Kontonummer</th>
              <th>E-post</th>
              <th>Telefon</th>
              <th>Startdatum</th>
              <th>Sista arbetsdag</th>
              <th>Lön för perioden</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Namn">{user.name}</td>
                  <td data-label="Personnummer">{user.personnummer}</td>
                  <td data-label="Sälj ID">{user.salesId || 'N/A'}</td>
                  <td data-label="Gatuadress">{user.gatuadress}</td>
                  <td data-label="Postnummer & Ort">{user.postnummerOrt}</td>
                  <td data-label="Bank">{user.bank}</td>
                  <td data-label="Clearingnummer">{user.clearingnummer}</td>
                  <td data-label="Kontonummer">{user.kontonummer}</td>
                  <td data-label="E-post">{user.email}</td>
                  <td data-label="Telefon">{user.telefon}</td>
                  <td data-label="Startdatum">{user.startDatum}</td>
                  <td data-label="Sista arbetsdag">{user.sistaArbetsdag || 'N/A'}</td>
                  <td data-label="Lön för perioden">
                    {user.salesSpecifications[selectedPeriod]?.salary || 'N/A'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13">Inga användare hittades för den valda perioden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalaryStatistics;