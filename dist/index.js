"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const utils_1 = require("./utils");
async function run() {
    try {
        const token = core.getInput('github-token');
        const codeownersFile = core.getInput('codeowners-file');
        const octokit = github.getOctokit(token);
        const context = github.context;
        const pullRequest = context.payload.pull_request;
        if (!pullRequest) {
            core.setFailed('This action can only be run in the context of a pull request.');
            return;
        }
        const committers = await (0, utils_1.getCommitters)(octokit, context.repo.owner, context.repo.repo, pullRequest.number);
        const approvers = (0, utils_1.getApprovers)(pullRequest);
        const ineligibleApprovers = approvers.filter(approver => committers.has(approver));
        if (ineligibleApprovers.length > 0) {
            core.info(`Ineligible approvers: ${ineligibleApprovers.join(', ')}`);
        }
        const codeowners = await (0, utils_1.parseCodeownersFile)(codeownersFile);
        const eligibleApprover = (0, utils_1.findEligibleApprover)(codeowners, committers);
        if (!eligibleApprover) {
            core.setFailed('No eligible approver found.');
            return;
        }
        await (0, utils_1.requestReviewer)(octokit, context.repo.owner, context.repo.repo, pullRequest.number, eligibleApprover);
        core.info(`Assigned new approver: @${eligibleApprover}`);
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
