/*************************************************
 * CONFIG
 *************************************************/
const API = {
    asset: "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec?action=asset",
    jobsheet: "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec?action=jobsheet",
    p2: "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec?action=p2",
    p3: "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec?action=p3"
};

let assetData = [];
let jobsheetData = [];
let p2Data = [];
let p3Data = [];

let assetChart = null;
let p3PieChart = null;

/*************************************************
 * LOAD DATA
 *************************************************/
document.addEventListener("DOMContentLoaded", async () => {
    showConnection("connecting");
    showCardLoading();

    try {
        const assetRes = await fetch(API.asset);
        const jsRes = await fetch(API.jobsheet);
        const p2Res = await fetch(API.p2);
        const p3Res = await fetch(API.p3);

        assetData = (await assetRes.json()).data || [];
        jobsheetData = (await jsRes.json()).data || [];
        p2Data = (await p2Res.json()).data || [];
        p3Data = (await p3Res.json()).data || [];

        document.getElementById("lastAssetUpdate").innerText = nowLabel();

        initAssetOverview();
        initJobsheetOverview();

        showConnection("hide");
        showLoadedSummary("Data Loaded Successfully");
    } catch (err) {
        console.error(err);
        showLoadedSummary("❌ Failed to load data");
    }
});

/*************************************************
 * FORMATTER
 *************************************************/
function nowLabel() {
    return new Date().toLocaleString("id-ID");
}

function formatNumber(n) {
    return Number(n || 0).toLocaleString("id-ID");
}

/*************************************************
 * LOADING UI
 *************************************************/
function showConnection(status) {
    const el = document.getElementById("connectionStatus");
    if (status === "connecting") el.classList.remove("hidden");
    else el.classList.add("hidden");
}

function showLoadedSummary(msg) {
    const el = document.getElementById("loadedSummary");
    document.getElementById("loadedMessage").innerText = msg;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 4000);
}

function showCardLoading() {
    ["statusUnitList", "customerList", "locationList", "yearList", "vehicleList"].forEach(id => {
        document.getElementById(id).innerHTML =
            `<div class="card-loading">
                <div class="loader"></div>
                <p>Loading...</p>
            </div>`;
    });
}

/*************************************************
 * ASSET OVERVIEW
 *************************************************/
function initAssetOverview() {
    populateHubFilter();
    renderAssetCards(assetData);
    renderAssetChart("status");
}

function populateHubFilter() {
    const hubs = [...new Set(assetData.map(r => r["HUB"]).filter(Boolean))].sort();
    const html = `<option value="ALL">All HUB</option>` +
                 hubs.map(h => `<option value="${h}">${h}</option>`).join("");

    document.getElementById("hubFilter").innerHTML = html;
    populateSiteFilter("ALL");
}

function populateSiteFilter(hub) {
    const list = hub === "ALL" ? assetData : assetData.filter(r => r["HUB"] === hub);

    const sites = [...new Set(list.map(r => r["Alt Location"]).filter(Boolean))].sort();

    document.getElementById("siteFilter").innerHTML =
        `<option value="ALL">All Site</option>` +
        sites.map(s => `<option>${s}</option>`).join("");
}

document.getElementById("hubFilter").addEventListener("change", e => {
    populateSiteFilter(e.target.value);
});

document.getElementById("applyAssetFilter").addEventListener("click", () => {
    const hub = document.getElementById("hubFilter").value;
    const site = document.getElementById("siteFilter").value;

    let filtered = assetData;
    if (hub !== "ALL") filtered = filtered.filter(r => r["HUB"] === hub);
    if (site !== "ALL") filtered = filtered.filter(r => r["Alt Location"] === site);

    renderAssetCards(filtered);
    renderAssetChart("status", filtered);
});

document.getElementById("resetAssetFilter").addEventListener("click", () => {
    document.getElementById("hubFilter").value = "ALL";
    populateSiteFilter("ALL");
    renderAssetCards(assetData);
    renderAssetChart("status", assetData);
});

/*************************************************
 * RENDER ASSET CARDS
 *************************************************/
function getTK(row) {
    return row["TK No."] || "";
}

function renderGroup(listId, totalId, key, title, dataset) {
    const map = {};

    dataset.forEach(r => {
        const v = r[key];
        if (!v) return; // REMOVE UNKNOWN
        if (!map[v]) map[v] = { count: 0, tk: [] };
        map[v].count++;
        map[v].tk.push(getTK(r));
    });

    const sorted = Object.entries(map).sort((a,b)=>b[1].count - a[1].count);

    document.getElementById(totalId).innerText = formatNumber(dataset.length) + " Units";

    document.getElementById(listId).innerHTML = sorted.map(([name,obj]) => `
        <div class="list-item" onclick='openDetail("${title}: ${name}", ${JSON.stringify(obj.tk)})'>
            <span>${name}</span>
            <span class="item-badge">${obj.count}</span>
        </div>
    `).join("");
}

function renderAssetCards(ds) {
    renderGroup("statusUnitList", "statusUnitTotal", "Status Unit 3", "Status Unit", ds);
    renderGroup("customerList", "customerTotal", "Customer", "Customer", ds);
    renderGroup("locationList", "locationTotal", "Alt Location", "Location", ds);
    renderGroup("yearList", "yearTotal", "Year", "Year", ds);
    renderGroup("vehicleList", "vehicleTotal", "Vehicle Type", "Vehicle", ds);
}

function openDetail(title, dataList) {
    const modal = document.getElementById("detailModal");
    document.getElementById("modalTitle").innerText = title;

    document.getElementById("modalBody").innerHTML =
        dataList.map(d => `<div class="modal-item">${d}</div>`).join("");

    modal.classList.add("show");
}

