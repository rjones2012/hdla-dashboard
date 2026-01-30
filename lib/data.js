import * as XLSX from 'xlsx';
import { downloadFile } from './sharepoint';
import { 
  PROB_MAP, 
  MONTHLY_CAPACITY_PER_PERSON, 
  TEAM_STRUCTURE,
  CRUNCH_THRESHOLDS,
  PRINCIPALS,
  PARTNER_ORDER,
} from './constants';

// Cache for data
let dataCache = {
  masterData: null,
  proposalLog: null,
  summary: null,
  marketing: null,
  lastFetch: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const str = String(value).replace(/[$,]/g, '').trim();
  if (str === '' || str === '-') return 0;
  
  // Handle K/M suffixes
  const multipliers = { K: 1000, M: 1000000 };
  const match = str.match(/^([\d.]+)([KM])?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const mult = match[2] ? multipliers[match[2].toUpperCase()] : 1;
    return num * mult;
  }
  
  return parseFloat(str) || 0;
}

function parseSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  
  // Parse with raw values to avoid NA being converted to error
  const rows = XLSX.utils.sheet_to_json(sheet, { 
    defval: '', 
    raw: true,
  });
  
  // Fix any cells where NA was parsed as error (#N/A) - restore as 'NA' string
  return rows.map(row => {
    const fixed = { ...row };
    // Check Status column specifically
    if (fixed.Status === undefined || fixed.Status === null || fixed.Status === '') {
      // Check if original cell had NA - we'll handle this in the XLSX read
    }
    return fixed;
  });
}

export async function loadAllData(forceRefresh = false) {
  // Return cached data if fresh
  if (!forceRefresh && dataCache.lastFetch && Date.now() - dataCache.lastFetch < CACHE_TTL) {
    return dataCache;
  }

  // Load Master Data file
  const masterBuffer = await downloadFile('HDLA Master Data.xlsx');
  // cellNF: true preserves number formats, WTF: true preserves errors as strings
  const masterWb = XLSX.read(masterBuffer, { type: 'array', cellText: false, cellDates: true });
  
  // Custom parse for Proposal Log to handle 'NA' status
  const proposalLogSheet = masterWb.Sheets['Proposal Log'];
  let proposalLog = [];
  if (proposalLogSheet) {
    // Get the range
    const range = XLSX.utils.decode_range(proposalLogSheet['!ref']);
    // Get headers from first row
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = proposalLogSheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headers.push(cell ? cell.v : `Col${col}`);
    }
    // Find Status column index
    const statusCol = headers.indexOf('Status');
    
    // Parse each row
    for (let row = 1; row <= range.e.r; row++) {
      const rowData = {};
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = proposalLogSheet[cellRef];
        let value = '';
        if (cell) {
          // For Status column, check raw value
          if (col === statusCol && cell.t === 'e' && cell.w === '#N/A') {
            value = 'NA'; // Restore NA that was parsed as error
          } else if (cell.t === 'e') {
            value = cell.w || ''; // Other errors keep display value
          } else {
            value = cell.v !== undefined ? cell.v : '';
          }
        }
        rowData[headers[col]] = value;
      }
      proposalLog.push(rowData);
    }
  }
  
  const masterData = parseSheet(masterWb, 'Master Data');
  const summary = parseSheet(masterWb, 'Summary');

  // Load Marketing file
  const marketingBuffer = await downloadFile('Marketing.xlsx');
  const marketingWb = XLSX.read(marketingBuffer, { type: 'array' });
  const marketing = parseSheet(marketingWb, marketingWb.SheetNames[0]);

  dataCache = {
    masterData,
    proposalLog,
    summary,
    marketing,
    lastFetch: Date.now(),
  };

  return dataCache;
}

// Get billing columns from master data
function getBillingColumns(data) {
  if (!data || data.length === 0) return [];
  
  const cols = Object.keys(data[0]);
  return cols.filter(c => 
    (c.includes('Projected Billing') || c.includes('PM Adjusted Billing')) 
    && !c.includes('%')
  );
}

