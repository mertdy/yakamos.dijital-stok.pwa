import React, { useState, useEffect } from 'react';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSalesStore } from '@/features/sales';
import { Button, Input } from '@heroui/react';
import { X, Search, UserPlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { customers, loadCustomers } = useCustomerStore();
  const { customerId, setCustomerId } = useSalesStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen, loadCustomers]);

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.surname && c.surname.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search))
  );

  const handleSelectCustomer = (id: string | null) => {
    const selectedCustomer = customers.find(customer => customer.id === id);

    posthog.capture('customer_selected_for_sale', {
      customer_id: id,
      selection_action: id ? 'selected' : 'cleared',
      has_phone: selectedCustomer ? Boolean(selectedCustomer.phone) : false,
      has_credit_limit: selectedCustomer
        ? Boolean((selectedCustomer.creditLimit ?? 0) > 0)
        : false,
      search_length: search.trim().length
    });

    setCustomerId(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'tween',
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Müşteri Seçimi
              </h2>
              <Button variant="ghost" isIconOnly onPress={onClose}>
                <X size={20} />
              </Button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="border-b border-gray-100 p-4">
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    type="text"
                    fullWidth
                    placeholder="Müşteri ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="tertiary"
                  className="mt-3 w-full rounded-xl border-dashed"
                  onPress={() => {
                    onClose();
                    navigate('/customers/new');
                  }}>
                  <UserPlus size={18} className="mr-2" />
                  Yeni Müşteri Ekle
                </Button>
                {customerId && (
                  <Button
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 mt-2 w-full"
                    onPress={() => handleSelectCustomer(null)}>
                    Seçimi Temizle
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {filteredCustomers.length === 0 ? (
                  <div className="mt-10 text-center text-gray-500">
                    Müşteri bulunamadı
                  </div>
                ) : (
                  filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                        customerId === customer.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {customer.name} {customer.surname || ''}
                        </h4>
                        {customer.phone && (
                          <span className="text-xs text-gray-500">
                            {customer.phone}
                          </span>
                        )}
                      </div>
                      {customerId === customer.id && (
                        <CheckCircle2 className="text-primary" size={20} />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