document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("detailModal").classList.remove("show");
});

/*************************************************
 * ASSET CHART (Bentuk Chart A)
 *************************************************/
function renderAssetChart(type, dataset = assetData) {
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
        const v = r[key];
        if (!v) return;
        map[v] = (map[v] || 0) + 1;
    });

    const labels = Object.keys(map);
    const values = Object.values(map);
    const total = values.reduce((a,b)=>a+b,0);

    const ctx = document.getElementById("assetChart").getContext("2d");

    if (assetChart) assetChart.destroy();

    assetChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Units",
                data: values,
                backgroundColor: "#A60000",
                borderRadius: 10
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const v = ctx.raw;
                            const pct = (v / total * 100).toFixed(1);
                            return `${v} units (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/*************************************************
 * JOBSHEET OVERVIEW WITH DATE FILTER
 *************************************************/
function initJobsheetOverview() {
    document.getElementById("applyDateFilter").addEventListener("click", applyDateFilter);

    applyDateFilter(); // initial
}

function applyDateFilter() {
    const start = document.getElementById("dateStart").value;
    const end = document.getElementById("dateEnd").value;

    let filtered = jobsheetData;

    if (start) filtered = filtered.filter(r => r["Received"] >= start);
    if (end) filtered = filtered.filter(r => r["Received"] <= end);

    renderJobsheetCards(filtered);
    renderRepairDetails(filtered);
    renderCashDetails(filtered);
    renderP2Data();
    renderP3Data();
    renderP3PieChart();
}

/*************************************************
 * JOBSHEET CARDS (P1–P2–P3–Cash–Repair)
 *************************************************/
function renderJobsheetCards(list) {
    const countP1 = list.filter(r => r["Category (P1,P2,P3/Ready Stock)"].includes("P1")).length;
    const countP2 = list.filter(r => r["Category (P1,P2,P3/Ready Stock)"].includes("P2")).length;
    const countCash = list.filter(r => r["Memo"].toLowerCase().includes("cash")).length;
    const countRepair = list.filter(r => r["VCR"].toLowerCase().includes("repair")).length;

    document.getElementById("p1Count").innerText = countP1;
    document.getElementById("p2Count").innerText = p2Data.length;
    document.getElementById("p3Count").innerText = p3Data.length;
    document.getElementById("cashCount").innerText = countCash;
    document.getElementById("repairCount").innerText = countRepair;

    document.getElementById("cardP1").onclick = () => openJobsheetModal("P1 Jobsheet", list.filter(r=>r["Category (P1,P2,P3/Ready Stock)"].includes("P1")));
    document.getElementById("cardP2").onclick = () => openJobsheetModal("P2 Jobsheet", p2Data);
    document.getElementById("cardP3").onclick = () => openP3Modal();
    document.getElementById("cardCash").onclick = () => openCashModal(list);
    document.getElementById("cardRepair").onclick = () => openRepairModal(list);
}

/*************************************************
 * MODAL RENDERING
 *************************************************/
function openJobsheetModal(title, rows) {
    const modal = document.getElementById("detailModal");
    document.getElementById("modalTitle").innerText = title;

    document.getElementById("modalBody").innerHTML =
        rows.map(r => `
            <div class="modal-item">
                <strong>MR:</strong> ${r["MR No."]}<br>
                <strong>Received:</strong> ${r["Received"]}<br>
                <strong>Site:</strong> ${r["Site"]}
            </div>
        `).join("");

    modal.classList.add("show");
}

function openP3Modal() {
    const modal = document.getElementById("detailModal");
    document.getElementById("modalTitle").innerText = "P3 Case – Detail";

    document.getElementById("modalBody").innerHTML =
        p3Data.map(r => `
            <div class="modal-item">
                📅 Received: ${r["Tgl Received"]}<br>
                📍 Site: ${r["Site"]}<br>
                #️⃣ MR No.: ${r["MR No."]}<br>
                📦 Sent to WHS: ${r["Send to Warehouse"]}
            </div>
        `).join("");

    modal.classList.add("show");
}

function openCashModal(list) {
    const data = list.filter(r => r["Memo"].toLowerCase().includes("cash"));

    openJobsheetModal("Cash On Site", data);
}

function openRepairModal(list) {
    const data = list.filter(r => r["VCR"].toLowerCase().includes("repair"));

    const petty = data.filter(r => r["Memo"].toLowerCase().includes("petty")).length;
    const ho = data.filter(r => r["Memo"].toLowerCase().includes("dana ho")).length;

    const modal = document.getElementById("detailModal");
    document.getElementById("modalTitle").innerText = "Repair Breakdown";

    document.getElementById("modalBody").innerHTML = `
        <div class="modal-item"><strong>DANA HO BPN:</strong> ${ho}</div>
        <div class="modal-item"><strong>PETTY CASH:</strong> ${petty}</div>
    `;

    modal.classList.add("show");
}

/*************************************************
 * P3 PIE CHART BY SITE
 *************************************************/
function renderP3PieChart() {
    const map = {};

    p3Data.forEach(r => {
        const site = r["Site"];
        if (!site) return;
        map[site] = (map[site] || 0) + 1;
    });

    const labels = Object.keys(map);
    const values = Object.values(map);

    const ctx = document.getElementById("p3PieChart").getContext("2d");
    if (p3PieChart) p3PieChart.destroy();

    p3PieChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: ["#b30000", "#ff5a5a", "#ff9999", "#660000"]
            }]
        },
        options: {
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}
