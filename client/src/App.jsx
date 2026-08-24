import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './ToastContext';
import { CartProvider } from './CartContext';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import AttributesTab from './components/AttributesTab';
import ClassesTab from './components/ClassesTab';
import ColorPicker from './components/ColorPicker';
import CartDrawer from './components/CartDrawer';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const DEFAULT_BG = '#FAFAF9';

function PaymentSuccessBanner({ orderId, onClose }) {
  return (
    <div className="payment-success-banner">
      <span>✓ Заказ #{orderId} оплачен! Спасибо за покупку.</span>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('products');
  const [modal, setModal] = useState({ open: false, product: null });
  const [bgColor, setBgColor] = useState(() => {
    try { return localStorage.getItem('site-bg') || DEFAULT_BG; } catch { return DEFAULT_BG; }
  });
  const [successOrder, setSuccessOrder] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') return params.get('order');
    return null;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--bg', bgColor);
    try { localStorage.setItem('site-bg', bgColor); } catch {}
  }, [bgColor]);

  useEffect(() => {
    if (successOrder) {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      url.searchParams.delete('order');
      window.history.replaceState({}, '', url.toString());
    }
  }, [successOrder]);

  const openCreate = () => setModal({ open: true, product: null });
  const openEdit = (product) => setModal({ open: true, product });
  const closeModal = () => setModal({ open: false, product: null });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CartProvider>
          {successOrder && (
            <PaymentSuccessBanner orderId={successOrder} onClose={() => setSuccessOrder(null)} />
          )}
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
          <CartDrawer />
          <ColorPicker value={bgColor} onChange={setBgColor} />
        </CartProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
