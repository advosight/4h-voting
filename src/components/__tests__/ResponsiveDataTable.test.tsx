import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ResponsiveDataTable, { TableColumn } from '../ResponsiveDataTable';

// Mock useMediaQuery
const mockUseMediaQuery = jest.fn();
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => mockUseMediaQuery(),
    useTheme: () => actual.createTheme()
  };
});

// Test data
const testData = [
  { id: '1', name: 'John Doe', age: 30, email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', age: 25, email: 'jane@example.com', status: 'inactive' },
  { id: '3', name: 'Bob Johnson', age: 35, email: 'bob@example.com', status: 'active' },
];

const testColumns: TableColumn[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    priority: 'high',
    render: (value) => <strong>{value}</strong>
  },
  {
    key: 'age',
    label: 'Age',
    sortable: true,
    priority: 'medium',
    align: 'center'
  },
  {
    key: 'email',
    label: 'Email',
    priority: 'low'
  },
  {
    key: 'status',
    label: 'Status',
    priority: 'high',
    render: (value) => (
      <span className={`status-${value}`}>{value}</span>
    )
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ResponsiveDataTable', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false); // Default to desktop
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders table with data on desktop', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('renders mobile card view on mobile devices', () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile

      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          mobileCardView={true}
        />
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getAllByText('Name:')).toHaveLength(3);
    });

    it('renders empty state when no data', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={[]}
          columns={testColumns}
          emptyMessage="No data found"
        />
      );

      expect(screen.getByText('No data found')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          loading={true}
        />
      );

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('calls onSort when sortable column header is clicked', async () => {
      const mockOnSort = jest.fn();
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          onSort={mockOnSort}
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      fireEvent.click(nameHeader);

      expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('toggles sort direction on repeated clicks', async () => {
      const mockOnSort = jest.fn();
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          onSort={mockOnSort}
          sortColumn="name"
          sortDirection="asc"
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      fireEvent.click(nameHeader);

      expect(mockOnSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('supports keyboard navigation for sorting', async () => {
      const mockOnSort = jest.fn();
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          onSort={mockOnSort}
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      nameHeader.focus();
      fireEvent.keyDown(nameHeader, { key: 'Enter' });

      expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('displays sort icons correctly', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          sortColumn="name"
          sortDirection="asc"
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('Search Functionality', () => {
    it('renders search input when searchable is true', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          searchable={true}
        />
      );

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('filters data based on search term', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          searchable={true}
        />
      );

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).toBeInTheDocument(); // Contains "John"
    });

    it('shows no results when search term matches nothing', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          searchable={true}
          emptyMessage="No matches found"
        />
      );

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'xyz123');

      expect(screen.getByText('No matches found')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    const paginationProps = {
      page: 1,
      pageSize: 2,
      total: 3,
      onPageChange: jest.fn()
    };

    it('renders pagination controls', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          pagination={paginationProps}
        />
      );

      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('calls onPageChange when pagination buttons are clicked', () => {
      const mockOnPageChange = jest.fn();
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          pagination={{
            ...paginationProps,
            onPageChange: mockOnPageChange
          }}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('disables previous button on first page', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          pagination={paginationProps}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          pagination={{
            ...paginationProps,
            page: 2
          }}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Expandable Rows', () => {
    const expandableProps = {
      expandableRows: true,
      onRowExpand: jest.fn(() => <div>Expanded content</div>)
    };

    it('renders expand buttons in mobile card view', () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          mobileCardView={true}
          {...expandableProps}
        />
      );

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      expect(expandButtons).toHaveLength(3);
    });

    it('expands and collapses rows in mobile view', async () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile
      
      const mockOnRowExpand = jest.fn(() => <div>Expanded content</div>);
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          mobileCardView={true}
          expandableRows={true}
          onRowExpand={mockOnRowExpand}
        />
      );

      const expandButton = screen.getAllByRole('button', { name: /expand/i })[0];
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(mockOnRowExpand).toHaveBeenCalledWith(testData[0]);
      });

      // Click again to collapse
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('makes table rows clickable when expandable', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          {...expandableProps}
        />
      );

      const rows = screen.getAllByRole('row');
      const dataRow = rows[1]; // First data row (skip header)
      expect(dataRow).toHaveClass('expandable-row');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          ariaLabel="Test data table"
        />
      );

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Test data table');
    });

    it('has proper column headers with roles', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
        />
      );

      testColumns.forEach(column => {
        expect(screen.getByRole('columnheader', { name: new RegExp(column.label, 'i') }))
          .toBeInTheDocument();
      });
    });

    it('has proper row and cell roles', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
        />
      );

      expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
      expect(screen.getAllByRole('cell')).toHaveLength(12); // 3 rows × 4 columns
    });

    it('supports keyboard navigation for expand buttons', () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          mobileCardView={true}
          expandableRows={true}
          onRowExpand={() => <div>Expanded</div>}
        />
      );

      const expandButton = screen.getAllByRole('button', { name: /expand/i })[0];
      expandButton.focus();
      expect(expandButton).toHaveFocus();
    });
  });

  describe('Responsive Behavior', () => {
    it('shows only high priority columns on mobile', () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
          mobileCardView={false} // Force table view on mobile
        />
      );

      // Should show high priority columns (name, status) but not low priority (email)
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: /email/i })).not.toBeInTheDocument();
    });

    it('shows all columns on desktop', () => {
      mockUseMediaQuery.mockReturnValue(false); // Desktop
      
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
        />
      );

      testColumns.forEach(column => {
        expect(screen.getByRole('columnheader', { name: new RegExp(column.label, 'i') }))
          .toBeInTheDocument();
      });
    });

    it('uses mobile render function when provided', () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile
      
      const columnsWithMobileRender: TableColumn[] = [
        {
          key: 'name',
          label: 'Name',
          priority: 'high',
          render: (value) => <span>{value}</span>,
          mobileRender: (row) => <div data-testid={`mobile-name-${row.id}`}>{row.name} (Mobile)</div>
        }
      ];

      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={columnsWithMobileRender}
          mobileCardView={true}
        />
      );

      expect(screen.getByTestId('mobile-name-1')).toHaveTextContent('John Doe (Mobile)');
    });
  });

  describe('Custom Rendering', () => {
    it('uses custom render functions', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
        />
      );

      // Name column should be rendered as <strong>
      const nameCell = screen.getByText('John Doe');
      expect(nameCell.tagName).toBe('STRONG');

      // Status column should have custom class
      const statusCells = screen.getAllByText('active');
      expect(statusCells[0]).toHaveClass('status-active');
    });

    it('applies column alignment classes', () => {
      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={testColumns}
        />
      );

      const ageHeader = screen.getByRole('columnheader', { name: /age/i });
      expect(ageHeader).toHaveClass('align-center');
    });

    it('applies sticky column classes when specified', () => {
      const stickyColumns: TableColumn[] = [
        { ...testColumns[0], sticky: true }
      ];

      renderWithTheme(
        <ResponsiveDataTable
          data={testData}
          columns={stickyColumns}
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader).toHaveClass('sticky-column');
    });
  });
});