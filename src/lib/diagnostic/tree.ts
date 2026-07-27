import treeData from "@content/diagnostic-tree.json";

export const CONSTRAINT_MODULES = [
  "constraint_finder",
  "offer_bench",
  "lead_engine",
  "money_rules",
  "time_buyback",
  "owner_independence",
  "execution_cadence",
] as const;

export type ConstraintModule = (typeof CONSTRAINT_MODULES)[number];

export const MODULE_LABELS: Record<ConstraintModule, string> = {
  constraint_finder: "naming the actual constraint",
  offer_bench: "sharpening the offer and pricing",
  lead_engine: "building one consistent lead channel",
  money_rules: "cash discipline and margin",
  time_buyback: "getting the owner off low-leverage work",
  owner_independence: "capturing the first real SOP",
  execution_cadence: "installing a weekly operating rhythm",
};

export type TreeBranch = {
  answer_pattern: string;
  next_node_id: string | null;
};

export type TreeNode = {
  node_id: string;
  question: string;
  module_candidates: ConstraintModule[];
  branches: TreeBranch[];
};

export type DiagnosticTree = {
  root: string;
  nodes: TreeNode[];
};

const tree = treeData as DiagnosticTree;

const nodesById = new Map(tree.nodes.map((node) => [node.node_id, node]));

export function getRootNode(): TreeNode {
  const root = nodesById.get(tree.root);
  if (!root) {
    throw new Error(`Diagnostic tree root "${tree.root}" is missing from content/diagnostic-tree.json`);
  }
  return root;
}

export function getNode(nodeId: string): TreeNode | undefined {
  return nodesById.get(nodeId);
}

export function isTerminalBranch(branch: TreeBranch): boolean {
  return branch.next_node_id === null;
}

export function allNodes(): TreeNode[] {
  return tree.nodes;
}
