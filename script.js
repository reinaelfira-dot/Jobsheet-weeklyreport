/* ============================================================
      API URL
============================================================ */
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];

/* Global Chart Object */
let assetChart = null;

/* ============================================================
      FORMATTER
============================================================ */
function formatNumber(num) {
  return Number(num || 0).toLocaleString("id-ID");
}

function nowLabel() {
  return new Date().toLocaleString("id-ID");
}

/* ============================================================
      LOADING UI
============================================================ */
function showConnection(status = "connecting") {
  const box = document.getElementById("connectionStatus");

  if (status === "connecting") {
    box.classList.remove("hidden");
    box.innerHTML = `<span class="dot"></span> Connecting...`;
  }
  if (status === "hide") {
    box.classList.add("hidden");
  }
}

function showLoadedSummary(text) {
  const box = document.getElementById("loadedSummary");
  document.getElementById("loadedMessage").innerText = text;

  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 3500);
}

function showCardLoading() {
  const ids = ["statusUnitList", "customerList", "locationList", "yearList", "vehicleList"];

  ids.forEach((id) => {
    document.getElementById(id).innerHTML = `
      <div class="card-loading">
          <div class="loader"></div>
          <p>Loading data...</p>
      </div>`;
  });
}

/* ============================================================
      LOAD DATA
============================================================ */
document.addEventListener("DOMContentLoaded", loadData);

async function loadData() {
  showConnection("connecting");
  showCardLoading();

  try {
    const assetReq = await fetch(API_URL + "?action=asset");
    const assetJson = await assetReq.json();
    assetData = assetJson.data || [];

    const jsReq = await fetch(API_URL + "?action=jobsheet");
    const jsJson = await jsReq.json();
    jobsheetData = jsJson.data || [];

    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    populateHubFilter();
    renderAssetCards(assetData);
    renderJobsheetSummary();
    renderAssetChart("year", assetData); // default chart

    showConnection("hide");
    showLoadedSummary(`Data loaded: ${assetData.length} assets, ${jobsheetData.length} jobsheets`);
  } catch (err) {
    console.error("LOAD ERROR:", err);
    showLoadedSummary("❌ Failed to load data");
  }
}

/* ============================================================
      HUB → SITE FILTER
============================================================ */
function populateHubFilter() {
  const hubs = [...new Set(assetData.map((a) => a["HUB"] || "Unknown"))].sort();
  document.getElementById("hubFilter").innerHTML =
    `<option value="ALL">All HUBs</option>` +
    hubs.map((h) => `<option value="${h}">${h}</option>`).join("");

  populateSiteFilter("ALL");
}

function populateSiteFilter(selectedHub) {
  let filtered = selectedHub === "ALL" ? assetData : assetData.filter((a) => a["HUB"] === selectedHub);

  const sites = [...new Set(filtered.map((a) => a["Alt Location"] || "Unknown"))].sort();

  document.getElementById("siteFilter").innerHTML =
    `<option value="ALL">All Sites</option>` +
    sites.map((s) => `<option value="${s}">${s}</option>`).join("");
}

document.getElementById("hubFilter").addEventListener("change", (e) => {
  populateSiteFilter(e.target.value);
});

/* Apply Filter */
document.getElementById("applyAssetFilter").addEventListener("click", () => {
  const hub = document.getElementById("hubFilter").value;
  const site = document.getElementById("siteFilter").value;

  let filtered = assetData;
  if (hub !== "ALL") filtered = filtered.filter((r) => r["HUB"] === hub);
  if (site !== "ALL") filtered = filtered.filter((r) => r["Alt Location"] === site);

  renderAssetCards(filtered);
  renderAssetChart(document.getElementById("chartSelector").value, filtered);
});

/* Reset Filter */
document.getElementById("resetAssetFilter").addEventListener("click", () => {
  document.getElementById("hubFilter").value = "ALL";
  populateSiteFilter("ALL");

  renderAssetCards(assetData);
  renderAssetChart(document.getElementById("chartSelector").value, assetData);
});

