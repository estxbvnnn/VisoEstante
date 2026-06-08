import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChanged, getUserData } from '../services/authService';
import { firebaseInitError } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (firebaseInitError) {
      setError(firebaseInitError);
      setLoading(false);
      return;
    }

    const unsub = onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const data = await getUserData(firebaseUser.uid);
          setUserData(data);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
        <div className="max-w-xl w-full bg-white border border-red-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Error de configuración</h1>
          <p className="text-gray-700 mb-4">{error.message}</p>
          <p className="text-sm text-gray-500">
            Verifica que tus variables de entorno `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
            `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`
            y `VITE_FIREBASE_APP_ID` estén definidas correctamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