// Executive Summary metrics - with O/PR splits
export function computeExecutiveSummary(data) {
  const { masterData, proposalLog, summary } = data;
  
  // Filter by status
  const openProjects = masterData.filter(row => row.Status === 'O');
  const projectedProjects = masterData.filter(row => row.Status === 'PR');
  
  // Total fee remaining by status
  const totalFeeO = openProjects.reduce((sum, row) => sum + parseNumeric(row['Fee Remaining']), 0);
  const totalFeePR = projectedProjects.reduce((sum, row) => sum + parseNumeric(row['Fee Remaining']), 0);
  
  // Project and client counts
  const projectCountO = openProjects.length;
  const uniqueClients = new Set(openProjects.map(row => row.Client).filter(Boolean));
  const clientCount = uniqueClients.size;

  // Fee by partner - split by O/PR
  const feeByPartnerO = {};
  const feeByPartnerPR = {};
  PARTNER_ORDER.forEach(p => {
    feeByPartnerO[p] = 0;
    feeByPartnerPR[p] = 0;
  });
  
  openProjects.forEach(row => {
    const partner = row.Partner;
    if (partner && feeByPartnerO.hasOwnProperty(partner)) {
      feeByPartnerO[partner] += parseNumeric(row['Fee Remaining']);
    }
  });
  
  projectedProjects.forEach(row => {
    const partner = row.Partner;
    if (partner && feeByPartnerPR.hasOwnProperty(partner)) {
      feeByPartnerPR[partner] += parseNumeric(row['Fee Remaining']);
    }
  });

  // Fee by PM - split by O/PR
  const feeByPM_O = {};
  const feeByPM_PR = {};
  
  openProjects.forEach(row => {
    const pm = row.PM;
    if (pm) {
      feeByPM_O[pm] = (feeByPM_O[pm] || 0) + parseNumeric(row['Fee Remaining']);
    }
  });
  
  projectedProjects.forEach(row => {
    const pm = row.PM;
    if (pm) {
      feeByPM_PR[pm] = (feeByPM_PR[pm] || 0) + parseNumeric(row['Fee Remaining']);
    }
  });
  
  // Combine PM keys
  const allPMs = new Set([...Object.keys(feeByPM_O), ...Object.keys(feeByPM_PR)]);
  allPMs.forEach(pm => {
    if (!feeByPM_O[pm]) feeByPM_O[pm] = 0;
    if (!feeByPM_PR[pm]) feeByPM_PR[pm] = 0;
  });

  // Monthly projections - split by O/PR
  const billingCols = getBillingColumns(masterData);
  const monthlyProjections = billingCols.slice(0, 7).map(col => {
    const month = col.replace('PM Adjusted Billing ', '').replace('Projected Billing ', '');
    const oTotal = openProjects.reduce((sum, row) => sum + parseNumeric(row[col]), 0);
    const prTotal = projectedProjects.reduce((sum, row) => sum + parseNumeric(row[col]), 0);
    return { month, o: oTotal, pr: prTotal, total: oTotal + prTotal };
  });

  // Rolling 12-month actuals from summary - only months with actual billing data
  // Skip months where billing is 0, empty, or missing (incomplete months like current month)
  const monthsWithData = (summary || []).filter(row => {
    const billing = parseNumeric(row.Billing);
    // Only include months that have billing > 0 (completed months)
    return billing > 0;
  });
  
  // Check if data is newest-first (descending) or oldest-first (ascending)
  // by comparing first and last dates if available
  let recentMonths;
  if (monthsWithData.length >= 2) {
    const firstMonth = monthsWithData[0]?.Month;
    const lastMonth = monthsWithData[monthsWithData.length - 1]?.Month;
    const firstDate = new Date(firstMonth);
    const lastDate = new Date(lastMonth);
    
    if (firstDate > lastDate) {
      // Newest first - take first 12
      recentMonths = monthsWithData.slice(0, 12);
    } else {
      // Oldest first - take last 12
      recentMonths = monthsWithData.slice(-12);
    }
  } else {
    recentMonths = monthsWithData.slice(-12);
  }
  
  const avgBillingMo = recentMonths.length > 0 
    ? recentMonths.reduce((sum, row) => sum + parseNumeric(row.Billing), 0) / recentMonths.length 
    : 0;
  const avgExpensesMo = recentMonths.length > 0 
    ? recentMonths.reduce((sum, row) => sum + parseNumeric(row.Expenses), 0) / recentMonths.length 
    : 0;
  const avgMargin = avgBillingMo > 0 ? (avgBillingMo - avgExpensesMo) / avgBillingMo : 0;

  // 3-month forecast averages
  const first3 = monthlyProjections.slice(0, 3);
  const avg3moO = first3.length > 0 ? first3.reduce((sum, m) => sum + m.o, 0) / first3.length : 0;
  const avg3moPR = first3.length > 0 ? first3.reduce((sum, m) => sum + m.pr, 0) / first3.length : 0;

  // 6-month forecast averages
  const first6 = monthlyProjections.slice(0, 6);
  const avg6moO = first6.length > 0 ? first6.reduce((sum, m) => sum + m.o, 0) / first6.length : 0;
  const avg6moPR = first6.length > 0 ? first6.reduce((sum, m) => sum + m.pr, 0) / first6.length : 0;

  // Pipeline summary
  const openProposals = proposalLog.filter(row => row.Status === 'O');
  const pipelineTotal = openProposals.reduce((sum, row) => sum + parseNumeric(row.Fee), 0);
  const weightedPipeline = openProposals.reduce((sum, row) => {
    const fee = parseNumeric(row.Fee);
    const prob = PROB_MAP[row.Probability] || 0;
    return sum + (fee * prob);
  }, 0);

  return {
    totalFeeO,
    totalFeePR,
    totalFeeRemaining: totalFeeO + totalFeePR,
    projectCountO,
    clientCount,
    feeByPartnerO,
    feeByPartnerPR,
    feeByPM_O,
    feeByPM_PR,
    monthlyProjections,
    avgBillingMo,
    avgExpensesMo,
    avgMargin,
    avg3moO,
    avg3moPR,
    avg6moO,
    avg6moPR,
    pipelineTotal,
    weightedPipeline,
    proposalCount: openProposals.length,
  };
}

