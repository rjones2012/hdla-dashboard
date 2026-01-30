'use client';

import { useState } from 'react';
import { useExecutiveData } from '@/lib/hooks';
import { PageHeader } from '@/components/Navigation';
import { Card, MetricCard } from '@/components/Card';
import { LoadingPage, ErrorMessage } from '@/components/Loading';
import { Table } from '@/components/Table';
import { PARTNER_ORDER } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (value) => {
  if (value === 0) return '$0';
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatFullCurrency = (value) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function Toggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-hdla-magenta' : 'bg-gray-300'}`}></div>
        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
      </div>
      <span className="ml-2 text-sm font-medium text-hdla-text">{label}</span>
    </label>
  );
}

export default function ExecutiveSummaryPage() {
  const [includePR, setIncludePR] = useState(true);
  const { data, loading, error, refetch } = useExecutiveData();

  if (loading) return <LoadingPage />;
  if (error) return <ErrorMessage message={error} retry={refetch} />;
  if (!data) return null;

  // Partner table data
  const partnerTableData = PARTNER_ORDER.map(p => ({
    partner: p,
    o: data.feeByPartnerO?.[p] || 0,
    pr: data.feeByPartnerPR?.[p] || 0,
    combined: (data.feeByPartnerO?.[p] || 0) + (data.feeByPartnerPR?.[p] || 0),
  }));

  // PM table data - sort by combined descending
  const pmTableData = Object.keys(data.feeByPM_O || {})
    .map(pm => ({
      pm,
      o: data.feeByPM_O?.[pm] || 0,
      pr: data.feeByPM_PR?.[pm] || 0,
      combined: (data.feeByPM_O?.[pm] || 0) + (data.feeByPM_PR?.[pm] || 0),
    }))
    .sort((a, b) => b.combined - a.combined);

  // Chart data for partner - respects toggle
  const partnerChartData = PARTNER_ORDER.map(p => ({
    name: p,
    O: data.feeByPartnerO?.[p] || 0,
    PR: includePR ? (data.feeByPartnerPR?.[p] || 0) : 0,
  }));

  // Chart data for PM - respects toggle
  const pmChartData = pmTableData.slice(0, 6).map(row => ({
    name: row.pm,
    O: row.o,
    PR: includePR ? row.pr : 0,
  }));

  // Monthly chart data - respects toggle
  const monthlyChartData = (data.monthlyProjections || []).map(m => ({
    name: m.month,
    O: m.o || 0,
    PR: includePR ? (m.pr || 0) : 0,
  }));

  // Monthly table data
  const monthlyTableData = (data.monthlyProjections || []).map(m => ({
    month: m.month,
    o: m.o || 0,
    pr: m.pr || 0,
    combined: (m.o || 0) + (m.pr || 0),
  }));

  const partnerColumns = [
    { header: 'Partner', key: 'partner' },
    { header: 'O', key: 'o', align: 'right', render: (v) => formatFullCurrency(v) },
    { header: 'PR', key: 'pr', align: 'right', render: (v) => formatFullCurrency(v) },
    { header: 'Combined', key: 'combined', align: 'right', render: (v) => formatFullCurrency(v) },
  ];

  const pmColumns = [
    { header: 'PM', key: 'pm' },
    { header: 'O', key: 'o', align: 'right', render: (v) => formatFullCurrency(v) },
    { header: 'PR', key: 'pr', align: 'right', render: (v) => formatFullCurrency(v) },
    { header: 'Combined', key: 'combined', align: 'right', render: (v) => formatFullCurrency(v) },
  ];

  const monthlyColumns = [
    { header: 'Month', key: 'month' },
    { header: 'O', key: 'o', align: 'right', render: (v) => formatFullCurrency(v) },
    { header: 'PR', key: 'pr', align: 'right', render: (v) => formatFullCurrency(v) },
    { header: 'Combined', key: 'combined', align: 'right', render: (v) => formatFullCurrency(v) },
  ];

  // Totals for forecast
  const totalForecastO = monthlyTableData.reduce((sum, m) => sum + m.o, 0);
  const totalForecastPR = monthlyTableData.reduce((sum, m) => sum + m.pr, 0);
  const totalForecastCombined = totalForecastO + totalForecastPR;

  return (
    <div>
      <PageHeader 
        title="Executive Summary" 
        subtitle="Under contract and projected work overview"
      />

      {/* Fee Remaining Section */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Fee Remaining</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <MetricCard 
          label="Under Contract (O)" 
          value={formatFullCurrency(data.totalFeeO || 0)}
        />
        <MetricCard 
          label="Projected (PR)" 
          value={formatFullCurrency(data.totalFeePR || 0)}
        />
        <MetricCard 
          label="Combined" 
          value={formatFullCurrency((data.totalFeeO || 0) + (data.totalFeePR || 0))}
        />
        <MetricCard 
          label="Projects (O)" 
          value={data.projectCountO || 0}
        />
        <MetricCard 
          label="Clients (O)" 
          value={data.clientCount || 0}
        />
      </div>

      {/* Historical & Forecast Averages */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Historical & Forecast Averages</h2>
      
      <h3 className="text-xs font-medium text-hdla-muted uppercase tracking-wide mb-2">Rolling 12-Month Actuals</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard 
          label="Avg Billing/Mo" 
          value={formatFullCurrency(data.avgBillingMo || 0)}
        />
        <MetricCard 
          label="Avg Expenses/Mo" 
          value={formatFullCurrency(data.avgExpensesMo || 0)}
        />
        <MetricCard 
          label="Avg Margin" 
          value={`${((data.avgMargin || 0) * 100).toFixed(1)}%`}
        />
      </div>

      <h3 className="text-xs font-medium text-hdla-muted uppercase tracking-wide mb-2">3-Month Forecast Averages</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard 
          label="Avg/Mo (O)" 
          value={formatFullCurrency(data.avg3moO || 0)}
        />
        <MetricCard 
          label="Avg/Mo (PR)" 
          value={formatFullCurrency(data.avg3moPR || 0)}
        />
        <MetricCard 
          label="Avg/Mo (Combined)" 
          value={formatFullCurrency((data.avg3moO || 0) + (data.avg3moPR || 0))}
        />
      </div>

      <h3 className="text-xs font-medium text-hdla-muted uppercase tracking-wide mb-2">6-Month Forecast Averages</h3>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard 
          label="Avg/Mo (O)" 
          value={formatFullCurrency(data.avg6moO || 0)}
        />
        <MetricCard 
          label="Avg/Mo (PR)" 
          value={formatFullCurrency(data.avg6moPR || 0)}
        />
        <MetricCard 
          label="Avg/Mo (Combined)" 
          value={formatFullCurrency((data.avg6moO || 0) + (data.avg6moPR || 0))}
        />
      </div>

      {/* Fee Remaining by Partner & PM */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Fee Remaining by Partner & PM</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Partner Chart */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-hdla-muted">By Partner {includePR ? '(O + PR)' : '(O only)'}</h3>
            <Toggle label="Include PR" checked={includePR} onChange={setIncludePR} />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={partnerChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatFullCurrency(v)} />
              <Legend />
              <Bar dataKey="O" stackId="a" fill="#E00087" name="O" />
              {includePR && <Bar dataKey="PR" stackId="a" fill="#ff69b4" name="PR" />}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* PM Chart */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-hdla-muted">By PM {includePR ? '(O + PR)' : '(O only)'}</h3>
            <Toggle label="Include PR" checked={includePR} onChange={setIncludePR} />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pmChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatFullCurrency(v)} />
              <Legend />
              <Bar dataKey="O" stackId="a" fill="#E00087" name="O" />
              {includePR && <Bar dataKey="PR" stackId="a" fill="#ff69b4" name="PR" />}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Partner & PM Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <Table columns={partnerColumns} data={partnerTableData} />
        </Card>
        <Card>
          <Table columns={pmColumns} data={pmTableData} />
        </Card>
      </div>

      {/* Projected Billing (Monthly Forecast) */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Projected Billing (Monthly Forecast)</h2>
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-hdla-muted">Monthly Projected Billing {includePR ? '(O + PR)' : '(O only)'}</h3>
          <Toggle label="Include PR" checked={includePR} onChange={setIncludePR} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatFullCurrency(v)} />
            <Legend />
            <Bar dataKey="O" stackId="a" fill="#E00087" name="O" />
            {includePR && <Bar dataKey="PR" stackId="a" fill="#ff69b4" name="PR" />}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Forecast Totals */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard 
          label="Total Forecast (O)" 
          value={formatFullCurrency(totalForecastO)}
        />
        <MetricCard 
          label="Total Forecast (PR)" 
          value={formatFullCurrency(totalForecastPR)}
        />
        <MetricCard 
          label="Total Forecast (Combined)" 
          value={formatFullCurrency(totalForecastCombined)}
        />
      </div>

      {/* Monthly Table */}
      <Card>
        <Table columns={monthlyColumns} data={monthlyTableData} />
      </Card>
    </div>
  );
}
