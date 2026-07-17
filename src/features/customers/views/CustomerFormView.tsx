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
import { FormInput } from '@/shared/components/FormInput';
import { PhoneInput } from '@/shared/components/PhoneInput';
import { optionalPhoneNumberSchema } from '@/shared/utils/phoneNumber';

const customerSchema = z.object({
  name: z.string().min(2, 'Müşteri adı en az 2 karakter olmalıdır'),
  surname: z.string().optional(),
  phone: optionalPhoneNumberSchema,
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

  const { customers, addCustomer, updateCustomer, hasLoadedCustomers } =
    useCustomerStore();
  const { setCustomerId } = useSalesStore();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid }
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

  if (isEditMode && hasLoadedCustomers === false) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

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
            <FormInput
              control={control}
              name="name"
              label="Ad"
              isRequired
              type="text"
              placeholder="Örn: Ahmet"
            />
            <FormInput
              control={control}
              name="surname"
              label="Soyad"
              type="text"
              placeholder="Örn: Yılmaz"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PhoneInput
              control={control}
              name="phone"
              label="Telefon Numarası"
              placeholder="555 555 55 55"
            />
            <FormInput
              control={control}
              name="email"
              label="E-posta Adresi"
              type="email"
              placeholder="ornek@email.com"
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              Veresiye ve Limit Ayarları
            </h3>
            <FormInput
              control={control}
              name="creditLimit"
              className="max-w-md"
              label="Maksimum Borç Limiti (₺)"
              type="number"
              step="0.01"
              valueAsNumber
              placeholder="0.00"
              hint="Boş bırakılır veya 0 yazılırsa, müşteriye veresiye satış yapılamaz."
            />
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
