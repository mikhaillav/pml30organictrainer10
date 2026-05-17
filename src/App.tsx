import { useEffect, useState } from "react";
import rawData from "@/data/organic_compounds_with_structures.json";
import { formatCompoundText, generateQuestion, getStructureImageUrl } from "@/lib/generateQuestion";
import type { CompoundData, Question } from "@/types/compound";

const data = rawData as CompoundData;
const compounds = data.compounds;

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

  function nextQuestion() {
    setQuestion(generateQuestion(compounds));
    setSelectedAnswer(null);
  }

  useEffect(() => {
    nextQuestion();
  }, []);

  const isCorrect = question && selectedAnswer === question.correctAnswer;
  const resultImageUrl = question ? getStructureImageUrl(question.compound, "large") : undefined;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1e8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.20),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(14,165,233,0.16),transparent_30%),linear-gradient(120deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:auto,auto,34px_34px]" />

      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col justify-center">
        <header className="mb-5 text-center sm:mb-8">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-emerald-700">
            30 важных соединений
          </p>
          <h1 className="font-serif text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Тренажёр органических соединений
          </h1>
        </header>

        <div className="rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur sm:p-7">
          {!question ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
              Подготавливаю первый вопрос...
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-[#fffdf7] p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                    Вопрос
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                    {question.answerType === "formula"
                      ? "выбери формулу"
                      : question.answerType === "className"
                        ? "выбери класс"
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

                <h2 className="text-balance text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                  {question.prompt}
                </h2>
              </div>

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

              {selectedAnswer ? (
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
                        <strong>{question.correctAnswer}</strong>
                      </p>
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
