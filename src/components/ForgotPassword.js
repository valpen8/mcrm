import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import './styles/ForgotPassword.css';

const ForgotPassword = () => {
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const navigate = useNavigate();

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

  const handleClose = () => {
    // Navigera tillbaka eller gör något annat för att "stänga" modalen
    navigate(-1);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-modal" onClick={handleClose}>X</button>
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
  );
};

export default ForgotPassword;