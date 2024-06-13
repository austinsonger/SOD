const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const readline = require('readline');

async function run() {
  try {
    const token = core.getInput('token');
    const codeownersFile = core.getInput('codeowners-file');
    
    const octokit = github.getOctokit(token);
    const context = github.context;
    const pullRequest = context.payload.pull_request;
    
    if (!pullRequest) {
      core.setFailed('This action can only be run in the context of a pull request.');
      return;
    }
    
    const committers = new Set();
    const commits = await octokit.rest.pulls.listCommits({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullRequest.number
    });
    
    for (const commit of commits.data) {
      committers.add(commit.author.login);
    }
    
    const approvers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);
    const ineligibleApprovers = approvers.filter(approver => committers.has(approver));
    
    if (ineligibleApprovers.length > 0) {
      core.info(`Ineligible approvers: ${ineligibleApprovers.join(', ')}`);
    }
    
    const codeowners = await parseCodeownersFile(codeownersFile);
    const eligibleApprover = findEligibleApprover(codeowners, committers);
    
    if (!eligibleApprover) {
      core.setFailed('No eligible approver found.');
      return;
    }
    
    await octokit.rest.pulls.requestReviewers({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullRequest.number,
      reviewers: [eligibleApprover]
    });
    
    core.info(`Assigned new approver: @${eligibleApprover}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function parseCodeownersFile(filePath) {
  const codeowners = [];
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

function findEligibleApprover(codeowners, committers) {
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

run();
