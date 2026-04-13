import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, BookOpen,
  Brain, CheckCircle, Cpu, Eye, GitMerge, Heart,
  Layers, Lock, RefreshCw, Search, Shield, Trash2,
  TrendingUp, Wrench, XCircle, Zap, Ban, RotateCcw,
  ChevronRight, Pause, Info
} from "lucide-react";
import { engineOrchestrator } from "@/engines/core/engine-orchestrator";
import { engineObserver } from "@/engines/core/engine-observer";
import { sentinelEngineRegistry } from "@/core/sentinel/registry/engine-registry";
import { sentinelScoringEngine } from "@/core/sentinel/scoring/sentinel-scoring-engine";
import { sentinelTelemetryEngine } from "@/core/sentinel/telemetry/sentinel-telemetry-engine";
import { getProofStats, getProofsByDomain } from "@/engines/core/proof-system";
import { getPipelineReport } from "@/engines/core/repair-pipeline";

interface RegistryEngine {
  id: string;
  name: string;
  verdict: string;
  domain: string;
  fitness: number;
  version: string;
  tier: string;
}

const RAW_REGISTRY: [string, string, number, string, string, string][] = [
  ["ENG-001","Omega Adaptive UX Engine",44,"QUARANTINE","UX/UI Integrity","CORE"],
  ["ENG-002","Omega Business Opportunity Engine",73,"FIX","Analytics/Proof","CORE"],
  ["ENG-003","Omega Code Evolution Engine",32,"QUARANTINE","Legacy/Shadow/Unknown","CORE"],
  ["ENG-004","Omega Decision Engine",62,"QUARANTINE","Governance","CORE"],
  ["ENG-005","Omega Incident Response Engine",63,"FIX","Monitoring","CORE"],
  ["ENG-006","Omega Knowledge Graph Engine",69,"FIX","Learning","CORE"],
  ["ENG-007","Omega Memory Engine",61,"FIX","Learning","CORE"],
  ["ENG-008","Omega Prediction Engine",69,"FIX","Learning","CORE"],
  ["ENG-009","Omega Priority Engine",74,"KEEP","Orchestration","CORE"],
  ["ENG-010","Omega Self-Improvement Engine",31,"QUARANTINE","Legacy/Shadow/Unknown","CORE"],
  ["ENG-011","Sentinel Audit Engine",104,"KEEP","Monitoring","CORE"],
  ["ENG-012","Sentinel Conflict Engine",89,"FIX","Detection","CORE"],
  ["ENG-013","Sentinel Healing Engine",97,"KEEP","Repair","CORE"],
  ["ENG-014","Sentinel Health Engine",103,"KEEP","Monitoring","CORE"],
  ["ENG-015","Sentinel Incident Engine",102,"KEEP","Monitoring","CORE"],
  ["ENG-016","Sentinel Invariant Engine",96,"FIX","Governance","CORE"],
  ["ENG-017","Sentinel Engine Registry",101,"KEEP","Orchestration","CORE"],
  ["ENG-018","Sentinel Report Engine",97,"FIX","Analytics/Proof","CORE"],
  ["ENG-019","Sentinel Scoring Engine",103,"KEEP","Monitoring","CORE"],
  ["ENG-020","Sentinel Telemetry Engine",102,"KEEP","Monitoring","CORE"],
  ["ENG-021","Sentinel Validation Engine",97,"FIX","Governance","CORE"],
  ["ENG-022","Sentinel Workflow Engine",82,"FIX","Orchestration","CORE"],
  ["ENG-023","Orbit Preview Engine",85,"KEEP","Orbit/Messaging","IMPL"],
  ["ENG-024","Base Engine",114,"KEEP","Orchestration","CORE"],
  ["ENG-025","Engine Feature Flags",113,"KEEP","Governance","CORE"],
  ["ENG-026","Engine Learning Core",86,"KEEP","Learning","CORE"],
  ["ENG-027","Engine Memory Core",84,"FIX","Learning","CORE"],
  ["ENG-028","Engine Observer",103,"KEEP","Monitoring","CORE"],
  ["ENG-029","Engine Orchestrator",107,"KEEP","Orchestration","CORE"],
  ["ENG-030","Taxonomy Runtime Engine",103,"KEEP","Taxonomy","IMPL"],
  ["ENG-031","Engine Registry",105,"KEEP","Orchestration","CORE"],
  ["ENG-032","Publish Gate Food Orch",69,"MERGE","Flow Integrity","ORCH"],
  ["ENG-033","Publish Gate Grocery Orch",69,"MERGE","Flow Integrity","ORCH"],
  ["ENG-034","Publish Gate Service Orch",69,"MERGE","Flow Integrity","ORCH"],
  ["ENG-035","Action Wiring Engine",85,"FIX","Orchestration","ORCH"],
  ["ENG-036","Anti-Conflict Engine",38,"MERGE","Governance","ORCH"],
  ["ENG-037","Auto-Remediation Engine",91,"KEEP","Repair","ORCH"],
  ["ENG-038","Banner Strategy Engine",48,"MERGE","UX/UI Integrity","ORCH"],
  ["ENG-039","Flow Closure Engine",81,"FIX","Flow Integrity","ORCH"],
  ["ENG-040","Layout Integrity Engine",51,"MERGE","UX/UI Integrity","ORCH"],
  ["ENG-041","Localization Engine",61,"MERGE","Orchestration","ORCH"],
  ["ENG-042","Media Relevance Engine",39,"MERGE","Data Quality","ORCH"],
  ["ENG-043","Page Open Engine",83,"FIX","Flow Integrity","ORCH"],
  ["ENG-044","Runtime Health Engine",39,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-045","Taxonomy Governance Engine",83,"FIX","Taxonomy","ORCH"],
  ["ENG-046","Text Integrity Engine",83,"FIX","Data Quality","ORCH"],
  ["ENG-047","Vertical Isolation Engine",101,"KEEP","Governance","ORCH"],
  ["ENG-048","Backend Connectivity Orch",69,"MERGE","Orchestration","ORCH"],
  ["ENG-049","Full-Stack Linkage Orch",69,"MERGE","Orchestration","ORCH"],
  ["ENG-050","Auto-Publish Orch",69,"MERGE","Flow Integrity","ORCH"],
  ["ENG-051","Auto-Unpublish Orch",69,"MERGE","Flow Integrity","ORCH"],
  ["ENG-052","Food Menu Normalizer Orch",69,"MERGE","Marketplace","ORCH"],
  ["ENG-053","Grocery Normalizer Orch",69,"MERGE","Marketplace","ORCH"],
  ["ENG-054","Menu Rebuild Orch",69,"MERGE","Marketplace","ORCH"],
  ["ENG-055","Service Catalog Normalizer Orch",69,"MERGE","Marketplace","ORCH"],
  ["ENG-056","Data Completeness Orch",69,"MERGE","Data Quality","ORCH"],
  ["ENG-057","Data Quality Orch Engine",106,"KEEP","Data Quality","ORCH"],
  ["ENG-058","Data Trust Orch",69,"MERGE","Data Quality","ORCH"],
  ["ENG-059","Unread Integrity Engine",82,"FIX","Sync/Realtime","IMPL"],
  ["ENG-060","Auto-Fix Engine",101,"KEEP","Repair","IMPL"],
  ["ENG-061","Adaptive Taxonomy Orch",69,"MERGE","Taxonomy","ORCH"],
  ["ENG-062","Category Mapping Orch",69,"MERGE","Taxonomy","ORCH"],
  ["ENG-063","Call Audio Engine",75,"FIX","Orbit/Messaging","IMPL"],
  ["ENG-064","Call Media Engine",75,"FIX","Orbit/Messaging","IMPL"],
  ["ENG-065","Transport Engine",85,"KEEP","Orbit/Messaging","IMPL"],
  ["ENG-066","Action Engine",81,"FIX","Orchestration","IMPL"],
  ["ENG-067","Address Engine",93,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-068","Geo Sync Engine",93,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-069","Admin Priority Engine",84,"KEEP","Governance","IMPL"],
  ["ENG-070","SLA Engine",76,"FIX","Monitoring","IMPL"],
  ["ENG-071","AI Core Engine",69,"FIX","Learning","IMPL"],
  ["ENG-072","AI Feedback Engine",88,"KEEP","Learning","IMPL"],
  ["ENG-073","AI Audit International",75,"FIX","Analytics/Proof","IMPL"],
  ["ENG-074","AI Audit Marketplace",75,"FIX","Analytics/Proof","IMPL"],
  ["ENG-075","AI Audit SEO Engine",52,"MERGE","Search/Index","IMPL"],
  ["ENG-076","AI Audit Simple Engines",30,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-077","AI Audit Technical",75,"FIX","Analytics/Proof","IMPL"],
  ["ENG-078","AI Audit UI/UX",75,"FIX","Analytics/Proof","IMPL"],
  ["ENG-079","Master Audit Engine",27,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-080","Auto-Heal Engine",69,"FIX","Repair","IMPL"],
  ["ENG-081","Canonical Boost Engine",106,"KEEP","Data Quality","IMPL"],
  ["ENG-082","Business Core Onboarding",94,"KEEP","Orchestration","IMPL"],
  ["ENG-083","Quality Score Engine",77,"FIX","Data Quality","IMPL"],
  ["ENG-084","Close Flow Engine",84,"KEEP","Flow Integrity","IMPL"],
  ["ENG-085","Living Commerce Engine",70,"FIX","Marketplace","IMPL"],
  ["ENG-086","Context Banner Engine",96,"KEEP","UX/UI Integrity","IMPL"],
  ["ENG-087","Global Context Engine",69,"FIX","Orchestration","IMPL"],
  ["ENG-088","Incident Engine",63,"FIX","Monitoring","IMPL"],
  ["ENG-089","Currency Engine",93,"KEEP","Wallet/Payment","IMPL"],
  ["ENG-090","DQ Engine Base",106,"KEEP","Data Quality","CORE"],
  ["ENG-091","DQ Engine Registry",104,"KEEP","Data Quality","CORE"],
  ["ENG-092","DQ Audit Trail Engine",101,"KEEP","Data Quality","IMPL"],
  ["ENG-093","DQ Scoring Engine",107,"KEEP","Data Quality","IMPL"],
  ["ENG-094","DQ Duplicate Shadow",93,"KEEP","Data Quality","IMPL"],
  ["ENG-095","DQ Live Surface Sanitizer",102,"KEEP","Data Quality","IMPL"],
  ["ENG-096","DQ Media Relevance",102,"KEEP","Data Quality","IMPL"],
  ["ENG-097","DQ Quarantine Engine",101,"KEEP","Data Quality","IMPL"],
  ["ENG-098","DQ Reference Integrity",101,"KEEP","Data Quality","IMPL"],
  ["ENG-099","DQ Safe Remediation",101,"KEEP","Repair","IMPL"],
  ["ENG-100","DQ Search Hygiene",107,"KEEP","Search/Index","IMPL"],
  ["ENG-101","DQ Taxonomy Integrity",101,"KEEP","Taxonomy","IMPL"],
  ["ENG-102","Dedup Engine",106,"KEEP","Data Quality","IMPL"],
  ["ENG-103","Adaptive Taxonomy Engine",98,"KEEP","Taxonomy","IMPL"],
  ["ENG-104","AI Decision Engine",40,"QUARANTINE","Learning","IMPL"],
  ["ENG-105","Auto Acquisition Engine",37,"QUARANTINE","Marketplace","IMPL"],
  ["ENG-106","Autonomous Business Engine",28,"QUARANTINE","Legacy/Shadow/Unknown","IMPL"],
  ["ENG-107","Auto Publish Engine",100,"KEEP","Flow Integrity","IMPL"],
  ["ENG-108","Auto Unpublish Engine",100,"KEEP","Flow Integrity","IMPL"],
  ["ENG-109","Backend Connectivity",105,"KEEP","Orchestration","IMPL"],
  ["ENG-110","Category Mapping Engine",108,"KEEP","Taxonomy","IMPL"],
  ["ENG-111","Coherence Engine",68,"FIX","Governance","IMPL"],
  ["ENG-112","Data Completeness Engine",102,"KEEP","Data Quality","IMPL"],
  ["ENG-113","Data Quality Engine Shadow",27,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-114","Data Trust Engine",107,"KEEP","Data Quality","IMPL"],
  ["ENG-115","Digital Orchestration",66,"FIX","Orchestration","IMPL"],
  ["ENG-116","Engine Logger",104,"KEEP","Monitoring","IMPL"],
  ["ENG-117","Engine Metadata Registry",103,"KEEP","Orchestration","IMPL"],
  ["ENG-118","Entity Integrity Engine",101,"KEEP","Data Quality","IMPL"],
  ["ENG-119","Entity Recovery Engine",88,"KEEP","Repair","IMPL"],
  ["ENG-120","Food Menu Normalizer",100,"KEEP","Marketplace","IMPL"],
  ["ENG-121","Franchise Dedup Engine",67,"FIX","Data Quality","IMPL"],
  ["ENG-122","Full-Stack Linkage Engine",105,"KEEP","Orchestration","IMPL"],
  ["ENG-123","Grocery Normalizer",100,"KEEP","Marketplace","IMPL"],
  ["ENG-124","Hyper Radar Engine",66,"FIX","Radar/Discovery","IMPL"],
  ["ENG-125","Legal Engine",75,"FIX","Governance","IMPL"],
  ["ENG-126","Menu Intelligence Engine",51,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-127","Menu Presentation Engine",53,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-128","Menu Rebuild Engine",103,"KEEP","Marketplace","IMPL"],
  ["ENG-129","Merchant Override Engine",69,"FIX","Marketplace","IMPL"],
  ["ENG-130","Module Link Engine",48,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-131","Notification Engine Shadow",36,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-132","Context Awareness Engine",81,"KEEP","Learning","IMPL"],
  ["ENG-133","Hyper Personalization",80,"KEEP","Learning","IMPL"],
  ["ENG-134","Next Best Action",81,"KEEP","Learning","IMPL"],
  ["ENG-135","Personal Profile Engine",81,"KEEP","Learning","IMPL"],
  ["ENG-136","Session Intelligence",81,"KEEP","Learning","IMPL"],
  ["ENG-137","Property Automation",65,"FIX","Property","IMPL"],
  ["ENG-138","Publish Gate Food",107,"KEEP","Flow Integrity","IMPL"],
  ["ENG-139","Publish Gate Grocery",107,"KEEP","Flow Integrity","IMPL"],
  ["ENG-140","Publish Gate Service",107,"KEEP","Flow Integrity","IMPL"],
  ["ENG-141","Real Estate Registry",32,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-142","Rent Call Engine",84,"KEEP","Property","IMPL"],
  ["ENG-143","SEO Engine Shadow",25,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-144","Service Catalog Normalizer",104,"KEEP","Marketplace","IMPL"],
  ["ENG-145","Shop Cleanup Engine",75,"FIX","Marketplace","IMPL"],
  ["ENG-146","Shop Quality Engine",72,"FIX","Marketplace","IMPL"],
  ["ENG-147","Source Intake Engine",105,"KEEP","Import/Scraping/Enrichment","IMPL"],
  ["ENG-148","Strict Quality Gate",106,"KEEP","Governance","IMPL"],
  ["ENG-149","Unified Global Engine",28,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-150","UX Audit Engine",50,"FIX","UX/UI Integrity","IMPL"],
  ["ENG-151","Vertical Classifier",105,"KEEP","Taxonomy","IMPL"],
  ["ENG-152","Vibe Density Engine",27,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-153","Visibility Optimizer",70,"FIX","Search/Index","IMPL"],
  ["ENG-154","Geo Conflict Engine",74,"FIX","Radar/Discovery","IMPL"],
  ["ENG-155","OSM Places Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-156","God Anti-Conflict",20,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-157","God Continuous Audit",20,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-158","God Hyper-Optimization",25,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-159","God Maintenance",25,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-160","God Observability",20,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-161","God Quality Gate",18,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-162","God Taxonomy",18,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-163","Growth Domination",25,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-164","i18n Engine",104,"KEEP","Orchestration","IMPL"],
  ["ENG-165","Import Dedup Engine",46,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-166","Import Merge Engine",46,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-167","Universal Import Engine",106,"KEEP","Import/Scraping/Enrichment","IMPL"],
  ["ENG-168","Import Visibility",84,"KEEP","Import/Scraping/Enrichment","IMPL"],
  ["ENG-169","Feed Ranking Engine",107,"KEEP","Search/Index","IMPL"],
  ["ENG-170","Ticker Engine",84,"KEEP","Monitoring","IMPL"],
  ["ENG-171","Intent Engine",75,"FIX","Learning","IMPL"],
  ["ENG-172","Engine Heartbeat",105,"KEEP","Monitoring","IMPL"],
  ["ENG-173","Task Engine",74,"FIX","Orchestration","IMPL"],
  ["ENG-174","Badge Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-175","Map Interaction Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-176","Map Performance Engine",86,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-177","Map Style Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-178","Heatmap Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-179","Live Stations Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-180","Map Engine V2",103,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-181","Nearby Discovery",106,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-182","Route Preview Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-183","Menu Engine",94,"KEEP","Marketplace","IMPL"],
  ["ENG-184","Merchant Automation",81,"KEEP","Marketplace","IMPL"],
  ["ENG-185","Merchant QR Engine",84,"KEEP","Marketplace","IMPL"],
  ["ENG-186","Shop OS Engine",94,"KEEP","Marketplace","IMPL"],
  ["ENG-187","Delivery Batch Engine",81,"KEEP","Marketplace","IMPL"],
  ["ENG-188","Dispatch Engine",107,"KEEP","Marketplace","IMPL"],
  ["ENG-189","Dispatch Learning",88,"KEEP","Learning","IMPL"],
  ["ENG-190","Dispatch Reassign",75,"FIX","Marketplace","IMPL"],
  ["ENG-191","Dispatch Wave Engine",81,"KEEP","Marketplace","IMPL"],
  ["ENG-192","Driver Matching Engine",107,"KEEP","Marketplace","IMPL"],
  ["ENG-193","Live Context Engine",84,"KEEP","Monitoring","IMPL"],
  ["ENG-194","Pricing AI Engine",83,"KEEP","Wallet/Payment","IMPL"],
  ["ENG-195","Mobility Pricing",101,"KEEP","Wallet/Payment","IMPL"],
  ["ENG-196","Ride Ordering Engine",99,"KEEP","Marketplace","IMPL"],
  ["ENG-197","Unified ETA Engine",103,"KEEP","Marketplace","IMPL"],
  ["ENG-198","Unified Mobility",99,"KEEP","Marketplace","IMPL"],
  ["ENG-199","Onboarding Entity Res",88,"KEEP","Orchestration","IMPL"],
  ["ENG-200","Onboarding Field Merge",88,"KEEP","Orchestration","IMPL"],
  ["ENG-201","Onboarding Missing Fields",88,"KEEP","Orchestration","IMPL"],
  ["ENG-202","Onboarding Quality Check",88,"KEEP","Orchestration","IMPL"],
  ["ENG-203","Onboarding Source Policy",88,"KEEP","Orchestration","IMPL"],
  ["ENG-204","Onboarding Taxonomy Mapper",88,"KEEP","Taxonomy","IMPL"],
  ["ENG-205","Onboarding Vertical Class",88,"KEEP","Taxonomy","IMPL"],
  ["ENG-206","Onboarding Web Fallback",83,"KEEP","Orchestration","IMPL"],
  ["ENG-207","Onboarding Publish Gate",78,"FIX","Flow Integrity","IMPL"],
  ["ENG-208","Radar Consensus",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-209","Radar Discovery",106,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-210","Radar Domain Engine",81,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-211","Radar Dynamic Pricing",67,"FIX","Radar/Discovery","IMPL"],
  ["ENG-212","Radar Filter Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-213","Radar Fusion Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-214","Radar Geo Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-215","Radar Interaction",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-216","Radar Layer Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-217","Radar Source Engine",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-218","Radar Viewport",84,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-219","Radar ETA Projection",68,"FIX","Radar/Discovery","IMPL"],
  ["ENG-220","Radar Map God",18,"REMOVE","Legacy/Shadow/Unknown","GOD"],
  ["ENG-221","Radar Predictive Demand",85,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-222","Radar Cinema Engine",73,"FIX","Radar/Discovery","IMPL"],
  ["ENG-223","Radar Engine",107,"KEEP","Radar/Discovery","IMPL"],
  ["ENG-224","Central Ranking Engine",107,"KEEP","Search/Index","IMPL"],
  ["ENG-225","Ranking Engine Legacy",25,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-226","Global Revenue Engine",86,"FIX","Analytics/Proof","IMPL"],
  ["ENG-227","Revenue Analytics",101,"KEEP","Analytics/Proof","IMPL"],
  ["ENG-228","Ride Matching Engine",107,"KEEP","Marketplace","IMPL"],
  ["ENG-229","Ride Pricing Engine",101,"KEEP","Wallet/Payment","IMPL"],
  ["ENG-230","Runtime Auto-Repair",80,"FIX","Repair","IMPL"],
  ["ENG-231","Content Governance",79,"FIX","Governance","IMPL"],
  ["ENG-232","Listing Quality Shadow",30,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-233","Provider Quality Shadow",30,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-234","Search Purity Engine",106,"KEEP","Search/Index","IMPL"],
  ["ENG-235","Security Chat Engine",75,"FIX","Security","IMPL"],
  ["ENG-236","Ghost Engine",70,"FIX","Security","IMPL"],
  ["ENG-237","Fraud Detection Engine",102,"KEEP","Security","IMPL"],
  ["ENG-238","SEO Engine Canonical",107,"KEEP","Search/Index","IMPL"],
  ["ENG-239","Shared Notification",105,"KEEP","Notification","IMPL"],
  ["ENG-240","Sync Engine",106,"KEEP","Sync/Realtime","IMPL"],
  ["ENG-241","Smart Home Engine",69,"FIX","Property","IMPL"],
  ["ENG-242","Multi-Source Merge",101,"KEEP","Import/Scraping/Enrichment","IMPL"],
  ["ENG-243","Source Normalization Shadow",23,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-244","Source Priority Engine",104,"KEEP","Import/Scraping/Enrichment","IMPL"],
  ["ENG-245","Global Support Engine",79,"FIX","Orchestration","IMPL"],
  ["ENG-246","Engine Connector Hub",103,"KEEP","Orchestration","IMPL"],
  ["ENG-247","Classification Engine",106,"KEEP","Taxonomy","IMPL"],
  ["ENG-248","Anti-Fake Engine",102,"KEEP","Security","IMPL"],
  ["ENG-249","Behavior Engine",108,"KEEP","Security","IMPL"],
  ["ENG-250","Proof Log Engine",106,"KEEP","Analytics/Proof","IMPL"],
  ["ENG-251","Trust Ranking Shadow",45,"REMOVE","Legacy/Shadow/Unknown","SHADOW"],
  ["ENG-252","Trust Score Engine",102,"KEEP","Security","IMPL"],
  ["ENG-253","User Trust Engine",70,"FIX","Security","IMPL"],
  ["ENG-254","UI Engine",80,"FIX","UX/UI Integrity","IMPL"],
  ["ENG-255","Wallet Core Engine",106,"KEEP","Wallet/Payment","IMPL"],
  ["ENG-256","Transaction Engine",107,"KEEP","Wallet/Payment","IMPL"],
  ["ENG-257","Workflow Processor",84,"KEEP","Orchestration","IMPL"],
  ["ENG-258","Workflow State Machine",88,"KEEP","Orchestration","IMPL"],
  ["ENG-259","Quarantine Engine Service",69,"FIX","Data Quality","IMPL"],
  ["ENG-260","Store Mutation Engine",81,"KEEP","Data Quality","IMPL"],
  ["ENG-261","Sentinel Quality Gate",106,"KEEP","Governance","CORE"],
  ["ENG-262","Unified Monitor Engine",84,"KEEP","Monitoring","IMPL"],
];

const MASTER_REGISTRY_DATA: RegistryEngine[] = RAW_REGISTRY.map(([id, name, fitness, verdict, domain, tier]) => ({
  id, name, fitness, verdict, domain, tier, version: tier === "CORE" ? "2.0.0" : "1.0.0",
}));

const VERDICT_COUNTS = MASTER_REGISTRY_DATA.reduce((acc, e) => {
  acc[e.verdict] = (acc[e.verdict] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
const CONFLICTS_BEFORE = 47;
const CONFLICTS_CRITICAL = 12;

interface ObserverMetric {
  engineId: string;
  category: string;
  tickCount: number;
  errorCount: number;
  totalFindings: number;
  totalActions: number;
  avgDurationMs: number;
  lastTick: number;
}

type TabKey = "dashboard" | "engines" | "detail" | "reports" | "proof";

function verdictColor(v: string) {
  if (v === "KEEP") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (v === "FIX") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (v === "MERGE") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (v === "QUARANTINE") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (v === "REMOVE") return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  if (v === "REBUILD") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  return "bg-white/10 text-gray-300";
}

function fitnessColor(f: number) {
  if (f >= 90) return "text-emerald-400";
  if (f >= 72) return "text-blue-400";
  if (f >= 50) return "text-amber-400";
  return "text-red-400";
}

function tierColor(t: string) {
  if (t === "CORE") return "text-purple-400";
  if (t === "ORCH") return "text-blue-400";
  if (t === "IMPL") return "text-teal-400";
  if (t === "SHADOW") return "text-gray-500";
  if (t === "GOD") return "text-red-500";
  return "text-gray-400";
}

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const ms = Date.now() - ts;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default function EngineControlRoomPage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [selectedEngine, setSelectedEngine] = useState<RegistryEngine | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<string>("ALL");
  const [domainFilter, setDomainFilter] = useState<string>("ALL");
  const [runtimeStats, setRuntimeStats] = useState<ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null>(null);
  const [scores, setScores] = useState(sentinelScoringEngine.getLastScores());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setRuntimeStats(engineOrchestrator.getEngineRuntimeStats());
    setScores(sentinelScoringEngine.calculate());
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [refresh]);

  const observerReport = useMemo(() => engineObserver.getReport(), [tick]);
  const registrySummary = useMemo(() => sentinelEngineRegistry.getSummary(), [tick]);
  const telemetrySnapshots = useMemo(() => sentinelTelemetryEngine.getSnapshots(10), [tick]);
  const proofStats = useMemo(() => getProofStats(), [tick]);
  const pipelineReport = useMemo(() => getPipelineReport(), [tick]);
  const recentProofs = useMemo(() => getProofsByDomain("taxonomy").slice(-10), [tick]);

  const filteredEngines = useMemo(() => {
    return MASTER_REGISTRY_DATA.filter(e => {
      const matchSearch = !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase()) || e.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchVerdict = verdictFilter === "ALL" || e.verdict === verdictFilter;
      const matchDomain = domainFilter === "ALL" || e.domain === domainFilter;
      return matchSearch && matchVerdict && matchDomain;
    });
  }, [searchQuery, verdictFilter, domainFilter]);

  const domains = useMemo(() => Array.from(new Set(MASTER_REGISTRY_DATA.map(e => e.domain))).sort(), []);

  const survivingEngines = (VERDICT_COUNTS["KEEP"] ?? 0) + (VERDICT_COUNTS["FIX"] ?? 0);
  const purgedEngines = (VERDICT_COUNTS["MERGE"] ?? 0) + (VERDICT_COUNTS["QUARANTINE"] ?? 0) + (VERDICT_COUNTS["REMOVE"] ?? 0);

  const navItems = [
    { key: "dashboard" as const, label: "Dashboard", icon: Activity },
    { key: "engines" as const, label: "Engine Registry", icon: Cpu },
    { key: "detail" as const, label: "Engine Detail", icon: Eye },
    { key: "reports" as const, label: "Reports", icon: BookOpen },
    { key: "proof" as const, label: "Proof System", icon: Shield },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(38 65% 56%)" }}>Engine Control Room</h1>
            <p className="text-sm text-gray-400 mt-1">
              Military-grade engine governance — {MASTER_REGISTRY_DATA.length} engines audited · {VERDICT_COUNTS["KEEP"] ?? 0} KEEP · {VERDICT_COUNTS["FIX"] ?? 0} FIX · {purgedEngines} purged
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="flex gap-1.5 flex-wrap border-b border-white/10 pb-2">
          {navItems.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === n.key ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
              style={tab === n.key ? { backgroundColor: "hsl(220 40% 18%)" } : {}}
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <DashboardTab
            scores={scores}
            registrySummary={registrySummary}
            runtimeStats={runtimeStats}
            observerReport={observerReport}
            telemetrySnapshots={telemetrySnapshots}
            survivingEngines={survivingEngines}
            purgedEngines={purgedEngines}
            conflictsBefore={CONFLICTS_BEFORE}
            criticalConflicts={CONFLICTS_CRITICAL}
          />
        )}

        {tab === "engines" && (
          <EngineRegistryTab
            engines={filteredEngines}
            allEngines={MASTER_REGISTRY_DATA}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            verdictFilter={verdictFilter}
            setVerdictFilter={setVerdictFilter}
            domainFilter={domainFilter}
            setDomainFilter={setDomainFilter}
            domains={domains}
            onSelect={e => { setSelectedEngine(e); setTab("detail"); }}
            observerReport={observerReport}
            runtimeStats={runtimeStats}
          />
        )}

        {tab === "detail" && (
          <EngineDetailTab
            engine={selectedEngine}
            runtimeStats={runtimeStats}
            observerReport={observerReport}
            onBack={() => setTab("engines")}
          />
        )}

        {tab === "reports" && (
          <ReportsTab
            runtimeStats={runtimeStats}
            registrySummary={registrySummary}
            allEngines={MASTER_REGISTRY_DATA}
          />
        )}

        {tab === "proof" && (
          <ProofTab
            proofStats={proofStats}
            pipelineReport={pipelineReport}
            recentProofs={recentProofs}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function DashboardTab({ scores, registrySummary, runtimeStats, observerReport, telemetrySnapshots, survivingEngines, purgedEngines, conflictsBefore, criticalConflicts }: {
  scores: ReturnType<typeof sentinelScoringEngine.getLastScores>;
  registrySummary: ReturnType<typeof sentinelEngineRegistry.getSummary>;
  runtimeStats: ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null;
  observerReport: ReturnType<typeof engineObserver.getReport>;
  telemetrySnapshots: unknown[];
  survivingEngines: number;
  purgedEngines: number;
  conflictsBefore: number;
  criticalConflicts: number;
}) {
  const topStatCards = [
    { label: "Global Score", value: `${scores.global_score}/100`, icon: TrendingUp, color: scores.global_score >= 70 ? "text-emerald-400" : scores.global_score >= 40 ? "text-amber-400" : "text-red-400" },
    { label: "Health Score", value: `${scores.health_score}/100`, icon: Heart, color: "text-blue-400" },
    { label: "Conflict Score", value: `${scores.conflict_score}/100`, icon: AlertTriangle, color: "text-amber-400" },
    { label: "Release Readiness", value: `${scores.release_readiness}/100`, icon: CheckCircle, color: "text-emerald-400" },
  ];

  const verdictStats = [
    { label: "KEEP", value: VERDICT_COUNTS["KEEP"] ?? 0, color: "text-emerald-400", icon: CheckCircle, desc: "Canonical, governed engines" },
    { label: "FIX", value: VERDICT_COUNTS["FIX"] ?? 0, color: "text-blue-400", icon: Wrench, desc: "Valid engines needing upgrades" },
    { label: "MERGE", value: VERDICT_COUNTS["MERGE"] ?? 0, color: "text-amber-400", icon: GitMerge, desc: "Absorbed into canonical targets" },
    { label: "QUARANTINE", value: VERDICT_COUNTS["QUARANTINE"] ?? 0, color: "text-red-400", icon: Ban, desc: "High-risk autonomous behavior" },
    { label: "REMOVE", value: VERDICT_COUNTS["REMOVE"] ?? 0, color: "text-gray-400", icon: Trash2, desc: "Dead shadows and god-layer bypasses" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {topStatCards.map(s => (
          <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Cpu className="w-4 h-4 inline mr-1" /> Engine Population
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Total audited</span><span className="text-white font-bold">{MASTER_REGISTRY_DATA.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Surviving (KEEP+FIX)</span><span className="text-emerald-400 font-bold">{survivingEngines}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Purged (MERGE+REMOVE+QUAR)</span><span className="text-red-400 font-bold">{purgedEngines}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Runtime active</span><span className="text-blue-400 font-bold">{runtimeStats?.runningEngines ?? "–"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Sentinel registered</span><span className="text-amber-400 font-bold">{registrySummary.total}</span></div>
            <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
              <div className="flex justify-between"><span className="text-gray-400">Healthy</span><span className="text-emerald-400 font-bold">{registrySummary.healthy}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Degraded</span><span className="text-amber-400 font-bold">{registrySummary.degraded}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Unhealthy</span><span className="text-red-400 font-bold">{registrySummary.unhealthy}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Quarantined</span><span className="text-red-300 font-bold">{VERDICT_COUNTS["QUARANTINE"] ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Retired</span><span className="text-gray-500 font-bold">{VERDICT_COUNTS["REMOVE"] ?? 0}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <AlertTriangle className="w-4 h-4 inline mr-1" /> Conflict Governance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Conflicts before audit</span><span className="text-red-400 font-bold">{conflictsBefore}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Critical conflicts</span><span className="text-red-400 font-bold">{criticalConflicts}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Conflict score</span><span className="text-amber-400 font-bold">{scores.conflict_score}/100</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Sentinel registry</span><span className="text-emerald-400 font-bold">ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-gray-400">God-layer engines</span><span className="text-emerald-400 font-bold">QUARANTINED</span></div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Activity className="w-4 h-4 inline mr-1" /> Runtime Observer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Browser engines</span><span className="text-blue-400 font-bold">{observerReport.totalEngines}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total ticks</span><span className="text-white font-bold">{observerReport.totalTicks}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total errors</span><span className="text-red-400 font-bold">{observerReport.totalErrors}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Telemetry snapshots</span><span className="text-amber-400 font-bold">{telemetrySnapshots.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Stability score</span><span className="text-blue-400 font-bold">{scores.stability_score}/100</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Layers className="w-4 h-4 inline mr-1" /> Verdict Distribution — {MASTER_REGISTRY_DATA.length} Engines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {verdictStats.map(v => (
              <div key={v.label} className="rounded-lg border border-white/10 p-3 text-center space-y-1" style={{ backgroundColor: "hsl(220 40% 17%)" }}>
                <v.icon className={`w-6 h-6 mx-auto ${v.color}`} />
                <p className={`text-xl font-bold ${v.color}`}>{v.value}</p>
                <p className={`text-xs font-semibold ${v.color}`}>{v.label}</p>
                <p className="text-[10px] text-gray-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {runtimeStats && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Zap className="w-4 h-4 inline mr-1" /> Live Runtime Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{runtimeStats.totalEngines}</p>
                <p className="text-xs text-gray-400">Registered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{runtimeStats.runningEngines}</p>
                <p className="text-xs text-gray-400">Running</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{runtimeStats.booted ? "YES" : "NO"}</p>
                <p className="text-xs text-gray-400">Booted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{runtimeStats.recentIncidents.length}</p>
                <p className="text-xs text-gray-400">Recent Incidents</p>
              </div>
            </div>
            <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
              {runtimeStats.engines.slice(0, 20).map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.running ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="text-gray-300 flex-1 truncate">{e.name}</span>
                  <span className="text-gray-500">{e.tickCount} ticks</span>
                  <span className={`text-xs ${e.errorCount > 0 ? "text-red-400" : "text-gray-500"}`}>{e.errorCount} err</span>
                  <span className="text-gray-600">{timeAgo(e.lastTick)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EngineRegistryTab({ engines, allEngines, searchQuery, setSearchQuery, verdictFilter, setVerdictFilter, domainFilter, setDomainFilter, domains, onSelect, observerReport, runtimeStats }: {
  engines: RegistryEngine[];
  allEngines: RegistryEngine[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  verdictFilter: string;
  setVerdictFilter: (v: string) => void;
  domainFilter: string;
  setDomainFilter: (v: string) => void;
  domains: string[];
  onSelect: (e: RegistryEngine) => void;
  observerReport: ReturnType<typeof engineObserver.getReport>;
  runtimeStats: ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null;
}) {
  const observerEngines = observerReport.engines as ObserverMetric[];

  const findObserverMetric = useCallback((engId: string): ObserverMetric | undefined => {
    const rid = engId.toLowerCase().replace("eng-", "");
    return observerEngines.find(o => o.engineId.includes(rid));
  }, [observerEngines]);

  function getEngineState(eng: RegistryEngine) {
    if (eng.verdict === "REMOVE") return { label: "RETIRED", color: "text-gray-500" };
    if (eng.verdict === "QUARANTINE") return { label: "QUARANTINED", color: "text-red-400" };
    if (eng.verdict === "MERGE") return { label: "MERGED", color: "text-amber-400" };
    const rid = eng.id.toLowerCase().replace("eng-", "");
    const rt = runtimeStats?.engines.find(r => r.name.toLowerCase().includes(rid) || r.id.includes(rid));
    if (rt?.running) return { label: "ACTIVE", color: "text-emerald-400" };
    const obs = findObserverMetric(eng.id);
    if (obs && obs.lastTick > 0) return { label: "ACTIVE", color: "text-emerald-400" };
    return { label: "IDLE", color: "text-blue-400" };
  }
  const verdicts = ["ALL", "KEEP", "FIX", "MERGE", "QUARANTINE", "REMOVE", "REBUILD"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search engines by name, ID, or domain..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
          />
        </div>
        <select
          value={verdictFilter}
          onChange={e => setVerdictFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
        >
          {verdicts.map(v => <option key={v} value={v} className="bg-gray-900">{v}</option>)}
        </select>
        <select
          value={domainFilter}
          onChange={e => setDomainFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none max-w-[200px]"
        >
          <option value="ALL" className="bg-gray-900">All Domains</option>
          {domains.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
        </select>
      </div>

      <div className="text-xs text-gray-500">
        Showing {engines.length} of {allEngines.length} engines
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10" style={{ backgroundColor: "hsl(220 40% 16%)" }}>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">ID</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Engine Name</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Domain</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Tier</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Fitness</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Verdict</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">State</th>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Errors</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {engines.map((e, i) => {
              const state = getEngineState(e);
              const obs = findObserverMetric(e.id);
              const errCount = obs?.errorCount ?? 0;
              return (
                <tr
                  key={e.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  style={{ backgroundColor: i % 2 === 0 ? "hsl(220 40% 13%)" : "hsl(220 40% 14%)" }}
                  onClick={() => onSelect(e)}
                >
                  <td className="px-3 py-2 text-gray-500 font-mono">{e.id}</td>
                  <td className="px-3 py-2 text-white font-medium">{e.name}</td>
                  <td className="px-3 py-2 text-gray-400">{e.domain}</td>
                  <td className={`px-3 py-2 font-semibold ${tierColor(e.tier)}`}>{e.tier}</td>
                  <td className={`px-3 py-2 font-bold ${fitnessColor(e.fitness)}`}>{e.fitness}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${verdictColor(e.verdict)}`}>
                      {e.verdict}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-[10px] font-semibold ${state.color}`}>{state.label}</td>
                  <td className={`px-3 py-2 font-mono ${errCount > 0 ? "text-red-400" : "text-gray-600"}`}>{errCount}</td>
                  <td className="px-3 py-2">
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {engines.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No engines match your filters.</div>
        )}
      </div>
    </div>
  );
}

function EngineDetailTab({ engine, runtimeStats, observerReport, onBack }: {
  engine: RegistryEngine | null;
  runtimeStats: ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null;
  observerReport: ReturnType<typeof engineObserver.getReport>;
  onBack: () => void;
}) {
  if (!engine) {
    return (
      <div className="text-center py-16 space-y-4">
        <Cpu className="w-12 h-12 mx-auto text-gray-600" />
        <p className="text-gray-400">Select an engine from the Engine Registry tab to view details.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Back to Registry
        </Button>
      </div>
    );
  }

  const runtimeEngine = runtimeStats?.engines.find(e => e.name === engine.name || e.id.includes(engine.id.toLowerCase()));
  const rid = engine.id.toLowerCase().replace("eng-", "");
  const observerMetric = (observerReport.engines as ObserverMetric[]).find(e => e.engineId.includes(rid));

  const lastTickTs = runtimeEngine?.lastTick ?? observerMetric?.lastTick ?? 0;
  const tickCount = runtimeEngine?.tickCount ?? observerMetric?.tickCount ?? 0;
  const traceContext = {
    traceId: lastTickTs > 0 ? `TR-${engine.id}-${lastTickTs.toString(36).toUpperCase()}` : null,
    runId: tickCount > 0 ? `RUN-${tickCount.toString(16).toUpperCase().padStart(6, "0")}` : null,
    executionId: observerMetric && observerMetric.tickCount > 0 ? `EXEC-${observerMetric.tickCount.toString(16).toUpperCase().padStart(8, "0")}` : null,
    repairId: runtimeEngine && runtimeEngine.errorCount > 0 ? `REP-${engine.id}-${runtimeEngine.errorCount}` : null,
    learningId: engine.verdict === "KEEP" && observerMetric && observerMetric.totalActions > 0 ? `LEARN-${engine.id}-${observerMetric.totalActions}` : null,
    hasData: lastTickTs > 0 || tickCount > 0,
  };

  const flags = {
    mute: engine.verdict === "REMOVE",
    noisy: engine.verdict === "QUARANTINE",
    useless: engine.fitness < 40,
    critical: engine.tier === "CORE" && engine.fitness > 90,
    quarantined: engine.verdict === "QUARANTINE",
    driftDetected: engine.verdict === "MERGE" || engine.verdict === "FIX",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Back
        </Button>
        <h2 className="text-lg font-bold text-white">{engine.name}</h2>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${verdictColor(engine.verdict)}`}>
          {engine.verdict}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Info className="w-4 h-4 inline mr-1" /> Engine Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Registry ID</span><span className="text-white font-mono font-bold">{engine.id}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Domain</span><span className="text-white">{engine.domain}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Tier</span><span className={`font-semibold ${tierColor(engine.tier)}`}>{engine.tier}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Version</span><span className="text-white font-mono">{engine.version}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Fitness Score</span><span className={`font-bold ${fitnessColor(engine.fitness)}`}>{engine.fitness}/120</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Verdict</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${verdictColor(engine.verdict)}`}>{engine.verdict}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Activity className="w-4 h-4 inline mr-1" /> Runtime State
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {runtimeEngine ? (
              <>
                <div className="flex justify-between"><span className="text-gray-400">Status</span>
                  <span className={`font-semibold ${runtimeEngine.running ? "text-emerald-400" : "text-red-400"}`}>{runtimeEngine.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-400">Total Ticks</span><span className="text-white">{runtimeEngine.tickCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Error Count</span><span className={runtimeEngine.errorCount > 0 ? "text-red-400" : "text-emerald-400"}>{runtimeEngine.errorCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Avg Duration</span><span className="text-white">{runtimeEngine.avgTickDurationMs}ms</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Success Rate</span><span className="text-emerald-400">{Math.round(runtimeEngine.successRate * 100)}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Last Run</span><span className="text-gray-300">{timeAgo(runtimeEngine.lastTick)}</span></div>
              </>
            ) : (
              <p className="text-gray-500 text-xs py-2">Not registered in runtime orchestrator. This engine may be a server-side, library, or audit-only engine.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Lock className="w-4 h-4 inline mr-1" /> Trace IDs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs font-mono">
          {traceContext.hasData ? (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Trace ID</span>
                <span className="text-blue-400">{traceContext.traceId ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Run ID</span>
                <span className="text-blue-400">{traceContext.runId ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Execution ID</span>
                <span className="text-blue-400">{traceContext.executionId ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Repair ID</span>
                <span className={traceContext.repairId ? "text-amber-400" : "text-gray-600"}>
                  {traceContext.repairId ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Learning ID</span>
                <span className={traceContext.learningId ? "text-emerald-400" : "text-gray-600"}>
                  {traceContext.learningId ?? "—"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-gray-500 py-2">No runtime trace data available for this engine. This engine may be server-side only, a library engine, or not yet running in this session.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Shield className="w-4 h-4 inline mr-1" /> Engine Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "MUTED", active: flags.mute, activeColor: "text-gray-400", icon: Pause },
              { label: "NOISY", active: flags.noisy, activeColor: "text-amber-400", icon: AlertCircle },
              { label: "USELESS", active: flags.useless, activeColor: "text-red-400", icon: XCircle },
              { label: "CRITICAL", active: flags.critical, activeColor: "text-red-300", icon: AlertTriangle },
              { label: "QUARANTINED", active: flags.quarantined, activeColor: "text-red-400", icon: Ban },
              { label: "DRIFT DETECTED", active: flags.driftDetected, activeColor: "text-amber-400", icon: RotateCcw },
            ].map(f => (
              <div key={f.label} className={`flex items-center gap-2 p-2 rounded border ${f.active ? "border-white/20 bg-white/5" : "border-white/5 opacity-40"}`}>
                <f.icon className={`w-4 h-4 ${f.active ? f.activeColor : "text-gray-600"}`} />
                <span className={`text-xs font-semibold ${f.active ? f.activeColor : "text-gray-600"}`}>{f.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {observerMetric && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Brain className="w-4 h-4 inline mr-1" /> Observer Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Tick Count</span><span className="text-white">{observerMetric.tickCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Error Count</span><span className={observerMetric.errorCount > 0 ? "text-red-400" : "text-emerald-400"}>{observerMetric.errorCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total Findings</span><span className="text-amber-400">{observerMetric.totalFindings}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total Actions</span><span className="text-blue-400">{observerMetric.totalActions}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Avg Duration</span><span className="text-white">{observerMetric.avgDurationMs}ms</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Last Tick</span><span className="text-gray-300">{timeAgo(observerMetric.lastTick)}</span></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportsTab({ runtimeStats, registrySummary, allEngines }: {
  runtimeStats: ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null;
  registrySummary: ReturnType<typeof sentinelEngineRegistry.getSummary>;
  allEngines: RegistryEngine[];
}) {
  const orphanEngines = allEngines.filter(e => e.verdict === "REMOVE" && e.tier === "SHADOW");
  const deadWiringEngines = allEngines.filter(e => e.verdict === "MERGE" && e.tier === "ORCH");
  const versionDriftEngines = allEngines.filter(e => e.fitness < 50 && e.verdict !== "KEEP");
  const quarantinedEngines = allEngines.filter(e => e.verdict === "QUARANTINE");

  return (
    <div className="space-y-6">
      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Heart className="w-4 h-4 inline mr-1" /> Health Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded border border-white/10">
              <p className="text-2xl font-bold text-white">{registrySummary.total}</p>
              <p className="text-xs text-gray-400">Sentinel Registered</p>
            </div>
            <div className="text-center p-3 rounded border border-white/10">
              <p className="text-2xl font-bold text-emerald-400">{registrySummary.healthy}</p>
              <p className="text-xs text-gray-400">Healthy</p>
            </div>
            <div className="text-center p-3 rounded border border-white/10">
              <p className="text-2xl font-bold text-amber-400">{registrySummary.degraded}</p>
              <p className="text-xs text-gray-400">Degraded</p>
            </div>
            <div className="text-center p-3 rounded border border-white/10">
              <p className="text-2xl font-bold text-red-400">{registrySummary.unhealthy}</p>
              <p className="text-xs text-gray-400">Unhealthy</p>
            </div>
          </div>
          {runtimeStats && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-2">Runtime Incidents (last 100)</p>
              {runtimeStats.recentIncidents.length === 0 ? (
                <p className="text-xs text-emerald-400">No recent incidents detected.</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {runtimeStats.recentIncidents.slice(0, 10).map((inc, i) => (
                    <div key={i} className="text-xs text-amber-400 py-0.5">{String(inc)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Trash2 className="w-4 h-4 inline mr-1" /> Orphan Report — {orphanEngines.length} engines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">Dead shadow engines with no unique logic. SAFE-RM eligible — no migration required.</p>
          <div className="space-y-1">
            {orphanEngines.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                <span className="text-gray-500 font-mono">{e.id}</span>
                <span className="text-gray-400 flex-1">{e.name}</span>
                <span className="text-gray-500">{e.domain}</span>
                <span className={`text-[10px] font-semibold border px-1 rounded ${verdictColor(e.verdict)}`}>{e.verdict}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <GitMerge className="w-4 h-4 inline mr-1" /> Dead Wiring Report — {deadWiringEngines.length} engines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">Orchestration-layer duplicates wired to canonical lib versions. Logic absorbed → source removed.</p>
          <div className="space-y-1">
            {deadWiringEngines.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                <span className="text-gray-500 font-mono">{e.id}</span>
                <span className="text-gray-400 flex-1">{e.name}</span>
                <span className="text-gray-500">{e.domain}</span>
                <span className={`text-[10px] font-semibold border px-1 rounded ${verdictColor(e.verdict)}`}>{e.verdict}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <RotateCcw className="w-4 h-4 inline mr-1" /> Version Drift Report — {versionDriftEngines.length} engines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">Engines with fitness &lt;50 showing high drift risk — not on canonical contract or wiring path.</p>
          <div className="space-y-1">
            {versionDriftEngines.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                <span className="text-gray-500 font-mono">{e.id}</span>
                <span className="text-gray-400 flex-1">{e.name}</span>
                <span className={`font-bold ${fitnessColor(e.fitness)}`}>{e.fitness}</span>
                <span className={`text-[10px] font-semibold border px-1 rounded ${verdictColor(e.verdict)}`}>{e.verdict}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Ban className="w-4 h-4 inline mr-1" /> Quarantine Report — {quarantinedEngines.length} engines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">High-risk autonomous engines disabled immediately. Under observation — 30-day decision window.</p>
          <div className="space-y-1">
            {quarantinedEngines.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="text-gray-500 font-mono">{e.id}</span>
                <span className="text-gray-400 flex-1">{e.name}</span>
                <span className="text-gray-500">{e.domain}</span>
                <span className={`font-bold ${fitnessColor(e.fitness)}`}>{e.fitness}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <AlertTriangle className="w-4 h-4 inline mr-1" /> Conflict Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded border border-white/10 text-center">
              <p className="text-2xl font-bold text-red-400">47</p>
              <p className="text-xs text-gray-400">Total Conflicts Identified</p>
            </div>
            <div className="p-3 rounded border border-white/10 text-center">
              <p className="text-2xl font-bold text-red-300">12</p>
              <p className="text-xs text-gray-400">Critical (data corruption risk)</p>
            </div>
            <div className="p-3 rounded border border-white/10 text-center">
              <p className="text-2xl font-bold text-amber-400">15</p>
              <p className="text-xs text-gray-400">High Severity</p>
            </div>
            <div className="p-3 rounded border border-white/10 text-center">
              <p className="text-2xl font-bold text-blue-400">20</p>
              <p className="text-xs text-gray-400">Medium/Low</p>
            </div>
          </div>
          <div className="pt-2 space-y-1 text-xs text-gray-400">
            <p className="text-gray-300 font-semibold">Resolution Strategy:</p>
            <p>• MERGE_INTO: Canonical engine absorbs logic from shadow</p>
            <p>• REMOVE_B: Non-canonical engine deleted after merge confirmation</p>
            <p>• SPLIT_SCOPE: Engines given explicit, non-overlapping scope boundaries</p>
            <p>• CLARIFY_CONTRACT: Contract updated to prevent future scope creep</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProofTab({ proofStats, pipelineReport, recentProofs }: {
  proofStats: ReturnType<typeof getProofStats>;
  pipelineReport: ReturnType<typeof getPipelineReport>;
  recentProofs: ReturnType<typeof getProofsByDomain>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Proofs", value: proofStats.total, color: "text-white" },
          { label: "Accepted", value: proofStats.outcomes?.accepted ?? 0, color: "text-emerald-400" },
          { label: "Rolled Back", value: proofStats.rollbackCount, color: "text-amber-400" },
          { label: "Failed", value: proofStats.failedValidationCount, color: "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Wrench className="w-4 h-4 inline mr-1" /> Repair Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Pipeline Active</span>
            <span className={pipelineReport.enabled ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
              {pipelineReport.enabled ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between"><span className="text-gray-400">Total Runs</span><span className="text-white">{pipelineReport.totalRuns}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Blocked Runs</span><span className={pipelineReport.totalBlocked > 0 ? "text-amber-400" : "text-emerald-400"}>{pipelineReport.totalBlocked}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Total Accepted</span><span className="text-emerald-400">{proofStats.outcomes?.accepted ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Rollback Count</span><span className="text-amber-400">{proofStats.rollbackCount}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Rollback Rate</span><span className="text-amber-400">{(proofStats.rollbackRate * 100).toFixed(1)}%</span></div>
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Brain className="w-4 h-4 inline mr-1" /> Learning Governance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Wild Writes Blocked</span><span className="text-emerald-400 font-bold">ALL</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Validated Learning Writes</span><span className="text-blue-400">{proofStats.successfulValidationCount}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Proof System</span><span className="text-emerald-400">ENFORCED</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Repair Proof Required</span><span className="text-emerald-400">YES</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Command Center Gate</span><span className="text-emerald-400">ACTIVE</span></div>
          <p className="text-xs text-gray-500 pt-2">
            All engine learning writes are gated through the repair pipeline proof system. No autonomous engine can write memory or modify system state without a validated ProofRecord and pipeline approval.
          </p>
        </CardContent>
      </Card>

      {recentProofs.length > 0 && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <CheckCircle className="w-4 h-4 inline mr-1" /> Recent Proof Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentProofs.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs border-b border-white/5 pb-1">
                  <span className={`w-2 h-2 rounded-full ${p.outcome === "accepted" ? "bg-emerald-400" : p.outcome === "rolled_back" ? "bg-amber-400" : "bg-red-400"}`} />
                  <span className="text-gray-500 font-mono">{p.id.slice(0, 8)}</span>
                  <span className="text-gray-400 flex-1">{p.engineId}</span>
                  <span className="text-gray-300">{p.repairLevel}</span>
                  <span className={p.outcome === "accepted" ? "text-emerald-400" : p.outcome === "rolled_back" ? "text-amber-400" : "text-red-400"}>{p.outcome}</span>
                  <span className="text-gray-600">{p.durationMs}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recentProofs.length === 0 && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            <Shield className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p>No proof records in taxonomy domain yet.</p>
            <p className="text-xs mt-1">Proof records are generated when the repair pipeline processes repairs.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
