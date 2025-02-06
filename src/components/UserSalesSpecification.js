import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/UserSalesSpecification.css';

const UserSalesSpecification = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);  // För att spara användardata (t.ex. namn, sälj-ID)
  const [salesSpecifications, setSalesSpecifications] = useState({}); // Objekt med säljspecifikationer, nyckel = period
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          // Hämta användardokumentet
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          const data = userDoc.data();
          if (data) {
            setUserData(data);
            console.log("Hämtade användardata:", data);
          }
          
          // Hämta säljspecifikationer från underkollektionen "salesSpecifications"
          const salesSpecsRef = collection(db, 'users', currentUser.uid, 'salesSpecifications');
          const salesSpecsSnapshot = await getDocs(salesSpecsRef);
          
          const specs = {};
          salesSpecsSnapshot.forEach((specDoc) => {
            console.log('Hittade säljspecifikation:', specDoc.id, specDoc.data());
            specs[specDoc.id] = specDoc.data();
          });
          setSalesSpecifications(specs);
          console.log('Alla hämtade säljspecifikationer:', specs);
        } catch (error) {
          console.error("Fel vid hämtning av användardata eller säljspecifikationer:", error);
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
    console.log("Vald period:", e.target.value);
  };

  return (
    <div className="user-sales-specification-container">
      <h1>Säljspecifikation</h1>
      
      {userData ? (
        <>
          <p>
            <strong>Säljare:</strong> {userData.firstName ? `${userData.firstName} ${userData.lastName}` : 'N/A'}
          </p>
          <p>
            <strong>Säljid:</strong> {userData.salesId || 'N/A'}
          </p>
          <br />
          
          <label htmlFor="period">Välj Löneperiod</label>
          <select id="period" value={selectedPeriod} onChange={handlePeriodChange}>
            <option value="">Välj en period</option>
            {Object.keys(salesSpecifications).length > 0 &&
              Object.keys(salesSpecifications).map((period, index) => (
                <option key={index} value={period}>
                  {period}
                </option>
              ))
            }
          </select>

          {selectedPeriod && salesSpecifications[selectedPeriod] && (
            <div className="specification-details">
              <h2>LÖNESPECIFIKATION</h2>
              <p>
                <strong>Försäljningsperiod:</strong> {selectedPeriod}
              </p>
              
              <h3>Behandlade avtal</h3>
              <p>
                <strong>Totalt inlästa:</strong> {salesSpecifications[selectedPeriod].totalProcessed}
              </p>
              <p>
                <strong>Godkända:</strong> {salesSpecifications[selectedPeriod].approved}
              </p>
              <p>
                <strong>Täckning saknas:</strong> {salesSpecifications[selectedPeriod].missingCoverage}
              </p>
              <p>
                <strong>Ogiltiga:</strong> {salesSpecifications[selectedPeriod].invalid}
              </p>
              <p>
                <strong>Felaktiga:</strong> {salesSpecifications[selectedPeriod].incorrect}
              </p>
              <p>
                <strong>Ånger:</strong> {salesSpecifications[selectedPeriod].withdrawal}
              </p>

              <h3>Löneberäkning</h3>
              <p>
                <strong>Justering tidigare period:</strong> {salesSpecifications[selectedPeriod].previousAdjustment}
              </p>
              <p>
                <strong>Lönegrundade avtal:</strong> {salesSpecifications[selectedPeriod].totalApproved}
              </p>
              <p>
                <strong>Provision:</strong> {salesSpecifications[selectedPeriod].commission} kr
              </p>
              <br />
              <p>
                <strong>Lön:</strong> {salesSpecifications[selectedPeriod].salary} kr
              </p>
            </div>
          )}
        </>
      ) : (
        <p>Hämtar användarinformation...</p>
      )}
    </div>
  );
};

export default UserSalesSpecification;