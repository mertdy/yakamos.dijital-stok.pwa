import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CustomerFormView } from './CustomerFormView';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSalesStore } from '@/features/sales';
import { useNavigate, useParams } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  Save: () => <div data-testid="icon-save" />,
  Loader2: () => <div data-testid="icon-loader2" />
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn()
}));

vi.mock('../store/useCustomerStore');
vi.mock('../../sales/store/useSalesStore');

const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<
  typeof vi.fn
>;
const mockUseSalesStore = useSalesStore as unknown as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as unknown as ReturnType<typeof vi.fn>;
const mockUseParams = useParams as unknown as ReturnType<typeof vi.fn>;

describe('CustomerFormView', () => {
  const navigateMock = vi.fn();
  const addCustomerMock = vi.fn();
  const updateCustomerMock = vi.fn();
  const setCustomerIdMock = vi.fn();

  beforeEach(() => {
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseParams.mockReturnValue({ id: undefined });

    mockUseCustomerStore.mockReturnValue({
      customers: [
        {
          id: 'c1',
          name: 'John',
          surname: 'Doe',
          phone: '123456789',
          email: 'test@test.com',
          creditLimit: 500
        }
      ],
      loadCustomers: vi.fn(),
      addCustomer: addCustomerMock,
      updateCustomer: updateCustomerMock
    });

    mockUseSalesStore.mockReturnValue({
      setCustomerId: setCustomerIdMock
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in add mode', () => {
    render(<CustomerFormView />);
    expect(screen.getByText('Yeni Müşteri Ekle')).toBeInTheDocument();
  });

  it('renders correctly in edit mode and populates data', () => {
    mockUseParams.mockReturnValue({ id: 'c1' });
    render(<CustomerFormView />);

    expect(screen.getByText('Müşteriyi Düzenle')).toBeInTheDocument();

    // Wait for the useEffect to populate the form
    waitFor(() => {
      const nameInput = screen.getByLabelText(/^Ad$/i) as HTMLInputElement;
      expect(nameInput.value).toBe('John');
      const surnameInput = screen.getByLabelText(
        /^Soyad$/i
      ) as HTMLInputElement;
      expect(surnameInput.value).toBe('Doe');
    });
  });

  it('shows validation errors when submitting empty form', async () => {
    render(<CustomerFormView />);

    // The submit button is disabled by default if the form is invalid based on mode: "onChange"
    // So we need to type invalid data to trigger errors.
    const nameInput = screen.getByLabelText(/^Ad$/i);
    fireEvent.change(nameInput, { target: { value: 'A' } }); // Min 2 chars

    // Form button is disabled since it's not valid
    const submitBtn = screen.getByText('Müşteriyi Kaydet').closest('button');
    expect(submitBtn).toBeDisabled();

    // Trigger blur or wait for error message
    await waitFor(() => {
      expect(
        screen.getByText('Müşteri adı en az 2 karakter olmalıdır')
      ).toBeInTheDocument();
    });
  });

  it('allows submission when valid data is entered', async () => {
    addCustomerMock.mockResolvedValue('new-c1');
    render(<CustomerFormView />);

    const nameInput = screen.getByLabelText(/^Ad$/i);
    fireEvent.change(nameInput, { target: { value: 'Ahmet' } });

    const limitInput = screen.getByLabelText(/Maksimum Borç Limiti/i);
    fireEvent.change(limitInput, { target: { value: '1000' } });

    await waitFor(() => {
      const submitBtn = screen.getByText('Müşteriyi Kaydet').closest('button');
      expect(submitBtn).not.toBeDisabled();
    });

    const form = nameInput.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(addCustomerMock).toHaveBeenCalledWith({
        name: 'Ahmet',
        surname: '',
        phone: '',
        email: '',
        creditLimit: 1000
      });
      expect(setCustomerIdMock).toHaveBeenCalledWith('new-c1');
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });
});
