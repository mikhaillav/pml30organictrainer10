import { useEffect, useMemo, useRef, useState } from "react";
import { getStructureImageUrl } from "@/lib/generateQuestion";
import { checkPlainFormula, checkStructuralFormula, normalizePlainFormula } from "@/lib/formulaGraph";
import type { Compound } from "@/types/compound";
import type {
  FormulaBuilderMode,
  FormulaBond,
  FormulaCheckResult,
  FormulaNode,
  FormulaNodeLabel,
} from "@/types/formula";

type FormulaConstructorProps = {
  compound: Compound;
  onNext: () => void;
};

const PLAIN_TOKENS = [
  "C",
  "H",
  "O",
  "N",
  "Cl",
  "S",
  "P",
  "Br",
  "I",
  "₁",
  "₂",
  "₃",
  "₄",
  "₅",
  "₆",
  "₁₂",
  "₂₂",
  "(",
  ")",
  "-",
  "=",
  "≡",
  "OH",
  "NO₂",
  "COOH",
  "CH₃",
  "CH₂",
  "NH₂",
];

const STRUCTURAL_BRICKS: { label: FormulaNodeLabel; text: string }[] = [
  { label: "C", text: "C" },
  { label: "H", text: "H" },
  { label: "O", text: "O" },
  { label: "N", text: "N" },
  { label: "Cl", text: "Cl" },
  { label: "CH3", text: "CH₃" },
  { label: "CH2", text: "CH₂" },
  { label: "CH", text: "CH" },
  { label: "OH", text: "OH" },
  { label: "NH2", text: "NH₂" },
  { label: "NO2", text: "NO₂" },
  { label: "COOH", text: "COOH" },
  { label: "benzene", text: "⌬" },
];

const COUNT_OPTIONS = [1, 2, 3, 4];

function resultClassName(result: FormulaCheckResult) {
  return result.isCorrect
    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
    : "border-rose-300 bg-rose-50 text-rose-950";
}

function bondLabel(order: 1 | 2 | 3) {
  return order === 1 ? "одинарная" : order === 2 ? "двойная" : "тройная";
}

function displayNodeLabel(node: FormulaNode) {
  const label = node.label === "benzene" ? "⌬" : node.label.replace("3", "₃").replace("2", "₂");
  return node.count && node.count > 1 ? `${label}${node.count}` : label;
}