// Pipeline metrics
export function computePipeline(data) {
  const { proposalLog } = data;
  
  const openProposals = proposalLog.filter(row => row.Status === 'O');
  
  // By probability
  const byProbability = { H: [], M: [], L: [], XL: [] };
  openProposals.forEach(row => {
    const prob = row.Probability || 'XL';
    if (byProbability[prob]) {
      byProbability[prob].push({
        ...row,
        fee: parseNumeric(row.Fee),
      });
    }
  });

  // By partner
  const byPartner = {};
  PARTNER_ORDER.forEach(p => byPartner[p] = { count: 0, fee: 0, weighted: 0 });
  openProposals.forEach(row => {
    const partner = row.Partner;
    const fee = parseNumeric(row.Fee);
    const prob = PROB_MAP[row.Probability] || 0;
    if (partner && byPartner[partner]) {
      byPartner[partner].count++;
      byPartner[partner].fee += fee;
      byPartner[partner].weighted += fee * prob;
    }
  });

  // Fee at risk (by days open)
  const now = Date.now();
  const atRisk90 = [];
  const atRisk180 = [];
  
  openProposals.forEach(row => {
    if (row.Submitted) {
      const submitted = new Date(row.Submitted);
      const daysOpen = Math.floor((now - submitted) / (1000 * 60 * 60 * 24));
      const item = { ...row, fee: parseNumeric(row.Fee), daysOpen };
      
      if (daysOpen >= 180) {
        atRisk180.push(item);
      } else if (daysOpen >= 90) {
        atRisk90.push(item);
      }
    }
  });

  // All losses (NA and D status)
  const losses = proposalLog
    .filter(row => row.Status === 'NA' || row.Status === 'D')
    .map(row => ({ ...row, fee: parseNumeric(row.Fee) }));

  return {
    openProposals: openProposals.map(row => ({ ...row, fee: parseNumeric(row.Fee) })),
    byProbability,
    byPartner,
    atRisk90,
    atRisk180,
    losses,
    totalOpen: openProposals.reduce((sum, row) => sum + parseNumeric(row.Fee), 0),
    totalWeighted: openProposals.reduce((sum, row) => {
      return sum + parseNumeric(row.Fee) * (PROB_MAP[row.Probability] || 0);
    }, 0),
  };
}

