import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, getUserRole } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { ROLE_DEFAULT_ROUTES } from '../constants/roles';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setFormLoading(true);
    try {
      const user = await signIn(email, password);
      const userRole = await getUserRole(user.uid);
      const route = ROLE_DEFAULT_ROUTES[userRole] || '/dashboard';
      navigate(route, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err.code));
    } finally {
      setFormLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && user) {
      const route = ROLE_DEFAULT_ROUTES[userData?.role] || '/dashboard';
      navigate(route, { replace: true });
    }
  }, [loading, user, userData, navigate]);

  function getErrorMessage(code) {
    const messages = {
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
      'auth/user-not-found': 'Usuario no encontrado.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    };
    return messages[code] || 'Error al iniciar sesión. Intenta de nuevo.';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mx-4">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900">Estante Inteligente</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de gestión de góndola</p>
        </div>

        {/* Only show login form */}
        {(
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario@supermercado.cl"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Iniciando sesión…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

