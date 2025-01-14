import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/UserSalesSpecification.css';

const UserSalesSpecification = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);  // För att spara användardata
  const [salesSpecification, setSalesSpecification] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const data = userDoc.data();
        if (data) {
          setUserData(data);  // Spara användarens namn och sälj-ID
          if (data.salesSpecifications) {
            setSalesSpecification(data.salesSpecifications);  // Spara säljspecifikationer
          }
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  return (
    <div className="user-sales-specification-container">
      <h1>Säljspecifikation</h1>
      
      {userData ? (
        <>
          <p><strong>Säljare:</strong> {userData.firstName ? `${userData.firstName} ${userData.lastName}` : 'N/A'}</p>
          <p><strong>Säljid:</strong> {userData.salesId || 'N/A'}</p>
          <br />
         

          <label htmlFor="period">Välj Löneperiod</label>
          <select id="period" value={selectedPeriod} onChange={handlePeriodChange}>
            <option value="">Välj en period</option>
            {salesSpecification && Object.keys(salesSpecification).map((period, index) => (
              <option key={index} value={period}>
                {period}
              </option>
            ))}
          </select>

          {selectedPeriod && salesSpecification && (
            <div className="specification-details">
              <h2>LÖNESPECIFIKATION</h2>
              <p><strong>Försäljningsperiod:</strong> {selectedPeriod}</p>
              
              <h3>Behandlade avtal</h3>
              <p><strong>Totalt inlästa:</strong> {salesSpecification[selectedPeriod].totalProcessed}</p>
              <p><strong>Godkända:</strong> {salesSpecification[selectedPeriod].approved}</p>
              <p><strong>Täckning saknas:</strong> {salesSpecification[selectedPeriod].missingCoverage}</p>
              <p><strong>Ogiltiga:</strong> {salesSpecification[selectedPeriod].invalid}</p>
              <p><strong>Felaktiga:</strong> {salesSpecification[selectedPeriod].incorrect}</p>
              <p><strong>Ånger:</strong> {salesSpecification[selectedPeriod].withdrawal}</p>

              <h3>Löneberäkning</h3>
              <p><strong>Justering tidigare period:</strong> {salesSpecification[selectedPeriod].previousAdjustment}</p>
              <p><strong>Lönegrundade avtal:</strong> {salesSpecification[selectedPeriod].totalApproved}</p>
              <p><strong>Provision:</strong> {salesSpecification[selectedPeriod].commission} kr</p>
              <br />
              <p><strong>Lön:</strong> {salesSpecification[selectedPeriod].salary} kr</p>
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