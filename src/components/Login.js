import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import './styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); // Återställ felmeddelanden

    try {
      // Logga in användaren
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Inloggning lyckades');
      const user = userCredential.user;

      // Hämta användardokumentet från Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.data()?.role; // Hämta användarens roll

      console.log('Användarroll:', role); // Lägg till loggning för att se rollen

      // Navigera baserat på användarens roll
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'user') {
        navigate('/user/dashboard');
      } else if (role === 'sales-manager') {
        navigate('/sales-manager/dashboard'); // Navigering för sales-manager
      } else if (role === 'quality') {
        navigate('/quality/dashboard'); // Navigering för kvalité
      } else if (role === 'uppdragsgivare') {
        navigate('/uppdragsgivare/dashboard'); // Navigering för uppdragsgivare
      } else {
        setError('Ingen giltig roll hittades för användaren.');
        console.error('Ingen giltig roll hittades för användaren.');
      }
    } catch (error) {
      setError('Fel vid inloggning: ' + error.message);
      console.error('Fel vid inloggning:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>MidSale Consulting</h1>
        <form onSubmit={handleLogin}>
          <label htmlFor="email">E-post</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
          />
          <label htmlFor="password">Lösenord</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <button type="submit">Logga in</button>
        </form>
        {error && <p style={{color: 'red'}}>{error}</p>}
        <a href="/forgot-password" className="forgot-password">Glömt ditt lösenord?</a>
      </div>
    </div>
  );
};

export default Login;