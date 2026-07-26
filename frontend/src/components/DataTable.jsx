import React, { useState } from 'react';

const DataTable = ({ columns, data, loading, searchPlaceholder = 'Search records...' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter records based on search term
  const filteredData = data.filter((row) => {
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') {
        // Handle nested fields like user.email or class.className
        return Object.values(val).some(nestedVal => 
          String(nestedVal).toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  return (
    <div className="table-wrapper glass-panel">
      <div className="table-header-toolbar">
        <div className="table-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="table-search-input"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="table-count-badge">
          {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'} found
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width || 'auto' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="table-loading-state">
                  <div className="spinner"></div>
                  <span>Loading records...</span>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty-state">
                  No records found matching your query.
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                <tr key={row._id || rowIdx} className="table-row-hover">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
