/* ----------------------------------------------------------
   GOOGLE APPS SCRIPT ENDPOINT
---------------------------------------------------------- */
const API_BASE = "https://script.google.com/macros/s/AKfycbzW_QKhsFWAEZS0AP8P-HnU0ZOz9_p--h9Y2w_lt0PeWg1i4yGQTlE6svCypSgZ8QgY/exec";

/* ----------------------------------------------------------
   GLOBAL VARIABLES
---------------------------------------------------------- */
let assetData = [];
let jobsheetData = [];
let p2Data = [];
let p3Data = [];

let p3Chart = null;

/* ----------------------------------------------------------
   SHOW / HIDE STATUS BADGES
---------------------------------------------------------- */
function showConnecting() {
    document.getElementById("connectionStatus").classList.remove("hidden");
}

function hideConnecting() {
    document.getElementById("connectionStatus").classList.add("hidden");
}

function showLoaded(msg = "Data Loaded") {
    const el = document.getElementById("loadedSummary");
    document.getElementById("loadedMessage").innerText = msg;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 2000);
}

/* ----------------------------------------------------------
   INITIAL DATA LOAD
---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
    showConnecting();
    await loadAllData();
    hideConnecting();
    showLoaded("Dashboard Updated");
});

/* ----------------------------------------------------------
   LOAD ALL DATA
---------------------------------------------------------- */
async function loadAllData() {
    try {
        await Promise.all([
            loadAssetData(),
            loadJobsheetData(),
            loadP2(),
            loadP3()
        ]);

        buildAssetFilters();
        renderAssetOverview();
        renderAssetChart("year");

        renderJobsheetSummary(jobsheetData);
        renderP3PieChart(p3Data);

    } catch (err) {
        console.error("LOAD ERROR:", err);
    }
}

/* ----------------------------------------------------------
   FETCH HELPERS
---------------------------------------------------------- */
async function fetchJSON(url) {
    const res = await fetch(url);
    return res.json();
}

/* ----------------------------------------------------------
   LOAD ASSET DATA
---------------------------------------------------------- */
async function loadAssetData() {
    const j = await fetchJSON(API_BASE + "?action=asset");
    assetData = j.data || [];
}

/* ----------------------------------------------------------
   LOAD JOBSHEET DATA
---------------------------------------------------------- */
async function loadJobsheetData() {
    const j = await fetchJSON(API_BASE + "?action=jobsheet");
    jobsheetData = j.data || [];
}

/* ----------------------------------------------------------
   LOAD P2
---------------------------------------------------------- */
async function loadP2() {
    const j = await fetchJSON(API_BASE + "?action=p2");
    p2Data = j.data || [];
}

/* ----------------------------------------------------------
   LOAD P3 (custom sheet)
---------------------------------------------------------- */
async function loadP3() {
    const j = await fetchJSON(API_BASE + "?action=p3");
    p3Data = j.data || [];
}

/* ----------------------------------------------------------
   ASSET FILTER SETUP
---------------------------------------------------------- */
function buildAssetFilters() {
    const hubs = [...new Set(assetData.map(a => a.HUB || ""))].sort();
    const sites = [...new Set(assetData.map(a => a.SITE || ""))].sort();

    fillSelect("hubFilter", hubs);
    fillSelect("siteFilter", sites);
}

function fillSelect(id, arr) {
    const el = document.getElementById(id);
    el.innerHTML = `<option value="">All</option>`;
    arr.forEach(v => el.innerHTML += `<option value="${v}">${v}</option>`);
}

/* ----------------------------------------------------------
   ASSET FILTER EVENT
---------------------------------------------------------- */
document.getElementById("applyAssetFilter").addEventListener("click", () => {
    renderAssetOverview();
    renderAssetChart(document.getElementById("assetChartSelector").value);
});

document.getElementById("resetAssetFilter").addEventListener("click", () => {
    document.getElementById("hubFilter").value = "";
    document.getElementById("siteFilter").value = "";
    renderAssetOverview();
    renderAssetChart("year");
});

