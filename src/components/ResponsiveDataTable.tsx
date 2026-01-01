import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useResponsive } from '../contexts/ResponsiveContext';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  sticky?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  mobileRender?: (row: T) => React.ReactNode;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  priority?: 'high' | 'medium' | 'low'; // For responsive column hiding
  landscapeOnly?: boolean; // Only show in landscape mode
  portraitHidden?: boolean; // Hide in portrait mode
  tabletOptimized?: boolean; // Optimized for tablet display
}

export interface ResponsiveDataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  searchable?: boolean;
  filterable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  mobileCardView?: boolean;
  expandableRows?: boolean;
  onRowExpand?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  ariaLabel?: string;
}

export const ResponsiveDataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onSort,
  sortColumn,
  sortDirection,
  searchable = false,
  filterable = false,
  pagination,
  mobileCardView = true,
  expandableRows = false,
  onRowExpand,
  emptyMessage = 'No data available',
  className = '',
  ariaLabel = 'Data table'
}: ResponsiveDataTableProps<T>) => {
  const theme = useTheme();
  const legacyIsMobile = useMediaQuery(theme.breakpoints.down('md'));
  const legacyIsTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  // Use responsive context for enhanced device detection
  const {
    isMobile,
    isTablet,
    orientation,
    isChangingOrientation,
    shouldUseCardLayout,
    shouldUseHorizontalScroll,
    getResponsiveSpacing,
    isLandscapeOptimized
  } = useResponsive();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [tableLayout, setTableLayout] = useState<'card' | 'table' | 'horizontal-scroll'>('table');
  const tableRef = useRef<HTMLDivElement>(null);

  // Determine optimal table layout based on device and orientation
  useEffect(() => {
    if (shouldUseCardLayout()) {
      setTableLayout('card');
    } else if (shouldUseHorizontalScroll() && isLandscapeOptimized) {
      setTableLayout('horizontal-scroll');
    } else {
      setTableLayout('table');
    }
  }, [shouldUseCardLayout, shouldUseHorizontalScroll, isLandscapeOptimized]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row =>
      columns.some(column => {
        const value = row[column.key];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Handle sort
  const handleSort = (column: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  };

  // Handle row expansion
  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Get visible columns based on screen size and orientation
  const visibleColumns = useMemo(() => {
    let filtered = columns.filter(col => {
      // Orientation-based filtering
      if (orientation === 'portrait' && col.portraitHidden) return false;
      if (orientation === 'landscape' && col.landscapeOnly === false) return false;
      if (orientation === 'portrait' && col.landscapeOnly) return false;
      
      return true;
    });

    // Device and layout-based filtering
    if (tableLayout === 'card') {
      // In card layout, show fewer columns initially
      filtered = filtered.filter(col => 
        col.priority === 'high' || 
        (!col.priority && columns.indexOf(col) < (isLandscapeOptimized ? 3 : 2))
      );
    } else if (isMobile && tableLayout === 'horizontal-scroll') {
      // In horizontal scroll on mobile, show more columns but prioritize
      filtered = filtered.filter(col => 
        col.priority !== 'low' && 
        (col.priority === 'high' || col.priority === 'medium' || !col.priority)
      );
    } else if (isTablet && orientation === 'portrait') {
      // Tablet portrait - moderate filtering
      filtered = filtered.filter(col => 
        col.priority !== 'low' || col.tabletOptimized
      );
    }

    return filtered;
  }, [columns, isMobile, isTablet, orientation, tableLayout, isLandscapeOptimized]);

  // Render sort icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="sort-icon neutral" aria-hidden="true">↕️</span>;
    }
    return (
      <span className="sort-icon active" aria-hidden="true">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Mobile card view with orientation optimization
  const renderMobileCard = (row: T, index: number) => {
    const rowId = row.id || index.toString();
    const isExpanded = expandedRows.has(rowId);
    const primaryColumns = visibleColumns.slice(0, isLandscapeOptimized ? 3 : 2);
    const secondaryColumns = visibleColumns.slice(isLandscapeOptimized ? 3 : 2);

    return (
      <div 
        key={rowId} 
        className={`mobile-table-card ${orientation} ${isChangingOrientation ? 'orientation-changing' : ''}`}
        style={{
          transition: isChangingOrientation ? 'all 0.3s ease-in-out' : 'none',
          opacity: isChangingOrientation ? 0.7 : 1
        }}
      >
        <div 
          className="card-header"
          style={{
            display: 'grid',
            gridTemplateColumns: isLandscapeOptimized && orientation === 'landscape' ? 
              'repeat(2, 1fr) auto' : '1fr auto',
            gap: getResponsiveSpacing(8),
            alignItems: 'start'
          }}
        >
          {primaryColumns.map(column => (
            <div key={column.key} className="card-field">
              <span className="field-label">{column.label}:</span>
              <span className="field-value">
                {column.mobileRender ? 
                  column.mobileRender(row) : 
                  column.render ? 
                    column.render(row[column.key], row) : 
                    row[column.key]
                }
              </span>
            </div>
          ))}
          
          {(expandableRows || secondaryColumns.length > 0) && (
            <button
              className="expand-button touch-target"
              onClick={() => toggleRowExpansion(rowId)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} row details`}
              style={{
                minHeight: '44px',
                minWidth: '44px',
                gridColumn: isLandscapeOptimized && orientation === 'landscape' ? '3' : '2'
              }}
            >
              <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
          )}
        </div>
        
        {isExpanded && (
          <div 
            className="card-details"
            style={{
              display: 'grid',
              gridTemplateColumns: isLandscapeOptimized && orientation === 'landscape' ? 
                'repeat(2, 1fr)' : '1fr',
              gap: getResponsiveSpacing(8),
              marginTop: getResponsiveSpacing(12),
              paddingTop: getResponsiveSpacing(12),
              borderTop: '1px solid #e0e0e0'
            }}
          >
            {secondaryColumns.map(column => (
              <div key={column.key} className="card-field">
                <span className="field-label">{column.label}:</span>
                <span className="field-value">
                  {column.mobileRender ? 
                    column.mobileRender(row) : 
                    column.render ? 
                      column.render(row[column.key], row) : 
                      row[column.key]
                  }
                </span>
              </div>
            ))}
            
            {expandableRows && onRowExpand && (
              <div 
                className="expanded-content"
                style={{
                  gridColumn: '1 / -1',
                  marginTop: getResponsiveSpacing(8)
                }}
              >
                {onRowExpand(row)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Desktop/tablet table view with orientation support
  const renderTableView = () => (
    <div 
      className={`table-container ${tableLayout} ${orientation}`} 
      ref={tableRef}
      style={{
        overflowX: tableLayout === 'horizontal-scroll' ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
        transition: isChangingOrientation ? 'all 0.3s ease-in-out' : 'none',
        opacity: isChangingOrientation ? 0.7 : 1,
        pointerEvents: isChangingOrientation ? 'none' : 'auto'
      }}
    >
      <table 
        className="responsive-table"
        role="table"
        aria-label={ariaLabel}
        style={{
          minWidth: tableLayout === 'horizontal-scroll' ? 'max-content' : '100%',
          fontSize: isMobile ? '0.75rem' : isTablet ? '0.875rem' : '1rem'
        }}
      >
        <thead>
          <tr role="row">
            {visibleColumns.map(column => (
              <th
                key={column.key}
                role="columnheader"
                className={`
                  ${column.sortable ? 'sortable' : ''}
                  ${column.sticky ? 'sticky-column' : ''}
                  ${column.align ? `align-${column.align}` : ''}
                `}
                style={{
                  width: column.width,
                  minWidth: column.minWidth || (isMobile ? '80px' : '120px'),
                  padding: isMobile ? '8px 4px' : isTablet ? '12px 8px' : '16px'
                }}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
                tabIndex={column.sortable ? 0 : -1}
                onKeyDown={(e) => {
                  if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleSort(column.key);
                  }
                }}
                aria-sort={
                  sortColumn === column.key 
                    ? sortDirection === 'asc' ? 'ascending' : 'descending'
                    : column.sortable ? 'none' : undefined
                }
              >
                <div className="header-content">
                  <span>{column.label}</span>
                  {column.sortable && renderSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => {
            const rowId = row.id || index.toString();
            const isExpanded = expandedRows.has(rowId);
            
            return (
              <React.Fragment key={rowId}>
                <tr 
                  role="row"
                  className={expandableRows ? 'expandable-row' : ''}
                  onClick={expandableRows ? () => toggleRowExpansion(rowId) : undefined}
                >
                  {visibleColumns.map(column => (
                    <td
                      key={column.key}
                      role="cell"
                      className={`
                        ${column.sticky ? 'sticky-column' : ''}
                        ${column.align ? `align-${column.align}` : ''}
                      `}
                      style={{
                        padding: isMobile ? '8px 4px' : isTablet ? '12px 8px' : '16px',
                        fontSize: 'inherit'
                      }}
                    >
                      {column.render ? 
                        column.render(row[column.key], row) : 
                        row[column.key]
                      }
                    </td>
                  ))}
                </tr>
                
                {expandableRows && isExpanded && onRowExpand && (
                  <tr className="expanded-row">
                    <td colSpan={visibleColumns.length} className="expanded-cell">
                      {onRowExpand(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div 
      className={`responsive-data-table ${className} ${orientation} ${tableLayout}`}
      style={{
        transition: isChangingOrientation ? 'all 0.3s ease-in-out' : 'none'
      }}
    >
      {/* Search and filters */}
      {searchable && (
        <div className="table-controls">
          <div className="search-container">
            <input
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input touch-target"
              aria-label="Search table data"
              style={{
                minHeight: '44px',
                fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
                padding: getResponsiveSpacing(12)
              }}
            />
            <span className="search-icon" aria-hidden="true">🔍</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="loading-spinner"></div>
          <span>Loading data...</span>
        </div>
      )}

      {/* Table content */}
      {!loading && (
        <>
          {filteredData.length === 0 ? (
            <div className="empty-state" role="status">
              <div className="empty-icon" aria-hidden="true">📊</div>
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <>
              {tableLayout === 'card' && mobileCardView ? (
                <div 
                  className="mobile-cards-container"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: getResponsiveSpacing(12)
                  }}
                >
                  {filteredData.map((row, index) => renderMobileCard(row, index))}
                </div>
              ) : (
                renderTableView()
              )}
            </>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="table-pagination" role="navigation" aria-label="Table pagination">
          <button
            className="pagination-btn touch-target"
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            aria-label="Previous page"
          >
            ← Previous
          </button>
          
          <span className="pagination-info">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
          </span>
          
          <button
            className="pagination-btn touch-target"
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ResponsiveDataTable;