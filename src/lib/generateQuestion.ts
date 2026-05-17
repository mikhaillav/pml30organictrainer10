import type { Compound, Question, QuestionType } from "@/types/compound";
import { getLocalStructureImageUrl } from "./localStructureImages";

const MIN_HINT_LENGTH = 18;

const QUESTION_TYPES: QuestionType[] = [
  "nameByFormula",
  "formulaByName",
  "nameByStructure",
  "classByName",
  "nameByClass",
  "nameByProperties",
  "nameByReactions",
];

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
  const otherCompounds = compounds.filter((item) => item.id !== compound.id);

  // Each branch builds one question shape and chooses only unambiguous distractors.
  switch (type) {
    case "nameByFormula": {
      const options = makeOptions(
        compound.name,
        otherCompounds.map((item) => item.name),
      );

      return options
        ? {
            prompt: `Как называется соединение с формулой ${compound.formula || compound.plainFormula}?`,
            answerType: "name",
            correctAnswer: compound.name,
            options,
            compound,
            type,
          }
        : null;
    }

    case "formulaByName": {
      const options = makeOptions(
        compound.formula,
        otherCompounds.map((item) => item.formula),
      );

      return options
        ? {
            prompt: `Какая формула у вещества «${compound.name}»?`,
            answerType: "formula",
            correctAnswer: compound.formula,
            options,
            compound,
            type,
          }
        : null;
    }

    case "nameByStructure": {
      const imageUrl = getStructureImageUrl(compound, "small");

      if (!imageUrl) {
        return null;
      }

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
          }
        : null;
    }

    case "classByName": {
      const options = makeOptions(
        compound.className,
        otherCompounds.map((item) => item.className),
      );

      return options
        ? {
            prompt: `К какому классу относится «${compound.name}»?`,
            answerType: "className",
            correctAnswer: compound.className,
            options,
            compound,
            type,
          }
        : null;
    }

    case "nameByClass": {
      const options = makeOptions(
        compound.name,
        compounds
          .filter((item) => item.className !== compound.className)
          .map((item) => item.name),
      );

      return options
        ? {
            prompt: `Какое вещество относится к классу «${compound.className}»?`,
            answerType: "name",
            correctAnswer: compound.name,
            options,
            compound,
            type,
          }
        : null;
    }

    case "nameByProperties": {
      if (!hasUsefulText(compound.propertiesApplicationBiologicalRole)) {
        return null;
      }

      const options = makeOptions(
        compound.name,
        otherCompounds.map((item) => item.name),
      );

      return options
        ? {
            prompt: `Для какого вещества характерно: ${truncateText(joinedText(compound.propertiesApplicationBiologicalRole))}`,
            answerType: "name",
            correctAnswer: compound.name,
            options,
            compound,
            type,
          }
        : null;
    }

    case "nameByReactions": {
      if (!hasUsefulText(compound.keyReactions)) {
        return null;
      }

      const options = makeOptions(
        compound.name,
        otherCompounds.map((item) => item.name),
      );

      return options
        ? {
            prompt: `Для какого вещества характерны такие реакции: ${truncateText(joinedText(compound.keyReactions))}`,
            answerType: "name",
            correctAnswer: compound.name,
            options,
            compound,
            type,
          }
        : null;
    }
  }
}

export function generateQuestion(compounds: Compound[]): Question {
  const shuffledCompounds = shuffle(compounds);
  const shuffledTypes = shuffle(QUESTION_TYPES);

  for (const compound of shuffledCompounds) {
    for (const type of shuffledTypes) {
      const question = buildQuestion(compound, type, compounds);

      if (question) {
        return question;
      }
    }
  }

  const fallbackCompound = sample(compounds);
  const fallbackOptions = makeOptions(
    fallbackCompound.name,
    compounds.filter((item) => item.id !== fallbackCompound.id).map((item) => item.name),
  );

  if (!fallbackOptions) {
    throw new Error("Недостаточно уникальных соединений для генерации вопроса.");
  }

  return {
    prompt: `Как называется соединение с формулой ${fallbackCompound.formula}?`,
    answerType: "name",
    correctAnswer: fallbackCompound.name,
    options: fallbackOptions,
    compound: fallbackCompound,
    type: "nameByFormula",
  };
}

export function formatCompoundText(value: string[]): string {
  return joinedText(value) || "Нет краткого описания.";
}
