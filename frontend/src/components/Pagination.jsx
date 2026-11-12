export default function Pagination({ currentPage, totalPages, onPageChange, perPage, onPerPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <div className="pagination-controls">
        <button className="secondary small" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>← Назад</button>
        <span className="muted">{currentPage} из {totalPages}</span>
        <button className="secondary small" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Вперед →</button>
      </div>
      <div className="per-page-inline">
        <label>Показывать по:</label>
        <select value={perPage} onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}>
          <option value="5">5</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </div>
    </div>
  );
}