import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const ProtectedRoute = ({ children, role }) => {
  const { currentUser, currentUserRole, isAddingUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (
        currentUser &&
        ['user', 'sales-manager', 'admin', 'quality'].includes(currentUserRole)
      ) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data:', userData);

            const isComplete = !!(
              userData.name &&
              userData.personnummer &&
              userData.gatuadress &&
              userData.postnummerOrt &&
              userData.bank &&
              userData.clearingnummer &&
              userData.kontonummer &&
              userData.email &&
              userData.telefon &&
              userData.anhorig &&
              userData.anhorigTelefon
            );

            console.log('Is profile complete:', isComplete);
            setIsProfileComplete(isComplete);
          } else {
            console.log('Användardokument saknas.');
          }
        } catch (error) {
          console.error('Fel vid hämtning av användardata:', error);
        }
      } else {
        setIsProfileComplete(true);
      }
      setIsLoading(false);
    };

    if (!isAddingUser) {
      checkProfileCompletion();
    } else {
      setIsLoading(false);
    }
  }, [currentUser, currentUserRole, location.pathname, isAddingUser]);

  if (!currentUser) {
    console.log('Ingen användare inloggad. Omdirigerar till inloggningssidan.');
    return <Navigate to="/login" />;
  }

  if (isLoading || !currentUserRole) {
    console.log('Laddar användardata...');
    return <div>Laddar...</div>;
  }

  if (isAddingUser) {
    console.log('Lägger till en ny användare. Undviker omdirigering.');
    return null;
  }

  if (location.pathname === '/profile') {
    console.log('Tillgång till profilsidan.');
    return children;
  }

  if (
    ['user', 'sales-manager', 'admin', 'quality'].includes(currentUserRole) &&
    !isProfileComplete
  ) {
    console.log('Användarens profil är inte komplett. Omdirigerar till profilsidan.');
    return <Navigate to="/profile" />;
  }

  if (currentUserRole === 'admin') {
    console.log('Admin-användare. Fullständig åtkomst beviljad.');
    return children;
  }

  if (Array.isArray(role)) {
    console.log('Tillåtna roller:', role);
    console.log('Användarens roll:', currentUserRole);
    if (!role.includes(currentUserRole)) {
      console.log('Obehörig åtkomst - användarens roll matchar inte de tillåtna rollerna.');
      return <Navigate to="/unauthorized" />;
    }
  } else {
    console.log('Förväntad roll:', role);
    console.log('Användarens roll:', currentUserRole);
    if (role && currentUserRole !== role) {
      console.log('Obehörig åtkomst - användarens roll matchar inte.');
      return <Navigate to="/unauthorized" />;
    }
  }

  console.log('Användaren har behörighet. Renderar innehåll.');
  return children;
};

export default ProtectedRoute;