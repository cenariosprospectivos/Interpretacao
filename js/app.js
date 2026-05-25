const state = {
  rows: [],
  scenarios: [],
  selectedScenarioId: null
};

function setStatus(message, type = "info") {
  const box = document.getElementById("statusBox");
  box.textContent = message;
  box.className = `status ${type}`;
}

function compact(text, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function labelState(value) {
  if (value === "ocorre") return "ocorre";
  if (value === "nao_ocorre") return "não ocorre";
  return "indiferente";
}

function badgeClass(value) {
  if (value === "ocorre") return "badge-yes";
  if (value === "nao_ocorre") return "badge-no";
  return "badge-any";
}

async function loadData() {
  setStatus("Carregando interpretação dos cenários...", "info");

  const { data, error } = await supabaseClient
    .from("interpretacao_cenarios_consolidada")
    .select("*")
    .order("cenario_nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar dados: ${error.message}`);

  state.rows = data || [];
  buildScenarios();
  renderAll();

  setStatus("Dados carregados. Os exemplos pré-preenchidos estão prontos para o storytelling.", "success");
}

function buildScenarios() {
  const map = new Map();

  state.rows.forEach(row => {
    if (!row.cenario_id) return;

    if (!map.has(row.cenario_id)) {
      map.set(row.cenario_id, {
        id: row.cenario_id,
        nome: row.cenario_nome,
        descricao: row.cenario_descricao,
        combinacao: row.combinacao_json || {},
        probabilidade: row.probabilidade_calculada,
        consequencias: new Map(),
        medidas: []
      });
    }

    const scenario = map.get(row.cenario_id);

    if (row.consequencia_id && !scenario.consequencias.has(row.consequencia_id)) {
      scenario.consequencias.set(row.consequencia_id, {
        id: row.consequencia_id,
        titulo: row.consequencia_titulo,
        descricao: row.consequencia_descricao,
        impacto: row.consequencia_impacto,
        dimensao: row.consequencia_dimensao,
        observacao: row.consequencia_observacao
      });
    }

    if (row.medida_id) {
      const exists = scenario.medidas.some(m => m.id === row.medida_id);
      if (!exists) {
        scenario.medidas.push({
          id: row.medida_id,
          titulo: row.medida_titulo,
          descricao: row.medida_descricao,
          tipo: row.medida_tipo,
          prioridade: row.medida_prioridade,
          altera_cultura: row.altera_cultura,
          gera_resistencia_externa: row.gera_resistencia_externa,
          altera_estrutura_poder: row.altera_estrutura_poder,
          diminui_resistencia_interna: row.diminui_resistencia_interna,
          diminui_resistencia_externa: row.diminui_resistencia_externa,
          observacao: row.medida_observacao,
          consequencia_id: row.consequencia_id
        });
      }
    }
  });

  state.scenarios = Array.from(map.values()).map(s => ({
    ...s,
    consequencias: Array.from(s.consequencias.values())
  }));

  if (!state.selectedScenarioId && state.scenarios.length) {
    state.selectedScenarioId = state.scenarios[0].id;
  }
}

function selectedScenario() {
  return state.scenarios.find(s => s.id === state.selectedScenarioId) || state.scenarios[0];
}

function renderAll() {
  renderMetrics();
  renderScenarioSelect();
  renderSelectedScenario();
  renderConsolidatedTable();
}

function renderMetrics() {
  const interpreted = state.scenarios.filter(s => s.consequencias.length > 0).length;
  const consequences = state.scenarios.reduce((sum, s) => sum + s.consequencias.length, 0);
  const measures = state.scenarios.reduce((sum, s) => sum + s.medidas.length, 0);

  document.getElementById("metricCenarios").textContent = interpreted;
  document.getElementById("metricConsequencias").textContent = consequences;
  document.getElementById("metricMedidas").textContent = measures;
}

function renderScenarioSelect() {
  const select = document.getElementById("scenarioSelect");
  select.innerHTML = state.scenarios.map(s => `
    <option value="${s.id}" ${s.id === state.selectedScenarioId ? "selected" : ""}>${s.nome}</option>
  `).join("");
}

function renderSelectedScenario() {
  const scenario = selectedScenario();
  if (!scenario) return;

  document.getElementById("scenarioTitle").textContent = scenario.nome;
  document.getElementById("scenarioDescription").textContent = scenario.descricao || "";

  const combo = document.getElementById("scenarioCombination");
  combo.innerHTML = Object.entries(scenario.combinacao || {})
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([num, value]) => `<span class="badge ${badgeClass(value)}">E${num}: ${labelState(value)}</span>`)
    .join("");

  renderConsequences(scenario);
  renderMeasures(scenario);
  renderSynthesis(scenario);
}

function renderConsequences(scenario) {
  const grid = document.getElementById("consequenceGrid");
  grid.innerHTML = "";

  if (!scenario.consequencias.length) {
    grid.innerHTML = `<article class="content-card"><p>Nenhuma consequência cadastrada para este cenário.</p></article>`;
    return;
  }

  scenario.consequencias.forEach(cons => {
    const card = document.createElement("article");
    card.className = "content-card";
    card.innerHTML = `
      <span class="badge badge-impact">${cons.impacto}</span>
      <span class="badge badge-any">${cons.dimensao}</span>
      <h3>${cons.titulo}</h3>
      <p>${cons.descricao}</p>
      ${cons.observacao ? `<p><strong>Observação:</strong> ${cons.observacao}</p>` : ""}
    `;
    grid.appendChild(card);
  });
}

function renderMeasures(scenario) {
  const grid = document.getElementById("measureGrid");
  grid.innerHTML = "";

  if (!scenario.medidas.length) {
    grid.innerHTML = `<article class="content-card"><p>Nenhuma medida cadastrada para este cenário.</p></article>`;
    return;
  }

  scenario.medidas.forEach(med => {
    const card = document.createElement("article");
    card.className = "content-card";
    card.innerHTML = `
      <span class="badge badge-type">${med.tipo}</span>
      <span class="badge badge-impact">prioridade ${med.prioridade}</span>
      <h3>${med.titulo}</h3>
      <p>${med.descricao}</p>
      <div class="check-grid">
        ${checkItem("Altera cultura", med.altera_cultura)}
        ${checkItem("Gera resistência externa", med.gera_resistencia_externa)}
        ${checkItem("Altera estrutura de poder", med.altera_estrutura_poder)}
        ${checkItem("Diminui resistência interna", med.diminui_resistencia_interna)}
        ${checkItem("Diminui resistência externa", med.diminui_resistencia_externa)}
      </div>
      ${med.observacao ? `<p><strong>Observação:</strong> ${med.observacao}</p>` : ""}
    `;
    grid.appendChild(card);
  });
}

function checkItem(label, active) {
  return `<div class="check-item ${active ? "active" : ""}">${active ? "✓" : "—"} ${label}</div>`;
}

function renderSynthesis(scenario) {
  const consequence = scenario.consequencias[0];
  const measure = scenario.medidas[0];

  const text = consequence && measure
    ? `No ${scenario.nome.toLowerCase()}, a principal consequência identificada é “${consequence.titulo}”. Essa leitura sugere que a resposta estratégica deve priorizar “${measure.titulo}”, articulando capacidades de Defesa, coordenação interagências e planejamento preventivo. A etapa mostra que o valor do cenário não está apenas em sua probabilidade, mas na capacidade de antecipar consequências e organizar medidas antes da crise.`
    : `O cenário selecionado ainda não possui consequência e medida suficientes para gerar síntese interpretativa.`;

  document.getElementById("synthesisText").textContent = text;
}

function renderConsolidatedTable() {
  const tbody = document.getElementById("consolidatedTableBody");
  tbody.innerHTML = "";

  state.rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.cenario_nome || "-"}</td>
      <td>${row.consequencia_titulo || "-"}</td>
      <td>${row.consequencia_impacto || "-"}</td>
      <td>${row.consequencia_dimensao || "-"}</td>
      <td>${row.medida_titulo || "-"}</td>
      <td>${row.medida_tipo || "-"}</td>
      <td>${row.medida_prioridade || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  downloadText("interpretacao_md2036.json", JSON.stringify(state.scenarios, null, 2), "application/json");
}

function exportCsv() {
  const header = ["cenario", "consequencia", "impacto", "dimensao", "medida", "tipo", "prioridade"];
  const lines = [header.join(";")];

  state.rows.forEach(row => {
    lines.push([
      `"${String(row.cenario_nome || "").replaceAll('"', '""')}"`,
      `"${String(row.consequencia_titulo || "").replaceAll('"', '""')}"`,
      row.consequencia_impacto || "",
      row.consequencia_dimensao || "",
      `"${String(row.medida_titulo || "").replaceAll('"', '""')}"`,
      row.medida_tipo || "",
      row.medida_prioridade || ""
    ].join(";"));
  });

  downloadText("interpretacao_md2036.csv", lines.join("\n"), "text/csv;charset=utf-8");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reloadBtn").addEventListener("click", () => {
    loadData().catch(err => setStatus(err.message, "error"));
  });

  document.getElementById("scenarioSelect").addEventListener("change", event => {
    state.selectedScenarioId = event.target.value;
    renderSelectedScenario();
  });

  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);

  loadData().catch(err => {
    console.error(err);
    setStatus(err.message, "error");
  });
});
