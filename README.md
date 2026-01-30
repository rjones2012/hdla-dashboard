# HDLA Executive Dashboard

React/Next.js rebuild of the Streamlit dashboard.

## Features

- **Executive Summary** - Fee remaining, monthly projections, project status
- **Pipeline** - Open proposals, probability breakdown, fee at risk
- **Marketing** - Client tiering, traction/priority scores, action flags
- **Marketing Nashville/Dallas** - Office-specific views
- **Trends** - Historical billing, expenses, rolling averages
- **Capacity** - Team capacity scoring with $21K/person baseline

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Access Codes

| Code | Role | Access |
|------|------|--------|
| OF20256 | Partner | Full access |
| PR2026 | Principal | Marketing pages only |

## Data Source

Pulls from SharePoint:
- `hodgsondouglas.sharepoint.com/sites/Sharepoint`
- Folder: `/HDLA Dashboard`
- Files: `HDLA Master Data.xlsx`, `Marketing.xlsx`

Data refreshes every 5 minutes (cached).

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Environment Variables (for production)

For better security, move these to environment variables:
- `SHAREPOINT_TENANT_ID`
- `SHAREPOINT_CLIENT_ID`
- `SHAREPOINT_CLIENT_SECRET`

Currently hardcoded in `/lib/constants.js` for simplicity.

## Structure

```
hdla-dashboard/
├── app/
│   ├── layout.js           # Root layout
│   ├── page.js             # Login page
│   ├── globals.css         # Tailwind styles
│   ├── api/data/route.js   # Data API endpoint
│   └── (dashboard)/        # Authenticated routes
│       ├── layout.js       # Dashboard layout with sidebar
│       ├── executive/
│       ├── pipeline/
│       ├── marketing/
│       ├── trends/
│       └── capacity/
├── components/
│   ├── Card.js
│   ├── Table.js
│   ├── Charts.js
│   ├── Navigation.js
│   ├── Loading.js
│   └── Badge.js
├── lib/
│   ├── constants.js        # Config, thresholds, team structure
│   ├── sharepoint.js       # SharePoint API connection
│   ├── data.js             # Data parsing and metrics
│   ├── auth.js             # Auth context
│   └── hooks.js            # Data fetching hooks
└── package.json
```

## Key Differences from Streamlit

- **No page reloads** - React state management
- **Proper loading states** - Skeleton loaders instead of spinners
- **Better mobile experience** - Responsive Tailwind layouts
- **Faster navigation** - Client-side routing
- **Real caching** - 5-minute TTL with proper invalidation
