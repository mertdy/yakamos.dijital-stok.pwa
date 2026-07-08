import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSalesStore } from '../../sales/store/useSalesStore';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@heroui/react';
import { toast } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const customerSchema = z.object({
  name: z.string().min(2, 'Müşteri adı en az 2 karakter olmalıdır'),
  surname: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email('Geçerli bir e-posta adresi giriniz')]).optional(),
  creditLimit: z.number().min(0, 'Limit 0 veya daha büyük olmalıdır').optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const CustomerFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  const { customers, loadCustomers, addCustomer, updateCustomer } = useCustomerStore();
  const { setCustomerId } = useSalesStore();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      surname: '',
      phone: '',
      email: '',
      creditLimit: 0,
    }
  });

  useEffect(() => {
    // If we refresh on edit page, customers might be empty
    if (customers.length === 0) {
      loadCustomers();
    }
  }, [customers.length, loadCustomers]);

  useEffect(() => {
    if (isEditMode && customers.length > 0) {
      const customer = customers.find(c => c.id === id);
      if (customer) {
        reset({
          name: customer.name,
          surname: customer.surname || '',
          phone: customer.phone || '',
          email: customer.email || '',
          creditLimit: customer.creditLimit || 0,
        });
      }
    }
  }, [isEditMode, id, customers, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSaving(true);
    try {
      if (isEditMode && id) {
        await updateCustomer(id, {
          name: data.name.trim(),
          surname: data.surname?.trim() || '',
          phone: data.phone?.trim() || '',
          email: data.email?.trim() || '',
          creditLimit: data.creditLimit || 0,
        });
        toast.success('Müşteri başarıyla güncellendi');
      } else {
        const newId = await addCustomer({
          name: data.name.trim(),
          surname: data.surname?.trim() || '',
          phone: data.phone?.trim() || '',
          email: data.email?.trim() || '',
          creditLimit: data.creditLimit || 0,
        });
        // Optionally auto-select in sales store if it was a new customer
        setCustomerId(newId);
        toast.success('Müşteri başarıyla eklendi');
      }
      navigate(-1);
    } catch (error) {
      toast.danger(isEditMode ? 'Müşteri güncellenirken hata oluştu' : 'Müşteri eklenirken hata oluştu');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" isIconOnly onPress={() => navigate(-1)} className="rounded-full bg-white shadow-sm border border-gray-100">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Ekle'}</h1>
          <p className="text-gray-500 text-sm mt-1">Sisteme yeni bir müşteri ve veresiye limiti tanımlayın</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 ml-1">Ad <span className="text-danger">*</span></label>
              <input 
                id="name"
                type="text" 
                {...register('name')}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.name ? 'border-danger focus:ring-danger' : 'border-gray-200'}`} 
                placeholder="Örn: Ahmet"
              />
              {errors.name && <span className="text-danger text-xs mt-1 block ml-1">{errors.name.message}</span>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 ml-1">Soyad</label>
              <input 
                type="text" 
                {...register('surname')}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.surname ? 'border-danger focus:ring-danger' : 'border-gray-200'}`} 
                placeholder="Örn: Yılmaz"
              />
              {errors.surname && <span className="text-danger text-xs mt-1 block ml-1">{errors.surname.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 ml-1">Telefon Numarası</label>
              <input 
                type="tel" 
                {...register('phone')}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.phone ? 'border-danger focus:ring-danger' : 'border-gray-200'}`} 
                placeholder="0555 555 5555"
              />
              {errors.phone && <span className="text-danger text-xs mt-1 block ml-1">{errors.phone.message}</span>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 ml-1">E-posta Adresi</label>
              <input 
                type="email" 
                {...register('email')}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.email ? 'border-danger focus:ring-danger' : 'border-gray-200'}`} 
                placeholder="ornek@email.com"
              />
              {errors.email && <span className="text-danger text-xs mt-1 block ml-1">{errors.email.message}</span>}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Veresiye ve Limit Ayarları</h3>
            <div className="space-y-1.5 max-w-md">
              <label htmlFor="creditLimit" className="block text-sm font-semibold text-gray-700 ml-1">Maksimum Borç Limiti (₺)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₺</span>
                <input 
                  id="creditLimit"
                  type="number" 
                  step="0.01"
                  {...register('creditLimit', { valueAsNumber: true })}
                  className={`w-full bg-gray-50 border rounded-xl py-3 pl-8 pr-4 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.creditLimit ? 'border-danger focus:ring-danger' : 'border-gray-200'}`} 
                  placeholder="0.00"
                />
              </div>
              {errors.creditLimit ? (
                <span className="text-danger text-xs mt-1 block ml-1">{errors.creditLimit.message}</span>
              ) : (
                <p className="text-xs text-gray-500 ml-1 mt-1">
                  Boş bırakılır veya 0 yazılırsa, müşteriye veresiye satış yapılamaz.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onPress={() => navigate(-1)}>
              İptal
            </Button>
            <Button variant="primary" type="submit" isDisabled={isSaving || !isValid} className="px-8 disabled:opacity-50 isDisabled:cursor-not-allowed">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
              {isEditMode ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};
