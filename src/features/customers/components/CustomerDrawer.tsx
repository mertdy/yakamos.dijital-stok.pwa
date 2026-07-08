import React, { useState, useEffect } from 'react';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSalesStore } from '../../sales/store/useSalesStore';
import { Button } from '@heroui/react';
import { X, Search, UserPlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.surname && c.surname.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  const handleSelectCustomer = (id: string | null) => {
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Müşteri Seçimi</h2>
              <Button variant="ghost" isIconOnly onPress={onClose}><X size={20} /></Button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Müşteri ara..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <Button 
                  variant="tertiary" 
                  className="w-full mt-3 rounded-xl border-dashed"
                  onPress={() => {
                    onClose();
                    navigate('/customers/new');
                  }}
                >
                  <UserPlus size={18} className="mr-2" />
                  Yeni Müşteri Ekle
                </Button>
                {customerId && (
                   <Button 
                     variant="ghost" 
                     className="w-full mt-2 text-danger hover:bg-danger/10"
                     onPress={() => handleSelectCustomer(null)}
                   >
                     Seçimi Temizle
                   </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredCustomers.length === 0 ? (
                   <div className="text-center text-gray-500 mt-10">Müşteri bulunamadı</div>
                ) : (
                  filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${
                        customerId === customer.id 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900">{customer.name} {customer.surname || ''}</h4>
                        {customer.phone && <span className="text-xs text-gray-500">{customer.phone}</span>}
                      </div>
                      {customerId === customer.id && <CheckCircle2 className="text-primary" size={20} />}
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
