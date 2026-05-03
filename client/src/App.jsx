import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './ToastContext';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import AttributesTab from './components/AttributesTab';
import ClassesTab from './components/ClassesTab';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  const [tab, setTab] = useState('products');
  const [modal, setModal] = useState({ open: false, product: null });

  const openCreate = () => setModal({ open: true, product: null });
  const openEdit = (product) => setModal({ open: true, product });
  const closeModal = () => setModal({ open: false, product: null });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <div className="app">
          <Header tab={tab} onTabChange={setTab} onAdd={openCreate} />
          <main className="main">
            {tab === 'products' && <ProductGrid onEdit={openEdit} />}
            {tab === 'attributes' && <AttributesTab />}
            {tab === 'classes' && <ClassesTab />}
          </main>
          {modal.open && tab === 'products' && (
            <ProductModal product={modal.product} onClose={closeModal} />
          )}
        </div>
      </ToastProvider>
    </QueryClientProvider>
  );
}
