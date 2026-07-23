import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';

export const useAppHotkeys = () => {
  const navigate = useNavigate();

  // F1: Satış Ekranına (POS) Git
  useHotkeys(
    'f1',
    e => {
      e.preventDefault();
      navigate(ROUTES.SALES);
    },
    { enableOnFormTags: true }
  );

  // F2: Yeni Satış (Sepeti Temizle)
  useHotkeys(
    'f2',
    e => {
      e.preventDefault();
      void import('@/features/sales/store/useSalesStore').then(
        ({ useSalesStore }) => {
          useSalesStore.getState().clearCart();
          navigate(ROUTES.SALES);
        }
      );
    },
    { enableOnFormTags: true }
  );

  // F3: Müşteriler Ekranına Git
  useHotkeys(
    'f3',
    e => {
      e.preventDefault();
      navigate(ROUTES.CUSTOMERS.INDEX);
    },
    { enableOnFormTags: true }
  );

  // F4: Envanter Ekranına Git
  useHotkeys(
    'f4',
    e => {
      e.preventDefault();
      navigate(ROUTES.INVENTORY.INDEX);
    },
    { enableOnFormTags: true }
  );
};
