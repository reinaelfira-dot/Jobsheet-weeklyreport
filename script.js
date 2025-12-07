/* -----------------------------------------------------------
      API URL
------------------------------------------------------------*/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];
let assetChart = null;
let assetChartLarge = null;

/* -----------------------------------------------------------
      FORMATTER
------------------------------------------------------------*/
function formatNumber(num) {
  return Number(num || 0).toLocaleString("id-ID");
}

function nowLabel() {
  return new Date().toLocaleString("id-ID");
}

/* -----------------------------------------------------------
      LOADER UI
------------------------------------------------------------*/
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
  setTimeout(() => box.classList.add("hidden"), 5000);
}

function showCardLoading() {
  const ids = [
    "statusUnitList",
    "customerList",
    "locationList",
    "yearList",
    "vehicleList"
  ];

  ids.forEach((id) => {
    document.getElementById(id).innerHTML = `
      <div class="card-loading">
          <div class="loader"></div>
          <p>Loading data...</p>
      </div>`;
  });
}

/* -----------------------------------------------------------
      LOAD DATA ON START
------------------------------------------------------------*/
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
    renderAssetChart("status", assetData);
    renderLargeAssetChart("year", assetData);

    showConnection("hide");
    showLoadedSummary(
      `Data loaded: ${assetData.length} assets, ${jobsheetData.length} jobsheets`
    );
  } catch (err) {
    console.error("LOAD ERROR:", err);
    showLoadedSummary("❌ Failed to load data");
  }
}

/* -----------------------------------------------------------
      HUB → SITE FILTER
------------------------------------------------------------*/
function populateHubFilter() {
  const hubs = [...new Set(assetData.map((a) => a["HUB"] || "Unknown"))].sort();

  document.getElementById("hubFilter").innerHTML =
    `<option value="ALL">All HUBs</option>` +
    hubs.map((h) => `<option value="${h}">${h}</option>`).join("");

  populateSiteFilter("ALL");
}

function populateSiteFilter(selectedHub) {
  let filtered =
    selectedHub === "ALL"
      ? assetData
      : assetData.filter((a) => a["HUB"] === selectedHub);

  const sites = [...new Set(filtered.map((a) => a["Alt Location"] || "Unknown"))].sort();

  document.getElementById("siteFilter").innerHTML =
    `<option value="ALL">All Sites</option>` +
    sites.map((s) => `<option value="${s}">${s}</option>`).join("");
}

document.getElementById("hubFilter").addEventListener("change", (e) => {
  populateSiteFilter(e.target.value);
});

/* -----------------------------------------------------------
      FILTER BUTTONS
------------------------------------------------------------*/
document.getElementById("applyAssetFilter").addEventListener("click", () => {
  const hub = document.getElementById("hubFilter").value;
  const site = document.getElementById("siteFilter").value;

  let filtered = assetData;

  if (hub !== "ALL") filtered = filtered.filter((r) => r["HUB"] === hub);
  if (site !== "ALL")
    filtered = filtered.filter((r) => r["Alt Location"] === site);

  renderAssetCards(filtered);
  renderAssetChart("status", filtered);
  renderLargeAssetChart("year", filtered);
});

document.getElementById("resetAssetFilter").addEventListener("click", () => {
  document.getElementById("hubFilter").value = "ALL";
  populateSiteFilter("ALL");

  renderAssetCards(assetData);
  renderAssetChart("status", assetData);
  renderLargeAssetChart("year", assetData);
});

/* -----------------------------------------------------------
      TK MODAL
------------------------------------------------------------*/
function getTK(row) {
  return row["TK No."] || row["TK No"] || row["TK"] || "";
}

function openDetailModal(title, tkList) {
  const modal = document.getElementById("detailModal");
  document.getElementById("modalTitle").innerText = title;

  const body = document.getElementById("modalBody");
  body.innerHTML = tkList
    .map((t) => `<div class="modal-item">${t}</div>`)
    .join("");

  modal.classList.add("show");
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("detailModal").classList.remove("show");
});

