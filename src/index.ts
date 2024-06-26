import * as core from '@actions/core';
import * as github from '@actions/github';
import { getCommitters, getApprovers, requestReviewer, parseCodeownersFile, findEligibleApprover } from './utils';
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";

type ExtendedOctokit = Octokit & { paginate: typeof paginateRest; rest: RestEndpointMethods };

const MyOctokit = Octokit.plugin(paginateRest, restEndpointMethods);

async function run() {
  try {
    const token = core.getInput('github-token');
    const codeownersFile = core.getInput('codeowners-file');

    const octokit = new MyOctokit({ auth: token }) as ExtendedOctokit;
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
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error occurred");
    }
  }
}

run();
