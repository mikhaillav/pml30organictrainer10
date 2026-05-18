import type { Compound } from "@/types/compound";
import type { FormulaBond, FormulaCheckResult, FormulaNode, StructuralFormula } from "@/types/formula";

type Atom = {
  id: number;
  element: string;
};

type Edge = {
  from: number;
  to: number;
  order: 1 | 2 | 3;
};

type AtomGraph = {
  atoms: Atom[];
  edges: Edge[];
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

const PLAIN_GROUPS: Record<string, string> = {
  "NO₂": "NO2",
  "NH₂": "NH2",
  "CH₃": "CH3",
  "CH₂": "CH2",
};

const TOKEN_COMPOSITION: Record<string, Record<string, number>> = {
  C: { C: 1 },
  H: { H: 1 },
  O: { O: 1 },
  N: { N: 1 },
  Cl: { Cl: 1 },
  S: { S: 1 },
  P: { P: 1 },
  Br: { Br: 1 },
  I: { I: 1 },
  OH: { O: 1, H: 1 },
  NO2: { N: 1, O: 2 },
  COOH: { C: 1, O: 2, H: 1 },
  CH3: { C: 1, H: 3 },
  CH2: { C: 1, H: 2 },
  CH: { C: 1, H: 1 },
  NH2: { N: 1, H: 2 },
};

function normalizeSymbols(value: string): string {
  return value
    .trim()
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (digit) => SUBSCRIPT_DIGITS[digit] ?? digit)
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/⌬|C6H5/g, "C6H5");
}

function addComposition(target: Map<string, number>, source: Record<string, number>, multiplier = 1) {
  for (const [element, count] of Object.entries(source)) {
    target.set(element, (target.get(element) ?? 0) + count * multiplier);
  }
}

