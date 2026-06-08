import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, registerUser, getUserRole } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { ROLE_DEFAULT_ROUTES, ROLES, ROLE_LABELS } from '../constants/roles';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState(ROLES.REPOSITOR);
  const [formLoading, setFormLoading] = useState(false);

  function resetForm() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setRole(ROLES.REPOSITOR);
  }

  function switchMode(newMode) {
    resetForm();
    setMode(newMode);
  }

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

  async function handleRegister(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener más de 6 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      await registerUser(email, password, displayName, role);
      toast.success('Cuenta creada correctamente. Iniciando sesión…');
      const route = ROLE_DEFAULT_ROUTES[role] || '/dashboard';
      navigate(route, { replace: true });
    } catch (err) {
      toast.error(getRegisterErrorMessage(err.code));
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

  function getRegisterErrorMessage(code) {
    const messages = {
      'auth/email-already-in-use': 'Este email ya está registrado.',
      'auth/invalid-email': 'El email no es válido.',
      'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
    };
    return messages[code] || 'Error al crear la cuenta. Intenta de nuevo.';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mx-4">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900">Estante Inteligente</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de gestión de góndola</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-sm font-medium transition ${
              mode === 'register'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Registrarse
          </button>
        </div>

        {mode === 'login' ? (
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
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-role" className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creando cuenta…
                </span>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

