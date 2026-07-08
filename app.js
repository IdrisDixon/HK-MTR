const tablesContainer = document.querySelector("#tablesContainer");
const routeMapContainer = document.querySelector("#routeMapContainer");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const lineFilter = document.querySelector("#lineFilter");
const totalCount = document.querySelector("#totalCount");
const visibleCount = document.querySelector("#visibleCount");
const lineCount = document.querySelector("#lineCount");

let rows = [];
let headers = [];

const fallbackHeaders = ["路綫", "站名", "粵語", "備註"];
const lineHeaderHints = ["路綫", "路線", "线路", "路线", "line", "route"];
const stationHeaderHints = ["車站名", "车站名", "站名", "station"];
const routeColorMap = [
  { match: ["荃灣綫", "荃湾线", "tsuen wan"], color: "#E2231A" },
  { match: ["觀塘綫", "观塘线", "kwun tong"], color: "#00AB4E" },
  { match: ["港島綫", "港岛线", "island"], color: "#00529B" },
  { match: ["將軍澳綫", "将军澳线", "tseung kwan o"], color: "#7D499D" },
  { match: ["東涌綫", "东涌线", "tung chung"], color: "#F7943E" },
  { match: ["迪士尼綫", "迪士尼线", "disneyland"], color: "#F173AC" },
  { match: ["機場快綫", "机场快线", "airport express"], color: "#00888A" },
  { match: ["東鐵綫", "东铁线", "east rail"], color: "#53B7E8" },
  { match: ["屯馬綫", "屯马线", "tuen ma"], color: "#923011" },
  { match: ["南港島綫", "南港岛线", "south island"], color: "#BAC429" },
];
const fallbackRouteColors = ["#58738f", "#3f7f3f", "#d4578f", "#7d6b3f"];
const routeAudioMap = [
  {
    match: ["觀塘綫", "kwun tong"],
    tracks: [{ label: "全程報站", src: "报站/04 - 觀塘綫全程報站 黃埔→調景嶺.m4a" }],
  },
  {
    match: ["荃灣綫", "tsuen wan"],
    tracks: [{ label: "全程報站", src: "报站/05 - 荃灣綫全程報站 中環→荃灣.m4a" }],
  },
  {
    match: ["港島綫", "island"],
    tracks: [{ label: "全程報站", src: "报站/06 - 港島綫全程報站 柴灣→堅尼地城.m4a" }],
  },
  {
    match: ["南港島綫", "south island"],
    tracks: [{ label: "全程報站", src: "报站/10 - 南港島綫全程報站 海怡半島→金鐘.m4a" }],
  },
  {
    match: ["將軍澳綫", "tseung kwan o"],
    tracks: [{ label: "全程報站", src: "报站/08 - 將軍澳綫全程報站 寶琳→北角.m4a" }],
  },
  {
    match: ["東涌綫", "tung chung"],
    tracks: [{ label: "全程報站", src: "报站/07 - 東涌綫全程報站 東涌→香港.m4a" }],
  },
  {
    match: ["東鐵綫", "east rail"],
    tracks: [{ label: "全程報站", src: "报站/02 - 東鐵綫全程報站 落馬洲→紅磡.m4a" }],
  },
  {
    match: ["屯馬綫", "tuen ma"],
    tracks: [
      { label: "西鐵段", src: "报站/03 - 西鐵綫全程報站及LCD顯示 屯門→紅磡.m4a" },
      { label: "馬鞍山段", src: "报站/09 - 馬鞍山綫全程報站及LCD顯示.m4a" },
    ],
  },
  {
    match: ["機場快綫", "airport express"],
    tracks: [{ label: "站名報站", src: "报站/【香港港铁】香港机场快线，站名报站及机场站提示 - 001 - 【香港港铁】香港机场快线，站名报站及机场站提示.m4a" }],
  },
];

function splitRow(line) {
  const clean = line.trim();

  if (clean.includes("\t")) return clean.split("\t").map((item) => item.trim());
  if (clean.includes("|")) return clean.replace(/^\||\|$/g, "").split("|").map((item) => item.trim());
  if (clean.includes(",")) return clean.split(",").map((item) => item.trim());

  return clean.split(/\s{2,}/).map((item) => item.trim());
}

