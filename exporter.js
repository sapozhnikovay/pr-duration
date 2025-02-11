import { Parser } from '@json2csv/plainjs';

export function exportData(data, format) {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else if (format === 'csv') {
    const fields = ['url', 'readyDate', 'mergedDate', 'durationHours'];
    const opts = { fields };
    const parser = new Parser();
    const csv = parser.parse(data.pullRequests, opts);
    console.log(csv);
  } else {
    throw new Error('Unsupported export format. Use "json" or "csv".');
  }
}
