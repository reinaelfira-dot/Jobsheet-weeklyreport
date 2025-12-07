/* -----------------------------------------------------------
      API URL
------------------------------------------------------------*/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];

let assetChart = null;        // Chart A (small)
let assetChartLarge = null;   // Chart B (large)

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
  setTimeout(() => box.classList.add("hidden"), 4000);
}

function showCardLoading() {
  const sections = [
    "statusUnitList",
    "customerList",
    "locationList",
    "yearList",
    "vehicleList"
  ];

  sections.forEach(id => {
    document.getElementById(id).innerHTML = `
      <div class="card-loading">
        <div class="loader"></div>
        <p>Loading data...</p>
      </div>
    `;
  });
}

/* -----------------------------------------------------------
      LOAD DATA
------------------------------------------------------------*/
document.addEventListener("DOMContentLoaded", loadData);

async function loadData() {
  showConnection("connecting");
  showCardLoading();

  try {
    // LOAD ASSET
    const reqA = await fetch(API_URL + "?action=asset");
    const jsonA = await reqA.json();
    assetData = cleanData(jsonA.data || []);

    // LOAD JOBSHEET
    const reqJS = await fetch(API_URL + "?action=jobsheet");
    const jsonJS = await reqJS.json();
    jobsheetData = jsonJS.data || [];

    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    populateHubFilter();
    renderAssetCards(assetData);
    renderJobsheetSummary();

    renderAssetChart("status", assetData);    // Chart A
    renderLargeAssetChart("year", assetData); // Chart B

    showConnection("hide");
    showLoadedSummary(`Loaded: ${assetData.length} assets, ${jobsheetData.length} jobsheets`);

  } catch (err) {
    console.error("LOAD ERROR:", err);
    showLoadedSummary("❌ Failed to load data");
  }
}

/* -----------------------------------------------------------
      CLEAN DATA (REMOVE UNKNOWN / EMPTY)
------------------------------------------------------------*/
function cleanData(data) {
  return data.filter(r => {
    const year = r["Year"];
    const hub = r["HUB"];
    return (
      year &&
      year !== "Unknown" &&
      year !== "" &&
      hub &&
      hub !== "" &&
      hub !== "Unknown" &&
      hub !== "#N/A"
    );
  });
}

/* -----------------------------------------------------------
      HUB → SITE FILTER
------------------------------------------------------------*/
function populateHubFilter() {
  const hubs = [...new Set(assetData.map(a => a["HUB"]))].sort();

  document.getElementById("hubFilter").innerHTML =
    `<option value="ALL">All HUBs</option>` +
    hubs.map(h => `<option value="${h}">${h}</option>`).join("");

  populateSiteFilter("ALL");
}

function populateSiteFilter(selectedHub) {
  let filtered = selectedHub === "ALL"
    ? assetData
    : assetData.filter(r => r["HUB"] === selectedHub);

  const sites = [...new Set(filtered.map(a => a["Alt Location"]))].sort();

  document.getElementById("siteFilter").innerHTML =
    `<option value="ALL">All Sites</option>` +
    sites.map(s => `<option value="${s}">${s}</option>`).join("");
}

document.getElementById("hubFilter").addEventListener("change", e => {
  populateSiteFilter(e.target.value);
});

