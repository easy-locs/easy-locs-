import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import type { OrchestratorConfig } from "../types.js";

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: OrchestratorConfig) {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.githubAppId,
        privateKey: config.githubPrivateKey,
        installationId: config.githubInstallationId,
      },
    });
    this.owner = config.githubOwner;
    this.repo = config.githubRepo;
  }

  async getIssue(issueNumber: number) {
    const { data } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });
    return data;
  }

  async addIssueComment(issueNumber: number, body: string) {
    const { data } = await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body,
    });
    return data;
  }

  async addIssueLabels(issueNumber: number, labels: string[]) {
    await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels,
    });
  }

  async createBranch(branchName: string, fromRef = "main"): Promise<void> {
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${fromRef}`,
    });

    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });
  }

  async getFileContent(path: string, ref?: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if ("content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      return null;
    } catch (err) {
      console.debug(`[github] getFileContent(${path}) failed:`, err instanceof Error ? err.message : err);
      return null;
    }
  }

  async createOrUpdateFile(params: {
    path: string;
    content: string;
    message: string;
    branch: string;
  }): Promise<void> {
    let sha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: params.path,
        ref: params.branch,
      });
      if ("sha" in data) {
        sha = data.sha;
      }
    } catch {
      // File doesn't exist yet
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: params.path,
      message: params.message,
      content: Buffer.from(params.content).toString("base64"),
      branch: params.branch,
      sha,
    });
  }

  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base?: string;
    labels?: string[];
  }) {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base ?? "main",
    });

    if (params.labels?.length) {
      await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: data.number,
        labels: params.labels,
      });
    }

    return data;
  }

  async getPullRequestDiff(prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      mediaType: { format: "diff" },
    });
    return data as unknown as string;
  }

  async addPRReviewComment(prNumber: number, body: string) {
    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
  }

  async getRepoTree(ref = "main"): Promise<string[]> {
    const { data } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: ref,
      recursive: "true",
    });
    return data.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path!)
      .filter(Boolean);
  }

  async createIssue(params: { title: string; body: string; labels?: string[] }) {
    const { data } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: params.title,
      body: params.body,
      labels: params.labels,
    });
    return data;
  }

  async listOpenIssues(labels?: string[]) {
    const { data } = await this.octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      state: "open",
      labels: labels?.join(","),
      per_page: 100,
    });
    return data;
  }

  async triggerWorkflowDispatch(workflowFile: string, ref = "main", inputs?: Record<string, string>): Promise<void> {
    await this.octokit.actions.createWorkflowDispatch({
      owner: this.owner,
      repo: this.repo,
      workflow_id: workflowFile,
      ref,
      inputs,
    });
  }

  async getLatestWorkflowRun(workflowFile: string): Promise<{
    id: number;
    status: string;
    conclusion: string | null;
    htmlUrl: string;
  } | null> {
    try {
      const { data } = await this.octokit.actions.listWorkflowRuns({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowFile,
        per_page: 1,
      });
      const run = data.workflow_runs[0];
      if (!run) return null;
      return {
        id: run.id,
        status: run.status ?? "unknown",
        conclusion: run.conclusion ?? null,
        htmlUrl: run.html_url,
      };
    } catch (err) {
      console.debug("[github] getLatestWorkflowRun failed:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  async getPRCheckRuns(prNumber: number): Promise<Array<{
    name: string;
    status: string;
    conclusion: string | null;
  }>> {
    try {
      const { data: pr } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });
      const { data } = await this.octokit.checks.listForRef({
        owner: this.owner,
        repo: this.repo,
        ref: pr.head.sha,
      });
      return data.check_runs.map((cr) => ({
        name: cr.name,
        status: cr.status,
        conclusion: cr.conclusion ?? null,
      }));
    } catch (err) {
      console.debug("[github] getPRCheckRuns failed:", err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getLatestDeploymentStatus(): Promise<{
    state: string;
    environment: string;
    updatedAt: string;
  } | null> {
    try {
      const { data: deployments } = await this.octokit.repos.listDeployments({
        owner: this.owner,
        repo: this.repo,
        per_page: 1,
      });

      if (!deployments.length) return null;

      const { data: statuses } =
        await this.octokit.repos.listDeploymentStatuses({
          owner: this.owner,
          repo: this.repo,
          deployment_id: deployments[0].id,
          per_page: 1,
        });

      if (!statuses.length) return null;

      return {
        state: statuses[0].state,
        environment: deployments[0].environment,
        updatedAt: statuses[0].updated_at,
      };
    } catch (err) {
      console.debug("[github] getLatestDeploymentStatus failed:", err instanceof Error ? err.message : err);
      return null;
    }
  }
}