function isDivider(line) {
  return /^[\s|:,-]+$/.test(line) || /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function normalizeHeaders(cells) {
  if (!cells.length) return fallbackHeaders;
  return cells.map((cell, index) => cell || fallbackHeaders[index] || `欄位 ${index + 1}`);
}

function sameHeader(a, b) {
  return a.length === b.length && a.every((cell, index) => cell === b[index]);
}

function looksLikeTransitSheet(parsed) {
  const first = parsed[0] || [];
  const repeatedHeaderCount = parsed.filter((cells) => sameHeader(cells, first)).length;
  const hasStationHeader = first.some((cell) => stationHeaderHints.some((hint) => cell.toLowerCase().includes(hint.toLowerCase())));

  return hasStationHeader && repeatedHeaderCount > 1;
}

function parseTransitSections(parsed) {
  const baseHeaders = normalizeHeaders(parsed[0]);
  const nextHeaders = ["路綫", ...baseHeaders];
  const nextRows = [];
  let currentLine = "";

  for (let index = 1; index < parsed.length; index += 1) {
    const cells = parsed[index];
    if (sameHeader(cells, baseHeaders)) {
      currentLine = "";
      continue;
    }

    const isLineRow = !currentLine && cells.some((cell) => /line|express|綫|線|线/i.test(cell || ""));
    if (isLineRow) {
      currentLine = cells[0] || cells[1] || "";
      continue;
    }

    const row = { 路綫: currentLine };
    baseHeaders.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] || "";
    });
    nextRows.push(row);
  }

  return { headers: nextHeaders, rows: nextRows };
}

function parseContent(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isDivider(line));

  if (!lines.length) return { headers: fallbackHeaders, rows: [] };

  const parsed = lines.map(splitRow).filter((cells) => cells.some(Boolean));
  if (looksLikeTransitSheet(parsed)) return parseTransitSections(parsed);

  const first = parsed[0] || [];
  const hasHeader = first.some((cell) => /路綫|路線|线路|路线|站名|中文|英文|粵語|粤语|拼音|讀音|读音|備註|备注|line|station|cantonese/i.test(cell));
  const nextRows = hasHeader ? parsed.slice(1) : parsed;
  const nextHeaders = hasHeader ? normalizeHeaders(first) : fallbackHeaders.slice(0, Math.max(fallbackHeaders.length, first.length));

  return {
    headers: nextHeaders,
    rows: nextRows.map((cells) => {
      const row = {};
      nextHeaders.forEach((header, index) => {
        row[header] = cells[index] || "";
      });
      return row;
    }),
  };
}

function getLineHeader() {
  return headers.find((header) => lineHeaderHints.some((hint) => header.toLowerCase().includes(hint.toLowerCase()))) || headers[0];
}