/* ----------------------------------------------------------
   ASSET OVERVIEW
---------------------------------------------------------- */
function getFilteredAssets() {
    let hub = document.getElementById("hubFilter").value;
    let site = document.getElementById("siteFilter").value;

    return assetData.filter(a =>
        (hub === "" || a.HUB === hub) &&
        (site === "" || a.SITE === site)
    );
}

function renderAssetOverview() {
    let d = getFilteredAssets();

    countList("statusUnitList", "statusUnitTotal", d, "STATUS");
    countList("customerList", "customerTotal", d, "CUSTOMER");
    countList("locationList", "locationTotal", d, "SITE");
    countList("yearList", "yearTotal", d, "YEAR");
    countList("vehicleList", "vehicleTotal", d, "VEHICLE TYPE");
}

function countList(listId, totalId, data, key) {
    const map = {};
    data.forEach(a => {
        const v = a[key] || "Unknown";
        map[v] = (map[v] || 0) + 1;
    });

    document.getElementById(totalId).innerText = `${data.length} Units`;

    const box = document.getElementById(listId);
    box.innerHTML = "";

    Object.entries(map).sort().forEach(([k, v]) => {
        box.innerHTML += `
            <div class="scroll-item">
                <span>${k}</span>
                <span class="unit-badge">${v}</span>
            </div>
        `;
    });
}

/* ----------------------------------------------------------
   ASSET CHART LARGE
---------------------------------------------------------- */
document.getElementById("assetChartSelector").addEventListener("change", e => {
    renderAssetChart(e.target.value);
});

function renderAssetChart(mode) {
    const ctx = document.getElementById("assetChartLarge").getContext("2d");

    let data = getFilteredAssets();
    let field = "";

    if (mode === "year") field = "YEAR";
    if (mode === "status") field = "STATUS";
    if (mode === "customer") field = "CUSTOMER";
    if (mode === "location") field = "SITE";
    if (mode === "vehicle") field = "VEHICLE TYPE";

    const map = {};
    data.forEach(a => {
        const v = a[field] || "Unknown";
        map[v] = (map[v] || 0) + 1;
    });

    const labels = Object.keys(map);
    const values = Object.values(map);

    if (window.assetChart) window.assetChart.destroy();

    window.assetChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Total",
                data: values,
                backgroundColor: "#A60000"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* ----------------------------------------------------------
   JOBSHEET DATE FILTER
---------------------------------------------------------- */
document.getElementById("applyJSFilter").addEventListener("click", () => {
    const start = document.getElementById("jsStart").value;
    const end = document.getElementById("jsEnd").value;

    let filtered = jobsheetData.filter(j => {
        if (!j["Received"]) return false;
        if (start && j["Received"] < start) return false;
        if (end && j["Received"] > end) return false;
        return true;
    });

    renderJobsheetSummary(filtered);
    renderP3PieChart(p3Data); // P3 tidak ikut filter
});

document.getElementById("resetJSFilter").addEventListener("click", () => {
    document.getElementById("jsStart").value = "";
    document.getElementById("jsEnd").value = "";
    renderJobsheetSummary(jobsheetData);
    renderP3PieChart(p3Data);
});

/* ----------------------------------------------------------
   JOBSHEET SUMMARY CARDS
---------------------------------------------------------- */
function renderJobsheetSummary(list) {
    const p1 = list.filter(j => j["Category (P1,P2,P3/Ready Stock)"].includes("P1"));
    const p2 = p2Data; // Full sheet, not from jobsheet
    const p3 = p3Data; // Full P3 sheet
    const cash = list.filter(j => (j.Memo || "").toLowerCase().includes("cash"));
    const repair = list.filter(j => (j.VCR || "").toLowerCase().includes("repair"));

    document.getElementById("p1Count").innerText = p1.length;
    document.getElementById("p2Count").innerText = p2.length;
    document.getElementById("p3Count").innerText = p3.length;
    document.getElementById("cashCount").innerText = cash.length;
    document.getElementById("repairCount").innerText = repair.length;
}

/* ----------------------------------------------------------
   P3 PIE CHART (BY SITE)
---------------------------------------------------------- */
function renderP3PieChart(data) {
    const ctx = document.getElementById("p3PieChart");

    const map = {};
    data.forEach(r => {
        const site = r["Site"] || "Unknown";
        map[site] = (map[site] || 0) + 1;
    });

    if (p3Chart) p3Chart.destroy();

    p3Chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(map),
            datasets: [{
                data: Object.values(map),
                backgroundColor: ["#A60000", "#C10000", "#8A0000", "#660000", "#FF6666"]
            }]
        }
    });
}

