import { useMemo, useRef, useState } from "react";
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

function getSvgPoint(event: React.PointerEvent<SVGSVGElement>, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
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
  const svgRef = useRef<SVGSVGElement | null>(null);

  const plainFormula = useMemo(() => normalizePlainFormula(plainTokens), [plainTokens]);

  function resetAll(nextMode = mode) {
    setPlainTokens([]);
    setNodes([]);
    setBonds([]);
    setPendingBondNodeId(null);
    setDraggingNodeId(null);
    setResult(null);
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
    setNodes((items) =>
      items.map((node) => (node.id === draggingNodeId ? { ...node, x: point.x, y: point.y } : node)),
    );
  }

  function checkAnswer() {
    const nextResult =
      mode === "plain" ? checkPlainFormula(plainTokens, compound) : checkStructuralFormula({ nodes, bonds }, compound);
    setResult(nextResult);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-[#101820] text-white shadow-2xl">
      <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_30%_0%,rgba(52,211,153,0.24),transparent_35%),linear-gradient(160deg,#101820,#17212b)] p-5 lg:border-b-0 lg:border-r lg:p-7">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Конструктор</p>
          <h3 className="font-serif text-3xl font-black leading-tight sm:text-4xl">Собери формулу</h3>
          <p className="mt-3 text-lg font-bold text-white">{compound.name}</p>
          <p className="mt-3 max-w-sm leading-7 text-slate-300">
            Можно собрать обычную запись для сложных формул или визуальную структуру как граф из кирпичиков.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/8 p-2">
            {[
              { mode: "plain" as const, label: "Обычная" },
              { mode: "structural" as const, label: "Структурная" },
            ].map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => resetAll(item.mode)}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === item.mode ? "bg-emerald-300 text-slate-950" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#f8f4e9] p-4 text-slate-950 sm:p-6">
          {mode === "plain" ? (
            <div>
              <div className="min-h-24 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-4 shadow-inner">
                {plainTokens.length ? (
                  <div className="flex flex-wrap gap-2 text-2xl font-black">
                    {plainTokens.map((token, index) => (
                      <button
                        key={`${token}-${index}`}
                        type="button"
                        onClick={() => {
                          setPlainTokens((items) => items.filter((_, itemIndex) => itemIndex !== index));
                          setResult(null);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-rose-300 hover:bg-rose-50"
                        title="Удалить кирпичик"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center font-semibold text-slate-500">Нажимай кирпичики снизу, чтобы собрать формулу.</p>
                )}
              </div>
              <p className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 font-mono text-lg font-black text-emerald-200">
                {plainFormula || "формула появится здесь"}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {PLAIN_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => {
                      setPlainTokens((items) => [...items, token]);
                      setResult(null);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-black shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
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
                className="h-[320px] w-full touch-none rounded-3xl border border-slate-200 bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:32px_32px] shadow-inner"
                onPointerMove={handlePointerMove}
                onPointerUp={() => setDraggingNodeId(null)}
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
                        setDraggingNodeId(node.id);
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
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

              <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Кирпичики</p>
                  <div className="flex flex-wrap gap-2">
                    {STRUCTURAL_BRICKS.map((brick) => (
                      <button
                        key={brick.label}
                        type="button"
                        onClick={() => addNode(brick.label)}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        {brick.text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Количество</p>
                    <div className="flex gap-2">
                      {COUNT_OPTIONS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSelectedCount(count)}
                          className={`h-11 w-11 rounded-xl text-sm font-black ${
                            selectedCount === count ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Связь</p>
                    <div className="flex gap-2">
                      {([1, 2, 3] as const).map((order) => (
                        <button
                          key={order}
                          type="button"
                          onClick={() => setSelectedBondOrder(order)}
                          className={`rounded-xl px-3 py-3 text-sm font-black ${
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

              <p className="mt-3 text-sm font-semibold text-slate-600">
                Клик по двум узлам создаёт связь. Узлы можно таскать. Двойной клик удаляет узел.
                Клик по связи удаляет её.
              </p>
            </div>
          )}

          {result ? (
            <div className={`mt-5 rounded-3xl border p-4 ${resultClassName(result)}`}>
              <p className="text-2xl font-black">{result.isCorrect ? "Верно!" : "Неверно"}</p>
              <p className="mt-1 font-semibold">{result.message}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={checkAnswer}
              className="rounded-full bg-emerald-400 px-6 py-3 text-base font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Проверить
            </button>
            <button
              type="button"
              onClick={() => resetAll()}
              className="rounded-full bg-slate-200 px-6 py-3 text-base font-black text-slate-900 transition hover:bg-slate-300"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-slate-950 px-6 py-3 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Следующий вопрос
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