function getStationHeader() {
  return headers.find((header) => stationHeaderHints.some((hint) => header.toLowerCase().includes(hint.toLowerCase()))) || headers.find((header) => header !== getLineHeader()) || headers[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlight(value, query) {
  const safe = escapeHtml(value);
  if (!query) return safe;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(escapedQuery, "gi"), (match) => `<mark>${match}</mark>`);
}

function groupByLine(nextRows) {
  const lineHeader = getLineHeader();
  const grouped = new Map();

  for (const row of nextRows) {
    const line = row[lineHeader] || "未分類路綫";
    if (!grouped.has(line)) grouped.set(line, []);
    grouped.get(line).push(row);
  }

  return grouped;
}

function getRouteColor(line, index) {
  const normalizedLine = String(line).toLowerCase();
  const matched = routeColorMap.find((route) => route.match.some((name) => normalizedLine.includes(name.toLowerCase())));

  return matched ? matched.color : fallbackRouteColors[index % fallbackRouteColors.length];
}

function getRouteAudio(line) {
  const normalizedLine = String(line).toLowerCase();
  const matched = routeAudioMap.find((route) => route.match.some((name) => normalizedLine.includes(name.toLowerCase())));

  return matched ? matched.tracks : [];
}

function renderAudioPlayers(line) {
  const tracks = getRouteAudio(line);
  if (!tracks.length) return "";

  return `
    <div class="line-audio" aria-label="${escapeHtml(line)}報站音頻">
      ${tracks
        .map((track) => `
          <div class="audio-row">
            <span>${escapeHtml(track.label)}</span>
            <audio controls preload="metadata" src="${encodeURI(track.src)}"></audio>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function renderRouteMap(grouped, query) {
  const stationHeader = getStationHeader();

  routeMapContainer.innerHTML = [...grouped.entries()]
    .map(([line, groupRows], index) => {
      const color = getRouteColor(line, index);
      const stations = groupRows
        .map((row) => {
          const station = row[stationHeader] || "";
          return `
            <div class="route-station">
              <span class="route-dot" aria-hidden="true"></span>
              <span class="route-name">${highlight(station, query)}</span>
            </div>
          `;
        })
        .join("");

      return `
        <article class="route-line" style="--route-color: ${color}">
          <div class="route-label">
            <strong>${escapeHtml(line)}</strong>
            <span>${groupRows.length} 個站</span>
          </div>
          <div class="route-track-wrap">
            <div class="route-track">${stations}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTable(groupRows, query, lineName = "") {
  const lineHeader = getLineHeader();
  const visibleHeaders = lineName ? headers.filter((header) => header !== lineHeader) : headers;
  const title = lineName || "全部路綫";
  const color = getRouteColor(title, 0);
  const headerHtml = visibleHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = groupRows
    .map((row) => {
      const cells = visibleHeaders.map((header) => {
        const value = row[header] || "";
        const content = header === lineHeader && value
          ? `<span class="pill">${highlight(value, query)}</span>`
          : highlight(value, query);
        return `<td>${content}</td>`;
      });
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  return `
    <article class="line-table">
      <header class="line-heading" style="--line-color: ${color}">
        <div class="line-title">
          <h2>${escapeHtml(title)}</h2>
          ${renderAudioPlayers(title)}
        </div>
        <span>${groupRows.length} 個站</span>
      </header>
      <div class="table-wrap">
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
    </article>
  `;
}

function renderLineOptions() {
  const lineHeader = getLineHeader();
  const lines = [...new Set(rows.map((row) => row[lineHeader]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));

  lineFilter.innerHTML = '<option value="">全部路綫</option>';
  for (const line of lines) {
    const option = document.createElement("option");
    option.value = line;
    option.textContent = line;
    lineFilter.appendChild(option);
  }

  lineCount.textContent = String(lines.length);
}

function renderRows() {
  const query = searchInput.value.trim();
  const selectedLine = lineFilter.value;
  const lineHeader = getLineHeader();
  const normalizedQuery = query.toLowerCase();

  const filtered = rows.filter((row) => {
    const matchesLine = !selectedLine || row[lineHeader] === selectedLine;
    const matchesQuery = !normalizedQuery || headers.some((header) => String(row[header]).toLowerCase().includes(normalizedQuery));
    return matchesLine && matchesQuery;
  });

  if (selectedLine) {
    const grouped = groupByLine(filtered);
    renderRouteMap(grouped, query);
    tablesContainer.innerHTML = filtered.length ? renderTable(filtered, query, selectedLine) : "";
  } else {
    const grouped = groupByLine(filtered);

    renderRouteMap(grouped, query);
    tablesContainer.innerHTML = [...grouped.entries()]
      .map(([line, groupRows]) => renderTable(groupRows, query, line))
      .join("");
  }

  visibleCount.textContent = String(filtered.length);
  emptyState.hidden = rows.length > 0 && filtered.length > 0;
}

function hydrate(text) {
  const parsed = parseContent(text);
  headers = parsed.headers;
  rows = parsed.rows;

  totalCount.textContent = String(rows.length);
  renderLineOptions();
  renderRows();
}

async function loadContent() {
  try {
    const response = await fetch("contents.txt", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    hydrate(await response.text());
  } catch (error) {
    hydrate("");
    emptyState.hidden = false;
  }
}

searchInput.addEventListener("input", renderRows);
lineFilter.addEventListener("change", renderRows);

loadContent();
