import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth';
import './styles/ManageOrganizations.css';

const ManageOrganizations = () => {
  const [orgName, setOrgName] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const { currentUserRole } = useAuth();

  // Hämta alla organisationer från Firestore
  const fetchOrganizations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'organizations'));
      const orgs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrganizations(orgs);
    } catch (error) {
      console.error('Fel vid hämtning av organisationer:', error);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Lägg till organisation och skapa collection om den inte finns
  const handleAddOrganization = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    try {
      // Kontrollera om 'organizations'-collectionen har dokument
      const orgSnapshot = await getDocs(collection(db, 'organizations'));

      if (orgSnapshot.empty) {
        console.log('Ingen organisation finns, skapar första organisationen...');
      }

      // Lägg till organisation i Firestore
      await addDoc(collection(db, 'organizations'), {
        name: orgName,
        createdAt: new Date(),
      });

      setOrgName('');
      fetchOrganizations();  // Uppdatera listan
      console.log('Organisationen har lagts till!');
    } catch (error) {
      console.error('Fel vid tillägg av organisation:', error);
    }
  };

  // Ta bort organisation
  const handleDeleteOrganization = async (id) => {
    try {
      await deleteDoc(doc(db, 'organizations', id));
      fetchOrganizations();  // Uppdatera listan
      console.log('Organisationen har tagits bort!');
    } catch (error) {
      console.error('Fel vid borttagning av organisation:', error);
    }
  };

  return (
    <div className="manage-organizations">
      <h1>Hantera Organisationer</h1>

      {/* Formulär för att lägga till en organisation */}
      <form onSubmit={handleAddOrganization} className="add-org-form">
        <input
          type="text"
          placeholder="Organisationsnamn"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
        />
        <button type="submit">Lägg till</button>
      </form>

      {/* Lista över organisationer */}
      <ul className="organization-list">
        {organizations.map((org) => (
          <li key={org.id}>
            {org.name}
            <button onClick={() => handleDeleteOrganization(org.id)}>Ta bort</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageOrganizations;