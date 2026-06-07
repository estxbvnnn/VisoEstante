import { useAuth } from '../context/AuthContext';

export function useAuthHook() {
  return useAuth();
}
