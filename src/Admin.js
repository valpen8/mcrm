import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const AddUser = () => {
  const [email, setEmail] = useState('');

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        email: email,
        assignedPages: []
      });
      console.log('Användare tillagd');
    } catch (error) {
      console.error('Fel vid tillägg av användare', error);
    }
  };

  return (
    <div>
      <h1>Lägg till användare</h1>
      <form onSubmit={handleAddUser}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <button type="submit">Lägg till</button>
      </form>
    </div>
  );
};

export default AddUser;