/* -----------------------------------------------------------
      RENDER GROUP LIST CARDS
------------------------------------------------------------*/
function renderGroup(listId, totalId, key, labelTitle, dataset) {
  const groupMap = {};

  dataset.forEach((r) => {
    const k = r[key] || "Unknown";
    if (!groupMap[k]) groupMap[k] = { count: 0, tk: [] };
    groupMap[k].count++;
    groupMap[k].tk.push(getTK(r));
  });

  const sorted = Object.entries(groupMap).sort((a, b) => b[1].count - a[1].count);

  document.getElementById(totalId).innerText =
    formatNumber(dataset.length) + " Units";

  document.getElementById(listId).innerHTML = sorted
    .map(
      ([name, obj]) => `
      <div class="list-item" onclick='openDetailModal("${labelTitle}: ${name}", ${JSON.stringify(
        obj.tk
      )})'>
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

/* -----------------------------------------------------------
      JOBSHEET SUMMARY
------------------------------------------------------------*/
function renderJobsheetSummary() {
  function countContains(col, str) {
    return jobsheetData.filter((x) => x[col]?.toLowerCase().includes(str)).length;
  }

  document.getElementById("p1CountJS").innerText =
    countContains("Category (P1,P2,P3/Ready Stock)", "p1");

  document.getElementById("p2CountJS").innerText =
    countContains("Category (P1,P2,P3/Ready Stock)", "p2");

  document.getElementById("cashCountJS").innerText =
    countContains("Memo", "cash");

  document.getElementById("repairCountJS").innerText =
    countContains("VCR", "repair");

  const totalCost = jobsheetData.reduce(
    (sum, x) =>
      sum + (Number(String(x["Cost Estimation"]).replace(/[^\d]/g, "")) || 0),
    0
  );

  document.getElementById("totalCostJS").innerText =
    "Rp " + formatNumber(totalCost);
}

/* -----------------------------------------------------------
      SMALL CHART – WITH PERCENTAGE LABELS
------------------------------------------------------------*/
function renderAssetChart(type, dataset = assetData) {
  const keyMap = {
    status: "Status Unit 3",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type",
    year: "Year",
  };

  const key = keyMap[type];

  const map = {};
  dataset.forEach((r) => {
    const v = r[key] || "Unknown";
    map[v] = (map[v] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);
  const total = values.reduce((x, y) => x + y, 0);

  const ctx = document.getElementById("assetChart").getContext("2d");
  if (assetChart) assetChart.destroy();

  assetChart = new Chart(ctx, {
    type: "bar",
    plugins: [ChartDataLabels],
    data: {
      labels,
      datasets: [
        {
          label: "Units",
          data: values,
          backgroundColor: "#A60000",
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#000",
          anchor: "end",
          align: "top",
          formatter: (val) => ((val / total) * 100).toFixed(1) + "%",
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

document.getElementById("chartSelector").addEventListener("change", (e) => {
  renderAssetChart(e.target.value, assetData);
});

/* -----------------------------------------------------------
      LARGE CHART – WITH PERCENTAGE LABELS
------------------------------------------------------------*/
document.getElementById("assetChartSelector").addEventListener("change", (e) => {
  renderLargeAssetChart(e.target.value, assetData);
});

function renderLargeAssetChart(type = "year", dataset = assetData) {
  const keyMap = {
    year: "Year",
    status: "Status Unit 3",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type",
  };

  const key = keyMap[type];

  const map = {};
  dataset.forEach((r) => {
    const v = r[key] || "Unknown";
    map[v] = (map[v] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);
  const total = values.reduce((x, y) => x + y, 0);

  const ctx = document.getElementById("assetChartLarge").getContext("2d");
  if (assetChartLarge) assetChartLarge.destroy();

  assetChartLarge = new Chart(ctx, {
    type: "bar",
    plugins: [ChartDataLabels],
    data: {
      labels,
      datasets: [
        {
          label: "Units",
          data: values,
          backgroundColor: "#b30000",
          borderRadius: 12,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#000",
          anchor: "end",
          align: "top",
          formatter: (val) => ((val / total) * 100).toFixed(1) + "%",
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  document.getElementById("chartTitle").innerText =
    type.charAt(0).toUpperCase() + type.slice(1) + " Distribution";
}
