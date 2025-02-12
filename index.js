#!/usr/bin/env node
/**
 * PR Stats Console App
 *
 * This script calculates the average duration (in hours) between the time
 * a pull request becomes “ready for review” and the time it is merged.
 * It uses GitHub’s API to fetch pull requests, filtered by organization,
 * optional repository, a specified time period, and optionally by a specific GitHub username.
 *
 * By default, if no user is specified, it shows stats for the authenticated user's PRs.
 *
 * Usage:
 *   node index.js --org my-org --period 1w --token YOUR_GITHUB_TOKEN
 *   node index.js --org my-org --repo my-repo --period 3mo --user otherUser --token YOUR_GITHUB_TOKEN
 *   node index.js --org my-org --start 2022-01-01 --end 2022-01-31 --token YOUR_GITHUB_TOKEN
 */

import { program } from 'commander';
import logger from './logger.js';
import { exportData } from './exporter.js';
import {
  getAuthenticatedUser,
  parsePeriod,
  parseDate,
  loadPullRequests,
  calculateAverageDuration,
} from './businessLogic.js';

// Define command-line options
program
  .requiredOption('-o, --org <org>', 'GitHub organization name')
  .option('-r, --repo <repo>', 'Filter by specific repository (optional)')
  .option('-p, --period <period>', "Time period (e.g., '2d', '1w', '3mo', '1y')")
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .option('-u, --user <username>', 'Filter PRs by GitHub username (defaults to the authenticated user)')
  .requiredOption('-t, --token <token>', 'GitHub personal access token')
  .option('--export <format>', 'Export data in the specified format (json or csv)')
  .parse(process.argv);

const options = program.opts();
const org = options.org;
const repo = options.repo;
const periodStr = options.period;
const startDateStr = options.start;
const endDateStr = options.end;
const token = options.token;

if (!periodStr && !startDateStr && !endDateStr) {
  logger.error('Either --period or --start option or --start and --end options are required.');
  process.exit(1);
}

if (periodStr && (startDateStr || endDateStr)) {
  logger.error('The --period option cannot be used with --start or --end options.');
  process.exit(1);
}

if (endDateStr && !startDateStr) {
  logger.error('The --end option cannot be used without the --start option.');
  process.exit(1);
}

if (options.export && !['json', 'csv'].includes(options.export)) {
  logger.error('Unsupported export format. Use "json" or "csv".');
  process.exit(1);
}

/**
 * Main function: Get the specified user's PRs, compute each duration
 * (in hours) from “ready” until merged, and output the average duration.
 */
async function main() {
  try {
    const searchUser = options.user || (await getAuthenticatedUser(token));

    const sinceDate = startDateStr ? parseDate(startDateStr) : parsePeriod(periodStr);
    const untilDate = endDateStr ? parseDate(endDateStr) : new Date();

    const logProgress = !options.export;

    if (logProgress) {
      logger.info(`Considering merged PRs from ${sinceDate.toISOString()} to ${untilDate.toISOString()}`);
    }

    const prItems = await loadPullRequests(searchUser, org, repo, sinceDate, untilDate, token, logProgress);
    const { totalDurationHours, count, prDataList } = await calculateAverageDuration(prItems, token, logProgress);

    if (count > 0) {
      const avgDuration = totalDurationHours / count;

      if (options.export) {
        exportData(
          {
            averageDurationHours: avgDuration.toFixed(2),
            pullRequests: prDataList,
          },
          options.export
        );
      } else {
        console.log(`\nAverage merge duration: ${avgDuration.toFixed(2)} hours over ${count} pull request(s).`);
      }
    } else {
      if (logProgress) {
        logger.info('No pull requests found in the specified period.');
      }
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
