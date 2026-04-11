export type CanonicalNodeType =
  | "USER"
  | "ACCOUNT"
  | "BUSINESS"
  | "ORGANIZATION"
  | "LISTING"
  | "PRODUCT"
  | "SERVICE_ITEM"
  | "PROPERTY"
  | "ROOM"
  | "HOTEL_UNIT"
  | "ORDER"
  | "BOOKING"
  | "FLIGHT_BOOKING"
  | "DELIVERY_JOB"
  | "MESSAGE_THREAD"
  | "CALL_SESSION"
  | "PAYMENT"
  | "WALLET_ACCOUNT"
  | "TRANSACTION"
  | "MEDIA_ASSET"
  | "CATEGORY_NODE"
  | "LOCATION_NODE"
  | "AD_CAMPAIGN"
  | "PROMOTION"
  | "REVIEW"
  | "EVENT"
  | "ALERT"
  | "INCIDENT"
  | "AUDIT_LOG"
  | "ENGINE_RUN"
  | "ENGINE_HEALTH";

export type CanonicalEdgeType =
  | "BELONGS_TO"
  | "LOCATED_IN"
  | "OWNED_BY"
  | "LISTED_AS"
  | "RELATED_TO"
  | "USES_MEDIA"
  | "PAID_BY"
  | "GENERATED_FROM"
  | "TARGETS"
  | "TRIGGERED"
  | "BLOCKED_BY"
  | "DEPENDS_ON"
  | "PUBLISHED_TO"
  | "SYNCS_WITH";

export type LifecycleState =
  | "draft"
  | "pending"
  | "active"
  | "suspended"
  | "archived"
  | "deleted";

export type ValidationStatus =
  | "unvalidated"
  | "validating"
  | "valid"
  | "invalid"
  | "expired";

export type VisibilityStatus =
  | "private"
  | "internal"
  | "public"
  | "hidden"
  | "restricted";

export interface CanonicalNode {
  id: string;
  canonical_type: CanonicalNodeType;
  canonical_path: string;
  domain: string;
  owner_id: string | null;
  source_of_truth: string;
  created_at: number;
  updated_at: number;
  lifecycle_state: LifecycleState;
  validation_status: ValidationStatus;
  quality_score: number;
  conflict_score: number;
  audit_status: "pending" | "passed" | "failed" | "skipped";
  visibility_status: VisibilityStatus;
  geo_scope: string | null;
  locale_scope: string | null;
  metadata: Record<string, unknown>;
}

export interface CanonicalEdge {
  id: string;
  type: CanonicalEdgeType;
  source_id: string;
  source_type: CanonicalNodeType;
  target_id: string;
  target_type: CanonicalNodeType;
  metadata: Record<string, unknown>;
  created_at: number;
}

const MAX_NODES = 50_000;
const MAX_EDGES = 100_000;

class ContentGraph {
  private nodes = new Map<string, CanonicalNode>();
  private edges: CanonicalEdge[] = [];
  private edgesBySource = new Map<string, CanonicalEdge[]>();
  private edgesByTarget = new Map<string, CanonicalEdge[]>();
  private nodesByType = new Map<CanonicalNodeType, Set<string>>();
  private nodesByPath = new Map<string, Set<string>>();

  registerNode(node: CanonicalNode): boolean {
    if (this.nodes.size >= MAX_NODES) return false;
    this.nodes.set(node.id, node);

    if (!this.nodesByType.has(node.canonical_type)) {
      this.nodesByType.set(node.canonical_type, new Set());
    }
    this.nodesByType.get(node.canonical_type)!.add(node.id);

    if (!this.nodesByPath.has(node.canonical_path)) {
      this.nodesByPath.set(node.canonical_path, new Set());
    }
    this.nodesByPath.get(node.canonical_path)!.add(node.id);

    return true;
  }

  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.nodes.delete(id);
    this.nodesByType.get(node.canonical_type)?.delete(id);
    this.nodesByPath.get(node.canonical_path)?.delete(id);
    this.edges = this.edges.filter(
      (e) => e.source_id !== id && e.target_id !== id
    );
    this.edgesBySource.delete(id);
    this.edgesByTarget.delete(id);
    return true;
  }

  addEdge(edge: CanonicalEdge): boolean {
    if (this.edges.length >= MAX_EDGES) return false;
    if (!this.nodes.has(edge.source_id) || !this.nodes.has(edge.target_id))
      return false;
    this.edges.push(edge);

    if (!this.edgesBySource.has(edge.source_id)) {
      this.edgesBySource.set(edge.source_id, []);
    }
    this.edgesBySource.get(edge.source_id)!.push(edge);

    if (!this.edgesByTarget.has(edge.target_id)) {
      this.edgesByTarget.set(edge.target_id, []);
    }
    this.edgesByTarget.get(edge.target_id)!.push(edge);

    return true;
  }

  getNode(id: string): CanonicalNode | undefined {
    return this.nodes.get(id);
  }

  getNodesByType(type: CanonicalNodeType): CanonicalNode[] {
    const ids = this.nodesByType.get(type);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  getNodesByPath(pathPrefix: string): CanonicalNode[] {
    const results: CanonicalNode[] = [];
    for (const [path, ids] of this.nodesByPath) {
      if (path === pathPrefix || path.startsWith(pathPrefix + ".")) {
        for (const id of ids) {
          const n = this.nodes.get(id);
          if (n) results.push(n);
        }
      }
    }
    return results;
  }

  getOutgoingEdges(nodeId: string): CanonicalEdge[] {
    return this.edgesBySource.get(nodeId) || [];
  }

  getIncomingEdges(nodeId: string): CanonicalEdge[] {
    return this.edgesByTarget.get(nodeId) || [];
  }

  getRelatedNodes(
    nodeId: string,
    edgeType?: CanonicalEdgeType
  ): CanonicalNode[] {
    const outgoing = this.getOutgoingEdges(nodeId);
    const filtered = edgeType
      ? outgoing.filter((e) => e.type === edgeType)
      : outgoing;
    return filtered
      .map((e) => this.nodes.get(e.target_id)!)
      .filter(Boolean);
  }

  findOrphanNodes(): CanonicalNode[] {
    const connected = new Set<string>();
    for (const edge of this.edges) {
      connected.add(edge.source_id);
      connected.add(edge.target_id);
    }
    return Array.from(this.nodes.values()).filter(
      (n) =>
        !connected.has(n.id) &&
        n.canonical_type !== "CATEGORY_NODE" &&
        n.canonical_type !== "LOCATION_NODE"
    );
  }

  findBrokenEdges(): CanonicalEdge[] {
    return this.edges.filter(
      (e) => !this.nodes.has(e.source_id) || !this.nodes.has(e.target_id)
    );
  }

  getStats() {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodesByType: Object.fromEntries(
        Array.from(this.nodesByType.entries()).map(([k, v]) => [k, v.size])
      ),
      uniquePaths: this.nodesByPath.size,
      orphanCount: this.findOrphanNodes().length,
      brokenEdgeCount: this.findBrokenEdges().length,
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.edgesBySource.clear();
    this.edgesByTarget.clear();
    this.nodesByType.clear();
    this.nodesByPath.clear();
  }
}

export const contentGraph = new ContentGraph();
