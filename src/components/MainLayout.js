import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useAuth } from '../auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import logga from '../img/logga.png';  // Anpassa sökvägen beroende på var du ligger
import './styles/Layout.css';

const MainLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuComponents, setMenuComponents] = useState([]);
  const { currentUserRole, currentUser } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };

  useEffect(() => {
    const fetchMenuComponents = async () => {
      if (currentUserRole === 'uppdragsgivare' && currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setMenuComponents(userDoc.data().menuComponents || []);
          }
        } catch (error) {
          console.error('Error fetching user menu components:', error);
        }
      }
    };

    fetchMenuComponents();
  }, [currentUser, currentUserRole]);

  // Dynamisk menystruktur baserat på roll
  const menuItems = {
    admin: [
      { path: '/admin/dashboard', label: 'Dashboard' },
      { path: '/quality/dashboard', label: 'Kvalité Dashboard' },
      { path: '/add-user', label: 'Lägg till användare' },
      { path: '/admin/manage-users', label: 'Hantera användare' },
      { path: '/sales-info', label: 'Försäljningsinfo' },
      { path: '/sales-specification', label: 'Försäljningsspecifikation' },
      { path: '/admin/salary-statistics', label: 'Lönestatistik' },
      { path: '/admin/statistics', label: 'Statistik' },
      { path: '/manage-organizations', label: 'Hantera Organisationer' }, // Ny länk
    ],
    'sales-manager': [
      { path: '/sales-manager/dashboard', label: 'Dashboard' },
      { path: '/add-user', label: 'Lägg till teammedlem' },
      { path: '/user/sales-specification', label: 'Säljspecifikation' },
      { path: '/sales-manager/manage-users', label: 'Hantera teammedlemmar' },
      { path: '/sales-manager/final-report', label: 'Slutrapport' },
      { path: '/sales-manager/statistics', label: 'Statistik' },
    ],
    quality: [
      { path: '/quality/dashboard', label: 'Kvalité Dashboard' },
      { path: '/quality/reporting', label: 'Rapportering' },
      { path: '/quality/statistics', label: 'Kvalité Statistik' },
      { path: '/manage-organizations', label: 'Hantera Organisationer' } // Ny länk
    ],
    user: [
      { path: '/user/dashboard', label: 'Start' },
      { path: '/user/sales-specification', label: 'Säljspecifikation' },
      { path: '/user/statistics', label: 'Min Statistik' },
    ],
    uppdragsgivare: [
      { path: '/uppdragsgivare/dashboard', label: 'Dashboard' },
      { path: '/uppdragsgivare/projects', label: 'Mina Projekt' },
      { path: '/uppdragsgivare/reports', label: 'Rapporter' },
      { path: '/uppdragsgivare/factor-dashboard', label: 'Factor Dashboard' },
      { path: '/uppdragsgivare/hellofresh', label: 'HelloFresh' } // Ny menykomponent
  ],
  };

  // Filtrera menyn för uppdragsgivare
  const filteredMenuItems =
    currentUserRole === 'uppdragsgivare'
      ? menuItems.uppdragsgivare.filter((item) =>
          menuComponents.includes(item.path.split('/')[2]) // Exempel: 'dashboard', 'projects', 'reports'
        )
      : menuItems[currentUserRole] || [];

  return (
    <div className="layout">
      <header className="header">
        <span className="menu-icon" onClick={toggleMenu}>
          &#9776;
        </span>
        
        <img src={logga} alt="Logga" />
      </header>

      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <nav>
          <ul>
            {/* Dynamiska länkar baserat på roll */}
            {filteredMenuItems.map((item, index) => (
              <li key={index}>
                <Link to={item.path}>{item.label}</Link>
              </li>
            ))}

            {/* Profil och Logout */}
            {currentUserRole !== 'uppdragsgivare' && (
              <li>
                <Link to="/profile">Min Profil</Link>
              </li>
            )}
            <li>
              <button onClick={handleLogout} className="logout-button">
                Logga ut
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;