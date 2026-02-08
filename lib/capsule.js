// Capsule CRM integration
// Pulls Meetings & Relationships board data to enrich marketing dashboard

const CAPSULE_API_BASE = 'https://api.capsulecrm.com/api/v2';
const CAPSULE_API_TOKEN = 'TA2PJL6jtYIyad+rN9BwKap8/98nluZ5PKG2QK2886ifhPctyYXFcR+DDtzHRHtO';

// Partner name → initials lookup
const PARTNER_MAP = {
  'Richie Jones': 'RJ',
  'Chris Barkley': 'CB',
  'Michael Black': 'MB',
  'Hank Dalton': 'HD',
  'TJ Eliason': 'TJ',
};

async function capsuleFetch(path, token) {
  const url = `${CAPSULE_API_BASE}${path}`;
  console.log(`[Capsule] Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[Capsule] API error ${res.status} at ${path}: ${text.substring(0, 200)}`);
    throw new Error(`Capsule API ${res.status}`);
  }
  return res.json();
}

// Get all projects from Meetings & Relationships pipeline
// Capsule paginates at 100 — we need to walk through pages
async function getAllProjects(token, pipelineId) {
  let allProjects = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await capsuleFetch(
      `/kases?pipeline=${pipelineId}&perPage=100&page=${page}&embed=fields,party`,
      token
    );
    const projects = data.kases || [];
    allProjects = allProjects.concat(projects);
    hasMore = projects.length === 100;
    page++;
  }

  return allProjects;
}

// Find the Meetings & Relationships pipeline ID
async function findPipelineId(token) {
  // Try multiple endpoint patterns — Capsule API docs vary
  const paths = ['/kases/pipelines', '/pipelines'];
  
  for (const path of paths) {
    try {
      const data = await capsuleFetch(path, token);
      const pipelines = data.pipelines || data.kases?.pipelines || [];
      
      console.log(`[Capsule] Found ${pipelines.length} pipelines at ${path}`);
      
      const mr = pipelines.find(p => 
        p.name && p.name.toLowerCase().includes('meetings')
      );
      
      if (mr) {
        console.log(`[Capsule] Found pipeline: "${mr.name}" (id: ${mr.id})`);
        return mr.id;
      }
    } catch (err) {
      console.log(`[Capsule] Path ${path} failed: ${err.message}, trying next...`);
    }
  }
  
  // If pipelines endpoint fails, try listing all projects and extracting pipeline info
  try {
    const data = await capsuleFetch('/kases?perPage=1', token);
    console.log(`[Capsule] /kases response keys: ${Object.keys(data).join(', ')}`);
    if (data.kases && data.kases.length > 0) {
      const sample = data.kases[0];
      console.log(`[Capsule] Sample project keys: ${Object.keys(sample).join(', ')}`);
      if (sample.milestone) {
        console.log(`[Capsule] Sample milestone: ${JSON.stringify(sample.milestone)}`);
      }
    }
  } catch (err) {
    console.log(`[Capsule] /kases also failed: ${err.message}`);
  }
  
  console.error('[Capsule] Could not find Meetings & Relationships pipeline');
  return null;
}

// Main function: fetch and process Capsule data
// Returns a map of org name → activity summary
export async function fetchCapsuleActivity() {
  const token = CAPSULE_API_TOKEN;
  
  if (!token) {
    console.warn('[Capsule] No Capsule API token configured — skipping Capsule integration');
    return null;
  }

  try {
    // Step 1: Find the pipeline
    const pipelineId = await findPipelineId(token);
    if (!pipelineId) return null;

    // Step 2: Get all projects (open + closed)
    const projects = await getAllProjects(token, pipelineId);
    console.log(`[Capsule] Fetched ${projects.length} projects from Meetings & Relationships`);

    // Step 3: Process into org-level activity summaries
    const orgActivity = {};

    for (const project of projects) {
      // Get the organization this project relates to
      const party = project.party;
      if (!party) continue;
      
      // party can be an org or a person — we want org name
      let orgName = null;
      if (party.type === 'organisation') {
        orgName = party.name;
      } else if (party.organisation) {
        orgName = party.organisation.name;
      }
      
      if (!orgName) continue;
      const orgKey = orgName.trim();

      if (!orgActivity[orgKey]) {
        orgActivity[orgKey] = {
          orgName: orgKey,
          lastClosed: null,
          lastClosedName: null,
          lastClosedOwner: null,
          nextOpen: null,
          nextOpenName: null,
          nextOpenOwner: null,
          openCount: 0,
          closedCount: 0,
          totalCount: 0,
        };
      }

      const entry = orgActivity[orgKey];
      entry.totalCount++;

      // Determine owner (stage name = partner name in this pipeline)
      const stageName = project.milestone?.name || '';
      const ownerInitials = PARTNER_MAP[stageName] || stageName;

      const closedDate = project.closedOn ? new Date(project.closedOn) : null;
      const expectedCloseDate = project.expectedCloseDate ? new Date(project.expectedCloseDate) : null;

      if (project.status === 'CLOSED' || project.status === 'WON' || project.status === 'LOST') {
        entry.closedCount++;
        // Track most recent closed
        if (closedDate && (!entry.lastClosed || closedDate > entry.lastClosed)) {
          entry.lastClosed = closedDate;
          entry.lastClosedName = project.name;
          entry.lastClosedOwner = ownerInitials;
        }
      } else {
        // Open project — upcoming activity
        entry.openCount++;
        // Track nearest upcoming (by expected close date or creation date)
        const sortDate = expectedCloseDate || (project.createdAt ? new Date(project.createdAt) : null);
        if (sortDate && (!entry.nextOpen || sortDate < entry.nextOpen)) {
          entry.nextOpen = sortDate;
          entry.nextOpenName = project.name;
          entry.nextOpenOwner = ownerInitials;
        } else if (!entry.nextOpenName) {
          // No date but still open — capture it
          entry.nextOpenName = project.name;
          entry.nextOpenOwner = ownerInitials;
        }
      }
    }

    // Convert dates to ISO strings for JSON serialization
    for (const key of Object.keys(orgActivity)) {
      const a = orgActivity[key];
      if (a.lastClosed) a.lastClosed = a.lastClosed.toISOString();
      if (a.nextOpen) a.nextOpen = a.nextOpen.toISOString();
    }

    console.log(`[Capsule] Processed activity for ${Object.keys(orgActivity).length} organizations`);
    return orgActivity;

  } catch (err) {
    console.error('[Capsule] Failed to fetch activity:', err.message);
    return null;
  }
}

// Utility: compute days since last touchpoint
export function daysSinceTouch(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
