import { useState } from 'react';
import { useCart } from '../CartContext';
import { paymentApi } from '../api';

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, clearCart, isOpen, setIsOpen, totalPrice } = useCart();
  const [step, setStep] = useState('cart');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setIsOpen(false);
    setStep('cart');
    setError('');
  };

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await paymentApi.create({
        items,
        customerName: form.name || null,
        customerPhone: form.phone || null,
        customerEmail: form.email || null,
      });
      clearCart();
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании платежа. Попробуйте позже.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={handleClose} />
      <aside className="cart-drawer">
        <div className="cart-header">
          <span className="cart-title">Корзина</span>
          <button className="btn btn-ghost btn-icon" onClick={handleClose} style={{ fontSize: 16 }}>✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <p>Корзина пуста</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="cart-item-del" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total">
              <span>Итого</span>
              <span className="cart-total-price">{totalPrice.toLocaleString('ru-RU')} ₽</span>
            </div>

            {step === 'cart' && (
              <div className="cart-footer">
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep('checkout')}>
                  Оформить заказ
                </button>
              </div>
            )}

            {step === 'checkout' && (
              <div className="cart-checkout">
                <p className="cart-checkout-hint">Контактные данные (необязательно)</p>
                <input
                  className="form-input"
                  placeholder="Ваше имя"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  disabled={loading}
                />
                <input
                  className="form-input"
                  placeholder="Телефон"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  disabled={loading}
                />
                <input
                  className="form-input"
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={loading}
                />
                {error && <div className="form-error">{error}</div>}
                <div className="cart-checkout-actions">
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePay} disabled={loading}>
                    {loading ? 'Переходим к оплате…' : `Оплатить ${totalPrice.toLocaleString('ru-RU')} ₽`}
                  </button>
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setStep('cart'); setError(''); }} disabled={loading}>
                    Назад
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