/* ============================================================
      RENDER LIST GROUP CARDS
============================================================ */
function getTK(row) {
  return row["TK No."] || row["TK No"] || row["TK"] || "";
}

function openDetailModal(title, tkList) {
  const modal = document.getElementById("detailModal");
  document.getElementById("modalTitle").innerText = title;

  document.getElementById("modalBody").innerHTML = tkList
    .map((t) => `<div class="modal-item">${t}</div>`)
    .join("");

  modal.classList.add("show");
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("detailModal").classList.remove("show");
});

function renderGroup(listId, totalId, key, labelTitle, dataset) {
  const groupMap = {};

  dataset.forEach((r) => {
    const k = r[key] || "Unknown";
    if (!groupMap[k]) groupMap[k] = { count: 0, tk: [] };
    groupMap[k].count++;
    groupMap[k].tk.push(getTK(r));
  });

  const sorted = Object.entries(groupMap).sort((a, b) => b[1].count - a[1].count);

  document.getElementById(totalId).innerText = formatNumber(dataset.length) + " Units";

  document.getElementById(listId).innerHTML = sorted
    .map(
      ([name, obj]) => `
      <div class="list-item clickable"
           onclick='openDetailModal("${labelTitle}: ${name}", ${JSON.stringify(obj.tk)})'>
          <span>${name}</span>
          <span class="item-badge">${formatNumber(obj.count)}</span>
      </div>`
    )
    .join("");
}

function renderAssetCards(dataset) {
  renderGroup("statusUnitList", "statusUnitTotal", "Status Unit 3", "Status Unit", dataset);
  renderGroup("customerList", "customerTotal", "Customer", "Customer", dataset);
  renderGroup("locationList", "locationTotal", "Alt Location", "Location", dataset);
  renderGroup("yearList", "yearTotal", "Year", "Year", dataset);
  renderGroup("vehicleList", "vehicleTotal", "Vehicle Type", "Vehicle Type", dataset);
}

/* ============================================================
      JOBSHEET SUMMARY
============================================================ */
function renderJobsheetSummary() {
  function countContains(col, str) {
    return jobsheetData.filter((x) => x[col]?.toLowerCase().includes(str)).length;
  }

  document.getElementById("p1CountJS").innerText = countContains("Category (P1,P2,P3/Ready Stock)", "p1");
  document.getElementById("p2CountJS").innerText = countContains("Category (P1,P2,P3/Ready Stock)", "p2");
  document.getElementById("cashCountJS").innerText = countContains("Memo", "cash");
  document.getElementById("repairCountJS").innerText = countContains("VCR", "repair");

  const totalCost = jobsheetData.reduce(
    (sum, x) => sum + (Number(String(x["Cost Estimation"]).replace(/[^\d]/g, "")) || 0),
    0
  );

  document.getElementById("totalCostJS").innerText = "Rp " + formatNumber(totalCost);
}

/* ============================================================
      BEAUTIFUL CARD-STYLE BAR CHART (VERSION B)
============================================================ */
document.getElementById("chartSelector").addEventListener("change", (e) => {
  renderAssetChart(e.target.value, assetData);
});

function renderAssetChart(type = "year", dataset = assetData) {
  const keys = {
    year: "Year",
    status: "Status Unit 3",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type"
  };

  const key = keys[type];

  /* Grouping */
  const map = {};
  dataset.forEach((r) => {
    const v = r[key] || "Unknown";
    if (v === "Unknown") return; // ⛔ Remove "Unknown"
    map[v] = (map[v] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);
  const total = values.reduce((a, b) => a + b, 0);

  /* Render HTML Card Chart (NO Chart.js) */
  const container = document.getElementById("assetChartCard");
  container.innerHTML = "";

  labels.forEach((label, i) => {
    const count = values[i];
    const pct = ((count / total) * 100).toFixed(1);

    container.innerHTML += `
      <div class="chart-box">
          <div class="chart-title-top">${label}</div>
          <div class="chart-bar">
              <div class="chart-value">${formatNumber(count)}</div>
              <div class="chart-percent">${pct}%</div>
          </div>
      </div>
    `;
  });
}
