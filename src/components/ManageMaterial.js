import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
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
} from "firebase/firestore";
import { useAuth } from "../auth";
import "./styles/ManageMaterial.css";

function ManageMaterial() {
  const { currentUser, currentUserRole } = useAuth();
  const [teamUsers, setTeamUsers] = useState([]);
  const [imeiSimRows, setImeiSimRows] = useState([]);
  const [vasterBrickorRows, setVasterBrickorRows] = useState([]);
  // State för Tankkort / Bil: Första raden innehåller även "tankkort", övriga endast "Registreringsnummer" och "Mätarställning"
  const [tankkortBilRows, setTankkortBilRows] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLocked, setIsLocked] = useState(false);

  // State för rapportering
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRowIndex, setReportRowIndex] = useState(null);
  // reportSection: "imeiSim" eller "tankkortBil"
  const [reportSection, setReportSection] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportPhoto, setReportPhoto] = useState(null);

  // Lyssna på materialLocked-fältet i användardokumentet
  useEffect(() => {
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsLocked(data.materialLocked || false);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Hämta teamanvändare (om sales-manager)
  useEffect(() => {
    const fetchTeamUsers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("managerUid", "==", currentUser?.uid)
        );
        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((docSnap) => {
          users.push({ uid: docSnap.id, ...docSnap.data() });
        });
        setTeamUsers(users);
      } catch (error) {
        console.error("Error fetching team users:", error);
      }
    };

    if (currentUserRole === "sales-manager") {
      fetchTeamUsers();
    }
  }, [currentUser, currentUserRole]);

  // Hämta sparat material och dela upp i respektive array
  useEffect(() => {
    const fetchSavedMaterial = async () => {
      if (!currentUser) return;
      try {
        const materialRef = collection(db, "material", currentUser.uid, "items");
        const querySnapshot = await getDocs(materialRef);
        const imeiSim = [];
        const vasterBrickor = [];
        const tankkortBil = [];

        querySnapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          if (data.type === "imeiSim") {
            imeiSim.push(data);
          } else if (data.type === "vasterBrickor") {
            vasterBrickor.push({
              id: docSnap.id,
              organisation: data.organisation || "",
              vaster: data.vaster || "",
              brickor: data.brickor || "",
              assignedTo: data.assignedTo || ""
            });
          } else if (data.type === "tankkortBil") {
            // Hämta även rapporthistorik (reports)
            tankkortBil.push({
              id: docSnap.id,
              registreringsnummer: data.registreringsnummer || "",
              matarstallning: data.matarstallning || "",
              tankkort: data.tankkort || "",
              reports: data.reports || []
            });
          }
        });

        setImeiSimRows(
          imeiSim.length > 0 ? imeiSim : [{ imei: "", sim: "", assignedTo: "" }]
        );
        setVasterBrickorRows(
          vasterBrickor.length > 0
            ? vasterBrickor
            : [{ organisation: "", vaster: "", brickor: "", assignedTo: "" }]
        );
        setTankkortBilRows(
          tankkortBil.length > 0
            ? tankkortBil
            : [{ registreringsnummer: "", matarstallning: "", tankkort: "", reports: [] }]
        );
      } catch (error) {
        console.error("Error fetching saved material:", error);
      }
    };

    if (currentUser) {
      fetchSavedMaterial();
    }
  }, [currentUser]);

  // Hämta alla organisationer (för dropdownen i Västar / Brickor)
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const organizationsRef = collection(db, "organizations");
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

  // Hantera ändringar i IMEI / SIM-raderna
  const handleImeiSimChange = (index, field, value) => {
    setImeiSimRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Hantera ändringar i Västar / Brickor-raderna
  const handleVasterBrickorChange = (index, field, value) => {
    setVasterBrickorRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Hantera ändringar i Tankkort / Bil-raderna
  const handleTankkortBilChange = (index, field, value) => {
    setTankkortBilRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Lägg till ny rad i IMEI / SIM-sektionen
  const handleAddImeiSimRow = () => {
    setImeiSimRows((prev) => [...prev, { imei: "", sim: "", assignedTo: "" }]);
  };

  // Lägg till ny rad i Västar / Brickor-sektionen
  const handleAddVasterBrickorRow = () => {
    setVasterBrickorRows((prev) => [
      ...prev,
      { organisation: "", vaster: "", brickor: "", assignedTo: "" }
    ]);
  };

  // Lägg till ny rad i Tankkort / Bil-sektionen.
  // Första raden innehåller även "tankkort", övriga rader endast "Registreringsnummer" och "Mätarställning"
  const handleAddTankkortBilRow = () => {
    setTankkortBilRows((prev) => {
      if (prev.length === 0) {
        return [...prev, { registreringsnummer: "", matarstallning: "", tankkort: "", reports: [] }];
      } else {
        return [...prev, { registreringsnummer: "", matarstallning: "", reports: [] }];
      }
    });
  };

  // Ta bort en rad – om den är sparad tas även dokumentet bort från Firestore
  const handleDeleteRow = async (rowType, index) => {
    if (!currentUser) return;
    try {
      if (rowType === "imeiSim") {
        const row = imeiSimRows[index];
        if (row.id) {
          const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
          await deleteDoc(rowDocRef);
        }
        setImeiSimRows((prev) => prev.filter((_, i) => i !== index));
      } else if (rowType === "vasterBrickor") {
        const row = vasterBrickorRows[index];
        if (row.id) {
          const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
          await deleteDoc(rowDocRef);
        }
        setVasterBrickorRows((prev) => prev.filter((_, i) => i !== index));
      } else if (rowType === "tankkortBil") {
        const row = tankkortBilRows[index];
        if (row.id) {
          const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
          await deleteDoc(rowDocRef);
        }
        setTankkortBilRows((prev) => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error("Fel vid borttagning av material:", error);
      alert("Kunde inte ta bort material, försök igen!");
    }
  };

  // Öppna rapportmodal med angivet index och sektion
  const handleOpenReportModal = (index, section) => {
    setReportRowIndex(index);
    setReportSection(section);
    setReportComment("");
    setReportPhoto(null);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
  };

  // Hantera inskickning av rapport
  const handleReportSubmit = async () => {
    if (!currentUser || reportRowIndex === null) return;
    
    // Välj rätt rad beroende på sektion
    const row =
      reportSection === "imeiSim"
        ? imeiSimRows[reportRowIndex]
        : tankkortBilRows[reportRowIndex];

    // Om raden inte är sparad kan vi inte rapportera
    if (!row.id) {
      alert("Materialet måste sparas innan du kan rapportera.");
      return;
    }

    const timestamp = new Date();
    const reportData = {
      userId: currentUser.uid,
      comment: reportComment,
      photo: reportPhoto ? reportPhoto.name : null,
      createdAt: timestamp
    };

    try {
      const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
      await updateDoc(rowDocRef, {
        reports: arrayUnion(reportData)
      });

      // Uppdatera lokal state med ny rapport (baserat på sektion) om den inte redan finns
      if (reportSection === "imeiSim") {
        setImeiSimRows((prev) => {
          const newRows = [...prev];
          const existingReports = newRows[reportRowIndex].reports || [];
          if (
            !existingReports.some(
              (r) =>
                r.comment === reportData.comment &&
                Math.abs(new Date(r.createdAt).getTime() - timestamp.getTime()) < 1000
            )
          ) {
            existingReports.push(reportData);
          }
          newRows[reportRowIndex].reports = existingReports;
          return newRows;
        });
      } else {
        setTankkortBilRows((prev) => {
          const newRows = [...prev];
          const existingReports = newRows[reportRowIndex].reports || [];
          if (
            !existingReports.some(
              (r) =>
                r.comment === reportData.comment &&
                Math.abs(new Date(r.createdAt).getTime() - timestamp.getTime()) < 1000
            )
          ) {
            existingReports.push(reportData);
          }
          newRows[reportRowIndex].reports = existingReports;
          return newRows;
        });
      }
      alert("Rapport skickad!");
    } catch (error) {
      console.error("Fel vid rapportering:", error);
      alert("Fel vid rapportering, försök igen!");
    } finally {
      setShowReportModal(false);
    }
  };

  // Spara material – uppdatera dokument om id finns, annars lägg till nytt
  const handleSave = async () => {
    if (!currentUser) return;
    try {
      const itemsCollectionRef = collection(db, "material", currentUser.uid, "items");

      // Spara IMEI / SIM-rader
      for (const row of imeiSimRows) {
        if (!row.imei && !row.sim) continue;
        if (row.id) {
          const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
          await updateDoc(rowDocRef, {
            imei: row.imei,
            sim: row.sim,
            assignedTo: row.assignedTo,
            updatedAt: new Date()
          });
        } else {
          const docRef = await addDoc(itemsCollectionRef, {
            type: "imeiSim",
            imei: row.imei,
            sim: row.sim,
            assignedTo: row.assignedTo,
            createdAt: new Date()
          });
          row.id = docRef.id;
        }
      }

      // Spara Västar / Brickor-rader
      for (const row of vasterBrickorRows) {
        if (!row.organisation && !row.vaster && !row.brickor) continue;
        if (row.id) {
          const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
          await updateDoc(rowDocRef, {
            organisation: row.organisation,
            vaster: row.vaster,
            brickor: row.brickor,
            assignedTo: row.assignedTo,
            updatedAt: new Date()
          });
        } else {
          const docRef = await addDoc(itemsCollectionRef, {
            type: "vasterBrickor",
            organisation: row.organisation,
            vaster: row.vaster,
            brickor: row.brickor,
            assignedTo: row.assignedTo,
            createdAt: new Date()
          });
          row.id = docRef.id;
        }
      }

      // Spara Tankkort / Bil-rader
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
          const rowDocRef = doc(db, "material", currentUser.uid, "items", row.id);
          await updateDoc(rowDocRef, { ...dataToSave, updatedAt: new Date() });
        } else {
          const docRef = await addDoc(itemsCollectionRef, {
            type: "tankkortBil",
            ...dataToSave,
            createdAt: new Date()
          });
          row.id = docRef.id;
        }
      }

      // Lås materialet genom att sätta materialLocked till true
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { materialLocked: true });

      alert("Material sparat och låst!");
    } catch (error) {
      console.error("Fel vid sparning av material:", error);
      alert("Kunde inte spara material, försök igen!");
    }
  };

  return (
    <div className="manage-material-container">
      <h2>Hantera material</h2>
      <p>
        - Ni fyller i IMEI-numret på den surfplatta som ni vill lägga in i systemet.
      </p>
      <p>
        - SIM-kortnumret som ni ska lägga in är de fyra sista siffrorna på SIM-kortet.
      </p>
      <p>
        - I rullistan väljer ni vilken säljare som har just den surfplattan. Om en säljare slutar
        skriver ni i rapporten att ni fått tillbaka den från säljaren och ändrar menyvalet till "Välj säljare".
        När ni sedan tilldelar den lediga surfplattan till en ny säljare väljer ni den nya säljaren i rullistan
        och trycker på spara.
      </p>
      <p>
        - Rapporteringen är till för att skriva in om ni fått tillbaka den från en säljare eller om den är
        skadad eller liknande. Skickar ni tillbaka en trasig surfplatta ska det också rapporteras där. När
        ersättningssurfplattan skickas tillbaka till er kommer det att uppdateras i rapporten för den
        trasiga surfplattan.
      </p>

      {/* Sektion för IMEI / Simkortsnummer */}
      <div className="manage-material-section">
        <h3>Märke-IMEI / Simkortsnummer</h3>
        {imeiSimRows.map((row, index) => (
          <div key={index} className="manage-material-row">
            <input
              type="text"
              placeholder="Märke-IMEI"
              value={row.imei}
              onChange={(e) => handleImeiSimChange(index, "imei", e.target.value)}
              disabled={row.id && isLocked}
            />
            <input
              type="text"
              placeholder="Simkortsnummer"
              value={row.sim}
              onChange={(e) => handleImeiSimChange(index, "sim", e.target.value)}
              disabled={row.id && isLocked}
            />
            <select
              className="custom-select"
              value={row.assignedTo}
              onChange={(e) => handleImeiSimChange(index, "assignedTo", e.target.value)}
            >
              <option value="">Välj säljare</option>
              {teamUsers.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
            <button
              className="report-button"
              onClick={() => handleOpenReportModal(index, "imeiSim")}
            >
              Rapportera
            </button>
            <button
              className="remove-button"
              onClick={() => handleDeleteRow("imeiSim", index)}
              disabled={row.id && isLocked}
            >
              Ta bort
            </button>
          </div>
        ))}
        <button className="add-row-button" onClick={handleAddImeiSimRow}>
          +
        </button>
      </div>

      <p>
        - När ni lägger in materialet för västar och brickor är varje rad en uppsättning som en säljare har i materialet.
      </p>
      <p>- Välj vilken organisation materialet tillhör.</p>
      <p>
        - Om ni har flera uppsättningar som inte används eller om ni har flera olika organisationer ska de också läggas in.
      </p>

      {/* Sektion för Västar / Brickor */}
      <div className="manage-material-section">
        <h3>Västar / Brickor</h3>
        {vasterBrickorRows.map((row, index) => (
          <div key={index} className="manage-material-row">
            <select
              className="custom-select"
              value={row.organisation}
              onChange={(e) =>
                handleVasterBrickorChange(index, "organisation", e.target.value)
              }
              disabled={row.id && isLocked}
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
              placeholder="Antalet Västar/Jackor"
              value={row.vaster}
              onChange={(e) => handleVasterBrickorChange(index, "vaster", e.target.value)}
              disabled={row.id && isLocked}
            />
            <input
              type="text"
              placeholder="Brickor"
              value={row.brickor}
              onChange={(e) =>
                handleVasterBrickorChange(index, "brickor", e.target.value)
              }
              disabled={row.id && isLocked}
            />
            <select
              className="custom-select"
              value={row.assignedTo}
              onChange={(e) =>
                handleVasterBrickorChange(index, "assignedTo", e.target.value)
              }
            >
              <option value="">Välj säljare</option>
              {teamUsers.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
            <button
              className="remove-button"
              onClick={() => handleDeleteRow("vasterBrickor", index)}
              disabled={row.id && isLocked}
            >
              Ta bort
            </button>
          </div>
        ))}
        <button className="add-row-button" onClick={handleAddVasterBrickorRow}>
          +
        </button>
      </div>
      <p>- På första raden fyller ni i registreringsnummer, mätarställning samt kortnummer på det tankkort ni har.</p>
<p>- Den 20:e varje månad ska mätarställningen på bilen rapporteras samt eventuella skador eller parkeringsböter noteras.</p>
<p>- Om ni byter bil ska detta rapporteras till närmsta chef.</p>
       
      {/* Sektion för Tankkort / Bil */}
      <div className="manage-material-section">
        <h3>Tankkort / Bil</h3>
        {tankkortBilRows.map((row, index) => (
          <div key={index} className="manage-material-row">
            <input
              type="text"
              placeholder="Registreringsnummer"
              value={row.registreringsnummer}
              onChange={(e) =>
                handleTankkortBilChange(index, "registreringsnummer", e.target.value)
              }
              disabled={row.id && isLocked}
            />
            <input
              type="text"
              placeholder="Mätarställning"
              value={row.matarstallning}
              onChange={(e) =>
                handleTankkortBilChange(index, "matarstallning", e.target.value)
              }
              disabled={row.id && isLocked}
            />
            {index === 0 && (
              <input
                type="text"
                placeholder="Tankkort"
                value={row.tankkort}
                onChange={(e) =>
                  handleTankkortBilChange(index, "tankkort", e.target.value)
                }
                disabled={row.id && isLocked}
              />
            )}
            <button
              className="report-button"
              onClick={() => handleOpenReportModal(index, "tankkortBil")}
            >
              Rapportera
            </button>
            <button
              className="remove-button"
              onClick={() => handleDeleteRow("tankkortBil", index)}
              disabled={row.id && isLocked}
            >
              Ta bort
            </button>
          </div>
        ))}
        <button className="add-row-button" onClick={handleAddTankkortBilRow}>
          +
        </button>
      </div>

      <button className="save-button" onClick={handleSave}>
        Spara
      </button>

      <p>
        - Ska ni byta kampanj, ska det gamla materialet skickas tillbaka till huvudkontoret och det nya materialet,
        som ni har fått, skrivas in. När det gamla materialet har kommit till huvudkontoret tas det bort från teamet.
      </p>

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
              <label htmlFor="reportPhoto">
                Bifoga fotot:Denna funktion kommer inom kort
              </label>
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
              const reportedRow =
                reportSection === "imeiSim"
                  ? imeiSimRows[reportRowIndex]
                  : tankkortBilRows[reportRowIndex];
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

export default ManageMaterial;