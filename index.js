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
 */

import { Octokit } from '@octokit/rest';
import { program } from 'commander';
import parseDuration from 'parse-duration';

// Define command-line options
program
  .requiredOption('-o, --org <org>', 'GitHub organization name')
  .option('-r, --repo <repo>', 'Filter by specific repository (optional)')
  .requiredOption(
    '-p, --period <period>',
    "Time period (e.g., '2d' for 2 days, '1w' for 1 week, '3mo' for 3 months, '1y' for 1 year)"
  )
  .option('-u, --user <username>', 'Filter PRs by GitHub username (defaults to the authenticated user)')
  .requiredOption('-t, --token <token>', 'GitHub personal access token')
  .option('--export <format>', 'Export data in the specified format (json)')
  .parse(process.argv);

const options = program.opts();
const org = options.org;
const repo = options.repo;
const periodStr = options.period;
const token = options.token;

const octokit = new Octokit({ auth: token });

/**
 * Get the authenticated user’s login name.
 */
async function getAuthenticatedUser() {
  const { data } = await octokit.users.getAuthenticated();
  return data.login;
}

/**
 * Parse a period string like "2d", "1w", "3mo", or "1y" and return the Date
 * corresponding to now minus that duration.
 */
function parsePeriod(periodStr) {
  const durationMs = parseDuration(periodStr);
  if (!durationMs) {
    throw new Error('Invalid period format. Use e.g. "2d", "1w", "3mo", or "1y".');
  }
  return new Date(Date.now() - durationMs);
}

/**
 * Use GitHub’s search API to get pull requests authored by the specified user
 * in the given organization (and repository, if provided) that were merged
 * since the given date.
 */
async function fetchPullRequests(username, org, repo, since) {
  const sinceStr = since.toISOString().split('T')[0];
  let query = `type:pr author:${username} is:merged merged:>=${sinceStr}`;

  if (repo) {
    if (repo.includes('/')) {
      query += ` repo:${repo}`;
    } else {
      query += ` repo:${org}/${repo}`;
    }
  } else {
    query += ` org:${org}`;
  }

  const prs = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: query,
      per_page: perPage,
      page,
    });

    if (!data.items || data.items.length === 0) break;
    prs.push(...data.items);
    if (data.items.length < perPage) break;
    page++;
  }
  return prs;
}

/**
 * For a given pull request, fetch its timeline events (which include events
 * like "ready_for_review"). We need the first time the PR became “ready.”
 *
 * Note: GitHub’s timeline API is currently in preview, so we must include the
 * special Accept header.
 */
async function fetchReadyTime(owner, repo, prNumber, fallbackCreatedAt) {
  const { data: events } = await octokit.issues.listEventsForTimeline({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
    headers: {
      accept: 'application/vnd.github.mockingbird-preview+json',
    },
  });

  const readyEvent = events.find((e) => e.event === 'ready_for_review');
  if (readyEvent) {
    return new Date(readyEvent.created_at);
  }
  return new Date(fallbackCreatedAt);
}

/**
 * Main function: Get the specified user's PRs, compute each duration
 * (in hours) from “ready” until merged, and output the average duration.
 */
async function main() {
  try {
    const searchUser = options.user || (await getAuthenticatedUser());
    if (options.export !== 'json') {
      console.log(`Fetching PR stats for ${searchUser} in organization ${org}...`);
    }
    const sinceDate = parsePeriod(periodStr);
    if (options.export !== 'json') {
      console.log(`Considering merged PRs since ${sinceDate.toISOString()}`);
    }

    const prItems = await fetchPullRequests(searchUser, org, repo, sinceDate);
    if (options.export !== 'json') {
      console.log(`Found ${prItems.length} pull request(s).`);
    }

    let totalDurationHours = 0;
    let count = 0;

    const prDataList = [];

    // Process each PR. Note that the search API returns “issues” that represent PRs.
    // We need to fetch the actual PR details to get properties like merged_at.
    for (const prItem of prItems) {
      const prUrl = prItem.pull_request.url;
      const { data: prData } = await octokit.request(`GET ${prUrl}`, {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'PR-Stats-App',
        },
      });

      // Skip if for some reason the PR isn’t merged.
      if (!prData.merged_at) continue;
      const mergeTime = new Date(prData.merged_at);

      // Determine the “ready” timestamp.
      // If the PR was created as a draft and later published, the timeline should include a “ready_for_review” event.
      // Otherwise, use the created_at timestamp.
      const ownerName = prData.base.repo.owner.login;
      const repoName = prData.base.repo.name;
      const prNumber = prData.number;
      const createdAt = prData.created_at;

      const readyTime = await fetchReadyTime(ownerName, repoName, prNumber, createdAt);

      // Calculate the duration (in hours) between readyTime and mergeTime.
      const durationMs = mergeTime - readyTime;
      const durationHours = durationMs / (1000 * 60 * 60);

      prDataList.push({
        url: prUrl,
        readyDate: readyTime.toISOString(),
        mergedDate: mergeTime.toISOString(),
        durationHours: durationHours.toFixed(2),
      });

      if (options.export !== 'json') {
        console.log(
          `PR #${prNumber} (${ownerName}/${repoName}): Ready at ${readyTime.toISOString()}, Merged at ${mergeTime.toISOString()} → Duration: ${durationHours.toFixed(
            2
          )} hours`
        );
      }

      totalDurationHours += durationHours;
      count++;
    }

    if (count > 0) {
      const avgDuration = totalDurationHours / count;

      if (options.export === 'json') {
        const exportData = {
          averageDurationHours: avgDuration.toFixed(2),
          pullRequests: prDataList,
        };
        console.log(JSON.stringify(exportData, null, 2));
      } else {
        console.log(`\nAverage merge duration: ${avgDuration.toFixed(2)} hours over ${count} pull request(s).`);
      }
    } else {
      if (options.export !== 'json') {
        console.log('No pull requests found in the specified period.');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
