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

// Boiler sizing
function calcBoiler() {
    const area = parseFloat(document.getElementById("boiler-area").value);
    const height = parseFloat(document.getElementById("boiler-height").value);
    const indoor = parseFloat(document.getElementById("boiler-indoor").value);
    const outdoor = parseFloat(document.getElementById("boiler-outdoor").value);
    const insul = parseFloat(document.getElementById("boiler-insul").value);
    const dt = parseFloat(document.getElementById("boiler-dt").value);

    if ([area, height, indoor, outdoor, insul, dt].some(isNaN)) return;

    const volumeFactor = height / 2.7;
    const baseSpecific = 0.1; // kW per m2 for нормальна ізоляція
    const deltaT = Math.max(indoor - outdoor, 15);

    const loadKw = area * baseSpecific * insul * volumeFactor * (deltaT / 40);
    const boilerKw = loadKw * 1.15;
    const i1 = (boilerKw * 1000) / 230;
    const i3 = (boilerKw * 1000) / (400 * Math.sqrt(3));

    const flowM3h = boilerKw / (1.16 * Math.max(dt, 10));

    document.getElementById("boiler-heat").innerText =
        formatNum(loadKw, 2) + " кВт";
    document.getElementById("boiler-kw").innerText =
        formatNum(boilerKw, 2) + " кВт";
    document.getElementById("boiler-i1").innerText =
        formatNum(i1, 1) + " А (1ф)";
    document.getElementById("boiler-i3").innerText =
        formatNum(i3, 1) + " А/фаза (3ф)";
    document.getElementById("boiler-flow").innerText =
        formatNum(flowM3h, 2) + " м³/год";
}

// Hydraulics & valves
function pickPipe(flow) {
    const table = [
        { dn: "DN15", cap: 1.2 },
        { dn: "DN20", cap: 2.5 },
        { dn: "DN25", cap: 4.0 },
        { dn: "DN32", cap: 7.0 },
        { dn: "DN40", cap: 12.0 },
        { dn: "DN50", cap: 18.0 },
    ];
    const found = table.find((t) => flow <= t.cap);
    return found ? found.dn : "DN65+";
}
function calcHydro() {
    const power = parseFloat(document.getElementById("hydro-power").value);
    const dt = parseFloat(document.getElementById("hydro-dt").value);
    const fluid = parseFloat(document.getElementById("hydro-fluid").value);
    const dp = parseFloat(document.getElementById("hydro-dp").value);
    if ([power, dt, fluid, dp].some(isNaN) || dt <= 0) return;

    const flow = (power / (1.16 * dt)) * fluid;
    const pipe = pickPipe(flow);
    const kvs = flow / Math.sqrt(Math.max(dp, 0.01));

    document.getElementById("hydro-flow").innerText =
        formatNum(flow, 2) + " м³/год";
    document.getElementById("hydro-pipe").innerText = pipe;
    document.getElementById("hydro-kvs").innerText = formatNum(kvs, 2);
}

// Fireplace & chimney
function calcFireplace() {
    const power = parseFloat(document.getElementById("fire-power").value);
    const area = parseFloat(document.getElementById("fire-area").value);
    const height = parseFloat(document.getElementById("fire-height").value);
    const stack = parseFloat(document.getElementById("fire-stack").value);
    if ([power, area, height, stack].some(isNaN)) return;

    const areaCm2 = power * 8; // rule of thumb
    const diameter = Math.sqrt((4 * areaCm2) / Math.PI);
    const wood = power * 0.27;
    const volume = area * height;
    const air = volume * 1.5;

    document.getElementById("fire-area-req").innerText =
        formatNum(areaCm2, 0) + " см²";
    document.getElementById("fire-diam").innerText =
        formatNum(diameter, 0) + " см";
    document.getElementById("fire-wood").innerText =
        formatNum(wood, 2) + " кг/год";
    document.getElementById("fire-air").innerText =
        formatNum(air, 0) + " м³/год";
    document.getElementById("fire-height-note").innerText =
        stack < 5
            ? "Низький димохід — перевірити тягу та утеплення."
            : "Висоти достатньо для стабільної тяги.";
}

// Costs
function calcCost() {
    const power = parseFloat(document.getElementById("cost-power").value);
    const tariff = parseFloat(document.getElementById("cost-tariff").value);
    const hours = parseFloat(document.getElementById("cost-hours").value);
    const days = parseFloat(document.getElementById("cost-days").value);
    const eff = parseFloat(document.getElementById("cost-eff").value);
    if ([power, tariff, hours, days, eff].some(isNaN)) return;

    const dailyKwh = power * hours / eff;
    const monthKwh = dailyKwh * days;
    const monthCost = monthKwh * tariff;

    document.getElementById("cost-daily").innerText =
        formatNum(dailyKwh, 1) + " кВт·год/добу";
    document.getElementById("cost-month").innerText =
        formatNum(monthKwh, 1) + " кВт·год/міс";
    document.getElementById("cost-money").innerText =
        formatNum(monthCost, 0) + " грн/міс";
}

document.addEventListener("DOMContentLoaded", () => {
    calcBoiler();
    calcHydro();
    calcFireplace();
    calcCost();
});
