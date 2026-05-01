export default function Header({ onAdd }) {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">🪞</div>
        <span>Zerkalls Admin</span>
      </div>
      <button className="btn btn-primary" onClick={onAdd}>
        + Добавить товар
      </button>
    </header>
  );
}
