import { Button, Card } from '@heroui/react';
import { Building2, Mail, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const NoCompanyView = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-xl rounded-3xl p-8 text-center shadow-xl">
        <Building2 className="text-primary mx-auto mb-4" size={40} />
        <h1 className="text-2xl font-bold text-gray-900">
          Başlamaya hazırsınız
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Sistemi kullanmak için bir işletme kurun veya size gelen işletme
          davetini kabul edin.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button variant="primary" onPress={() => navigate('/onboarding')}>
            İşletme Kur
          </Button>
          <Button variant="secondary" onPress={() => navigate('/onboarding')}>
            <Mail size={16} className="mr-2" />
            Davetlerimi Kontrol Et
          </Button>
        </div>
        <Button variant="ghost" className="mt-4" onPress={logout}>
          <LogOut size={16} className="mr-2" />
          Çıkış Yap
        </Button>
      </Card>
    </main>
  );
};