function getSvgPoint(event: Pick<React.PointerEvent, "clientX" | "clientY">, svg: SVGSVGElement) {
  const matrix = svg.getScreenCTM();

  if (matrix) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  return {
    x: ((event.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x,
    y: ((event.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y,
  };
}

export function FormulaConstructor({ compound, onNext }: FormulaConstructorProps) {
  const [mode, setMode] = useState<FormulaBuilderMode>("plain");
  const [plainTokens, setPlainTokens] = useState<string[]>([]);
  const [nodes, setNodes] = useState<FormulaNode[]>([]);
  const [bonds, setBonds] = useState<FormulaBond[]>([]);
  const [selectedCount, setSelectedCount] = useState(1);
  const [selectedBondOrder, setSelectedBondOrder] = useState<1 | 2 | 3>(1);
  const [pendingBondNodeId, setPendingBondNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [result, setResult] = useState<FormulaCheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);

  const plainFormula = useMemo(() => normalizePlainFormula(plainTokens), [plainTokens]);
  const hintImageUrl = getStructureImageUrl(compound, "large");

  useEffect(() => {
    resetAll(mode);
  }, [compound.id]);

  function resetAll(nextMode = mode) {
    setPlainTokens([]);
    setNodes([]);
    setBonds([]);
    setPendingBondNodeId(null);
    setDraggingNodeId(null);
    setResult(null);
    setShowHint(false);
    setMode(nextMode);
  }

  function addNode(label: FormulaNodeLabel) {
    const spread = nodes.length % 8;
    const node: FormulaNode = {
      id: `node-${Date.now()}-${nodes.length}`,
      label,
      count: ["C", "H", "O", "N", "Cl"].includes(label) ? selectedCount : undefined,
      x: 110 + spread * 58,
      y: 105 + Math.floor(nodes.length / 8) * 64,
    };

    setNodes((items) => [...items, node]);
    setResult(null);
  }

  function removeNode(nodeId: string) {
    setNodes((items) => items.filter((node) => node.id !== nodeId));
    setBonds((items) => items.filter((bond) => bond.from !== nodeId && bond.to !== nodeId));
    setPendingBondNodeId(null);
    setResult(null);
  }

  function removeBond(bondId: string) {
    setBonds((items) => items.filter((bond) => bond.id !== bondId));
    setPendingBondNodeId(null);
    setResult(null);
  }

  function selectNodeForBond(nodeId: string) {
    if (!pendingBondNodeId) {
      setPendingBondNodeId(nodeId);
      return;
    }

    if (pendingBondNodeId === nodeId) {
      setPendingBondNodeId(null);
      return;
    }

    const exists = bonds.some(
      (bond) =>
        (bond.from === pendingBondNodeId && bond.to === nodeId) || (bond.from === nodeId && bond.to === pendingBondNodeId),
    );

    if (!exists) {
      setBonds((items) => [
        ...items,
        { id: `bond-${Date.now()}-${items.length}`, from: pendingBondNodeId, to: nodeId, order: selectedBondOrder },
      ]);
      setResult(null);
    }

    setPendingBondNodeId(null);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!draggingNodeId || !svgRef.current) {
      return;
    }

    const point = getSvgPoint(event, svgRef.current);
    const nextX = Math.min(608, Math.max(32, point.x - dragOffsetRef.current.x));
    const nextY = Math.min(288, Math.max(32, point.y - dragOffsetRef.current.y));
    dragMovedRef.current = true;
    setNodes((items) =>
      items.map((node) => (node.id === draggingNodeId ? { ...node, x: nextX, y: nextY } : node)),
    );
  }

  function checkAnswer() {
    const nextResult =
      mode === "plain" ? checkPlainFormula(plainTokens, compound) : checkStructuralFormula({ nodes, bonds }, compound);
    setResult(nextResult);
  }

  function handleNextQuestion() {
    setShowHint(false);
    onNext();
  }

  return (
    <section className="mt-3 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#101820] text-white shadow-2xl sm:mt-5 sm:rounded-[2rem]">
      <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_30%_0%,rgba(52,211,153,0.24),transparent_35%),linear-gradient(160deg,#101820,#17212b)] p-3 sm:p-5 lg:border-b-0 lg:border-r lg:p-7">
          <div className="flex flex-wrap items-end justify-between gap-2 lg:block">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200 sm:mb-3 sm:text-xs sm:tracking-[0.28em]">Конструктор</p>
              <h3 className="font-serif text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">Собери формулу</h3>
            </div>
            <p className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white sm:mt-3 sm:bg-transparent sm:px-0 sm:py-0 sm:text-lg">{compound.name}</p>
          </div>
          <p className="mt-3 hidden max-w-sm leading-7 text-slate-300 sm:block">
            Можно собрать обычную запись для сложных формул или визуальную структуру как граф из кирпичиков.
          </p>

          <button
            type="button"
            onClick={() => setShowHint((value) => !value)}
            className="mt-3 w-full rounded-2xl border border-emerald-200/30 bg-white/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-white/15 sm:mt-5"
          >
            {showHint ? "Скрыть подсказку" : "Дать подсказку"}
          </button>

          {showHint ? (
            <div className="mt-3 rounded-2xl border border-white/15 bg-white p-3 text-slate-950 shadow-xl sm:mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Можно срисовать</p>
              {hintImageUrl ? (
                <img
                  src={hintImageUrl}
                  alt={`Подсказка: структурная формула ${compound.name}`}
                  className="max-h-[22svh] w-full object-contain sm:max-h-56"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-600">Для этого вещества нет картинки подсказки.</p>
              )}
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/8 p-1.5 sm:mt-6 sm:p-2">
            {[
              { mode: "plain" as const, label: "Обычная" },
              { mode: "structural" as const, label: "Структурная" },
            ].map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => resetAll(item.mode)}
                className={`rounded-xl px-3 py-2.5 text-sm font-black transition sm:px-4 sm:py-3 ${
                  mode === item.mode ? "bg-emerald-300 text-slate-950" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#f8f4e9] p-3 text-slate-950 sm:p-6">
          {mode === "plain" ? (
            <div>
              <div className="max-h-[18svh] min-h-16 overflow-y-auto rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3 shadow-inner sm:min-h-24 sm:rounded-3xl sm:p-4">
                {plainTokens.length ? (
                  <div className="flex flex-wrap gap-1.5 text-xl font-black sm:gap-2 sm:text-2xl">
                    {plainTokens.map((token, index) => (
                      <button
                        key={`${token}-${index}`}
                        type="button"
                        onClick={() => {
                          setPlainTokens((items) => items.filter((_, itemIndex) => itemIndex !== index));
                          setResult(null);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 transition hover:border-rose-300 hover:bg-rose-50 sm:px-3 sm:py-2"
                        title="Удалить кирпичик"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-3 text-center text-sm font-semibold text-slate-500 sm:py-4 sm:text-base">Нажимай кирпичики снизу, чтобы собрать формулу.</p>
                )}
              </div>
              <p className="mt-2 rounded-2xl bg-slate-900 px-3 py-2.5 font-mono text-base font-black text-emerald-200 sm:mt-3 sm:px-4 sm:py-3 sm:text-lg">
                {plainFormula || "формула появится здесь"}
              </p>

              <div className="mt-3 flex max-h-[24svh] flex-wrap gap-1.5 overflow-y-auto pr-1 sm:mt-5 sm:max-h-none sm:gap-2 sm:overflow-visible sm:pr-0">
                {PLAIN_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => {
                      setPlainTokens((items) => [...items, token]);
                      setResult(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-black shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-lg"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <svg
                ref={svgRef}
                viewBox="0 0 640 320"
                className="h-[34svh] max-h-[320px] min-h-[190px] w-full touch-none rounded-2xl border border-slate-200 bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:32px_32px] shadow-inner sm:rounded-3xl"
                onPointerMove={handlePointerMove}
                onPointerUp={() => setDraggingNodeId(null)}
                onPointerCancel={() => setDraggingNodeId(null)}
                onPointerLeave={() => setDraggingNodeId(null)}
              >
                {bonds.map((bond) => {
                  const from = nodes.find((node) => node.id === bond.from);
                  const to = nodes.find((node) => node.id === bond.to);
                  if (!from || !to) return null;
                  return (
                    <g
                      key={bond.id}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBond(bond.id);
                      }}
                    >
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="transparent"
                        strokeWidth="22"
                        strokeLinecap="round"
                      />
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#0f172a"
                        strokeWidth={bond.order === 1 ? 5 : bond.order === 2 ? 8 : 11}
                        strokeLinecap="round"
                        opacity="0.82"
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 - 10}
                        textAnchor="middle"
                        className="fill-emerald-700 text-[12px] font-black"
                      >
                        {bond.order === 1 ? "-" : bond.order === 2 ? "=" : "≡"}
                      </text>
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const isPending = pendingBondNodeId === node.id;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x} ${node.y})`}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        if (svgRef.current) {
                          const point = getSvgPoint(event, svgRef.current);
                          dragOffsetRef.current = { x: point.x - node.x, y: point.y - node.y };
                        }
                        dragMovedRef.current = false;
                        setDraggingNodeId(node.id);
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (dragMovedRef.current) {
                          dragMovedRef.current = false;
                          return;
                        }
                        selectNodeForBond(node.id);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        removeNode(node.id);
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {node.label === "benzene" ? (
                        <polygon
                          points="0,-33 29,-16 29,16 0,33 -29,16 -29,-16"
                          fill={isPending ? "#a7f3d0" : "#ffffff"}
                          stroke="#0f172a"
                          strokeWidth="4"
                        />
                      ) : (
                        <circle r="30" fill={isPending ? "#a7f3d0" : "#ffffff"} stroke="#0f172a" strokeWidth="4" />
                      )}
                      <text textAnchor="middle" dominantBaseline="central" className="select-none fill-slate-950 text-[17px] font-black">
                        {displayNodeLabel(node)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="mt-3 grid max-h-[28svh] gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 sm:mt-4 sm:max-h-none sm:rounded-3xl sm:overflow-visible lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Кирпичики</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {STRUCTURAL_BRICKS.map((brick) => (
                      <button
                        key={brick.label}
                        type="button"
                        onClick={() => addNode(brick.label)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-black transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-lg"
                      >
                        {brick.text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Количество</p>
                    <div className="flex gap-2">
                      {COUNT_OPTIONS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSelectedCount(count)}
                          className={`h-10 w-10 rounded-xl text-sm font-black sm:h-11 sm:w-11 ${
                            selectedCount === count ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Связь</p>
                    <div className="flex gap-2">
                      {([1, 2, 3] as const).map((order) => (
                        <button
                          key={order}
                          type="button"
                          onClick={() => setSelectedBondOrder(order)}
                          className={`rounded-xl px-3 py-2.5 text-sm font-black sm:py-3 ${
                            selectedBondOrder === order ? "bg-emerald-300 text-slate-950" : "bg-slate-100 text-slate-700"
                          }`}
                          title={bondLabel(order)}
                        >
                          {order === 1 ? "-" : order === 2 ? "=" : "≡"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-600 sm:mt-3 sm:text-sm">
                Клик по двум узлам создаёт связь. Узлы можно таскать. Двойной клик удаляет узел.
                Клик по связи удаляет её.
              </p>
            </div>
          )}

          {result ? (
            <div className={`mt-3 rounded-2xl border p-3 sm:mt-5 sm:rounded-3xl sm:p-4 ${resultClassName(result)}`}>
              <p className="text-xl font-black sm:text-2xl">{result.isCorrect ? "Верно!" : "Неверно"}</p>
              <p className="mt-1 font-semibold">{result.message}</p>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={checkAnswer}
              className="rounded-full bg-emerald-400 px-3 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-200 sm:px-6 sm:py-3 sm:text-base"
            >
              Проверить
            </button>
            <button
              type="button"
              onClick={() => setShowHint((value) => !value)}
              className="rounded-full bg-amber-200 px-3 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-100 sm:px-6 sm:py-3 sm:text-base"
            >
              Подсказка
            </button>
            <button
              type="button"
              onClick={() => resetAll()}
              className="rounded-full bg-slate-200 px-3 py-2.5 text-sm font-black text-slate-900 transition hover:bg-slate-300 sm:px-6 sm:py-3 sm:text-base"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={handleNextQuestion}
              className="rounded-full bg-slate-950 px-3 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-6 sm:py-3 sm:text-base"
            >
              Следующий вопрос
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
