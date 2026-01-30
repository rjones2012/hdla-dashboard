// SharePoint connection - uses environment variables
export const SHAREPOINT_CONFIG = {
  tenantId: process.env.SHAREPOINT_TENANT_ID,
  clientId: process.env.SHAREPOINT_CLIENT_ID,
  clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
  host: 'hodgsondouglas.sharepoint.com',
  sitePath: '/sites/Sharepoint',
  folderPath: '/HDLA Dashboard',
};

// Access codes
export const ACCESS_CODES = {
  'OF20256': 'partner',
  'PR2026': 'principal',
};

// Role permissions
export const ROLE_PAGES = {
  partner: ['executive', 'pipeline', 'marketing', 'marketing-nashville', 'marketing-dallas', 'trends', 'capacity'],
  principal: ['marketing', 'marketing-nashville', 'marketing-dallas'],
};

// Data constants
export const PARTNER_ORDER = ['RJ', 'CB', 'MB', 'TJ'];
export const PRINCIPALS = ['RW', 'AB', 'MM', 'HD'];
export const CORE_PMS = ['RW', 'AB', 'MM', 'HD', 'MB'];

export const PROB_MAP = {
  'XL': 0.00,
  'L': 0.25,
  'M': 0.65,
  'H': 0.85,
};

// Capacity constants
export const MONTHLY_CAPACITY_PER_PERSON = 21000;

export const TEAM_STRUCTURE = {
  RW: {
    name: 'Robert Whittemore',
    office: 'Nashville',
    members: ['Maggie Ackerman', 'Carly Shows', 'Elizabeth Crimmins', 'John Yakimicki', 'Ellie Hyzik'],
  },
  AB: {
    name: 'Austen Berry',
    office: 'Nashville',
    members: ['Watts Brown', 'Margaret Apperson', 'Taylor Uren', 'Madeline Easter'],
  },
  MM: {
    name: 'Mary Miller',
    office: 'Nashville',
    members: ['Thomas Schneider', 'Savannah Alexander', 'Samie Hubbard', 'Jackson Davis'],
  },
  HD: {
    name: 'Hank Dalton',
    office: 'Dallas',
    members: ['Yuan Ren', 'Robert Cunning', 'Andy Molina', 'Alex Ramirez'],
  },
};

// Capacity thresholds
export const CRUNCH_THRESHOLDS = {
  healthy: 1.00,  // <100% = green
  watch: 1.25,    // 100-125% = yellow
  // >125% = red (hire now)
};

// Colors
export const COLORS = {
  magenta: '#E00087',
  healthy: '#22c55e',
  watch: '#eab308',
  hire: '#ef4444',
  bg: '#fbfbfa',
  text: '#111111',
};

// Chart palette
export const CHART_PALETTE = ['#E00087', '#EE5AAE', '#F39BCB', '#F7C9E3', '#FCE9F4', '#111111', '#6B7280'];