function parseComposition(formula: string): Map<string, number> | null {
  const source = normalizeSymbols(formula).replace(/[=#≡-]/g, "");
  let index = 0;

  function readNumber(): number {
    let value = "";

    while (/\d/.test(source[index] ?? "")) {
      value += source[index];
      index += 1;
    }

    return value ? Number(value) : 1;
  }

  function parseGroup(endChar?: string): Map<string, number> | null {
    const result = new Map<string, number>();

    while (index < source.length) {
      if (endChar && source[index] === endChar) {
        index += 1;
        return result;
      }

      if (source[index] === "(") {
        index += 1;
        const group = parseGroup(")");
        if (!group) {
          return null;
        }

        const multiplier = readNumber();
        for (const [element, count] of group) {
          result.set(element, (result.get(element) ?? 0) + count * multiplier);
        }
        continue;
      }

      if (source[index] === ")") {
        return null;
      }

      const atomMatch = source.slice(index).match(/^([A-Z][a-z]?)/);
      if (!atomMatch) {
        return null;
      }

      const element = atomMatch[1];
      index += element.length;
      result.set(element, (result.get(element) ?? 0) + readNumber());
    }

    return endChar ? null : result;
  }

  const result = parseGroup();
  return result && index === source.length ? result : null;
}

function sameComposition(left: Map<string, number> | null, right: Map<string, number> | null): boolean {
  if (!left || !right || left.size !== right.size) {
    return false;
  }

  for (const [element, count] of left) {
    if (right.get(element) !== count) {
      return false;
    }
  }

  return true;
}

export function normalizePlainFormula(tokens: string[]): string {
  return normalizeSymbols(
    tokens
      .map((token) => PLAIN_GROUPS[token] ?? token)
      .join(""),
  );
}

export function checkPlainFormula(tokens: string[], compound: Compound): FormulaCheckResult {
  const answer = normalizePlainFormula(tokens);
  const target = normalizeSymbols(compound.plainFormula || compound.formula);

  if (!answer) {
    return { isCorrect: false, message: "Сначала собери формулу из кирпичиков." };
  }

  if (answer === target) {
    return { isCorrect: true, message: "Точная запись совпадает." };
  }

  if (sameComposition(parseComposition(answer), parseComposition(target))) {
    return { isCorrect: true, message: "Атомный состав совпадает, запись может отличаться от эталона." };
  }

  return { isCorrect: false, message: `Эталонная формула: ${compound.formula}.` };
}

function createGraph(): AtomGraph {
  return { atoms: [], edges: [] };
}

function addAtom(graph: AtomGraph, element: string): number {
  const id = graph.atoms.length;
  graph.atoms.push({ id, element });
  return id;
}

function addEdge(graph: AtomGraph, from: number, to: number, order: 1 | 2 | 3 = 1) {
  graph.edges.push({ from, to, order });
}

function expandBuilderNode(graph: AtomGraph, node: FormulaNode): { root: number; atoms: number[] } | null {
  switch (node.label) {
    case "H":
      return null;
    case "C":
    case "O":
    case "N":
    case "Cl":
    case "S":
    case "P":
    case "Br":
    case "I": {
      const root = addAtom(graph, node.label);
      return { root, atoms: [root] };
    }
    case "CH":
    case "CH2":
    case "CH3": {
      const root = addAtom(graph, "C");
      return { root, atoms: [root] };
    }
    case "OH": {
      const root = addAtom(graph, "O");
      return { root, atoms: [root] };
    }
    case "NH2": {
      const root = addAtom(graph, "N");
      return { root, atoms: [root] };
    }
    case "NO2": {
      const n = addAtom(graph, "N");
      const o1 = addAtom(graph, "O");
      const o2 = addAtom(graph, "O");
      addEdge(graph, n, o1, 2);
      addEdge(graph, n, o2, 1);
      return { root: n, atoms: [n, o1, o2] };
    }
    case "COOH": {
      const c = addAtom(graph, "C");
      const o1 = addAtom(graph, "O");
      const o2 = addAtom(graph, "O");
      addEdge(graph, c, o1, 2);
      addEdge(graph, c, o2, 1);
      return { root: c, atoms: [c, o1, o2] };
    }
    case "benzene": {
      const atoms = Array.from({ length: 6 }, () => addAtom(graph, "C"));
      atoms.forEach((atom, index) => addEdge(graph, atom, atoms[(index + 1) % atoms.length], 1));
      return { root: atoms[0], atoms };
    }
  }
}

function graphFromBuilder(formula: StructuralFormula): AtomGraph {
  const graph = createGraph();
  const expanded = new Map<string, { root: number; atoms: number[] }>();
  const benzeneExternalIndex = new Map<string, number>();

  for (const node of formula.nodes) {
    const value = expandBuilderNode(graph, node);
    if (value) {
      expanded.set(node.id, value);
    }
  }

  for (const bond of formula.bonds) {
    const from = expanded.get(bond.from);
    const to = expanded.get(bond.to);

    if (!from || !to) {
      continue;
    }

    const fromNode = formula.nodes.find((node) => node.id === bond.from);
    const toNode = formula.nodes.find((node) => node.id === bond.to);
    const fromAtom = fromNode?.label === "benzene" ? nextBenzeneAtom(bond.from, from, benzeneExternalIndex) : from.root;
    const toAtom = toNode?.label === "benzene" ? nextBenzeneAtom(bond.to, to, benzeneExternalIndex) : to.root;
    addEdge(graph, fromAtom, toAtom, bond.order);
  }

  normalizeCycleBondOrders(graph);
  return graph;
}

function nextBenzeneAtom(nodeId: string, expanded: { atoms: number[] }, indexes: Map<string, number>): number {
  const index = indexes.get(nodeId) ?? 0;
  indexes.set(nodeId, index + 1);
  return expanded.atoms[index % expanded.atoms.length];
}

function readBracketAtom(smiles: string, index: number): { element: string; nextIndex: number } | null {
  const endIndex = smiles.indexOf("]", index);
  if (endIndex === -1) {
    return null;
  }

  const content = smiles.slice(index + 1, endIndex);
  const element = content.match(/^(Cl|Br|[A-Z][a-z]?|[cnosp])/)?.[1];

  if (!element) {
    return null;
  }

  return { element: element.length === 1 ? element.toUpperCase() : element, nextIndex: endIndex + 1 };
}

function graphFromSmiles(smiles: string | null | undefined): AtomGraph | null {
  if (!smiles) {
    return null;
  }

  const graph = createGraph();
  const branchStack: number[] = [];
  const rings = new Map<string, { atom: number; order: 1 | 2 | 3 }>();
  let currentAtom: number | null = null;
  let pendingOrder: 1 | 2 | 3 = 1;
  let index = 0;

  while (index < smiles.length) {
    const char = smiles[index];

    if (char === "=") {
      pendingOrder = 2;
      index += 1;
      continue;
    }

    if (char === "#" || char === "≡") {
      pendingOrder = 3;
      index += 1;
      continue;
    }

    if (char === "(" && currentAtom !== null) {
      branchStack.push(currentAtom);
      index += 1;
      continue;
    }

    if (char === ")") {
      currentAtom = branchStack.pop() ?? currentAtom;
      index += 1;
      continue;
    }

    if (/\d/.test(char) && currentAtom !== null) {
      const ring = rings.get(char);
      if (ring) {
        addEdge(graph, ring.atom, currentAtom, pendingOrder === 1 ? ring.order : pendingOrder);
        rings.delete(char);
      } else {
        rings.set(char, { atom: currentAtom, order: pendingOrder });
      }
      pendingOrder = 1;
      index += 1;
      continue;
    }

    let element: string | null = null;
    let nextIndex = index + 1;

    if (char === "[") {
      const bracket = readBracketAtom(smiles, index);
      if (!bracket) {
        return null;
      }
      element = bracket.element;
      nextIndex = bracket.nextIndex;
    } else {
      const atom = smiles.slice(index).match(/^(Cl|Br|[BCNOFPSI]|[cnops])/);
      if (atom) {
        element = atom[1].length === 1 ? atom[1].toUpperCase() : atom[1];
        nextIndex = index + atom[1].length;
      }
    }

    if (element) {
      const atomId = addAtom(graph, element);
      if (currentAtom !== null) {
        addEdge(graph, currentAtom, atomId, pendingOrder);
      }
      currentAtom = atomId;
      pendingOrder = 1;
      index = nextIndex;
      continue;
    }

    index += 1;
  }

  normalizeCycleBondOrders(graph);
  return graph;
}

function normalizeCycleBondOrders(graph: AtomGraph) {
  for (const edge of graph.edges) {
    const from = graph.atoms[edge.from];
    const to = graph.atoms[edge.to];

    if (from?.element === "C" && to?.element === "C" && edgeIsInCycle(graph, edge)) {
      edge.order = 1;
    }
  }
}

function edgeIsInCycle(graph: AtomGraph, target: Edge): boolean {
  const seen = new Set<number>();
  const queue = [target.from];

  while (queue.length > 0) {
    const atom = queue.shift()!;
    if (atom === target.to) {
      return true;
    }

    if (seen.has(atom)) {
      continue;
    }
    seen.add(atom);

    for (const edge of graph.edges) {
      if (edge === target) {
        continue;
      }

      if (edge.from === atom && !seen.has(edge.to)) {
        queue.push(edge.to);
      }
      if (edge.to === atom && !seen.has(edge.from)) {
        queue.push(edge.from);
      }
    }
  }

  return false;
}

function atomDegree(graph: AtomGraph, atomId: number): number {
  return graph.edges.filter((edge) => edge.from === atomId || edge.to === atomId).length;
}

function edgeOrderBetween(graph: AtomGraph, left: number, right: number): number {
  return graph.edges.find(
    (edge) => (edge.from === left && edge.to === right) || (edge.from === right && edge.to === left),
  )?.order ?? 0;
}

function graphsMatch(answer: AtomGraph, target: AtomGraph): boolean {
  if (answer.atoms.length !== target.atoms.length || answer.edges.length !== target.edges.length) {
    return false;
  }

  const usedTargets = new Set<number>();
  const mapping = new Map<number, number>();
  const answerOrder = [...answer.atoms].sort((left, right) => atomDegree(answer, right.id) - atomDegree(answer, left.id));

  function canMap(answerAtom: number, targetAtom: number): boolean {
    if (answer.atoms[answerAtom].element !== target.atoms[targetAtom].element) {
      return false;
    }

    if (atomDegree(answer, answerAtom) !== atomDegree(target, targetAtom)) {
      return false;
    }

    for (const [mappedAnswer, mappedTarget] of mapping) {
      if (edgeOrderBetween(answer, answerAtom, mappedAnswer) !== edgeOrderBetween(target, targetAtom, mappedTarget)) {
        return false;
      }
    }

    return true;
  }

  function search(position: number): boolean {
    if (position === answerOrder.length) {
      return true;
    }

    const answerAtom = answerOrder[position].id;

    for (const targetAtom of target.atoms) {
      if (usedTargets.has(targetAtom.id) || !canMap(answerAtom, targetAtom.id)) {
        continue;
      }

      usedTargets.add(targetAtom.id);
      mapping.set(answerAtom, targetAtom.id);

      if (search(position + 1)) {
        return true;
      }

      usedTargets.delete(targetAtom.id);
      mapping.delete(answerAtom);
    }

    return false;
  }

  return search(0);
}

function formulaCompositionFromBuilder(nodes: FormulaNode[]): Map<string, number> {
  const result = new Map<string, number>();

  for (const node of nodes) {
    if (node.label === "benzene") {
      addComposition(result, { C: 6, H: 6 });
      continue;
    }

    const composition = TOKEN_COMPOSITION[node.label];
    if (composition) {
      addComposition(result, composition, node.count ?? 1);
    }
  }

  return result;
}

export function checkStructuralFormula(formula: StructuralFormula, compound: Compound): FormulaCheckResult {
  if (formula.nodes.length === 0) {
    return { isCorrect: false, message: "Добавь кирпичики на поле и соедини их связями." };
  }

  const target = graphFromSmiles(compound.smiles);
  const answer = graphFromBuilder(formula);

  if (target && graphsMatch(answer, target)) {
    return { isCorrect: true, message: "Граф структуры совпадает с эталоном." };
  }

  if (sameComposition(formulaCompositionFromBuilder(formula.nodes), parseComposition(compound.plainFormula))) {
    return { isCorrect: true, message: "Атомный состав совпадает; структура может быть записана иначе." };
  }

  return { isCorrect: false, message: `Проверь связи и фрагменты. Эталон: ${compound.formula}.` };
}
