import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Users as UsersIcon,
  Trash2,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';

export const Users: React.FC = () => {
  const { users, addUser, deleteUser, currentUser } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'seller' as 'admin' | 'seller'
  });

  // Solo el admin puede acceder a esta página
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <ShieldCheck size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Solo los administradores pueden acceder a esta página</p>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.name) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      await addUser({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
      });
      toast.success('Usuario creado exitosamente');

      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'seller'
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    }
  };

  const handleDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId);

    if (user?.role === 'admin') {
      toast.error('No puedes eliminar un usuario administrador');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar al usuario ${user?.name}?`)) {
      try {
        await deleteUser(userId);
        toast.success('Usuario eliminado');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar usuario');
      }
    }
  };

  const sellers = users.filter(u => u.role === 'seller');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Header */}\n      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra los usuarios del sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus size={20} className="mr-2" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre Completo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div>
                <Label>Usuario *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="juan.perez"
                  required
                />
              </div>
              <div>
                <Label>Contraseña *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <Label>Rol *</Label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'seller' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seller">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <Button type="submit" className="w-full">
                Crear Usuario
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Administradores</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{admins.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShieldCheck size={24} className="text-purple-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vendedores</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{sellers.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserIcon size={24} className="text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Nombre</th>
                <th className="text-left p-4 font-semibold text-gray-900">Usuario</th>
                <th className="text-left p-4 font-semibold text-gray-900">Rol</th>
                <th className="text-left p-4 font-semibold text-gray-900">Fecha de Creación</th>
                <th className="text-center p-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                        {user.role === 'admin' ? (
                          <ShieldCheck size={20} className="text-purple-600" />
                        ) : (
                          <UserIcon size={20} className="text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700">{user.username}</td>
                  <td className="p-4">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-700">
                    {new Date(user.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      {user.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
