import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { useAuth } from '../auth';
import './styles/ManageMaterial.css';

function ManageMaterialAdmin() {
  const { currentUser } = useAuth();
  
  // Sales Managers, vald manager och deras underordnade
  const [allSalesManagers, setAllSalesManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [subordinateUsers, setSubordinateUsers] = useState([]);
  
  // Material för respektive typ
  const [imeiSimRows, setImeiSimRows] = useState([]);
  const [vasterBrickorRows, setVasterBrickorRows] = useState([]);
  const [tankkortBilRows, setTankkortBilRows] = useState([]); // Nytt state för Tankkort/Bil
  const [organizations, setOrganizations] = useState([]);
  
  // State för rapportering
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRowIndex, setReportRowIndex] = useState(null);
  // reportSection anger vilken sektion rapporten gäller: "imeiSim" eller "tankkortBil"
  const [reportSection, setReportSection] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [reportPhoto, setReportPhoto] = useState(null);

  // Hämta alla Sales Managers
  useEffect(() => {
    const fetchSalesManagers = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'sales-manager')
        );
        const querySnapshot = await getDocs(q);
        const managers = [];
        querySnapshot.forEach((docSnap) => {
          managers.push({ uid: docSnap.id, ...docSnap.data() });
        });
        setAllSalesManagers(managers);
      } catch (error) {
        console.error('Error fetching sales managers:', error);
      }
    };
    fetchSalesManagers();
  }, []);

  // Hämta organisationer
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const organizationsRef = collection(db, 'organizations');
        const orgSnapshot = await getDocs(organizationsRef);
        const orgs = [];
        orgSnapshot.forEach((docSnap) => {
          orgs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setOrganizations(orgs);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
    fetchOrganizations();
  }, []);

  // När en Sales Manager är vald, hämta sparat material och underordnade säljare
  useEffect(() => {
    const fetchSavedMaterial = async () => {
      if (!selectedManager) return;
      try {
        const materialRef = collection(db, 'material', selectedManager.uid, 'items');
        const querySnapshot = await getDocs(materialRef);
        const imeiSim = [];
        const vasterBrickor = [];
        const tankkortBil = [];
        querySnapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          if (data.type === 'imeiSim') {
            imeiSim.push(data);
          } else if (data.type === 'vasterBrickor') {
            vasterBrickor.push({
              ...data,
              organisation: data.organisation || '',
              vaster: data.vaster || '',
              brickor: data.brickor || '',
              assignedTo: data.assignedTo || ''
            });
          } else if (data.type === 'tankkortBil') {
            tankkortBil.push({
              id: docSnap.id,
              registreringsnummer: data.registreringsnummer || '',
              matarstallning: data.matarstallning || '',
              tankkort: data.tankkort || '',
              reports: data.reports || []
            });
          }
        });
        setImeiSimRows(
          imeiSim.length > 0 ? imeiSim : [{ imei: '', sim: '', assignedTo: '' }]
        );
        setVasterBrickorRows(
          vasterBrickor.length > 0
            ? vasterBrickor
            : [{ organisation: '', vaster: '', brickor: '', assignedTo: '' }]
        );
        setTankkortBilRows(
          tankkortBil.length > 0
            ? tankkortBil
            : [{ registreringsnummer: '', matarstallning: '', tankkort: '', reports: [] }]
        );
      } catch (error) {
        console.error('Error fetching saved material:', error);
      }
    };

    const fetchSubordinateUsers = async () => {
      if (!selectedManager) return;
      try {
        const q = query(
          collection(db, 'users'),
          where('managerUid', '==', selectedManager.uid)
        );
        const querySnapshot = await getDocs(q);
        const subs = [];
        querySnapshot.forEach((docSnap) => {
          subs.push({ uid: docSnap.id, ...docSnap.data() });
        });
        setSubordinateUsers(subs);
      } catch (error) {
        console.error('Error fetching subordinate users:', error);
      }
    };

    if (selectedManager) {
      fetchSavedMaterial();
      fetchSubordinateUsers();
    }
  }, [selectedManager]);

  // Hantera ändring av vald Sales Manager
  const handleManagerChange = (e) => {
    const managerUid = e.target.value;
    const manager = allSalesManagers.find((m) => m.uid === managerUid);
    setSelectedManager(manager);
  };

  // Toggle låsstatus för vald Sales Manager
  const toggleLockStatus = async () => {
    if (!selectedManager) {
      console.log("Ingen Sales Manager vald");
      return;
    }
    try {
      const userDocRef = doc(db, 'users', selectedManager.uid);
      const currentLock = selectedManager.materialLocked || false;
      const newLockStatus = !currentLock;
      await updateDoc(userDocRef, { materialLocked: newLockStatus });
      setSelectedManager({ ...selectedManager, materialLocked: newLockStatus });
    } catch (error) {
      console.error("Error toggling lock status:", error);
      alert("Kunde inte ändra låsstatus.");
    }
  };

  // Hantera ändringar i IMEI/SIM-rader
  const handleImeiSimChange = (index, field, value) => {
    setImeiSimRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Hantera ändringar i Västar/Brickor-rader
  const handleVasterBrickorChange = (index, field, value) => {
    setVasterBrickorRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Hantera ändringar i Tankkort/Bil-rader
  const handleTankkortBilChange = (index, field, value) => {
    setTankkortBilRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Lägg till en ny rad i IMEI/SIM-sektionen
  const handleAddImeiSimRow = () => {
    setImeiSimRows((prev) => [...prev, { imei: '', sim: '', assignedTo: '' }]);
  };

  // Lägg till en ny rad i Västar/Brickor-sektionen
  const handleAddVasterBrickorRow = () => {
    setVasterBrickorRows((prev) => [
      ...prev,
      { organisation: '', vaster: '', brickor: '', assignedTo: '' }
    ]);
  };

  // Lägg till en ny rad i Tankkort/Bil-sektionen.
  // Första raden innehåller även "tankkort", övriga rader endast "Registreringsnummer" och "Mätarställning"
  const handleAddTankkortBilRow = () => {
    setTankkortBilRows((prev) => {
      if (prev.length === 0) {
        return [...prev, { registreringsnummer: '', matarstallning: '', tankkort: '', reports: [] }];
      } else {
        return [...prev, { registreringsnummer: '', matarstallning: '', reports: [] }];
      }
    });
  };

  // Ta bort en rad – om den är sparad tas även dokumentet bort från Firestore
  const handleDeleteRow = async (rowType, index) => {
    if (!selectedManager) return;
    try {
      if (rowType === 'imeiSim') {
        const row = imeiSimRows[index];
        if (row.id) {
          const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', row.id);
          await deleteDoc(rowDocRef);
        }
        setImeiSimRows((prev) => prev.filter((_, i) => i !== index));
      } else if (rowType === 'vasterBrickor') {
        const row = vasterBrickorRows[index];
        if (row.id) {
          const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', row.id);
          await deleteDoc(rowDocRef);
        }
        setVasterBrickorRows((prev) => prev.filter((_, i) => i !== index));
      } else if (rowType === 'tankkortBil') {
        const row = tankkortBilRows[index];
        if (row.id) {
          const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', row.id);
          await deleteDoc(rowDocRef);
        }
        setTankkortBilRows((prev) => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error('Fel vid borttagning av material:', error);
      alert('Kunde inte ta bort material, försök igen!');
    }
  };

  // Spara rader
  const handleSave = async () => {
    if (!selectedManager) return;
    try {
      const itemsCollectionRef = collection(db, 'material', selectedManager.uid, 'items');

      // Spara IMEI/SIM-rader
      for (const row of imeiSimRows) {
        if (!row.imei && !row.sim) continue;
        if (row.id) {
          const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', row.id);
          await updateDoc(rowDocRef, {
            imei: row.imei,
            sim: row.sim,
            assignedTo: row.assignedTo,
            updatedAt: new Date()
          });
        } else {
          const docRef = await addDoc(itemsCollectionRef, {
            type: 'imeiSim',
            imei: row.imei,
            sim: row.sim,
            assignedTo: row.assignedTo,
            createdAt: new Date()
          });
          row.id = docRef.id;
        }
      }

      // Spara Västar/Brickor-rader
      for (const row of vasterBrickorRows) {
        if (!row.organisation && !row.vaster && !row.brickor) continue;
        if (row.id) {
          const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', row.id);
          await updateDoc(rowDocRef, {
            organisation: row.organisation,
            vaster: row.vaster,
            brickor: row.brickor,
            assignedTo: row.assignedTo,
            updatedAt: new Date()
          });
        } else {
          const docRef = await addDoc(itemsCollectionRef, {
            type: 'vasterBrickor',
            organisation: row.organisation,
            vaster: row.vaster,
            brickor: row.brickor,
            assignedTo: row.assignedTo,
            createdAt: new Date()
          });
          row.id = docRef.id;
        }
      }
      
      // Spara Tankkort/Bil-rader
      // För den första raden ingår även "tankkort", övriga rader endast "Registreringsnummer" och "Mätarställning"
      for (let i = 0; i < tankkortBilRows.length; i++) {
        const row = tankkortBilRows[i];
        if (
          !row.registreringsnummer &&
          !row.matarstallning &&
          (i === 0 ? !row.tankkort : true)
        )
          continue;
        let dataToSave = {
          registreringsnummer: row.registreringsnummer,
          matarstallning: row.matarstallning
        };
        if (i === 0) {
          dataToSave.tankkort = row.tankkort;
        }
        if (row.id) {
          const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', row.id);
          await updateDoc(rowDocRef, { ...dataToSave, updatedAt: new Date() });
        } else {
          const docRef = await addDoc(itemsCollectionRef, {
            type: 'tankkortBil',
            ...dataToSave,
            createdAt: new Date()
          });
          row.id = docRef.id;
        }
      }

      alert('Material sparat!');
    } catch (error) {
      console.error('Fel vid sparning av material:', error);
      alert('Kunde inte spara material, försök igen!');
    }
  };

  // Rapportering
  // Uppdatera rapporten i Firestore genom att lägga till ett nytt rapportobjekt i "reports"
  const handleOpenReportModal = (index, section = 'imeiSim') => {
    setReportRowIndex(index);
    setReportSection(section);
    setReportComment('');
    setReportPhoto(null);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
  };

  const handleReportSubmit = async () => {
    if (!selectedManager || reportRowIndex === null) return;
    try {
      const reportData = {
        userId: currentUser.uid,
        comment: reportComment,
        photo: reportPhoto ? reportPhoto.name : null,
        createdAt: new Date()
      };
      // I detta exempel antar vi att endast IMEI/SIM- och Tankkort/Bil-rader kan rapporteras.
      let rowId;
      if (reportSection === 'imeiSim') {
        rowId = imeiSimRows[reportRowIndex].id;
      } else {
        rowId = tankkortBilRows[reportRowIndex].id;
      }
      const rowDocRef = doc(db, 'material', selectedManager.uid, 'items', rowId);
      await updateDoc(rowDocRef, {
        reports: arrayUnion(reportData)
      });
      alert('Rapport skickad!');
    } catch (error) {
      console.error('Fel vid rapportering:', error);
      alert('Fel vid rapportering, försök igen!');
    } finally {
      setShowReportModal(false);
    }
  };

  return (
    <div className="manage-material-container">
      <h2>Hantera material (Admin)</h2>
      
      {/* Dropdown för att välja en Sales Manager */}
      <div className="dropdown-section">
        <label htmlFor="salesManagerSelect">Välj Sales Manager:</label>
        <select
          id="salesManagerSelect"
          value={selectedManager ? selectedManager.uid : ''}
          onChange={handleManagerChange}
        >
          <option value="">-- Välj Sales Manager --</option>
          {allSalesManagers.map((manager) => (
            <option key={manager.uid} value={manager.uid}>
              {manager.firstName} {manager.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Om en Sales Manager är vald, visa knappen för att toggla låsstatus */}
      {selectedManager && (
        <div className="lock-toggle-section" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button className="lock-toggle-button" onClick={toggleLockStatus}>
            {selectedManager.materialLocked ? 'Avlås Sales Managerens material' : 'Lås Sales Managerens material'}
          </button>
        </div>
      )}

      {selectedManager && (
        <>
          {/* Sektion för IMEI / Simkortsnummer */}
          <div className="manage-material-section">
            <h3>IMEI / Simkortsnummer</h3>
            {imeiSimRows.map((row, index) => (
              <div key={index} className="manage-material-row">
                <input
                  type="text"
                  placeholder="IMEI"
                  value={row.imei}
                  onChange={(e) => handleImeiSimChange(index, 'imei', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Simkortsnummer"
                  value={row.sim}
                  onChange={(e) => handleImeiSimChange(index, 'sim', e.target.value)}
                />
                <select
                  value={row.assignedTo}
                  onChange={(e) => handleImeiSimChange(index, 'assignedTo', e.target.value)}
                >
                  <option value="">Välj säljare</option>
                  {subordinateUsers.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
                <button className="report-button" onClick={() => handleOpenReportModal(index, 'imeiSim')}>
                  Rapportera
                </button>
                <button className="remove-button" onClick={() => handleDeleteRow('imeiSim', index)}>
                  Ta bort
                </button>
              </div>
            ))}
            <button className="add-row-button" onClick={handleAddImeiSimRow}>
              +
            </button>
          </div>

          {/* Sektion för Västar / Brickor */}
          <div className="manage-material-section">
            <h3>Västar / Brickor</h3>
            {vasterBrickorRows.map((row, index) => (
              <div key={index} className="manage-material-row">
                <select
                  value={row.organisation}
                  onChange={(e) => handleVasterBrickorChange(index, 'organisation', e.target.value)}
                >
                  <option value="">Välj organisation</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.name}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Antal Västar/Jackor"
                  value={row.vaster}
                  onChange={(e) => handleVasterBrickorChange(index, 'vaster', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Brickor"
                  value={row.brickor}
                  onChange={(e) => handleVasterBrickorChange(index, 'brickor', e.target.value)}
                />
                <select
                  value={row.assignedTo}
                  onChange={(e) => handleVasterBrickorChange(index, 'assignedTo', e.target.value)}
                >
                  <option value="">Välj säljare</option>
                  {subordinateUsers.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
                <button className="remove-button" onClick={() => handleDeleteRow('vasterBrickor', index)}>
                  Ta bort
                </button>
              </div>
            ))}
            <button className="add-row-button" onClick={handleAddVasterBrickorRow}>
              +
            </button>
          </div>
          
          {/* Ny sektion för Tankkort / Bil */}
          <div className="manage-material-section">
            <h3>Tankkort / Bil</h3>
            {tankkortBilRows.map((row, index) => (
              <div key={index} className="manage-material-row">
                <input
                  type="text"
                  placeholder="Registreringsnummer"
                  value={row.registreringsnummer}
                  onChange={(e) => handleTankkortBilChange(index, 'registreringsnummer', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Mätarställning"
                  value={row.matarstallning}
                  onChange={(e) => handleTankkortBilChange(index, 'matarstallning', e.target.value)}
                />
                {index === 0 && (
                  <input
                    type="text"
                    placeholder="Tankkort"
                    value={row.tankkort}
                    onChange={(e) => handleTankkortBilChange(index, 'tankkort', e.target.value)}
                  />
                )}
                <button className="report-button" onClick={() => handleOpenReportModal(index, 'tankkortBil')}>
                  Rapportera
                </button>
                <button className="remove-button" onClick={() => handleDeleteRow('tankkortBil', index)}>
                  Ta bort
                </button>
              </div>
            ))}
            <button className="add-row-button" onClick={handleAddTankkortBilRow}>
              +
            </button>
          </div>
          
          <button className="save-button" onClick={handleSave}>Spara allt</button>
        </>
      )}

      {/* Rapportera Modal */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Rapportera material</h3>
            <div className="modal-field">
              <label htmlFor="reportComment">Kommentar</label>
              <textarea
                id="reportComment"
                placeholder="Skriv din kommentar här"
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
              />
            </div>
            <div className="modal-field inline-field">
              <label htmlFor="reportPhoto">Bifoga fotot:</label>
              <input
                type="file"
                id="reportPhoto"
                accept="image/*"
                onChange={(e) => setReportPhoto(e.target.files[0])}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={handleReportSubmit}>Skicka rapport</button>
              <button onClick={handleCloseReportModal}>Avbryt</button>
            </div>
            {(() => {
              let reportedRow;
              if (reportSection === 'imeiSim') {
                reportedRow = imeiSimRows[reportRowIndex];
              } else if (reportSection === 'tankkortBil') {
                reportedRow = tankkortBilRows[reportRowIndex];
              }
              return reportedRow &&
                reportedRow.reports &&
                reportedRow.reports.length > 0 ? (
                <div className="report-log">
                  <h4>Rapporthistorik</h4>
                  <ul>
                    {reportedRow.reports.map((report, idx) => (
                      <li key={idx}>
                        {report.createdAt && report.createdAt.seconds
                          ? new Date(report.createdAt.seconds * 1000).toLocaleString()
                          : new Date(report.createdAt).toLocaleString()}{" "}
                        - {report.comment}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageMaterialAdmin;