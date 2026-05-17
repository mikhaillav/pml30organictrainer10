export type Compound = {
  id: number;
  name: string;
  aliases: string[];
  formula: string;
  plainFormula: string;
  className: string;
  propertiesApplicationBiologicalRole: string[];
  keyReactions: string[];
  pubchemCid: number | null;
  pubchemName: string | null;
  pubchemPageUrl: string | null;
  structuralFormulaImageUrl: string | null;
  structuralFormulaImageUrlSmall: string | null;
  structuralFormulaSource: string | null;
  pubchemStructuralFormulaImageUrl?: string | null;
  pubchemStructuralFormulaImageUrlSmall?: string | null;
  smiles?: string | null;
  cactusIdentifierType?: string | null;
  cactusIdentifierEncoded?: string | null;
  cactusStructuralFormulaImageUrl?: string | null;
  cactusStructuralFormulaImageUrlSmall?: string | null;
  wikimediaCommonsFileName?: string | null;
  wikimediaCommonsFilePageUrl?: string | null;
  wikipediaStructuralFormulaImageUrl?: string | null;
  wikipediaStructuralFormulaImageUrlSmall?: string | null;
};

export type CompoundData = {
  title: string;
  source: string;
  compounds: Compound[];
};

export type QuestionType =
  | "nameByFormula"
  | "formulaByName"
  | "nameByStructure"
  | "classByName"
  | "nameByClass"
  | "nameByProperties"
  | "nameByReactions";

export type Question = {
  prompt: string;
  imageUrl?: string;
  answerType: "name" | "formula" | "className";
  correctAnswer: string;
  options: string[];
  compound: Compound;
  type: QuestionType;
};
