import type { KnowledgeNode, KnowledgeNodeType, KnowledgeEdge, KnowledgeEdgeType, OmegaEngineStatus } from "../omega-types";

const MAX_NODES = 50_000;
const MAX_EDGES = 200_000;

let nodeIdCounter = 0;
let edgeIdCounter = 0;

class KnowledgeGraphEngine {
  readonly name = "omega-knowledge-graph";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private nodes = new Map<string, KnowledgeNode>();
  private edges = new Map<string, KnowledgeEdge>();
  private adjacency = new Map<string, Set<string>>();
  private reverseAdj = new Map<string, Set<string>>();
  private typeIndex = new Map<KnowledgeNodeType, Set<string>>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  addNode(type: KnowledgeNodeType, label: string, domain: string, metadata: Record<string, unknown> = {}): KnowledgeNode {
    if (this.nodes.size >= MAX_NODES) {
      const oldest = [...this.nodes.values()].sort((a, b) => a.updated_at - b.updated_at)[0];
      if (oldest) this.removeNode(oldest.id);
    }
    const id = `kn_${++nodeIdCounter}`;
    const node: KnowledgeNode = { id, type, label, domain, metadata, created_at: Date.now(), updated_at: Date.now() };
    this.nodes.set(id, node);
    if (!this.typeIndex.has(type)) this.typeIndex.set(type, new Set());
    this.typeIndex.get(type)!.add(id);
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
    if (!this.reverseAdj.has(id)) this.reverseAdj.set(id, new Set());
    return node;
  }

  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    const outEdges = this.adjacency.get(id) || new Set();
    const inEdges = this.reverseAdj.get(id) || new Set();
    for (const eid of [...outEdges, ...inEdges]) {
      this.edges.delete(eid);
    }
    this.adjacency.delete(id);
    this.reverseAdj.delete(id);
    this.typeIndex.get(node.type)?.delete(id);
    this.nodes.delete(id);
    return true;
  }

  addEdge(sourceId: string, targetId: string, edgeType: KnowledgeEdgeType, weight = 1.0, metadata: Record<string, unknown> = {}): KnowledgeEdge | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;
    if (this.edges.size >= MAX_EDGES) {
      const oldest = [...this.edges.values()].sort((a, b) => a.created_at - b.created_at)[0];
      if (oldest) this.removeEdge(oldest.id);
    }
    const id = `ke_${++edgeIdCounter}`;
    const edge: KnowledgeEdge = { id, source_id: sourceId, target_id: targetId, edge_type: edgeType, weight, metadata, created_at: Date.now() };
    this.edges.set(id, edge);
    if (!this.adjacency.has(sourceId)) this.adjacency.set(sourceId, new Set());
    this.adjacency.get(sourceId)!.add(id);
    if (!this.reverseAdj.has(targetId)) this.reverseAdj.set(targetId, new Set());
    this.reverseAdj.get(targetId)!.add(id);
    return edge;
  }

  removeEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;
    this.adjacency.get(edge.source_id)?.delete(id);
    this.reverseAdj.get(edge.target_id)?.delete(id);
    this.edges.delete(id);
    return true;
  }

  getNode(id: string): KnowledgeNode | undefined { return this.nodes.get(id); }
  getEdge(id: string): KnowledgeEdge | undefined { return this.edges.get(id); }

  getNodesByType(type: KnowledgeNodeType): KnowledgeNode[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];
    return [...ids].map((id) => this.nodes.get(id)!).filter(Boolean);
  }

  getOutgoingEdges(nodeId: string): KnowledgeEdge[] {
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds) return [];
    return [...edgeIds].map((id) => this.edges.get(id)!).filter(Boolean);
  }

  getIncomingEdges(nodeId: string): KnowledgeEdge[] {
    const edgeIds = this.reverseAdj.get(nodeId);
    if (!edgeIds) return [];
    return [...edgeIds].map((id) => this.edges.get(id)!).filter(Boolean);
  }

  getNeighbors(nodeId: string): KnowledgeNode[] {
    const outEdges = this.getOutgoingEdges(nodeId);
    const inEdges = this.getIncomingEdges(nodeId);
    const neighborIds = new Set<string>();
    for (const e of outEdges) neighborIds.add(e.target_id);
    for (const e of inEdges) neighborIds.add(e.source_id);
    neighborIds.delete(nodeId);
    return [...neighborIds].map((id) => this.nodes.get(id)!).filter(Boolean);
  }

  findPath(fromId: string, toId: string, maxDepth = 6): string[] | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === toId) return current.path;
      if (current.path.length >= maxDepth) continue;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const outEdges = this.adjacency.get(current.id) || new Set();
      for (const eid of outEdges) {
        const edge = this.edges.get(eid);
        if (edge && !visited.has(edge.target_id)) {
          queue.push({ id: edge.target_id, path: [...current.path, edge.target_id] });
        }
      }
    }
    return null;
  }

  detectOrphanNodes(): KnowledgeNode[] {
    const orphans: KnowledgeNode[] = [];
    for (const [id, node] of this.nodes) {
      const outCount = this.adjacency.get(id)?.size || 0;
      const inCount = this.reverseAdj.get(id)?.size || 0;
      if (outCount === 0 && inCount === 0) orphans.push(node);
    }
    return orphans;
  }

  detectBrokenEdges(): KnowledgeEdge[] {
    const broken: KnowledgeEdge[] = [];
    for (const [, edge] of this.edges) {
      if (!this.nodes.has(edge.source_id) || !this.nodes.has(edge.target_id)) {
        broken.push(edge);
      }
    }
    return broken;
  }

  detectDuplicates(type: KnowledgeNodeType): Array<[KnowledgeNode, KnowledgeNode]> {
    const byType = this.getNodesByType(type);
    const dupes: Array<[KnowledgeNode, KnowledgeNode]> = [];
    for (let i = 0; i < byType.length; i++) {
      for (let j = i + 1; j < byType.length; j++) {
        if (byType[i].label === byType[j].label && byType[i].domain === byType[j].domain) {
          dupes.push([byType[i], byType[j]]);
        }
      }
    }
    return dupes;
  }

  getStats() {
    const typeCounts: Record<string, number> = {};
    for (const [type, ids] of this.typeIndex) {
      typeCounts[type] = ids.size;
    }
    const edgeTypeCounts: Record<string, number> = {};
    for (const [, edge] of this.edges) {
      edgeTypeCounts[edge.edge_type] = (edgeTypeCounts[edge.edge_type] || 0) + 1;
    }
    return {
      total_nodes: this.nodes.size,
      total_edges: this.edges.size,
      node_types: typeCounts,
      edge_types: edgeTypeCounts,
      orphans: this.detectOrphanNodes().length,
      broken_edges: this.detectBrokenEdges().length,
    };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] KnowledgeGraphEngine booted | nodes: ${this.nodes.size} | edges: ${this.edges.size}`);
  }

  shutdown(): void {
    this.status = "stopped";
  }
}

export const knowledgeGraphEngine = new KnowledgeGraphEngine();
