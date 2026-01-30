'use client';

import { useState } from 'react';
import { useMarketingData } from '@/lib/hooks';
import { PageHeader } from '@/components/Navigation';
import { Card, MetricCard } from '@/components/Card';
import { LoadingPage, ErrorMessage } from '@/components/Loading';
import { Table } from '@/components/Table';
import { PARTNER_ORDER } from '@/lib/constants';

const formatCurrency = (value) => {
  if (value === 0) return '$0';
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

function Expander({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
      >
        <span className="text-sm font-medium text-hdla-text">{title} ({count})</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function ClientCard({ client }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[200px]">
      <div className="font-semibold text-hdla-text mb-1">{client.Client}</div>
      <div className="text-xs text-hdla-muted mb-2">{client.Market} • {client.Partner || 'Unassigned'}</div>
      
      <div className="flex gap-4 text-xs mb-2">
        <span><strong>Active</strong> {client.activeProjects}</span>
        <span><strong>Proposals</strong> {client.proposalCount}</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div><strong>Traction</strong> {client.traction}</div>
        <div><strong>Relationship</strong> {client.relationship}</div>
        <div><strong>Touchpoint</strong> {client.touchpoint}</div>
      </div>
      
      {client.flags && client.flags.length > 0 && (
        <div className="mt-2 text-xs">
          <strong>Why:</strong> {client.flags.join(', ')}
        </div>
      )}
    </div>
  );
}

function CardRow({ clients, maxShow = 7 }) {
  const shown = clients.slice(0, maxShow);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {shown.map((c, i) => <ClientCard key={i} client={c} />)}
    </div>
  );
}

function FlagBadge({ flag }) {
  const colors = {
    'H-probability proposal': 'bg-yellow-100 text-yellow-800',
    'PR work pending': 'bg-yellow-100 text-yellow-800',
    'Active client gone cold': 'bg-red-100 text-red-800',
    'Weak relationship with active work': 'bg-red-100 text-red-800',
    'Going cold': 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded ${colors[flag] || 'bg-gray-100 text-gray-800'}`}>
      {flag}
    </span>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active 
          ? 'border-hdla-magenta text-hdla-magenta' 
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function MarketingPage() {
  const [analysisTab, setAnalysisTab] = useState('partner');
  const { data, loading, error, refetch } = useMarketingData();

  if (loading) return <LoadingPage />;
  if (error) return <ErrorMessage message={error} retry={refetch} />;
  if (!data) return null;

  const allClients = data.all || [];
  
  // Tier counts
  const tier1 = allClients.filter(c => c.tier === 1);
  const tier2 = allClients.filter(c => c.tier === 2);
  const tier3 = allClients.filter(c => c.tier === 3);
  
  // Clients needing attention (have flags)
  const tier1Actions = tier1.filter(c => c.flags?.length > 0).sort((a, b) => b.priority - a.priority);
  const tier2Actions = tier2.filter(c => c.flags?.length > 0).sort((a, b) => b.priority - a.priority);
  const tier3Actions = tier3.filter(c => c.flags?.length > 0).sort((a, b) => b.priority - a.priority);
  
  // Active clients count
  const activeClients = allClients.filter(c => c.activeProjects > 0);
  
  // Protect & Build - healthy relationships with active work (relationship >= 7, touchpoint >= 5, active work)
  const protectBuild = allClients.filter(c => 
    c.relationship >= 7 && c.touchpoint >= 5 && c.activeProjects > 0
  ).sort((a, b) => b.traction - a.traction);
  
  // Strategic targets (flagged as strategic)
  const strategic = allClients.filter(c => c.Strategic === true || c.Strategic === 'TRUE' || c.Strategic === 1);
  const strategicWithWork = strategic.filter(c => c.activeProjects > 0);
  const strategicProspects = strategic.filter(c => c.activeProjects === 0);
  
  // Recent wins and losses
  const wins = data.wins || [];
  const losses = data.losses || [];
  
  // Analysis data
  const byPartner = {};
  PARTNER_ORDER.forEach(p => {
    byPartner[p] = { total: 0, tier1: 0, tier2: 0, active: 0, proposals: 0 };
  });
  byPartner['Unassigned'] = { total: 0, tier1: 0, tier2: 0, active: 0, proposals: 0 };
  
  allClients.forEach(c => {
    const p = c.Partner || 'Unassigned';
    if (!byPartner[p]) byPartner[p] = { total: 0, tier1: 0, tier2: 0, active: 0, proposals: 0 };
    byPartner[p].total++;
    if (c.tier === 1) byPartner[p].tier1++;
    if (c.tier === 2) byPartner[p].tier2++;
    if (c.activeProjects > 0) byPartner[p].active++;
    byPartner[p].proposals += c.proposalCount || 0;
  });

  const partnerTableData = Object.entries(byPartner)
    .filter(([_, d]) => d.total > 0)
    .map(([partner, d]) => ({ partner, ...d }));

  // Critical markets
  const criticalMarkets = ['Parks', 'Campus', 'Mixed-Use', 'Civic', 'State'];
  const byMarket = {};
  allClients.forEach(c => {
    const m = c.Market || 'Unknown';
    if (!byMarket[m]) byMarket[m] = { total: 0, active: 0, fee: 0 };
    byMarket[m].total++;
    if (c.activeProjects > 0) byMarket[m].active++;
    byMarket[m].fee += c.activeFee || 0;
  });

  const marketTableData = Object.entries(byMarket)
    .map(([market, d]) => ({ 
      market, 
      ...d, 
      critical: criticalMarkets.includes(market) ? '✓' : '' 
    }))
    .sort((a, b) => b.fee - a.fee);

  // Table columns
  const actionColumns = [
    { header: 'Client', key: 'Client' },
    { header: 'Tier', key: 'tier', align: 'center' },
    { header: 'Market', key: 'Market' },
    { header: 'Partner', key: 'Partner' },
    { header: 'Active Fee', key: 'activeFee', align: 'right', render: formatCurrency },
    { header: 'Traction', key: 'traction', align: 'right' },
    { header: 'Priority', key: 'priority', align: 'right', render: (v) => <span className="text-hdla-magenta font-semibold">{v}</span> },
    { header: 'Flags', key: 'flags', render: (flags) => (
      <div className="flex flex-wrap gap-1">
        {(flags || []).map((f, i) => <FlagBadge key={i} flag={f} />)}
      </div>
    )},
  ];

  const winLossColumns = [
    { header: 'Project', key: 'Project Name' },
    { header: 'Client', key: 'Client' },
    { header: 'Partner', key: 'Partner' },
    { header: 'Fee', key: 'fee', align: 'right', render: formatCurrency },
    { header: 'Date', key: 'Awarded', render: (v) => v ? new Date(v).toLocaleDateString() : '' },
  ];

  const lossColumns = [
    { header: 'Project', key: 'Project Name' },
    { header: 'Client', key: 'Client' },
    { header: 'Partner', key: 'Partner' },
    { header: 'Fee', key: 'fee', align: 'right', render: formatCurrency },
  ];

  const partnerColumns = [
    { header: 'Partner', key: 'partner' },
    { header: 'Total', key: 'total', align: 'right' },
    { header: 'Tier 1', key: 'tier1', align: 'right' },
    { header: 'Tier 2', key: 'tier2', align: 'right' },
    { header: 'Active', key: 'active', align: 'right' },
    { header: 'Proposals', key: 'proposals', align: 'right' },
  ];

  const marketColumns = [
    { header: 'Market', key: 'market' },
    { header: 'Critical', key: 'critical', align: 'center' },
    { header: 'Total Clients', key: 'total', align: 'right' },
    { header: 'Active', key: 'active', align: 'right' },
    { header: 'Active Fee', key: 'fee', align: 'right', render: formatCurrency },
  ];

  const allClientColumns = [
    { header: 'Client', key: 'Client' },
    { header: 'Market', key: 'Market' },
    { header: 'Partner', key: 'Partner' },
    { header: 'Tier', key: 'tier', align: 'center' },
    { header: 'Active Fee', key: 'activeFee', align: 'right', render: formatCurrency },
    { header: 'Traction', key: 'traction', align: 'right' },
    { header: 'Priority', key: 'priority', align: 'right' },
  ];

  return (
    <div>
      <PageHeader 
        title="Marketing — Action Board" 
        subtitle="Client tiering and relationship management"
      />

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Total Accounts" value={allClients.length} />
        <MetricCard label="Tier 1" value={tier1.length} />
        <MetricCard label="Tier 2" value={tier2.length} />
        <MetricCard label="Active Clients" value={activeClients.length} />
        <MetricCard label="Open Proposals" value={allClients.reduce((sum, c) => sum + (c.proposalCount || 0), 0)} />
        <MetricCard label="Recent Wins" value={wins.length} />
      </div>

      {/* Tier 1 Actions */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2">
        🎯 Tier 1 Actions
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Your personal list. In-person visits, high-touch engagement.</p>
      <p className="text-sm font-medium text-hdla-text mb-3">{tier1Actions.length} clients need attention</p>
      
      {tier1Actions.length > 0 && (
        <>
          <CardRow clients={tier1Actions} />
          <Expander title="View all Tier 1 actions" count={tier1Actions.length}>
            <Table columns={actionColumns} data={tier1Actions} />
          </Expander>
        </>
      )}

      {/* Tier 2 Actions */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2 mt-8">
        📋 Tier 2 Actions
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Note + call list. Relationship building, stay top of mind.</p>
      <p className="text-sm font-medium text-hdla-text mb-3">{tier2Actions.length} clients need attention</p>
      
      {tier2Actions.length > 0 && (
        <>
          <CardRow clients={tier2Actions} />
          <Expander title="View all Tier 2 actions" count={tier2Actions.length}>
            <Table columns={actionColumns} data={tier2Actions} />
          </Expander>
        </>
      )}

      {/* Tier 3 Actions */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2 mt-8">
        👥 Tier 3 Actions
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Delegate to principals. Foster these relationships.</p>
      <p className="text-sm font-medium text-hdla-text mb-3">{tier3Actions.length} clients need attention</p>
      
      {tier3Actions.length > 0 && (
        <Expander title="View all Tier 3 actions" count={tier3Actions.length}>
          <Table columns={actionColumns} data={tier3Actions} />
        </Expander>
      )}

      {/* Protect & Build */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2 mt-8">
        💪 Protect & Build
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Healthy relationships with active work. Keep building on these wins.</p>
      <p className="text-sm font-medium text-hdla-text mb-3">{protectBuild.length} healthy active relationships</p>
      
      {protectBuild.length > 0 && (
        <>
          <CardRow clients={protectBuild} />
          <Expander title="View all Protect & Build" count={protectBuild.length}>
            <Table columns={actionColumns} data={protectBuild} />
          </Expander>
        </>
      )}

      {/* Strategic Targets */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2 mt-8">
        🎯 Strategic Targets
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Clients you've flagged for intentional growth. Your 'go for it' list.</p>
      <p className="text-sm font-medium text-hdla-text mb-3">
        {strategic.length} strategic targets ({strategicWithWork.length} with active work, {strategicProspects.length} to develop)
      </p>
      
      {strategicWithWork.length > 0 && (
        <>
          <CardRow clients={strategicWithWork} />
          <Expander title="Strategic with Active Work - Expand these" count={strategicWithWork.length}>
            <Table columns={actionColumns} data={strategicWithWork} />
          </Expander>
        </>
      )}
      
      {strategicProspects.length > 0 && (
        <Expander title="Strategic Prospects - Break into these" count={strategicProspects.length}>
          <Table columns={actionColumns} data={strategicProspects} />
        </Expander>
      )}

      {/* Recent Wins */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2 mt-8">
        🏆 Recent Wins
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Proposals awarded in the last 90 days.</p>
      
      {wins.length > 0 ? (
        <Card className="mb-6">
          <Table columns={winLossColumns} data={wins.slice(0, 10)} />
        </Card>
      ) : (
        <p className="text-sm text-hdla-muted mb-6">No recent wins in the last 90 days.</p>
      )}

      {/* Recent Losses */}
      <h2 className="text-xl font-semibold text-hdla-text mb-1 flex items-center gap-2 mt-8">
        📉 Recent Losses
      </h2>
      <p className="text-sm text-hdla-muted mb-3">Proposals not awarded in the last 90 days.</p>
      
      {losses.length > 0 ? (
        <Card className="mb-6">
          <Table columns={lossColumns} data={losses.slice(0, 10)} />
        </Card>
      ) : (
        <p className="text-sm text-hdla-muted mb-6">No recent losses in the last 90 days.</p>
      )}

      {/* Additional Analysis */}
      <h2 className="text-xl font-semibold text-hdla-text mb-3 mt-8">Additional Analysis</h2>
      
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <TabButton active={analysisTab === 'partner'} onClick={() => setAnalysisTab('partner')}>
          By Partner
        </TabButton>
        <TabButton active={analysisTab === 'market'} onClick={() => setAnalysisTab('market')}>
          Critical Markets
        </TabButton>
        <TabButton active={analysisTab === 'all'} onClick={() => setAnalysisTab('all')}>
          All Clients
        </TabButton>
      </div>

      <Card>
        {analysisTab === 'partner' && <Table columns={partnerColumns} data={partnerTableData} />}
        {analysisTab === 'market' && <Table columns={marketColumns} data={marketTableData} />}
        {analysisTab === 'all' && <Table columns={allClientColumns} data={allClients.slice(0, 50)} />}
      </Card>
    </div>
  );
}
