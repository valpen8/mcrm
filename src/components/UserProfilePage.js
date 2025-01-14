import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Använd useParams för att få användarens ID från URL:en
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../auth'; // Hämta auth
import { db } from '../firebaseConfig';
import './styles/UserProfile.css';

const UserProfilePage = () => {
  const { id } = useParams(); // Hämta användarens ID från URL:en
  const { currentUser, currentUserRole, fetchUserData } = useAuth(); // Hämta currentUser, currentUserRole och fetchUserData
  const [userData, setUserData] = useState({
    name: '',
    personnummer: '',
    gatuadress: '',
    postnummerOrt: '',
    bank: '',
    clearingnummer: '',
    kontonummer: '',
    email: '',
    telefon: '',
    anhorig: '',
    anhorigTelefon: '',
    startDatum: '',
    sistaArbetsdag: '',
    salesId: '' // Lägg till salesId i state
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Bestäm om vi visar den inloggade användarens profil eller en annan användares profil
  const userId = id || currentUser?.uid; // Använd id från URL eller inloggad användares uid

  useEffect(() => {
    const loadUserData = async () => {
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId); // Använd det bestämda userId
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.error('Användare hittades inte.');
          }
        } catch (error) {
          console.error('Fel vid hämtning av användardata:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserData();
  }, [userId]); // Kör om när userId ändras

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', userId); // Använd userId för att uppdatera rätt användare
      await updateDoc(userRef, userData); // Uppdatera användardata i Firestore
      setMessage('Användarens profil har uppdaterats!');

      // Uppdatera användarinformationen efter sparandet
      await fetchUserData(userId);

      // Omdirigera baserat på användarroll
      if ((currentUserRole === 'user' || currentUserRole === 'sales-manager') && userData.name && userData.personnummer) {
        navigate('/sales-specification', { replace: true }); // Omdirigera till säljspecifikation om profilen är komplett
      } else {
        navigate('/user/dashboard', { replace: true }); // Annars, omdirigera till dashboard
      }
    } catch (error) {
      console.error('Fel vid uppdatering av användarens data:', error);
      setMessage('Ett fel uppstod vid sparande av profilen.');
    }
  };

  if (loading) {
    return <p>Hämtar användarinformation...</p>;
  }

  return (
    <div className="user-profile-container">
      <h1>Användarprofil</h1>
      <form onSubmit={handleSubmit} className="user-profile-form">
        <div className="form-group">
          <label>Arbetstagarens namn:</label>
          <input
            type="text"
            name="name"
            value={userData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Personnummer:</label>
          <input
            type="text"
            name="personnummer"
            value={userData.personnummer}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* Fält för Sales ID, bara synligt för Admin */}
        {currentUserRole === 'admin' && (
          <div className="form-group">
            <label>Sälj ID:</label>
            <input
              type="text"
              name="salesId"
              value={userData.salesId}
              onChange={handleInputChange}
              placeholder="Ange Sälj ID"
            />
          </div>
        )}

        <div className="form-group">
          <label>Startdatum:</label>
          <input
            type="date"
            name="startDatum"
            value={userData.startDatum}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Sista arbetsdag:</label>
          <input
            type="date"
            name="sistaArbetsdag"
            value={userData.sistaArbetsdag}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Gatuadress:</label>
          <input
            type="text"
            name="gatuadress"
            value={userData.gatuadress}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Postnummer och ort:</label>
          <input
            type="text"
            name="postnummerOrt"
            value={userData.postnummerOrt}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Bank:</label>
          <input
            type="text"
            name="bank"
            value={userData.bank}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Clearingnummer:</label>
          <input
            type="text"
            name="clearingnummer"
            value={userData.clearingnummer}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Kontonummer:</label>
          <input
            type="text"
            name="kontonummer"
            value={userData.kontonummer}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>E-post:</label>
          <input
            type="email"
            name="email"
            value={userData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Telefon:</label>
          <input
            type="text"
            name="telefon"
            value={userData.telefon}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Anhörig:</label>
          <input
            type="text"
            name="anhorig"
            value={userData.anhorig}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Tel. anhörig:</label>
          <input
            type="text"
            name="anhorigTelefon"
            value={userData.anhorigTelefon}
            onChange={handleInputChange}
            required
          />
        </div>
        <button type="submit">Spara</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default UserProfilePage;