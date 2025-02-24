// Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import MC_logo_dark from '../img/MC_logo_dark.png';
import './styles/Login.css';
import './styles/Modal.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // State för modal (glömt lösenord)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Den automatiska inloggningen togs bort – nu sker inloggning endast via handleLogin

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.data()?.role;

      if (!role) {
        setError('Ingen giltig roll hittades för användaren.');
        return;
      }

      // Fördröjning för att undvika att iOS öppnar en ny flik – navigera internt
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'user') {
          navigate('/user/dashboard', { replace: true });
        } else if (role === 'sales-manager') {
          navigate('/sales-manager/dashboard', { replace: true });
        } else if (role === 'quality') {
          navigate('/quality/dashboard', { replace: true });
        } else if (role === 'uppdragsgivare') {
          navigate('/uppdragsgivare/dashboard', { replace: true });
        }
      }, 500);
    } catch (error) {
      setError('Fel vid inloggning: ' + error.message);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetMessage('');
    setResetError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('Ett återställningsmail har skickats. Kontrollera din e-post.');
    } catch (error) {
      setResetError('Fel vid lösenordsåterställning: ' + error.message);
    }
  };

  const closeModal = () => {
    setShowForgotPasswordModal(false);
    setResetEmail('');
    setResetMessage('');
    setResetError('');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={MC_logo_dark} alt="Logga" />
        <form onSubmit={handleLogin}>
          <label htmlFor="email">E-post</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ange din e-postadress"
          />
          <label htmlFor="password">Lösenord</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ange ditt lösenord"
          />
          <button type="submit">Logga in</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button 
          className="forgot-password-btn" 
          onClick={() => setShowForgotPasswordModal(true)}
        >
          Glömt ditt lösenord?
        </button>
      </div>

      {showForgotPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal" onClick={closeModal}>X</button>
            <h1>Återställ lösenord</h1>
            <form onSubmit={handlePasswordReset}>
              <label htmlFor="resetEmail">E-post</label>
              <input
                type="email"
                id="resetEmail"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Ange din e-postadress"
              />
              <button type="submit">Skicka</button>
            </form>
            {resetMessage && <p style={{ color: 'green' }}>{resetMessage}</p>}
            {resetError && <p style={{ color: 'red' }}>{resetError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;