/* -----------------------------------------------------------
      APPLY FILTER
------------------------------------------------------------*/
document.getElementById("applyAssetFilter").addEventListener("click", () => {
  const hub = document.getElementById("hubFilter").value;
  const site = document.getElementById("siteFilter").value;

  let filtered = assetData;

  if (hub !== "ALL") filtered = filtered.filter(r => r["HUB"] === hub);
  if (site !== "ALL") filtered = filtered.filter(r => r["Alt Location"] === site);

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
      CARD LISTS + MODAL
------------------------------------------------------------*/
function getTK(r) {
  return r["TK No."] || r["TK No"] || r["TK"] || "-";
}

function openDetailModal(title, tkList) {
  document.getElementById("modalTitle").innerText = title;

  document.getElementById("modalBody").innerHTML =
    tkList.map(t => `<div class="modal-item">${t}</div>`).join("");

  document.getElementById("detailModal").classList.add("show");
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("detailModal").classList.remove("show");
});

function renderGroup(listId, totalId, key, labelName, dataset) {
  const group = {};

  dataset.forEach(r => {
    const v = r[key] || "Other";
    if (!group[v]) group[v] = { count: 0, tk: [] };
    group[v].count++;
    group[v].tk.push(getTK(r));
  });

  const sorted = Object.entries(group).sort((a, b) => b[1].count - a[1].count);

  document.getElementById(totalId).innerText = formatNumber(dataset.length) + " Units";

  document.getElementById(listId).innerHTML = sorted
    .map(([name, obj]) => `
      <div class="list-item" onclick='openDetailModal("${labelName}: ${name}", ${JSON.stringify(obj.tk)})'>
        <span>${name}</span>
        <span class="item-badge">${formatNumber(obj.count)}</span>
      </div>
    `)
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
    return jobsheetData.filter(x => x[col]?.toLowerCase().includes(str)).length;
  }

  document.getElementById("p1CountJS").innerText =
    countContains("Category (P1,P2,P3/Ready Stock)", "p1");

  document.getElementById("p2CountJS").innerText =
    countContains("Category (P1,P2,P3/Ready Stock)", "p2");

  document.getElementById("cashCountJS").innerText =
    countContains("Memo", "cash");

  document.getElementById("repairCountJS").innerText =
    countContains("VCR", "repair");

  const totalCost = jobsheetData.reduce((sum, x) =>
    sum + (Number(String(x["Cost Estimation"]).replace(/[^\d]/g, "")) || 0)
  , 0);

  document.getElementById("totalCostJS").innerText =
    "Rp " + formatNumber(totalCost);
}

/* -----------------------------------------------------------
      CHART A (SMALL)
------------------------------------------------------------*/
document.getElementById("chartSelector").addEventListener("change", e => {
  renderAssetChart(e.target.value, assetData);
});

function renderAssetChart(type, dataset) {
  const keyMap = {
    status: "Status Unit 3",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type",
    year: "Year"
  };

  const key = keyMap[type];
  const map = {};

  dataset.forEach(r => {
    const val = r[key];
    map[val] = (map[val] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);
  const total = values.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById("assetChart").getContext("2d");
  if (assetChart) assetChart.destroy();

  assetChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Units",
          data: values,
          backgroundColor: "#8b0000",
          borderRadius: 8,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw} units (${((ctx.raw / total) * 100).toFixed(1)}%)`
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    },
    plugins: [{
      id: "percentageLabels",
      afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        ctx.fillStyle = "#000";
        ctx.font = "12px Inter";

        data.datasets[0].data.forEach((val, i) => {
          const meta = chart.getDatasetMeta(0).data[i];
          const percent = ((val / total) * 100).toFixed(1) + "%";

          ctx.fillText(percent, meta.x - 10, meta.y - 10);
        });
      }
    }]
  });
}

/* -----------------------------------------------------------
      CHART B (LARGE)
------------------------------------------------------------*/
document.getElementById("assetChartSelector").addEventListener("change", e => {
  renderLargeAssetChart(e.target.value, assetData);
});

function renderLargeAssetChart(type = "year", dataset) {

  const keys = {
    year: "Year",
    status: "Status Unit 3",
    location: "Alt Location",
    customer: "Customer",
    vehicle: "Vehicle Type"
  };

  const map = {};
  const key = keys[type];

  dataset.forEach(r => {
    const val = r[key];
    map[val] = (map[val] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);
  const total = values.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById("assetChartLarge").getContext("2d");
  if (assetChartLarge) assetChartLarge.destroy();

  assetChartLarge = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Units",
        data: values,
        backgroundColor: "#a60000",
        borderRadius: 10
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw} units (${((ctx.raw / total) * 100).toFixed(1)}%)`
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    },
    plugins: [{
      id: "labelTop",
      afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        ctx.font = "13px Inter";
        ctx.fillStyle = "#000";

        data.datasets[0].data.forEach((val, i) => {
          const bar = chart.getDatasetMeta(0).data[i];
          ctx.fillText(
            ((val / total) * 100).toFixed(1) + "%",
            bar.x - 12,
            bar.y - 10
          );
        });
      }
    }]
  });

  document.getElementById("chartTitle").innerText =
    `${type.charAt(0).toUpperCase() + type.slice(1)} Distribution`;
}
