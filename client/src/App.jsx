import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './ToastContext';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  const [modal, setModal] = useState({ open: false, product: null });

  const openCreate = () => setModal({ open: true, product: null });
  const openEdit = (product) => setModal({ open: true, product });
  const closeModal = () => setModal({ open: false, product: null });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <div className="app">
          <Header onAdd={openCreate} />
          <main className="main">
            <ProductGrid onEdit={openEdit} />
          </main>
          {modal.open && (
            <ProductModal product={modal.product} onClose={closeModal} />
          )}
        </div>
      </ToastProvider>
    </QueryClientProvider>
  );
}
