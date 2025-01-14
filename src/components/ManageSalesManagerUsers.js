import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/ManageUsers.css';

const ManageSalesManagerUsers = () => {
  const { currentUser } = useAuth();  // Hämta inloggad försäljningschef
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // Hantera vald användare
  const [isModalOpen, setIsModalOpen] = useState(false); // Hantera modalens synlighet
  const [endDate, setEndDate] = useState(''); // Hantera inmatat slutdatum

  // Hämta användare som tillhör den inloggade försäljningschefen
  useEffect(() => {
    const fetchUsers = async () => {
      if (currentUser && currentUser.uid) {
        const q = query(collection(db, 'users'), where('managerUid', '==', currentUser.uid));  
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setUsers(usersData);
      }
    };
    fetchUsers();
  }, [currentUser]);

  // Öppna modalen och välj en användare
  const handleOpenModal = (userId) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // Stäng modalen
  const handleCloseModal = () => {
    setSelectedUser(null);
    setEndDate('');
    setIsModalOpen(false);
  };

  // Uppdatera användarens sista arbetsdag i Firestore
  const handleSaveEndDate = async () => {
    if (selectedUser && endDate) {
      try {
        // Hämta referens till användarens dokument i Firestore
        const userRef = doc(db, 'users', selectedUser.id);
        
        // Uppdatera fältet "sistaArbetsdag" med det valda datumet
        await updateDoc(userRef, { sistaArbetsdag: endDate });

        // Uppdatera lokalt state
        setUsers(prevUsers =>
          prevUsers.map(user => user.id === selectedUser.id ? { ...user, sistaArbetsdag: endDate } : user)
        );

        handleCloseModal(); // Stäng modalen efter uppdatering
      } catch (error) {
        console.error('Fel vid uppdatering av sista arbetsdag:', error);
      }
    }
  };

  return (
    <div className="manage-users-container">
      <h1>Teammedlemmar</h1>
      <table className="user-table">
        <thead>
          <tr>
            <th>Namn</th>
            <th>E-post</th>
            <th>Roll</th>
            <th>Sälj ID</th>
            <th>Startdatum</th>
            <th>Sista arbetsdag</th>
            <th>Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map(user => (
              <tr key={user.id}>
                <td data-label="Namn">{user.firstName} {user.lastName}</td>
                <td data-label="E-post">{user.email}</td>
                <td data-label="Roll">{user.role}</td>
                <td data-label="Sälj ID">{user.salesId || 'N/A'}</td>
                <td data-label="Startdatum">{user.startDatum || 'N/A'}</td>
                <td data-label="Sista arbetsdag">{user.sistaArbetsdag || 'N/A'}</td>
                <td data-label="Åtgärder">
                  <button className="button-profile" onClick={() => handleOpenModal(user.id)}>Slutade</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">Inga användare hittades.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal för att ange slutdatum */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Ange sista arbetsdag för {selectedUser?.firstName} {selectedUser?.lastName}</h2>
            <label>
              Sista arbetsdag:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <div className="modal-buttons">
              <button className="button-success" onClick={handleSaveEndDate}>Spara</button>
              <button className="button-neutral" onClick={handleCloseModal}>Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSalesManagerUsers;