import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Store } from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const success = await login(username, password);
      if (success) {
        toast.success('¡Bienvenido!');
        navigate('/');
      } else {
        toast.error('Usuario o contraseña incorrectos');
      }
    } catch {
      toast.error('Error de conexión con el servidor');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Store size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AldySV</h1>
            <p className="text-gray-500 mt-2">Sistema de Gestión de Ferretería</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                className="mt-2"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoggingIn}>
              {isLoggingIn ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          © 2026 AldySV - Digitaliza tu ferretería
        </p>
      </div>
    </div>
  );
};