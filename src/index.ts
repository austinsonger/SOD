import * as core from '@actions/core';
import * as github from '@actions/github';
import { getCommitters, getApprovers, requestReviewer, parseCodeownersFile, findEligibleApprover } from './utils';

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
    
    const committers = await getCommitters(octokit, context.repo.owner, context.repo.repo, pullRequest.number);
    const approvers = getApprovers(pullRequest);
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
    
    await requestReviewer(octokit, context.repo.owner, context.repo.repo, pullRequest.number, eligibleApprover);
    
    core.info(`Assigned new approver: @${eligibleApprover}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
