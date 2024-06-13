"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEligibleApprover = exports.parseCodeownersFile = exports.requestReviewer = exports.getApprovers = exports.getCommitters = void 0;
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
async function getCommitters(octokit, owner, repo, pullNumber) {
    const committers = new Set();
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
exports.getCommitters = getCommitters;
function getApprovers(pullRequest) {
    return pullRequest.requested_reviewers.map((reviewer) => reviewer.login);
}
exports.getApprovers = getApprovers;
async function requestReviewer(octokit, owner, repo, pullNumber, reviewer) {
    await octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: pullNumber,
        reviewers: [reviewer]
    });
}
exports.requestReviewer = requestReviewer;
async function parseCodeownersFile(filePath) {
    const codeowners = [];
    const fileStream = fs_1.default.createReadStream(filePath);
    const rl = readline_1.default.createInterface({
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
exports.parseCodeownersFile = parseCodeownersFile;
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
exports.findEligibleApprover = findEligibleApprover;
