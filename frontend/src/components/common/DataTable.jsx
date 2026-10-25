import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Button } from './Button';

export const DataTable = ({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  emptyDescription = 'There are currently no records to display.',
  emptyIcon,
  emptyActionText,
  onEmptyAction,
  sortField,
  sortOrder = 'asc',
  onSort,
  pagination,
  onPageChange,
  keyField = 'id',
}) => {
  const handleSort = (key, sortable) => {
    if (!sortable || !onSort) return;
    const nextOrder = sortField === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, nextOrder);
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = sortField === col.key;
              return (
                <th
                  key={col.key || col.header}
                  className={col.sortable ? 'sortable' : ''}
                  onClick={() => handleSort(col.key, col.sortable)}
                  style={{ textAlign: col.align || 'left', width: col.width }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span style={{ display: 'inline-flex', flexDirection: 'column', color: isSorted ? 'var(--primary-600)' : 'var(--border-dark)' }}>
                        {isSorted && sortOrder === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : isSorted && sortOrder === 'desc' ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronUp size={14} style={{ opacity: 0.4 }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '2rem' }}>
                <LoadingSkeleton lines={5} height={32} />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 0 }}>
                <EmptyState
                  title={emptyMessage}
                  description={emptyDescription}
                  icon={emptyIcon}
                  actionText={emptyActionText}
                  onAction={onEmptyAction}
                />
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const rowKey = row[keyField] || index;
              return (
                <tr key={rowKey}>
                  {columns.map((col) => (
                    <td key={col.key || col.header} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row, index) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {pagination && pagination.pages > 1 && (
        <div className="pagination-bar">
          <div>
            Showing{' '}
            <strong>{(pagination.page - 1) * pagination.per_page + (data.length > 0 ? 1 : 0)}</strong> to{' '}
            <strong>
              {Math.min(pagination.page * pagination.per_page, pagination.total)}
            </strong>{' '}
            of <strong>{pagination.total}</strong> results
          </div>
          <div className="pagination-controls">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => onPageChange(pagination.page - 1)}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <span style={{ margin: '0 0.5rem', fontWeight: 500, fontSize: '0.8125rem' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => onPageChange(pagination.page + 1)}
              icon={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
