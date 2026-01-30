'use client';

import { useCapacityData } from '@/lib/hooks';
import { PageHeader } from '@/components/Navigation';
import { Card, StatusCard } from '@/components/Card';
import { Table } from '@/components/Table';
import { StatusBadge } from '@/components/Badge';
import { LoadingPage, ErrorMessage } from '@/components/Loading';
import { PRINCIPALS } from '@/lib/constants';

const formatCurrency = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export default function CapacityPage() {
  const { data, loading, error, refetch } = useCapacityData();

  if (loading) return <LoadingPage />;
  if (error) return <ErrorMessage message={error} retry={refetch} />;
  if (!data) return null;

  const tableData = PRINCIPALS.map(p => ({
    principal: p,
    ...data[p],
  }));

  const columns = [
    { header: 'Principal', key: 'principal' },
    { header: 'Name', key: 'name' },
    { header: 'Office', key: 'office' },
    { header: 'Team Size', key: 'teamSize', align: 'right' },
    { 
      header: 'Q1 Billing', 
      key: 'q1Billing', 
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    { 
      header: 'Q1 Capacity', 
      key: 'q1Capacity', 
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    { 
      header: 'Crunch %', 
      key: 'crunchPercent', 
      align: 'right',
      render: (val, row) => (
        <span className={`font-bold ${
          row.status === 'hire' ? 'text-status-hire' :
          row.status === 'watch' ? 'text-status-watch' :
          'text-status-healthy'
        }`}>
          {val}%
        </span>
      ),
    },
    { 
      header: 'Status', 
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const hireNow = tableData.filter(t => t.status === 'hire');
  const watch = tableData.filter(t => t.status === 'watch');
  const healthy = tableData.filter(t => t.status === 'healthy');

  return (
    <div>
      <PageHeader 
        title="Capacity" 
        subtitle="Team capacity scoring based on Q1 billing projections"
      />

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {PRINCIPALS.map(p => {
          const team = data[p];
          return (
            <StatusCard
              key={p}
              label={`${p} - ${team.office}`}
              value={`${team.crunchPercent}%`}
              status={team.status}
              description={`${team.teamSize} people · ${formatCurrency(team.q1Billing)} / ${formatCurrency(team.q1Capacity)}`}
            />
          );
        })}
      </div>

      {/* Main table */}
      <Card className="mb-6">
        <h3 className="text-sm font-medium text-hdla-muted mb-4">Team Capacity Details</h3>
        <Table columns={columns} data={tableData} />
      </Card>

      {/* Formula explanation */}
      <Card className="mb-6">
        <h3 className="text-sm font-medium text-hdla-muted mb-4">The Formula</h3>
        <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm mb-4">
          Crunch % = Q1 Projected Billing ÷ Q1 Capacity
          <br />
          Q1 Capacity = Team Size × $21,000/person/month × 3 months
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-healthy"></span>
            <span>&lt;100% = HEALTHY</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-watch"></span>
            <span>100-125% = WATCH</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-hire"></span>
            <span>&gt;125% = HIRE NOW</span>
          </div>
        </div>
      </Card>

      {/* Team rosters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PRINCIPALS.map(p => {
          const team = data[p];
          return (
            <Card key={p}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-hdla-text">Team {p}</h3>
                <StatusBadge status={team.status} />
              </div>
              <p className="text-sm text-hdla-muted mb-3">{team.name} · {team.office}</p>
              <div className="space-y-1">
                {team.members.map(member => (
                  <div key={member} className="text-sm text-hdla-text py-1 px-2 bg-gray-50 rounded">
                    {member}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
