import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import fs from 'fs';
import readline from 'readline';

type ExtendedOctokit = Octokit & { paginate: typeof paginateRest } & { rest: ReturnType<typeof restEndpointMethods> };

export async function getCommitters(octokit: ExtendedOctokit, owner: string, repo: string, pullNumber: number): Promise<Set<string>> {
  const committers = new Set<string>();
  const commits = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber
  });
  
  for (const commit of commits.data) {
    if (commit.author) {
      committers.add(commit.author.login);
    }
  }
  
  return committers;
}

export function getApprovers(pullRequest: any): string[] {
  return pullRequest.requested_reviewers.map((reviewer: any) => reviewer.login);
}

export async function requestReviewer(octokit: ExtendedOctokit, owner: string, repo: string, pullNumber: number, reviewer: string): Promise<void> {
  await octokit.rest.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pullNumber,
    reviewers: [reviewer]
  });
}

export async function parseCodeownersFile(filePath: string): Promise<{ username: string, role: number }[]> {
  const codeowners: { username: string, role: number }[] = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    if (line.trim() && !line.startsWith('#')) {
      const [username, role] = line.split(',');
      codeowners.push({ username: username.trim(), role: parseInt(role.trim()) });
    }
  }
  
  return codeowners;
}

export function findEligibleApprover(codeowners: { username: string, role: number }[], committers: Set<string>): string | null {
  for (const { username, role } of codeowners) {
    if (role === 0 && !committers.has(username)) {
      return username;
    }
  }
  
  for (const { username, role } of codeowners) {
    if (role === 1 && !committers.has(username)) {
      return username;
    }
  }
  
  return null;
}
