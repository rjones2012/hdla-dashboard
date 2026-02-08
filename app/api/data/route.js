import { NextResponse } from 'next/server';
import { 
  loadAllData, 
  computeExecutiveSummary, 
  computePipeline, 
  computeCapacity,
  computeMarketing,
  computeTrends,
} from '@/lib/data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const office = searchParams.get('office');

  try {
    const data = await loadAllData();

    let result = {};

    switch (type) {
      case 'executive':
        result = computeExecutiveSummary(data);
        break;
      case 'pipeline':
        result = computePipeline(data);
        break;
      case 'capacity':
        result = computeCapacity(data);
        break;
      case 'marketing':
        result = await computeMarketing(data, office);
        break;
      case 'trends':
        result = computeTrends(data);
        break;
      case 'all':
      default:
        result = {
          executive: computeExecutiveSummary(data),
          pipeline: computePipeline(data),
          capacity: computeCapacity(data),
          marketing: await computeMarketing(data),
          trends: computeTrends(data),
        };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.message },
      { status: 500 }
    );
  }
}