/* ----------------------------------------------------------
   CARD CLICK EVENTS → OPEN MODAL
---------------------------------------------------------- */
document.getElementById("cardP1").addEventListener("click", () => openModalP1());
document.getElementById("cardP2").addEventListener("click", () => openModalP2());
document.getElementById("cardP3").addEventListener("click", () => openModalP3());

document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("detailModal").classList.remove("active");
});

/* ----------------------------------------------------------
   MODAL BUILDERS
---------------------------------------------------------- */
function openModalP1() {
    let data = jobsheetData.filter(j => j["Category (P1,P2,P3/Ready Stock)"].includes("P1"));
    let html = "";

    data.forEach(j => {
        html += `
        <div class="modal-job">
            <div class="modal-job-title">Job No. ${j["Job No."]}</div>
            <div class="modal-label">HUB</div>
            <div class="modal-value">${j["HUB"]}</div>

            <div class="modal-label">WORK TO BE PERFORMED</div>
            <div class="modal-value">${j["Work To Be Performed"]}</div>

            <div class="modal-label">CATEGORY JOB</div>
            <div class="modal-value">${j["Category (P1,P2,P3/Ready Stock)"]}</div>

            <div class="modal-label">COST ESTIMATION</div>
            <div class="modal-value">Rp ${j["Cost Estimation"] || 0}</div>
        </div>`;
    });

    document.getElementById("modalTitle").innerText = `P1 Priority – Details (${data.length})`;
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("detailModal").classList.add("active");
}

function openModalP2() {
    let html = "";

    p2Data.forEach(r => {
        html += `
        <div class="modal-job">
            <div class="modal-job-title">${r["TK NO"] || ""}</div>

            <div class="modal-label">LOKASI</div>
            <div class="modal-value">${r["LOKASI"] || ""}</div>

            <div class="modal-label">TYPE UNIT</div>
            <div class="modal-value">${r["TYPE UNIT"] || ""}</div>

            <div class="modal-label">DATE RECEIVED P2</div>
            <div class="modal-value">${r["Date Recived P2"] || ""}</div>

            <div class="modal-label">NO. REGISTER</div>
            <div class="modal-value">${r["NO. Register"] || ""}</div>

            <div class="modal-label">PART NUMBER</div>
            <div class="modal-value">${r["PART NUMBER"] || ""}</div>

            <div class="modal-label">PART NAME</div>
            <div class="modal-value">${r["PART NAME"] || ""}</div>

            <div class="modal-label">QTY</div>
            <div class="modal-value">${r["QTY"] || ""}</div>

            <div class="modal-label">MR NO</div>
            <div class="modal-value">${r["No. MR (Material Request)"] || ""}</div>

            <div class="modal-label">SEND TO WHS</div>
            <div class="modal-value">${r["Date Send to WHS"] || ""}</div>
        </div>`;
    });

    document.getElementById("modalTitle").innerText = `P2 Priority – Details (${p2Data.length})`;
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("detailModal").classList.add("active");
}

function openModalP3() {
    let html = "";

    p3Data.forEach(r => {
        html += `
        <div class="modal-job">
            <div class="modal-job-title">MR No. ${r["MR No."]}</div>

            <div class="modal-label">RECEIVED</div>
            <div class="modal-value">${r["Tgl Received"] || ""}</div>

            <div class="modal-label">REGISTER</div>
            <div class="modal-value">${r["Tgl Register"] || ""}</div>

            <div class="modal-label">SITE</div>
            <div class="modal-value">${r["Site"] || ""}</div>

            <div class="modal-label">SEND TO WHS</div>
            <div class="modal-value">${r["Send to Warehouse"] || ""}</div>
        </div>`;
    });

    document.getElementById("modalTitle").innerText = `P3 – Details (${p3Data.length})`;
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("detailModal").classList.add("active");
}
