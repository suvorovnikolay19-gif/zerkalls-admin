import { useCart } from '../CartContext';

const TAB_LABELS = { products: 'Товары', attributes: 'Характеристики', classes: 'Классы' };

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

export default function Header({ tab, onTabChange, onAdd }) {
  const { totalCount, setIsOpen } = useCart();

  return (
    <header className="header">
      <div className="header-logo">
        Admin<span>Panel</span>
      </div>
      <nav className="header-tabs">
        {Object.keys(TAB_LABELS).map((t) => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => onTabChange(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>
      <div className="header-right">
        {tab === 'products' && (
          <button className="btn btn-primary" onClick={onAdd}>
            + Добавить товар
          </button>
        )}
        <button className="cart-btn" onClick={() => setIsOpen(true)} title="Корзина">
          <CartIcon />
          {totalCount > 0 && <span className="cart-badge">{totalCount > 99 ? '99+' : totalCount}</span>}
        </button>
      </div>
    </header>
  );
}
