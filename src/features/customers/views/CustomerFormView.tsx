import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSalesStore } from '@/features/sales';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@heroui/react';
import { toast } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import posthog from 'posthog-js';
import { normalizeWhatsAppPhone } from '../domain/customerStatement';

const customerSchema = z.object({
  name: z.string().min(2, 'Müşteri adı en az 2 karakter olmalıdır'),
  surname: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine(value => !value?.trim() || Boolean(normalizeWhatsAppPhone(value)), {
      message: 'Geçerli bir telefon numarası giriniz'
    }),
  email: z
    .union([
      z.literal(''),
      z.string().email('Geçerli bir e-posta adresi giriniz')
    ])
    .optional(),
  creditLimit: z.number().min(0, 'Limit 0 veya daha büyük olmalıdır').optional()
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const CustomerFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const { customers, loadCustomers, addCustomer, updateCustomer } =
    useCustomerStore();
  const { setCustomerId } = useSalesStore();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      surname: '',
      phone: '',
      email: '',
      creditLimit: 0
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
          creditLimit: customer.creditLimit || 0
        });
      }
    }
  }, [isEditMode, id, customers, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSaving(true);
    try {
      const normalizedPhone = data.phone?.trim()
        ? normalizeWhatsAppPhone(data.phone)
        : '';
      posthog.capture('customer_form_submitted', {
        form_mode: isEditMode ? 'edit' : 'create',
        customer_id: id,
        has_phone: Boolean(data.phone?.trim()),
        has_email: Boolean(data.email?.trim()),
        has_credit_limit: Boolean((data.creditLimit || 0) > 0)
      });

      if (isEditMode && id) {
        await updateCustomer(id, {
          name: data.name.trim(),
          surname: data.surname?.trim() || '',
          phone: normalizedPhone || '',
          email: data.email?.trim() || '',
          creditLimit: data.creditLimit || 0
        });
        toast.success('Müşteri başarıyla güncellendi');
      } else {
        const newId = await addCustomer({
          name: data.name.trim(),
          surname: data.surname?.trim() || '',
          phone: normalizedPhone || '',
          email: data.email?.trim() || '',
          creditLimit: data.creditLimit || 0
        });
        // Optionally auto-select in sales store if it was a new customer
        setCustomerId(newId);
        toast.success('Müşteri başarıyla eklendi');
      }
      navigate(-1);
    } catch (error) {
      toast.danger(
        isEditMode
          ? 'Müşteri güncellenirken hata oluştu'
          : 'Müşteri eklenirken hata oluştu'
      );
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          isIconOnly
          onPress={() => navigate(-1)}
          className="rounded-full border border-gray-100 bg-white shadow-sm">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Ekle'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sisteme yeni bir müşteri ve veresiye limiti tanımlayın
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 p-6 md:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="ml-1 block text-sm font-semibold text-gray-700">
                Ad <span className="text-danger">*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className={`focus:ring-primary w-full rounded-xl border bg-gray-50 px-4 py-3 transition-all outline-none focus:bg-white focus:ring-2 ${errors.name ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
                placeholder="Örn: Ahmet"
              />
              {errors.name && (
                <span className="text-danger mt-1 ml-1 block text-xs">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="ml-1 block text-sm font-semibold text-gray-700">
                Soyad
              </label>
              <input
                type="text"
                {...register('surname')}
                className={`focus:ring-primary w-full rounded-xl border bg-gray-50 px-4 py-3 transition-all outline-none focus:bg-white focus:ring-2 ${errors.surname ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
                placeholder="Örn: Yılmaz"
              />
              {errors.surname && (
                <span className="text-danger mt-1 ml-1 block text-xs">
                  {errors.surname.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="ml-1 block text-sm font-semibold text-gray-700">
                Telefon Numarası
              </label>
              <input
                type="tel"
                {...register('phone')}
                className={`focus:ring-primary w-full rounded-xl border bg-gray-50 px-4 py-3 transition-all outline-none focus:bg-white focus:ring-2 ${errors.phone ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
                placeholder="0555 555 5555"
              />
              {errors.phone && (
                <span className="text-danger mt-1 ml-1 block text-xs">
                  {errors.phone.message}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="ml-1 block text-sm font-semibold text-gray-700">
                E-posta Adresi
              </label>
              <input
                type="email"
                {...register('email')}
                className={`focus:ring-primary w-full rounded-xl border bg-gray-50 px-4 py-3 transition-all outline-none focus:bg-white focus:ring-2 ${errors.email ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
                placeholder="ornek@email.com"
              />
              {errors.email && (
                <span className="text-danger mt-1 ml-1 block text-xs">
                  {errors.email.message}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              Veresiye ve Limit Ayarları
            </h3>
            <div className="max-w-md space-y-1.5">
              <label
                htmlFor="creditLimit"
                className="ml-1 block text-sm font-semibold text-gray-700">
                Maksimum Borç Limiti (₺)
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-gray-400">
                  ₺
                </span>
                <input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  {...register('creditLimit', { valueAsNumber: true })}
                  className={`focus:ring-primary w-full rounded-xl border bg-gray-50 py-3 pr-4 pl-8 transition-all outline-none focus:bg-white focus:ring-2 ${errors.creditLimit ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
                  placeholder="0.00"
                />
              </div>
              {errors.creditLimit ? (
                <span className="text-danger mt-1 ml-1 block text-xs">
                  {errors.creditLimit.message}
                </span>
              ) : (
                <p className="mt-1 ml-1 text-xs text-gray-500">
                  Boş bırakılır veya 0 yazılırsa, müşteriye veresiye satış
                  yapılamaz.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onPress={() => navigate(-1)}>
              İptal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isDisabled={isSaving || !isValid}
              className="isDisabled:cursor-not-allowed px-8 disabled:opacity-50">
              {isSaving ? (
                <Loader2 className="mr-2 animate-spin" size={20} />
              ) : (
                <Save className="mr-2" size={20} />
              )}
              {isEditMode ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
