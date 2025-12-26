// Helpers
function formatNum(val, digits = 1) {
    if (isNaN(val)) return "--";
    if (Math.abs(val) >= 1000) return val.toFixed(0);
    return val.toFixed(digits);
}

// Tabs
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach((el) => {
        el.classList.remove("active");
    });
    document.getElementById("tab-" + tabId).classList.add("active");

    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.remove("active");
    });
    const active = document.getElementById("btn-" + tabId);
    if (active) active.classList.add("active");
}

// Demand & pipe sizing
const pipeTable = [
    { dn: "DN15", d: 13, flow: 13 },
    { dn: "DN20", d: 17, flow: 22 },
    { dn: "DN25", d: 21, flow: 35 },
    { dn: "DN32", d: 27, flow: 55 },
    { dn: "DN40", d: 32, flow: 80 },
    { dn: "DN50", d: 40, flow: 120 },
];

function pickPipe(flowLmin) {
    const found = pipeTable.find((p) => flowLmin <= p.flow);
    return found || pipeTable[pipeTable.length - 1];
}

function calcDemand() {
    const kitchen = parseFloat(document.getElementById("demand-kitchen").value);
    const basin = parseFloat(document.getElementById("demand-basin").value);
    const shower = parseFloat(document.getElementById("demand-shower").value);
    const wc = parseFloat(document.getElementById("demand-wc").value);

    const flows =
        kitchen * 8 + basin * 6 + shower * 9 + wc * 6; // л/хв без коеф.
    const diversity = 0.6 + 0.08 * Math.max(kitchen + basin + shower + wc, 1);
    const total = flows * Math.min(diversity, 1);
    const peak = total * 1.3;

    const pipe = pickPipe(peak);
    const area = (Math.PI * Math.pow(pipe.d / 1000, 2)) / 4;
    const velocity = (peak / 1000 / 60) / area; // м/с

    document.getElementById("demand-flow").innerText =
        formatNum(total, 1) + " л/хв";
    document.getElementById("demand-peak").innerText =
        formatNum(peak, 1) + " л/хв";
    document.getElementById("demand-pipe").innerText = pipe.dn;
    document.getElementById("demand-vel").innerText =
        formatNum(velocity, 2) + " м/с";
}

// Pump & headloss (Hazen-Williams approx, C=140)
function calcPump() {
    const flow = parseFloat(document.getElementById("pump-flow").value); // л/хв
    const length = parseFloat(document.getElementById("pump-length").value);
    const head = parseFloat(document.getElementById("pump-head").value);
    const dn = document.getElementById("pump-dn").value;
    const eqFactor = parseFloat(document.getElementById("pump-eq").value);
    if ([flow, length, head, eqFactor].some(isNaN)) return;

    const pipe = pipeTable.find((p) => p.dn === dn) || pipeTable[2];
    const q = (flow * 60) / 1000; // м3/год
    const L = length * eqFactor;
    const C = 140;
    const d = pipe.d / 1000; // м
    const hLoss =
        (10.67 * L * Math.pow(q, 1.852)) /
        (Math.pow(C, 1.852) * Math.pow(d, 4.87));
    const totalHead = head + hLoss * 1.1; // 10% запас

    document.getElementById("pump-loss").innerText =
        formatNum(hLoss, 2) + " м";
    document.getElementById("pump-total").innerText =
        formatNum(totalHead, 2) + " м";
    document.getElementById("pump-note").innerText =
        totalHead < 15
            ? "Підійде невеликий циркуляційний насос."
            : "Шукай середні/потужні насоси, перевірь криву.";
}

// Water heater
function calcHeater() {
    const people = parseFloat(document.getElementById("heat-people").value);
    const flow = parseFloat(document.getElementById("heat-flow").value);
    const duration = parseFloat(document.getElementById("heat-duration").value);
    const tCold = parseFloat(document.getElementById("heat-cold").value);
    const tMix = parseFloat(document.getElementById("heat-mix").value);
    const tHot = parseFloat(document.getElementById("heat-hot").value);
    if ([people, flow, duration, tCold, tMix, tHot].some(isNaN)) return;

    const hotShare = (tMix - tCold) / (tHot - tCold);
    const hotShareClamped = Math.min(Math.max(hotShare, 0.1), 1);
    const hotFlow = flow * hotShareClamped;
    const totalHot = hotFlow * duration * people; // л
    const tank = totalHot * 1.25;
    const instantPower = flow * (tMix - tCold) * 0.069; // кВт

    document.getElementById("heat-share").innerText =
        formatNum(hotShareClamped * 100, 0) + " % гарячої";
    document.getElementById("heat-volume").innerText =
        formatNum(totalHot, 0) + " л/день";
    document.getElementById("heat-tank").innerText =
        formatNum(tank, 0) + " л бойлер";
    document.getElementById("heat-power").innerText =
        formatNum(instantPower, 1) + " кВт";
}

// Mixing valve
function calcMix() {
    const th = parseFloat(document.getElementById("mix-hot").value);
    const tc = parseFloat(document.getElementById("mix-cold").value);
    const tout = parseFloat(document.getElementById("mix-out").value);
    const flow = parseFloat(document.getElementById("mix-flow").value);
    if ([th, tc, tout, flow].some(isNaN)) return;

    const fracHot = (tout - tc) / (th - tc);
    const hotLmin = flow * fracHot;
    const coldLmin = flow - hotLmin;

    document.getElementById("mix-frac").innerText =
        formatNum(fracHot * 100, 0) + " % гарячої";
    document.getElementById("mix-hot-l").innerText =
        formatNum(hotLmin, 1) + " л/хв";
    document.getElementById("mix-cold-l").innerText =
        formatNum(coldLmin, 1) + " л/хв";
}

document.addEventListener("DOMContentLoaded", () => {
    calcDemand();
    calcPump();
    calcHeater();
    calcMix();
});