// Capacity metrics
export function computeCapacity(data) {
  const { masterData } = data;
  
  const billingCols = getBillingColumns(masterData);
  const q1Cols = billingCols.slice(0, 3);
  
  const results = {};
  
  PRINCIPALS.forEach(principal => {
    const team = TEAM_STRUCTURE[principal];
    const teamSize = team.members.length + 1; // +1 for principal
    
    // Filter projects for this principal
    const projects = masterData.filter(row => row.PM === principal && row.Status === 'O');
    
    // Sum Q1 billing
    const q1Billing = projects.reduce((sum, row) => {
      return sum + q1Cols.reduce((colSum, col) => colSum + parseNumeric(row[col]), 0);
    }, 0);
    
    // Capacity
    const q1Capacity = teamSize * MONTHLY_CAPACITY_PER_PERSON * 3;
    const crunch = q1Capacity > 0 ? q1Billing / q1Capacity : 0;
    
    // Status flag
    let status = 'healthy';
    if (crunch > CRUNCH_THRESHOLDS.watch) {
      status = 'hire';
    } else if (crunch >= CRUNCH_THRESHOLDS.healthy) {
      status = 'watch';
    }
    
    results[principal] = {
      name: team.name,
      office: team.office,
      teamSize,
      members: team.members,
      q1Billing,
      q1Capacity,
      crunch,
      crunchPercent: Math.round(crunch * 100),
      status,
    };
  });
  
  return results;
}

