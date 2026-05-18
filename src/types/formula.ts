export type FormulaBuilderMode = "plain" | "structural";

export type FormulaNodeLabel =
  | "C"
  | "H"
  | "O"
  | "N"
  | "Cl"
  | "S"
  | "P"
  | "Br"
  | "I"
  | "CH3"
  | "CH2"
  | "CH"
  | "OH"
  | "NH2"
  | "NO2"
  | "COOH"
  | "benzene";

export type FormulaNode = {
  id: string;
  label: FormulaNodeLabel;
  count?: number;
  x: number;
  y: number;
};

export type FormulaBond = {
  id: string;
  from: string;
  to: string;
  order: 1 | 2 | 3;
};

export type StructuralFormula = {
  nodes: FormulaNode[];
  bonds: FormulaBond[];
};

export type FormulaCheckResult = {
  isCorrect: boolean;
  message: string;
};
