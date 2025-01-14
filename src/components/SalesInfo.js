import React, { useState } from 'react';
import { getDocs, query, collection, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/SalesInfo.css';

const SalesInfo = () => {
  const [searchType, setSearchType] = useState('salesId');
  const [searchValue, setSearchValue] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [selectedMenuOption, setSelectedMenuOption] = useState('');
  const [message, setMessage] = useState('');
  const [userDocId, setUserDocId] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false); // Hanterar visning av användarprofil
  const [userData, setUserData] = useState({}); // Sparar användarprofilens data
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchValue('');
    setUserInfo(null);
    setSelectedMenuOption('');
    setMessage('');
    setShowUserProfile(false);
  };

  const handleGetInfo = async (e) => {
    e.preventDefault();
    try {
      let q;
      if (searchType === 'salesId') {
        q = query(collection(db, 'users'), where('salesId', '==', searchValue));
      } else if (searchType === 'name') {
        const [firstName, lastName] = searchValue.split(' ');
        q = query(collection(db, 'users'), where('firstName', '==', firstName), where('lastName', '==', lastName));
      }

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setUserInfo(userDoc.data());
        setUserDocId(userDoc.id);
        setMessage('');
        setSelectedMenuOption('');
        setShowUserProfile(false); // Återställ profilvyn
      } else {
        setMessage('Ingen användare hittades med den angivna informationen.');
        setUserInfo(null);
        setSelectedMenuOption('');
      }
    } catch (error) {
      setMessage(`Ett fel uppstod: ${error.message}`);
    }
  };

  const handleMenuOptionChange = (e) => {
    setSelectedMenuOption(e.target.value);
  };

  const handleViewUserProfile = async () => {
    if (!userDocId) return;

    try {
      setLoadingProfile(true); // Starta laddning
      const userRef = doc(db, 'users', userDocId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setUserData(userDoc.data());
        setShowUserProfile(true); // Visa användarprofil
      } else {
        setMessage('Kunde inte hämta användarprofil.');
      }
    } catch (error) {
      setMessage(`Ett fel uppstod vid hämtning av användarprofilen: ${error.message}`);
    } finally {
      setLoadingProfile(false); // Avsluta laddning
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedMenuOption || !userDocId) return;
    
    try {
      const userRef = doc(db, 'users', userDocId);
      const updatedSpecifications = { ...userInfo.salesSpecifications };
      delete updatedSpecifications[selectedMenuOption]; // Ta bort den valda perioden

      await updateDoc(userRef, {
        salesSpecifications: updatedSpecifications
      });

      // Uppdatera UI
      setUserInfo((prev) => ({
        ...prev,
        salesSpecifications: updatedSpecifications,
      }));
      setSelectedMenuOption('');
      setMessage('Löneperioden har tagits bort.');
    } catch (error) {
      setMessage(`Ett fel uppstod vid borttagningen: ${error.message}`);
    }
  };

  return (
    <div className="sales-info-container">
      <h1>Hämta användarinformation</h1>

      <form onSubmit={handleGetInfo}>
        <div className="search-type">
          <label>
            <input
              type="radio"
              value="salesId"
              checked={searchType === 'salesId'}
              onChange={handleSearchTypeChange}
            />
            Sök med Sälj ID
          </label>
          <label>
            <input
              type="radio"
              value="name"
              checked={searchType === 'name'}
              onChange={handleSearchTypeChange}
            />
            Sök med Namn
          </label>
        </div>

        <label htmlFor="searchValue">{searchType === 'salesId' ? 'Sälj ID' : 'Namn'}</label>
        <input
          type="text"
          id="searchValue"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={searchType === 'salesId' ? 'Ange Sälj ID' : 'Ange Förnamn Efternamn'}
        />

        <button type="submit">Hämta information</button>
      </form>

      {message && <p>{message}</p>}

      {userInfo && (
        <div className="user-info">
          <p><strong>Förnamn:</strong> {userInfo.firstName}</p>
          <p><strong>Efternamn:</strong> {userInfo.lastName}</p>
          <p><strong>E-post:</strong> {userInfo.email}</p>
          <p><strong>Roll:</strong> {userInfo.role}</p>
          <p><strong>Sälj ID:</strong> {userInfo.salesId}</p>

          {/* Visa Användarprofil-knappen */}
          <button onClick={handleViewUserProfile}>Användarprofil</button>
          <br />

          {/* Om det finns salesSpecifications, visa dropdown för perioder */}
          {userInfo.salesSpecifications && Object.keys(userInfo.salesSpecifications).length > 0 && (
            <>
              <label htmlFor="menuOption">Välj en period:</label>
              <select
                id="menuOption"
                value={selectedMenuOption}
                onChange={handleMenuOptionChange}
              >
                <option value="">Välj en period</option>
                {Object.keys(userInfo.salesSpecifications).map((period, index) => (
                  <option key={index} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </>
          )}

          {selectedMenuOption && userInfo.salesSpecifications && userInfo.salesSpecifications[selectedMenuOption] && (
            <div className="specification-details">
              <h2>Säljspecifikation för {selectedMenuOption}</h2>
              <p><strong>Totalt inlästa:</strong> {userInfo.salesSpecifications[selectedMenuOption].totalProcessed}</p>
              <p><strong>Godkända:</strong> {userInfo.salesSpecifications[selectedMenuOption].approved}</p>
              <p><strong>Täckning saknas:</strong> {userInfo.salesSpecifications[selectedMenuOption].missingCoverage}</p>
              <p><strong>Ogiltiga:</strong> {userInfo.salesSpecifications[selectedMenuOption].invalid}</p>
              <p><strong>Felaktiga:</strong> {userInfo.salesSpecifications[selectedMenuOption].incorrect}</p>
              <p><strong>Ånger:</strong> {userInfo.salesSpecifications[selectedMenuOption].withdrawal}</p>
              <p><strong>Lönegrundade avtal:</strong> {userInfo.salesSpecifications[selectedMenuOption].totalApproved}</p>
              <p><strong>Provision:</strong> {userInfo.salesSpecifications[selectedMenuOption].commission} kr</p>
              <p><strong>Lön:</strong> {userInfo.salesSpecifications[selectedMenuOption].salary} kr</p>

              {/* Ta bort-knappen visas längst ner under den valda periodens detaljer */}
              <button onClick={handleDeletePeriod}>Ta bort denna period</button>
            </div>
          )}
        </div>
      )}

      {/* Visa användarprofil om knappen trycks */}
      {showUserProfile && (
        <div className="user-profile">
          <h2>Användarprofil</h2>
          {loadingProfile ? (
            <p>Laddar användarprofil...</p>
          ) : (
            <>
              <p><strong>Namn:</strong> {userData.name}</p>
              <p><strong>Personnummer:</strong> {userData.personnummer}</p>
              <p><strong>Startdatum:</strong> {userData.startDatum}</p>
              <p><strong>Sista arbetsdag:</strong> {userData.sistaArbetsdag || 'Ej angiven'}</p>
              <p><strong>Gatuadress:</strong> {userData.gatuadress}</p>
              <p><strong>Postnummer och ort:</strong> {userData.postnummerOrt}</p>
              <p><strong>Telefon:</strong> {userData.telefon}</p>
              <p><strong>Anhörig:</strong> {userData.anhorig}</p>
              <p><strong>Tel. anhörig:</strong> {userData.anhorigTelefon}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesInfo;