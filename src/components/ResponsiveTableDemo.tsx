import React, { useState } from 'react';
import ResponsiveDataTable, { TableColumn } from './ResponsiveDataTable';

// Demo data
const demoData = [
  { id: '1', name: 'Fluffy', owner: 'John Doe', cageNumber: 1, score: 87, status: 'finalized', date: '2024-01-15' },
  { id: '2', name: 'Whiskers', owner: 'Jane Smith', cageNumber: 2, score: 74, status: 'draft', date: '2024-01-16' },
  { id: '3', name: 'Mittens', owner: 'Bob Johnson', cageNumber: 3, score: 92, status: 'finalized', date: '2024-01-17' },
  { id: '4', name: 'Shadow', owner: 'Alice Brown', cageNumber: 4, score: 68, status: 'draft', date: '2024-01-18' },
  { id: '5', name: 'Tiger', owner: 'Charlie Wilson', cageNumber: 5, score: 85, status: 'finalized', date: '2024-01-19' },
];

const ResponsiveTableDemo: React.FC = () => {
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  // Define columns
  const columns: TableColumn[] = [
    {
      key: 'cageNumber',
      label: 'Cage #',
      sortable: true,
      priority: 'high',
      align: 'center',
      width: '80px',
      render: (value) => (
        <strong style={{ 
          padding: '4px 8px',
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          color: '#0066cc'
        }}>
          {value}
        </strong>
      ),
      mobileRender: (row) => (
        <strong style={{ fontSize: '1.2em', color: '#0066cc' }}>
          Cage #{row.cageNumber}
        </strong>
      )
    },
    {
      key: 'name',
      label: 'Cat Name',
      sortable: true,
      priority: 'high',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
            {value}
          </div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>
            {row.owner}
          </div>
        </div>
      ),
      mobileRender: (row) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
            {row.name}
          </div>
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            Owner: {row.owner}
          </div>
        </div>
      )
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      priority: 'high',
      align: 'center',
      width: '100px',
      render: (value) => {
        const score = value || 0;
        const color = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
        return (
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '1.1em',
            color,
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: `${color}15`
          }}>
            {score}/100
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      priority: 'medium',
      align: 'center',
      render: (value) => (
        <span style={{
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '0.8em',
          fontWeight: '500',
          backgroundColor: value === 'finalized' ? '#d4edda' : '#fff3cd',
          color: value === 'finalized' ? '#155724' : '#856404',
          border: `1px solid ${value === 'finalized' ? '#c3e6cb' : '#ffeaa7'}`
        }}>
          {value === 'finalized' ? '✅ Final' : '📝 Draft'}
        </span>
      )
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      priority: 'low',
      render: (value) => {
        const date = new Date(value);
        return (
          <div>
            <div>{date.toLocaleDateString()}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
          </div>
        );
      }
    }
  ];

  // Sort data
  const sortedData = [...demoData].sort((a, b) => {
    let aValue = a[sortColumn as keyof typeof a];
    let bValue = b[sortColumn as keyof typeof b];

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle sort
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Expandable row content
  const renderExpandedContent = (row: any) => (
    <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Additional Details</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
        <div><strong>ID:</strong> {row.id}</div>
        <div><strong>Owner:</strong> {row.owner}</div>
        <div><strong>Score:</strong> {row.score}/100</div>
        <div><strong>Status:</strong> {row.status}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ color: '#333', marginBottom: '8px' }}>Responsive Data Table Demo</h2>
        <p style={{ color: '#666', fontSize: '16px' }}>
          This table adapts to different screen sizes. Try resizing your browser window!
        </p>
      </div>

      <ResponsiveDataTable
        data={paginatedData}
        columns={columns}
        loading={false}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        searchable={true}
        expandableRows={true}
        onRowExpand={renderExpandedContent}
        pagination={{
          page: currentPage,
          pageSize,
          total: sortedData.length,
          onPageChange: setCurrentPage
        }}
        emptyMessage="No cats found. Add some cats to see them here!"
        ariaLabel="Cat scoring results table"
        className="demo-table"
      />

      <div style={{ 
        marginTop: '32px', 
        padding: '16px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1565c0'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Features Demonstrated:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Mobile-first responsive design with card layout on small screens</li>
          <li>Touch-optimized controls with proper target sizes (44px minimum)</li>
          <li>Sortable columns with keyboard navigation support</li>
          <li>Search functionality across all data fields</li>
          <li>Expandable rows for additional details</li>
          <li>Pagination with accessible controls</li>
          <li>Proper ARIA labels and roles for screen readers</li>
          <li>Column priority system for responsive hiding</li>
        </ul>
      </div>
    </div>
  );
};

export default ResponsiveTableDemo;