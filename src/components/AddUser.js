import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/AddUser.css';

const AddUser = () => {
  const { currentUser, currentUserRole, setIsAddingUser } = useAuth();
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user',
    salesId: '',
    managerUid: '',
    menuComponents: [], // Menyval för uppdragsgivare
  });
  const [salesManagers, setSalesManagers] = useState([]);
  const [message, setMessage] = useState('');

  const staticMenuOptions = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'projects', label: 'Mina Projekt' },
    { value: 'reports', label: 'Rapporter' },
    { value: 'factor-dashboard', label: 'Factor Dashboard' },
    { value: 'hellofresh', label: 'HelloFresh' } // Nytt menyval
];

  // Hämta lista med Sales Managers från Firestore
  useEffect(() => {
    const fetchSalesManagers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'sales-manager'));
        const querySnapshot = await getDocs(q);
        const managers = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          name: `${doc.data().firstName} ${doc.data().lastName}`,
        }));
        setSalesManagers(managers);
      } catch (error) {
        console.error('Error fetching sales managers:', error);
      }
    };

    fetchSalesManagers();
  }, []);

  // Hantera ändringar i formulärfälten
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Hantera val av menykomponent
  const handleMenuComponentChange = (component) => {
    setUserData((prevState) => ({
      ...prevState,
      menuComponents: prevState.menuComponents.includes(component)
        ? prevState.menuComponents.filter((item) => item !== component)
        : [...prevState.menuComponents, component],
    }));
  };

  // Hantera formulärsubmitt
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAddingUser(true);

    try {
      if (!currentUser) {
        console.error('Ingen användare är inloggad.');
        setMessage('Fel: Ingen användare är inloggad.');
        return;
      }

      const adminEmail = currentUser.email;
      const adminPassword = prompt('Ange ditt lösenord igen för att fortsätta');

      // Skapa ny användare i Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const user = userCredential.user;

      // Förbered nytt användarobjekt
      const newUser = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        salesId: userData.salesId || null,
        managerUid: userData.managerUid || null,
        menuComponents: userData.menuComponents, // Lägg till menyval
      };

      // Om en sales-manager lägger till användaren -> sätt managerUid till inloggad sales-manager
      if (currentUserRole === 'sales-manager') {
        newUser.managerUid = currentUser.uid;
      }

      // Skapa användardokument i Firestore
      await setDoc(doc(db, 'users', user.uid), newUser);

      // Logga in som originaladministratör igen
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      setMessage('Användare har lagts till framgångsrikt.');
      setUserData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'user',
        salesId: '',
        managerUid: '',
        menuComponents: [],
      });
    } catch (error) {
      console.error('Fel vid tillägg av användare:', error);
      setMessage('Ett fel uppstod vid tillägg av användaren.');
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className="add-user-container">
      <h1>{currentUserRole === 'admin' ? 'Lägg till användare' : 'Lägg till teammedlem'}</h1>
      <form onSubmit={handleSubmit} className="add-user-form">
        <div className="form-group">
          <label>Förnamn:</label>
          <input
            type="text"
            name="firstName"
            value={userData.firstName}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Efternamn:</label>
          <input
            type="text"
            name="lastName"
            value={userData.lastName}
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
          <label>Lösenord:</label>
          <input
            type="password"
            name="password"
            value={userData.password}
            onChange={handleInputChange}
            required
          />
        </div>

        {(currentUserRole === 'admin' || currentUserRole === 'sales-manager') && (
          <div className="form-group">
            <label>Sales ID:</label>
            <input
              type="text"
              name="salesId"
              value={userData.salesId}
              onChange={handleInputChange}
              placeholder="Ange Sales ID (valfritt)"
            />
          </div>
        )}

        {/* Uppdaterad kod för dropdown av roll */}
        <div className="form-group">
          <label>Roll:</label>
          {currentUserRole === 'sales-manager' ? (
            // Om den inloggade användaren är Sales Manager, visa ENDAST User
            <select
              name="role"
              value={userData.role}
              onChange={handleInputChange}
              required
            >
              <option value="user">User</option>
            </select>
          ) : (
            // Om t.ex. admin eller annan roll, visa alla roller
            <select
              name="role"
              value={userData.role}
              onChange={handleInputChange}
              required
            >
              <option value="user">User</option>
              <option value="sales-manager">Sales Manager</option>
              {currentUserRole === 'admin' && <option value="admin">Admin</option>}
              <option value="quality">Kvalité</option>
              <option value="uppdragsgivare">Uppdragsgivare</option>
            </select>
          )}
        </div>

        {/* Dropdown för att välja Sales Manager (endast om admin) */}
        {currentUserRole === 'admin' && (
          <div className="form-group">
            <label>Välj Sales Manager:</label>
            <select
              name="managerUid"
              value={userData.managerUid}
              onChange={handleInputChange}
            >
              <option value="">Välj en sales manager (valfritt)</option>
              {salesManagers.map((manager) => (
                <option key={manager.uid} value={manager.uid}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Menyval endast för uppdragsgivare */}
        {userData.role === 'uppdragsgivare' && (
          <div className="form-group">
            <label>Välj menykomponenter:</label>
            <div>
              {staticMenuOptions.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={userData.menuComponents.includes(option.value)}
                    onChange={() => handleMenuComponentChange(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit">
          {currentUserRole === 'admin' ? 'Lägg till användare' : 'Lägg till teammedlem'}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddUser;