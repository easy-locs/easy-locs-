import fs from "node:fs";
import path from "node:path";
import type { Task } from "./types.js";

const DEFAULT_STORE_PATH = path.resolve(
  import.meta.dirname ?? ".",
  "../data/tasks.json"
);

export class TaskStore {
  private storePath: string;
  private tasks: Map<string, Task> = new Map();

  constructor(storePath?: string) {
    this.storePath = storePath ?? DEFAULT_STORE_PATH;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, "utf-8");
        const data = JSON.parse(raw) as Task[];
        for (const task of data) {
          this.tasks.set(task.id, task);
        }
        console.log(`[task-store] Loaded ${this.tasks.size} tasks from ${this.storePath}`);
      }
    } catch (err) {
      console.warn(`[task-store] Failed to load tasks: ${err instanceof Error ? err.message : err}`);
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = [...this.tasks.values()];
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error(`[task-store] Failed to persist tasks: ${err instanceof Error ? err.message : err}`);
    }
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  set(task: Task): void {
    task.updatedAt = new Date().toISOString();
    this.tasks.set(task.id, task);
    this.persist();
  }

  delete(id: string): boolean {
    const deleted = this.tasks.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  findByIssueNumber(issueNumber: number): Task | undefined {
    return [...this.tasks.values()].find(
      (t) => t.githubIssueNumber === issueNumber
    );
  }

  findByPRNumber(prNumber: number): Task | undefined {
    return [...this.tasks.values()].find(
      (t) => t.prNumber === prNumber
    );
  }

  getAll(): Task[] {
    return [...this.tasks.values()];
  }

  get size(): number {
    return this.tasks.size;
  }
}
