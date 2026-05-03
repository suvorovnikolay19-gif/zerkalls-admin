const TAB_LABELS = { products: 'Товары', attributes: 'Характеристики', classes: 'Классы' };

export default function Header({ tab, onTabChange, onAdd }) {
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
      {tab === 'products' && (
        <button className="btn btn-primary" onClick={onAdd}>
          + Добавить товар
        </button>
      )}
    </header>
  );
}
