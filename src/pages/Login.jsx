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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4 py-10">
      {/* Fondo animado: blobs flotantes */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/30 blur-3xl animate-blob" />
        <div className="absolute right-[-6rem] top-1/3 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl animate-blob" style={{ animationDelay: '-5s' }} />
        <div className="absolute bottom-[-6rem] left-1/3 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl animate-blob" style={{ animationDelay: '-10s' }} />
      </div>
      {/* Rejilla sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 grid w-full max-w-5xl animate-fade-in-up overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-xl lg:grid-cols-2">
        {/* Panel de marca (solo en pantallas grandes) */}
        <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-emerald-600 via-blue-600 to-slate-800 opacity-90" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl ring-1 ring-white/30 backdrop-blur">🛒</div>
              <div>
                <p className="text-lg font-semibold leading-none">VisoEstante</p>
                <p className="mt-1 text-xs text-white/70">Estante Inteligente</p>
              </div>
            </div>
            <h2 className="mt-12 text-3xl font-semibold leading-tight tracking-tight">
              Control total de tu góndola, en tiempo real.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">
              Inventario, vencimientos, precios y alertas en un solo panel. Menos pérdidas, mejores decisiones.
            </p>
          </div>
          <ul className="relative z-10 mt-10 space-y-3 text-sm text-white/90">
            {[
              { icon: '⏰', text: 'Detección automática de vencimientos' },
              { icon: '🔔', text: 'Alertas de stock bajo en vivo' },
              { icon: '📊', text: 'Reportes ejecutivos en Excel' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Panel del formulario */}
        <div className="bg-white/95 p-8 backdrop-blur-sm sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-700 text-2xl text-white shadow-lg lg:hidden">🛒</div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bienvenido de vuelta</h1>
            <p className="mt-1 text-sm text-slate-500">Inicia sesión para acceder a tu panel.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="usuario@supermercado.cl"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {formLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Iniciando sesión…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            © 2026 VisoEstante · Sistema de gestión de góndola
          </p>
        </div>
      </div>
    </div>
  );
}

