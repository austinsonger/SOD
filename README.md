> [Not Production Ready]


# Segregation of Duties (SODBuddy) Github Action

> This GitHub Action enforces segregation of duties by checking the APPROVER file and ensuring that no committer can approve or merge their own code.

## Usage

Create a workflow file in your repository (e.g., `.github/workflows/enforce_sod.yml`) with the following content:

```yaml
```

- **Inputs** - `GITHUB_TOKEN:` - The GitHub token for authentication (required).


-------

### APPROVER

The APPROVER file should follow this format:

```
* @username1,1
* @username2,0
* @username3,0
* @username4,0
* @username5,1
* @username6,1
```

##### Hierarchy

- Users assigned 0 are Primary APPROVER.
- Users assigned 1 are Secondary APPROVER.


### Action Logic

The action follows these steps to enforce segregation of duties:

#### 1. Identify Committers and Approvers:

The action first identifies all committers (users who have made commits) and approvers (users who are requested to review the pull request).

#### 2. Remove Ineligible Approvers:

If any approver has also committed code to the pull request, they are removed from the list of approvers.

#### 3. Find Eligible Approver:

The action then searches for a new approver in the APPROVER.md file. It first checks the Primary APPROVER (users assigned 0).
If all Primary APPROVER have committed code and are thus ineligible, the action moves on to check the Secondary APPROVER (users assigned 1).

#### 4. Assign New Approver:

The first eligible user found (who has not committed code to the pull request) is assigned as the new approver.


### Example

**Let's say the action encounters the following scenario:**

- `@username4` cannot approve the pull request because they have at least one commit as part of the PR.
- The action then checks the next Primary CODEOWNER: `@username2` (has at least one commit as part of the PR).
- Then, `@username3` (has at least one commit as part of the PR).
- All Primary APPROVER are ineligible to approve the pull request because they have committed code.

The action then moves to the Secondary APPROVER:
- `@username1` is checked and found eligible (no commits in the PR).

Therefore, @username1 is assigned as the new approver.

```
@username1,1
@username2,0
@username3,0
@username4,0
@username5,1
@username6,1
```

- `@username2`, `@username3`, and `@username4` are Primary APPROVER (assigned 0).
- `@username1`, `@username5`, and `@username6` are Secondary APPROVER (assigned 1).


