'use client';

import { useTrendsData } from '@/lib/hooks';
import { PageHeader } from '@/components/Navigation';
import { Card } from '@/components/Card';
import { LineChartComponent } from '@/components/Charts';
import { Table } from '@/components/Table';
import { LoadingPage, ErrorMessage } from '@/components/Loading';

const formatCurrency = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export default function TrendsPage() {
  const { data, loading, error, refetch } = useTrendsData();

  if (loading) return <LoadingPage />;
  if (error) return <ErrorMessage message={error} retry={refetch} />;
  if (!data) return null;

  const columns = [
    { header: 'Month', key: 'month' },
    { 
      header: 'Under Contract', 
      key: 'underContract', 
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    { 
      header: 'Pipeline', 
      key: 'pipeline', 
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    { 
      header: 'Billing', 
      key: 'billing', 
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    { 
      header: 'Expenses', 
      key: 'expenses', 
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    { 
      header: 'Net', 
      key: 'net', 
      align: 'right',
      render: (val, row) => {
        const net = row.billing - row.expenses;
        return (
          <span className={net >= 0 ? 'text-status-healthy' : 'text-status-hire'}>
            {formatCurrency(net)}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader 
        title="Trends" 
        subtitle="Historical billing, expenses, and financial trends"
      />

      {/* Billing vs Expenses chart */}
      <Card className="mb-6">
        <LineChartComponent 
          data={data.months}
          lines={[
            { dataKey: 'billing', name: 'Billing' },
            { dataKey: 'expenses', name: 'Expenses' },
          ]}
          xKey="month"
          title="Billing vs Expenses"
        />
      </Card>

      {/* Rolling averages chart */}
      <Card className="mb-6">
        <LineChartComponent 
          data={data.months}
          lines={[
            { dataKey: 'billingRolling3', name: 'Billing (3-mo avg)' },
            { dataKey: 'expensesRolling3', name: 'Expenses (3-mo avg)' },
          ]}
          xKey="month"
          title="Rolling 3-Month Averages"
        />
      </Card>

      {/* Under Contract & Pipeline */}
      <Card className="mb-6">
        <LineChartComponent 
          data={data.months}
          lines={[
            { dataKey: 'underContract', name: 'Under Contract' },
            { dataKey: 'pipeline', name: 'Pipeline' },
          ]}
          xKey="month"
          title="Backlog: Under Contract vs Pipeline"
        />
      </Card>

      {/* Data table */}
      <Card>
        <h3 className="text-sm font-medium text-hdla-muted mb-4">Monthly Summary Data</h3>
        <Table columns={columns} data={data.months} />
      </Card>
    </div>
  );
}
