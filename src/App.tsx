import { useEffect, useState } from "react";
import { FormulaConstructor } from "@/components/FormulaConstructor";
import rawData from "@/data/organic_compounds_with_structures.json";
import { formatCompoundText, generateQuestionQueue, getStructureImageUrl } from "@/lib/generateQuestion";
import type { CompoundData, Question, TrainingMode } from "@/types/compound";

const data = rawData as CompoundData;
const compounds = data.compounds;

const TRAINING_MODES: { mode: TrainingMode; label: string; description: string }[] = [
  { mode: "names", label: "Названия/формулы", description: "выбери название" },
  { mode: "properties", label: "Формула/свойства", description: "выбери свойства" },
  { mode: "mixed", label: "Смешанное", description: "оба типа" },
  { mode: "constructor", label: "Конструктор", description: "собери формулу" },
];

function optionClassName(question: Question, selectedAnswer: string | null, option: string) {
  const base =
    "group relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left text-lg font-semibold transition duration-200 sm:px-6 sm:py-5";

  if (!selectedAnswer) {
    return `${base} border-slate-200 bg-white/80 text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100`;
  }

  if (option === question.correctAnswer) {
    return `${base} border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm`;
  }

  if (option === selectedAnswer) {
    return `${base} border-rose-400 bg-rose-100 text-rose-950 shadow-sm`;
  }

  return `${base} border-slate-200 bg-slate-50 text-slate-500`;
}

export default function App() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("mixed");

  function nextQuestion() {
    setQuestionQueue((queue) => {
      const activeQueue = queue.length > 0 ? queue : generateQuestionQueue(compounds, trainingMode);
      const [next, ...rest] = activeQueue;

      setQuestion(next);
      setSelectedAnswer(null);
      return rest;
    });
  }

  useEffect(() => {
    const [next, ...rest] = generateQuestionQueue(compounds, trainingMode);

    setQuestion(next);
    setSelectedAnswer(null);
    setQuestionQueue(rest);
  }, [trainingMode]);

  const isCorrect = question && selectedAnswer === question.correctAnswer;
  const resultImageUrl = question ? getStructureImageUrl(question.compound, "large") : undefined;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1e8] px-3 py-3 text-slate-950 sm:px-6 sm:py-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.20),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(14,165,233,0.16),transparent_30%),linear-gradient(120deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:auto,auto,34px_34px]" />

      <section className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-4xl flex-col justify-start sm:min-h-[calc(100vh-3rem)] sm:justify-center">
        <header className={`text-center sm:mb-8 ${question?.answerType === "constructor" ? "mb-2 sm:mb-8" : "mb-3"}`}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 sm:mb-3 sm:text-sm sm:tracking-[0.28em]">
            30 важных соединений
          </p>
          <h1 className={`font-serif font-black tracking-tight text-slate-950 sm:text-6xl ${question?.answerType === "constructor" ? "text-2xl" : "text-3xl"}`}>
            Тренажёр органических соединений
          </h1>
        </header>

        <div className={`rounded-[1.5rem] border border-white/80 bg-white/78 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur sm:rounded-[2rem] sm:p-7 ${question?.answerType === "constructor" ? "p-2" : "p-3"}`}>
          <div className="mb-3 grid gap-1.5 rounded-2xl border border-slate-200 bg-white/70 p-1.5 sm:mb-5 sm:gap-2 sm:rounded-3xl sm:p-2 md:grid-cols-4">
            {TRAINING_MODES.map((item) => {
              const isActive = item.mode === trainingMode;

              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => setTrainingMode(item.mode)}
                  className={`rounded-xl px-3 py-2 text-left transition focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:rounded-2xl sm:px-4 sm:py-3 ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-transparent text-slate-700 hover:bg-emerald-50 hover:text-slate-950"
                  }`}
                >
                  <span className="block text-xs font-black sm:text-sm">{item.label}</span>
                  <span className={`mt-0.5 block text-[11px] font-semibold sm:mt-1 sm:text-xs ${isActive ? "text-emerald-200" : "text-slate-500"}`}>
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>

          {!question ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
              Подготавливаю первый вопрос...
            </div>
          ) : (
            <>
              <div className={`rounded-2xl border border-slate-200 bg-[#fffdf7] sm:rounded-3xl sm:p-7 ${question.answerType === "constructor" ? "p-2" : "p-3"}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-5">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                    Вопрос
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                    {question.answerType === "constructor"
                      ? "собери формулу"
                      : question.answerType === "properties"
                        ? "выбери свойства"
                        : "выбери название"}
                  </span>
                </div>

                {question.imageUrl ? (
                  <div className="mb-6 flex justify-center rounded-3xl border border-slate-200 bg-white p-4">
                    <img
                      src={question.imageUrl}
                      alt={`Структурная формула: ${question.compound.name}`}
                      className="max-h-56 w-full max-w-sm object-contain sm:max-h-72"
                    />
                  </div>
                ) : null}

                <h2 className={`text-balance font-black leading-tight text-slate-950 sm:text-3xl ${question.answerType === "constructor" ? "text-lg" : "text-xl"}`}>
                  {question.prompt}
                </h2>
                {question.answerType === "constructor" ? null : (
                  <p className="mt-4 inline-flex rounded-2xl bg-slate-100 px-4 py-2 text-lg font-black text-slate-900">
                    {question.compound.formula}
                  </p>
                )}
              </div>

              {question.answerType === "constructor" ? (
                <FormulaConstructor compound={question.compound} onNext={nextQuestion} />
              ) : (
                <div className="mt-5 grid gap-3 sm:gap-4">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={selectedAnswer !== null}
                      onClick={() => setSelectedAnswer(option)}
                      className={optionClassName(question, selectedAnswer, option)}
                    >
                      <span className="relative z-10 flex items-center justify-between gap-4">
                        <span>{option}</span>
                        {!selectedAnswer ? (
                          <span className="h-3 w-3 rounded-full bg-emerald-300 opacity-0 transition group-hover:opacity-100" />
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedAnswer && question.answerType !== "constructor" ? (
                <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl sm:p-7">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-3xl font-black">
                      {isCorrect ? "Верно!" : "Неверно"}
                    </h3>
                    <button
                      type="button"
                      onClick={nextQuestion}
                      className="rounded-full bg-emerald-300 px-5 py-3 text-base font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 focus:outline-none focus:ring-4 focus:ring-emerald-300/30"
                    >
                      Следующий вопрос
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-3 rounded-2xl bg-white/8 p-4">
                      <p className="text-lg">
                        <span className="text-slate-300">Правильный ответ: </span>
                        <strong>{question.compound.name}</strong>
                      </p>
                      {question.answerType === "properties" ? (
                        <p className="leading-7 text-slate-200">
                          <span className="text-slate-300">Правильные свойства: </span>
                          <strong>{question.correctAnswer}</strong>
                        </p>
                      ) : null}
                      <p>
                        <span className="text-slate-300">Формула: </span>
                        <strong>{question.compound.formula}</strong>
                      </p>
                      <p>
                        <span className="text-slate-300">Класс: </span>
                        <strong>{question.compound.className}</strong>
                      </p>
                      <p className="leading-7 text-slate-200">
                        {formatCompoundText(question.compound.propertiesApplicationBiologicalRole)}
                      </p>
                    </div>

                    {resultImageUrl ? (
                      <div className="flex items-center justify-center rounded-2xl bg-white p-4">
                        <img
                          src={resultImageUrl}
                          alt={`Структурная формула: ${question.compound.name}`}
                          className="max-h-64 w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
