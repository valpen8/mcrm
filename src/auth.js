// auth.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const fetchUserData = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data fetched from Firestore: ', userData);
        setCurrentUser({
          ...user,
          salesId: userData.salesId || null,
          role: userData.role || null,
        });
        if (['user', 'sales-manager', 'admin', 'quality', 'uppdragsgivare'].includes(userData.role)) {
          setCurrentUserRole(userData.role);
        } else {
          console.log('Ogiltig roll hittades för användaren.');
          setCurrentUserRole(null);
        }
      } else {
        console.log('Ingen giltig roll eller salesId hittades för användaren.');
      }
    } catch (error) {
      console.error('Fel vid hämtning av användardata:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged har anropats");
      if (isAddingUser) {
        console.log('Lägger till en ny användare. Undviker att uppdatera autentiseringsstatus.');
        return;
      }
      if (user) {
        console.log('Inloggning lyckades, hämtar användarens data...');
        setCurrentUser(user);
        await fetchUserData(user);
      } else {
        console.log('Ingen användare inloggad.');
        setCurrentUser(null);
        setCurrentUserRole(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, [isAddingUser]);

  if (isLoading) {
    return <div>Laddar användardata...</div>;
  }

  return (
    <AuthContext.Provider value={{ currentUser, currentUserRole, isLoading, fetchUserData, isAddingUser, setIsAddingUser }}>
      {children}
    </AuthContext.Provider>
  );
};