// Marketing metrics
export function computeMarketing(data, office = null) {
  const { masterData, proposalLog, marketing } = data;
  
  let clients = [...marketing];
  
  // Filter by office if specified
  if (office === 'Nashville') {
    clients = clients.filter(row => 
      row['Office State'] === 'TN' || row['Office Location'] === 'Nashville'
    );
  } else if (office === 'Dallas') {
    clients = clients.filter(row => 
      row['Office State'] === 'TX' || row['Office Location'] === 'Dallas'
    );
  }
  
  // Enrich with project data
  const enriched = clients.map(client => {
    const clientName = client.Client;
    
    // Active projects
    const activeProjects = masterData.filter(row => 
      row.Client === clientName && row.Status === 'O'
    );
    const activeFee = activeProjects.reduce((sum, row) => sum + parseNumeric(row['Fee Remaining']), 0);
    
    // Projected work
    const projectedProjects = masterData.filter(row => 
      row.Client === clientName && row.Status === 'PR'
    );
    const projectedFee = projectedProjects.reduce((sum, row) => sum + parseNumeric(row['Fee Remaining']), 0);
    
    // Open proposals
    const proposals = proposalLog.filter(row => 
      row.Client === clientName && row.Status === 'O'
    );
    const proposalFee = proposals.reduce((sum, row) => sum + parseNumeric(row.Fee), 0);
    const hasHighProb = proposals.some(row => row.Probability === 'H');
    
    // Compute traction score
    const tractionBase = ((activeProjects.length * 10) + (activeFee / 10000)) * 0.45
      + (projectedFee / 10000) * 0.20
      + ((proposals.length * 5) + (proposalFee / 10000)) * 0.35;
    const tractionBoost = (projectedFee > 0 || hasHighProb) ? 15 : 0;
    const traction = Math.min(100, tractionBase + tractionBoost);
    
    // Compute priority score
    const tier = parseInt(client.Tier) || 5;
    const relationship = parseInt(client['Relationship Status']) || 5;
    const touchpoint = parseInt(client['Touchpoint Value']) || 5;
    const isCritical = ['Parks', 'Campus', 'Mixed-Use', 'Civic', 'State'].includes(client.Market);
    
    let priority = (6 - tier) * 2.0;
    priority += traction * 0.25;
    if (isCritical) priority += 8;
    if (touchpoint <= 4) priority += 12;
    if (relationship <= 4 && activeFee > 0) priority += 10;
    if (relationship >= 7 && touchpoint <= 4) priority += 15;
    if (hasHighProb) priority += 12;
    if (projectedFee > 0) priority += 10;
    
    // Flags
    const flags = [];
    if (relationship >= 7 && touchpoint <= 4) flags.push('Going cold');
    if (hasHighProb) flags.push('H-probability proposal');
    if (projectedFee > 0) flags.push('PR work pending');
    if (activeFee > 0 && touchpoint <= 4) flags.push('Active client gone cold');
    if (relationship <= 4 && activeFee > 0) flags.push('Weak relationship with active work');
    
    return {
      ...client,
      tier,
      relationship,
      touchpoint,
      activeProjects: activeProjects.length,
      activeFee,
      projectedFee,
      proposalCount: proposals.length,
      proposalFee,
      traction: Math.round(traction),
      priority: Math.round(priority),
      flags,
    };
  });
  
  // Sort by priority
  enriched.sort((a, b) => b.priority - a.priority);
  
  // Group by tier
  const byTier = {
    1: enriched.filter(c => c.tier === 1),
    2: enriched.filter(c => c.tier === 2),
    3: enriched.filter(c => c.tier === 3),
    4: enriched.filter(c => c.tier === 4),
    5: enriched.filter(c => c.tier === 5),
  };
  
  // Helper to parse date strings like "Nov-25", "Dec-25", "Jan-26" or full month names with Year column
  const parseYearMonth = (year, month) => {
    if (!month) return null;
    
    // Check if it's already a date object
    if (month instanceof Date) return month;
    
    const monthStr = String(month);
    
    // Try "Nov-25" format first (abbreviated month-year)
    const abbrevMatch = monthStr.match(/^([A-Za-z]{3})-(\d{2})$/);
    if (abbrevMatch) {
      const monthAbbrev = abbrevMatch[1];
      const yearShort = parseInt(abbrevMatch[2]);
      const fullYear = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const monthNum = monthMap[monthAbbrev];
      if (monthNum !== undefined) {
        return new Date(fullYear, monthNum, 15);
      }
    }
    
    // Try full month name with Year column
    const monthMapFull = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    const monthNum = monthMapFull[monthStr];
    if (monthNum !== undefined && year) {
      return new Date(year, monthNum, 15);
    }
    
    // Try parsing as date string (some rows have full dates like "2025-09-01")
    const parsed = new Date(monthStr);
    if (!isNaN(parsed.getTime())) return parsed;
    
    return null;
  };

  // Recent wins (awarded in last 120 days - gives buffer for edge cases)
  const now = Date.now();
  const recentCutoff = now - (120 * 24 * 60 * 60 * 1000);
  const wins = proposalLog
    .filter(row => {
      if (row.Status !== 'A') return false;
      // Try Awarded column first, fall back to Submitted
      const dateCol = row.Awarded || row.Submitted;
      const date = parseYearMonth(row.Year, dateCol);
      if (!date) return false;
      return date.getTime() >= recentCutoff;
    })
    .map(row => ({ ...row, fee: parseNumeric(row.Fee) }))
    .sort((a, b) => (b.Year || 0) - (a.Year || 0));
  
  // Recent losses (NA in last 120 days)
  const losses = proposalLog
    .filter(row => {
      if (row.Status !== 'NA') return false;
      const date = parseYearMonth(row.Year, row.Submitted);
      if (!date) return false;
      return date.getTime() >= recentCutoff;
    })
    .map(row => ({ ...row, fee: parseNumeric(row.Fee) }))
    .sort((a, b) => (b.Year || 0) - (a.Year || 0))
    .slice(0, 30);
  
  return {
    all: enriched,
    byTier,
    flagged: enriched.filter(c => c.flags.length > 0),
    wins,
    losses,
  };
}

// Trends metrics
export function computeTrends(data) {
  const { summary } = data;
  
  // Parse summary data
  const months = summary.map(row => ({
    month: row.Month,
    underContract: parseNumeric(row['Under Contract']),
    pipeline: parseNumeric(row.Pipeline),
    billing: parseNumeric(row.Billing),
    expenses: parseNumeric(row.Expenses),
    deposits: parseNumeric(row.Deposits),
    balance: parseNumeric(row.Balance),
  }));
  
  // Compute rolling averages
  const withRolling = months.map((row, idx) => {
    const start = Math.max(0, idx - 2);
    const window = months.slice(start, idx + 1);
    
    return {
      ...row,
      billingRolling3: window.reduce((sum, r) => sum + r.billing, 0) / window.length,
      expensesRolling3: window.reduce((sum, r) => sum + r.expenses, 0) / window.length,
    };
  });
  
  return {
    months: withRolling,
  };
}
