import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './styles/ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [selectedSalesManager, setSelectedSalesManager] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsersAndManagers = async () => {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      
      setUsers(usersData);
      setFilteredUsers(usersData);

      // Filtrerar fram de användare som är "sales-manager"
      const managers = usersData.filter(user => user.role === 'sales-manager');
      setSalesManagers(managers);
    };

    fetchUsersAndManagers();
  }, []);

  /**
   * Exporterar de filtrerade användarna till en Excel-fil.
   */
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredUsers.map(user => ({
        Namn: `${user.firstName} ${user.lastName}`,
        Epost: user.email,
        Roll: user.role,
        'Sälj ID': user.salesId || 'N/A',
        'Startdatum': user.startDatum || 'N/A',
        'Sista arbetsdag': user.sistaArbetsdag || 'N/A'
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Användare');
    XLSX.writeFile(workbook, 'användare.xlsx');
  };

  /**
   * Filtrerar användarlistan baserat på vald manager, status och datumintervall.
   */
  const handleFilter = () => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const filtered = users.filter(user => {
      const userEndDate = user.sistaArbetsdag ? new Date(user.sistaArbetsdag) : null;

      const isStatusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !user.sistaArbetsdag) ||
        (statusFilter === 'inactive' && user.sistaArbetsdag);

      const isDateMatch = (!start || !end) ||
        (!userEndDate || (userEndDate >= start && userEndDate <= end));

      const isManagerMatch =
        selectedSalesManager === '' ||
        user.managerUid === selectedSalesManager;

      return isStatusMatch && isDateMatch && isManagerMatch;
    });

    setFilteredUsers(filtered);
  };

  /**
   * Navigerar till en specifik användares profil.
   */
  const handleViewProfile = (userId) => {
    navigate(`/user-profile/${userId}`);
  };

  /**
   * Öppnar en modal för att hantera borttagning/inaktivering/aktivering.
   */
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  /**
   * Inaktiverar en användare (sätter active=false).
   */
  const handleInactivateUser = async () => {
    if (selectedUser) {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, { active: false });

      setFilteredUsers(
        filteredUsers.map(u => (u.id === selectedUser.id ? { ...u, active: false } : u))
      );

      alert('Användaren har inaktiverats.');
      setShowDeleteModal(false);
    }
  };

  /**
   * Aktiverar en användare (sätter active=true).
   */
  const handleActivateUser = async () => {
    if (selectedUser) {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, { active: true });

      setFilteredUsers(
        filteredUsers.map(u => (u.id === selectedUser.id ? { ...u, active: true } : u))
      );

      alert('Användaren har aktiverats.');
      setShowDeleteModal(false);
    }
  };

  /**
   * Tar bort en användare från Firestore.
   */
  const handleDeleteUser = async () => {
    if (selectedUser) {
      await deleteDoc(doc(db, 'users', selectedUser.id));
      setFilteredUsers(filteredUsers.filter(u => u.id !== selectedUser.id));
      alert('Användaren och all tillhörande data har tagits bort.');
      setShowDeleteModal(false);
    }
  };

  /**
   * Uppdaterar en användares managerUid i Firestore och lokala state.
   */
  const handleManagerChange = async (userId, newManagerUid) => {
    try {
      // Uppdatera i Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { managerUid: newManagerUid });

      // Uppdatera i local state (både users och filteredUsers)
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, managerUid: newManagerUid } : u))
      );
      setFilteredUsers(prevFiltered =>
        prevFiltered.map(u => (u.id === userId ? { ...u, managerUid: newManagerUid } : u))
      );
    } catch (error) {
      console.error('Kunde inte uppdatera managerUid:', error);
      alert('Ett fel uppstod vid uppdatering av team. Försök igen!');
    }
  };

  return (
    <div className="manage-users-container">
      <h1>Hantera Användare</h1>
      
      <div className="filter-container">
        <label htmlFor="sales-manager-select">Välj Försäljningschef:</label>
        <select
          id="sales-manager-select"
          value={selectedSalesManager}
          onChange={(e) => setSelectedSalesManager(e.target.value)}
        >
          <option value="">Alla</option>
          {salesManagers.map(manager => (
            <option key={manager.id} value={manager.id}>
              {manager.firstName} {manager.lastName}
            </option>
          ))}
        </select>

        <div className="status-filter-container">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Alla</option>
            <option value="active">Aktiva</option>
            <option value="inactive">Avslutade</option>
          </select>
        </div>

        <div className="date-filter-container">
          <label>Från:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label>Till:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button className="filter-button" onClick={handleFilter}>
          Filtrera
        </button>
        <button className="export-button" onClick={exportToExcel}>
          Exportera
        </button>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Namn</th>
              <th>E-post</th>
              <th>Roll</th>
              <th>Sälj ID</th>
              {/* Ny kolumn för Team (dropdown) */}
              <th>Team</th>
              <th>Startdatum</th>
              <th>Sista arbetsdag</th>
              <th>Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              return (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.salesId || 'N/A'}</td>

                  {/* Dropdown där användaren kan byta manager/team */}
                  <td>
                    <select
                    className="team-dropdown"
                      value={user.managerUid || ''} // tom sträng om ingen manager
                      onChange={(e) => handleManagerChange(user.id, e.target.value)}
                    >
                      <option value="">Ingen manager</option>
                      {salesManagers.map(manager => (
                        <option key={manager.id} value={manager.id}>
                          {manager.firstName} {manager.lastName}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>{user.startDatum || 'N/A'}</td>
                  <td>{user.sistaArbetsdag || 'N/A'}</td>
                  <td>
                    <button
                      className="button-profile"
                      onClick={() => handleViewProfile(user.id)}
                    >
                      Min profil
                    </button>
                    <button
                      className="button-danger"
                      onClick={() => handleDeleteClick(user)}
                    >
                      Ta bort
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Popup-dialog för att hantera inaktivering/aktivering/borttagning */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Vad vill du göra med användaren?</h2>
            <p>Välj ett alternativ nedan för att hantera användaren:</p>
            {selectedUser && !selectedUser.active && (
              <button onClick={handleActivateUser} className="button-activate">
                Aktivera
              </button>
            )}
            <button onClick={handleInactivateUser} className="button-inactivate">
              Inaktivera
            </button>
            <button onClick={handleDeleteUser} className="button-danger">
              Ta bort all data
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="button-cancel"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;