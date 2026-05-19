import type { Compound, Question, QuestionType, TrainingMode } from "@/types/compound";
import { getLocalStructureImageUrl } from "./localStructureImages";

const MIN_HINT_LENGTH = 18;
const PROPERTY_OPTION_LENGTH = 180;

const QUESTION_TYPES: QuestionType[] = ["nameByStructure", "propertiesByStructure"];

const QUESTION_TYPES_BY_MODE: Record<TrainingMode, QuestionType[]> = {
  names: ["nameByStructure"],
  properties: ["propertiesByStructure"],
  mixed: QUESTION_TYPES,
  constructor: ["formulaConstructor"],
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function sample<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function joinedText(value: string[] | undefined): string {
  return value?.filter(Boolean).join(" ") ?? "";
}

function hasUsefulText(value: string[] | undefined): boolean {
  return joinedText(value).trim().length >= MIN_HINT_LENGTH;
}

function truncateText(value: string, maxLength = 230): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function makePropertyOption(compound: Compound): string {
  return truncateText(joinedText(compound.propertiesApplicationBiologicalRole), PROPERTY_OPTION_LENGTH);
}

function makeOptions(correctAnswer: string, wrongAnswers: string[]): string[] | null {
  const uniqueWrongAnswers = uniqueValues(wrongAnswers).filter(
    (answer) => answer !== correctAnswer,
  );

  if (uniqueWrongAnswers.length < 2) {
    return null;
  }

  return shuffle([correctAnswer, ...shuffle(uniqueWrongAnswers).slice(0, 2)]);
}

export function getStructureImageUrl(compound: Compound, _size: "small" | "large" = "small") {
  const localImageUrl = getLocalStructureImageUrl(compound.id);

  if (localImageUrl) {
    return localImageUrl;
  }

  return undefined;
}

function buildQuestion(
  compound: Compound,
  type: QuestionType,
  compounds: Compound[],
): Question | null {
  const imageUrl = getStructureImageUrl(compound, "small");

  if (!imageUrl) {
    return null;
  }

  const otherCompounds = compounds.filter((item) => item.id !== compound.id);
  const key = `${type}:${compound.id}`;

  switch (type) {
    case "nameByStructure": {
      const options = makeOptions(
        compound.name,
        otherCompounds.map((item) => item.name),
      );

      return options
        ? {
            prompt: "Как называется это соединение?",
            imageUrl,
            answerType: "name",
            correctAnswer: compound.name,
            options,
            compound,
            type,
            key,
          }
        : null;
    }

    case "propertiesByStructure": {
      if (!hasUsefulText(compound.propertiesApplicationBiologicalRole)) {
        return null;
      }

      const correctAnswer = makePropertyOption(compound);
      const options = makeOptions(
        correctAnswer,
        otherCompounds
          .filter((item) => hasUsefulText(item.propertiesApplicationBiologicalRole))
          .map(makePropertyOption),
      );

      return options
        ? {
            prompt: "Какие свойства, применение или биологическая роль соответствуют этому соединению?",
            imageUrl,
            answerType: "properties",
            correctAnswer,
            options,
            compound,
            type,
            key,
          }
        : null;
    }

    case "formulaConstructor": {
      return {
        prompt: "Собери формулу",
        imageUrl: undefined,
        answerType: "constructor",
        correctAnswer: compound.formula,
        options: [],
        compound,
        type,
        key,
      };
    }
  }
}

export function generateQuestion(
  compounds: Compound[],
  recentQuestionKeys: string[] = [],
  trainingMode: TrainingMode = "mixed",
): Question {
  const shuffledCompounds = shuffle(compounds);
  const shuffledTypes = shuffle(QUESTION_TYPES_BY_MODE[trainingMode]);
  const recentKeys = new Set(recentQuestionKeys);

  for (const compound of shuffledCompounds) {
    for (const type of shuffledTypes) {
      const question = buildQuestion(compound, type, compounds);

      if (question && !recentKeys.has(question.key)) {
        return question;
      }
    }
  }

  for (const compound of shuffledCompounds) {
    for (const type of shuffledTypes) {
      const question = buildQuestion(compound, type, compounds);

      if (question) {
        return question;
      }
    }
  }

  const fallbackCompound = sample(compounds);
  const fallbackImageUrl = getStructureImageUrl(fallbackCompound, "small");
  const fallbackOptions = makeOptions(
    fallbackCompound.name,
    compounds.filter((item) => item.id !== fallbackCompound.id).map((item) => item.name),
  );

  if (!fallbackImageUrl || !fallbackOptions) {
    throw new Error("Недостаточно уникальных соединений для генерации вопроса.");
  }

  return {
    prompt: "Как называется это соединение?",
    imageUrl: fallbackImageUrl,
    answerType: "name",
    correctAnswer: fallbackCompound.name,
    options: fallbackOptions,
    compound: fallbackCompound,
    type: "nameByStructure",
    key: `nameByStructure:${fallbackCompound.id}`,
  };
}

export function formatCompoundText(value: string[]): string {
  return joinedText(value) || "Нет краткого описания.";
}
