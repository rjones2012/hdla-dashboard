'use client';

import { useState } from 'react';
import { usePipelineData } from '@/lib/hooks';
import { PageHeader } from '@/components/Navigation';
import { Card, MetricCard } from '@/components/Card';
import { LoadingPage, ErrorMessage } from '@/components/Loading';
import { Table } from '@/components/Table';
import { PARTNER_ORDER, PROB_MAP } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

function TabButton({ active, onClick, children, color }) {
  const baseClasses = "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors";
  const activeClasses = color === 'warning' 
    ? "bg-yellow-100 text-yellow-800 border-b-2 border-yellow-500"
    : color === 'critical'
    ? "bg-red-100 text-red-800 border-b-2 border-red-500"
    : "bg-hdla-magenta text-white";
  const inactiveClasses = "bg-gray-100 text-gray-600 hover:bg-gray-200";
  
  return (
    <button 
      onClick={onClick}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      {children}
    </button>
  );
}

export default function PipelinePage() {
  const [riskTab, setRiskTab] = useState('warning');
  const [lossTab, setLossTab] = useState('client');
  const { data, loading, error, refetch } = usePipelineData();

  if (loading) return <LoadingPage />;
  if (error) return <ErrorMessage message={error} retry={refetch} />;
  if (!data) return null;

  // Probability chart data
  const probOrder = ['H', 'M', 'L', 'XL'];
  const probChartData = probOrder.map(p => ({
    name: p,
    total: data.byProbability?.[p]?.reduce((sum, row) => sum + row.fee, 0) || 0,
    weighted: data.byProbability?.[p]?.reduce((sum, row) => sum + row.fee * (PROB_MAP[p] || 0), 0) || 0,
    count: data.byProbability?.[p]?.length || 0,
  }));

  // Probability table data
  const probTableData = probOrder.map(p => ({
    probability: p,
    count: data.byProbability?.[p]?.length || 0,
    totalFee: data.byProbability?.[p]?.reduce((sum, row) => sum + row.fee, 0) || 0,
    weightedFee: data.byProbability?.[p]?.reduce((sum, row) => sum + row.fee * (PROB_MAP[p] || 0), 0) || 0,
  }));

  // Partner chart data - include Unassigned
  const partnerKeys = [...PARTNER_ORDER];
  const unassignedTotal = data.openProposals?.filter(p => !p.Partner || p.Partner === '').reduce((sum, p) => sum + p.fee, 0) || 0;
  const unassignedWeighted = data.openProposals?.filter(p => !p.Partner || p.Partner === '').reduce((sum, p) => sum + p.fee * (PROB_MAP[p.Probability] || 0), 0) || 0;
  const unassignedCount = data.openProposals?.filter(p => !p.Partner || p.Partner === '').length || 0;
  
  const partnerChartData = partnerKeys.map(p => ({
    name: p,
    total: data.byPartner?.[p]?.fee || 0,
    weighted: data.byPartner?.[p]?.weighted || 0,
    count: data.byPartner?.[p]?.count || 0,
  }));
  
  if (unassignedCount > 0) {
    partnerChartData.push({
      name: 'Unassigned',
      total: unassignedTotal,
      weighted: unassignedWeighted,
      count: unassignedCount,
    });
  }

  // Partner table data
  const partnerTableData = partnerChartData.map(p => ({
    partner: p.name,
    count: p.count,
    totalFee: p.total,
    weightedFee: p.weighted,
  }));

  // Fee at risk
  const warningProposals = data.atRisk90 || [];
  const criticalProposals = data.atRisk180 || [];
  const warningFee = warningProposals.reduce((sum, p) => sum + p.fee, 0);
  const criticalFee = criticalProposals.reduce((sum, p) => sum + p.fee, 0);

  // Losses by category
  const allLosses = data.losses || [];
  const lossesByClient = {};
  const lossesByMarket = {};
  const lossesByPartner = {};
  
  allLosses.forEach(loss => {
    const client = loss.Client || 'Unknown';
    const market = loss.Market || 'Unknown';
    const partner = loss.Partner || 'Unassigned';
    
    if (!lossesByClient[client]) lossesByClient[client] = { count: 0, fee: 0 };
    lossesByClient[client].count++;
    lossesByClient[client].fee += loss.fee;
    
    if (!lossesByMarket[market]) lossesByMarket[market] = { count: 0, fee: 0 };
    lossesByMarket[market].count++;
    lossesByMarket[market].fee += loss.fee;
    
    if (!lossesByPartner[partner]) lossesByPartner[partner] = { count: 0, fee: 0 };
    lossesByPartner[partner].count++;
    lossesByPartner[partner].fee += loss.fee;
  });

  const lossClientData = Object.entries(lossesByClient)
    .map(([client, data]) => ({ client, ...data }))
    .sort((a, b) => b.fee - a.fee)
    .slice(0, 10);
  
  const lossMarketData = Object.entries(lossesByMarket)
    .map(([market, data]) => ({ market, ...data }))
    .sort((a, b) => b.fee - a.fee);
  
  const lossPartnerData = Object.entries(lossesByPartner)
    .map(([partner, data]) => ({ partner, ...data }))
    .sort((a, b) => b.fee - a.fee);

  // Top 10 clients by pipeline
  const clientPipeline = {};
  (data.openProposals || []).forEach(p => {
    const client = p.Client || 'Unknown';
    if (!clientPipeline[client]) clientPipeline[client] = { count: 0, fee: 0, weighted: 0, bestProb: 'XL' };
    clientPipeline[client].count++;
    clientPipeline[client].fee += p.fee;
    clientPipeline[client].weighted += p.fee * (PROB_MAP[p.Probability] || 0);
    // Track best probability
    const probRank = { H: 4, M: 3, L: 2, XL: 1 };
    if (probRank[p.Probability] > probRank[clientPipeline[client].bestProb]) {
      clientPipeline[client].bestProb = p.Probability;
    }
  });
  
  const topClientsData = Object.entries(clientPipeline)
    .map(([client, data]) => ({ client, ...data }))
    .sort((a, b) => b.fee - a.fee)
    .slice(0, 10);

  const totalLostFee = allLosses.reduce((sum, l) => sum + l.fee, 0);

  // Table columns
  const probColumns = [
    { header: 'Probability', key: 'probability' },
    { header: 'Count', key: 'count', align: 'right' },
    { header: 'Total_Fee', key: 'totalFee', align: 'right', render: formatFullCurrency },
    { header: 'Weighted_Fee', key: 'weightedFee', align: 'right', render: formatFullCurrency },
  ];

  const partnerColumns = [
    { header: 'Partner', key: 'partner' },
    { header: 'Count', key: 'count', align: 'right' },
    { header: 'Total_Fee', key: 'totalFee', align: 'right', render: formatFullCurrency },
    { header: 'Weighted_Fee', key: 'weightedFee', align: 'right', render: formatFullCurrency },
  ];

  const riskColumns = [
    { header: 'Project Name', key: 'Project Name' },
    { header: 'Client', key: 'Client' },
    { header: 'Partner', key: 'Partner' },
    { header: 'Market', key: 'Market' },
    { header: 'Fee', key: 'fee', align: 'right', render: formatFullCurrency },
    { header: 'Probability', key: 'Probability' },
    { header: 'Days Open', key: 'daysOpen', align: 'right' },
    { header: 'Submitted', key: 'Submitted', render: (v) => v ? new Date(v).toLocaleDateString() : '' },
  ];

  const lossClientColumns = [
    { header: 'Client', key: 'client' },
    { header: 'Count', key: 'count', align: 'right' },
    { header: 'Total_Fee', key: 'fee', align: 'right', render: formatFullCurrency },
  ];

  const lossMarketColumns = [
    { header: 'Market', key: 'market' },
    { header: 'Count', key: 'count', align: 'right' },
    { header: 'Total_Fee', key: 'fee', align: 'right', render: formatFullCurrency },
  ];

  const lossPartnerColumns = [
    { header: 'Partner', key: 'partner' },
    { header: 'Count', key: 'count', align: 'right' },
    { header: 'Total_Fee', key: 'fee', align: 'right', render: formatFullCurrency },
  ];

  const allLossColumns = [
    { header: 'Project Name', key: 'Project Name' },
    { header: 'Client', key: 'Client' },
    { header: 'Partner', key: 'Partner' },
    { header: 'Fee', key: 'fee', align: 'right', render: formatFullCurrency },
  ];

  const topClientColumns = [
    { header: 'Client', key: 'client' },
    { header: 'Count', key: 'count', align: 'right' },
    { header: 'Total_Fee', key: 'fee', align: 'right', render: formatFullCurrency },
    { header: 'Weighted_Fee', key: 'weighted', align: 'right', render: formatFullCurrency },
    { header: 'Best_Prob', key: 'bestProb' },
  ];

  return (
    <div>
      <PageHeader 
        title="Pipeline" 
        subtitle="Open proposals, fee at risk, and losses analysis"
      />

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <MetricCard 
          label="Open Proposals" 
          value={data.openProposals?.length || 0}
        />
        <MetricCard 
          label="Total Pipeline" 
          value={formatFullCurrency(data.totalOpen || 0)}
        />
        <MetricCard 
          label="Weighted Pipeline" 
          value={formatFullCurrency(data.totalWeighted || 0)}
        />
        <MetricCard 
          label="At Risk (90+ days)" 
          value={formatFullCurrency(warningFee)}
        />
        <MetricCard 
          label="Critical (180+ days)" 
          value={formatFullCurrency(criticalFee)}
        />
      </div>

      {/* Pipeline by Probability */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Pipeline by Probability</h2>
      <p className="text-sm text-hdla-muted mb-3">XL = 0%, L = 25%, M = 65%, H = 85%</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <h3 className="text-sm font-medium text-hdla-muted mb-3">Total Fee by Probability</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={probChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatFullCurrency(v)} />
              <Bar dataKey="total" fill="#E00087" name="Total Fee" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-hdla-muted mb-3">Weighted Fee by Probability</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={probChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatFullCurrency(v)} />
              <Bar dataKey="weighted" fill="#ff69b4" name="Weighted Fee" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mb-6">
        <Table columns={probColumns} data={probTableData} />
      </Card>

      {/* Pipeline by Partner */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Pipeline by Partner</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <h3 className="text-sm font-medium text-hdla-muted mb-3">Total Pipeline by Partner</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={partnerChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatFullCurrency(v)} />
              <Bar dataKey="total" fill="#E00087" name="Total Fee" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-hdla-muted mb-3">Weighted Pipeline by Partner</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={partnerChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatFullCurrency(v)} />
              <Bar dataKey="weighted" fill="#ff69b4" name="Weighted Fee" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mb-6">
        <Table columns={partnerColumns} data={partnerTableData} />
      </Card>

      {/* Fee at Risk */}
      <h2 className="text-lg font-semibold text-hdla-text mb-1 flex items-center gap-2">
        <span className="text-yellow-500">⚠</span> Fee at Risk
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Proposals open longer than 90 days need attention</p>

      <div className="flex gap-2 mb-3">
        <TabButton 
          active={riskTab === 'warning'} 
          onClick={() => setRiskTab('warning')}
          color="warning"
        >
          Warning (90-179 days) — {warningProposals.length} proposals
        </TabButton>
        <TabButton 
          active={riskTab === 'critical'} 
          onClick={() => setRiskTab('critical')}
          color="critical"
        >
          Critical (180+ days) — {criticalProposals.length} proposals
        </TabButton>
      </div>

      <Card className="mb-2">
        <div className="mb-3">
          <span className="text-xs text-hdla-muted uppercase tracking-wide">
            Fee at Risk ({riskTab === 'warning' ? 'Warning' : 'Critical'})
          </span>
          <div className="text-4xl font-bold text-hdla-text">
            {formatFullCurrency(riskTab === 'warning' ? warningFee : criticalFee)}
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <Table 
          columns={riskColumns} 
          data={riskTab === 'warning' ? warningProposals : criticalProposals} 
        />
      </Card>

      {/* Losses Analysis */}
      <h2 className="text-lg font-semibold text-hdla-text mb-1 flex items-center gap-2">
        <span className="text-red-500">📉</span> Losses Analysis
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Proposals marked as Not Awarded (NA) or Dead (D)</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricCard label="Total Lost Proposals" value={allLosses.length} />
        <MetricCard label="Total Lost Fee" value={formatFullCurrency(totalLostFee)} />
      </div>

      <div className="flex gap-2 mb-3">
        <TabButton active={lossTab === 'client'} onClick={() => setLossTab('client')}>
          By Client
        </TabButton>
        <TabButton active={lossTab === 'market'} onClick={() => setLossTab('market')}>
          By Market
        </TabButton>
        <TabButton active={lossTab === 'partner'} onClick={() => setLossTab('partner')}>
          By Partner
        </TabButton>
        <TabButton active={lossTab === 'all'} onClick={() => setLossTab('all')}>
          All Losses
        </TabButton>
      </div>

      <Card className="mb-6">
        {lossTab === 'client' && <Table columns={lossClientColumns} data={lossClientData} />}
        {lossTab === 'market' && <Table columns={lossMarketColumns} data={lossMarketData} />}
        {lossTab === 'partner' && <Table columns={lossPartnerColumns} data={lossPartnerData} />}
        {lossTab === 'all' && <Table columns={allLossColumns} data={allLosses.slice(0, 20)} />}
      </Card>

      {/* Top 10 Clients by Pipeline */}
      <h2 className="text-lg font-semibold text-hdla-text mb-3">Top 10 Clients by Pipeline</h2>
      <Card>
        <Table columns={topClientColumns} data={topClientsData} />
      </Card>
    </div>
  );
}
