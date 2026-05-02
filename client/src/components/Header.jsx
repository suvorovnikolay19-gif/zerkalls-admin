export default function Header({ onAdd }) {
  return (
    <header className="header">
      <div className="header-logo">
        Admin<span>Panel</span>
      </div>
      <button className="btn btn-primary" onClick={onAdd}>
        + Добавить товар
      </button>
    </header>
  );
}
