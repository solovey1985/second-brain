// --- GLOBAL HELPERS ---
function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
    if (n >= 1000) return (n / 1000).toFixed(2) + "k";
    return parseFloat(n.toFixed(3));
}

// --- TABS ---
function switchTab(tabId) {
    document
        .querySelectorAll(".tab-content")
        .forEach((el) => el.classList.remove("active"));
    document.getElementById("tab-" + tabId).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach((el) => {
        el.classList.remove("bg-slate-800", "text-white");
        el.classList.add("text-slate-300");
    });
    const activeBtn = document.getElementById("btn-" + tabId);
    activeBtn.classList.add("bg-slate-800", "text-white");
    activeBtn.classList.remove("text-slate-300");
}

// --- OHM ---
function calcOhm() {
    const v = parseFloat(document.getElementById("ohm-v").value);
    const i = parseFloat(document.getElementById("ohm-i").value);
    const r = parseFloat(document.getElementById("ohm-r").value);
    const p = parseFloat(document.getElementById("ohm-p").value);
    let resV = v,
        resI = i,
        resR = r,
        resP = p,
        calculated = false;
    const count = [v, i, r, p].filter((x) => !isNaN(x)).length;

    if (count >= 2) {
        if (!isNaN(v) && !isNaN(i)) {
            resR = v / i;
            resP = v * i;
            calculated = true;
        } else if (!isNaN(v) && !isNaN(r)) {
            resI = v / r;
            resP = (v * v) / r;
            calculated = true;
        } else if (!isNaN(v) && !isNaN(p)) {
            resI = p / v;
            resR = (v * v) / p;
            calculated = true;
        } else if (!isNaN(i) && !isNaN(r)) {
            resV = i * r;
            resP = i * i * r;
            calculated = true;
        } else if (!isNaN(i) && !isNaN(p)) {
            resV = p / i;
            resR = p / (i * i);
            calculated = true;
        } else if (!isNaN(p) && !isNaN(r)) {
            resV = Math.sqrt(p * r);
            resI = Math.sqrt(p / r);
            calculated = true;
        }
    }

    const resBox = document.getElementById("ohm-result");
    if (calculated) {
        resBox.classList.remove("hidden");
        resBox.innerHTML = `
            <div class="p-3 bg-slate-800 rounded border border-slate-700"><div class="text-xs text-slate-500">V</div><div class="text-xl font-mono text-white">${formatNum(
                resV
            )} V</div></div>
            <div class="p-3 bg-slate-800 rounded border border-slate-700"><div class="text-xs text-slate-500">I</div><div class="text-xl font-mono text-white">${formatNum(
                resI
            )} A</div></div>
            <div class="p-3 bg-slate-800 rounded border border-slate-700"><div class="text-xs text-slate-500">R</div><div class="text-xl font-mono text-white">${formatNum(
                resR
            )} Ω</div></div>
            <div class="p-3 bg-slate-800 rounded border border-slate-700"><div class="text-xs text-slate-500">P</div><div class="text-xl font-mono text-white">${formatNum(
                resP
            )} W</div></div>`;
    } else {
        resBox.classList.add("hidden");
    }
}
function clearOhm() {
    ["ohm-v", "ohm-i", "ohm-r", "ohm-p"].forEach(
        (id) => (document.getElementById(id).value = "")
    );
    document.getElementById("ohm-result").classList.add("hidden");
}

// --- PSU ---
function calcPSU() {
    const vout = parseFloat(document.getElementById("psu-v").value);
    const i = parseFloat(document.getElementById("psu-i").value);
    const vrip = parseFloat(document.getElementById("psu-rip").value);
    if (!isNaN(vout) && !isNaN(i) && !isNaN(vrip) && i > 0) {
        const vCapMin = vout + 3.0;
        const vCapPeak = vCapMin + vrip;
        const vSecRMS = (vCapPeak + 1.4) / Math.sqrt(2);
        const cMicro = Math.round((i / (2 * 50 * vrip)) * 1000000);
        const pHeat = (vCapPeak - vrip / 2 - vout) * i;

        document.getElementById("psu-vac-rec").innerText =
            "~" + Math.ceil(vSecRMS) + " V";
        document.getElementById("psu-cap-std").innerText = cMicro + " µF";
        document.getElementById("psu-heat").innerText = pHeat.toFixed(1) + " W";

        let heatMsg = "OK";
        if (pHeat > 1.0) heatMsg = "Потрібен радіатор";
        if (pHeat > 5.0) heatMsg = "Великий радіатор!";
        document.getElementById("psu-heat-msg").innerText = heatMsg;
    }
}

// --- 555 TIMER ---
function calc555() {
    const r1 = parseFloat(document.getElementById("t555-r1").value) * 1000; // kOhm -> Ohm
    const r2 = parseFloat(document.getElementById("t555-r2").value) * 1000;
    const c = parseFloat(document.getElementById("t555-c").value) / 1000000; // uF -> F

    if (r1 > 0 && r2 > 0 && c > 0) {
        const tHigh = 0.693 * (r1 + r2) * c;
        const tLow = 0.693 * r2 * c;
        const period = tHigh + tLow;
        const freq = 1 / period;
        const duty = (tHigh / period) * 100;

        document.getElementById("t555-freq").innerText =
            freq < 1000
                ? freq.toFixed(1) + " Hz"
                : (freq / 1000).toFixed(2) + " kHz";
        document.getElementById("t555-duty").innerText = duty.toFixed(1) + " %";
        document.getElementById("t555-high").innerText =
            tHigh.toFixed(4) + " s";
        document.getElementById("t555-low").innerText = tLow.toFixed(4) + " s";
    }
}

// --- CAP CODES ---
function calcCapCode() {
    const code = document.getElementById("cap-code-input").value;
    document.getElementById("cap-code-disp").innerText = code;

    if (code.length === 3) {
        const val = parseInt(code.substring(0, 2));
        const mult = parseInt(code.substring(2, 3));

        const pf = val * Math.pow(10, mult);
        const nf = pf / 1000;
        const uf = pf / 1000000;

        document.getElementById("cap-res-pf").innerText = pf + " pF";
        document.getElementById("cap-res-nf").innerText = nf + " nF";
        document.getElementById("cap-res-uf").innerText = uf + " µF";
    } else {
        document.getElementById("cap-res-pf").innerText = "--";
        document.getElementById("cap-res-nf").innerText = "--";
        document.getElementById("cap-res-uf").innerText = "--";
    }
}

// --- BATTERY ---
function calcBattery() {
    const cap = parseFloat(document.getElementById("bat-cap").value);
    const load = parseFloat(document.getElementById("bat-load").value);
    const eff = parseFloat(document.getElementById("bat-type").value);

    if (cap > 0 && load > 0) {
        const hours = (cap * eff) / load;
        document.getElementById("bat-time").innerText =
            hours.toFixed(1) + " год";

        if (hours > 24) {
            document.getElementById("bat-days").innerText =
                "~" + (hours / 24).toFixed(1) + " днів";
        } else {
            document.getElementById("bat-days").innerText = "";
        }
    }
}

// --- DIVIDER ---
function calcDivider() {
    const vin = parseFloat(document.getElementById("vd-vin").value);
    const r1 = parseFloat(document.getElementById("vd-r1").value);
    const r2 = parseFloat(document.getElementById("vd-r2").value);
    if (!isNaN(vin) && !isNaN(r1) && !isNaN(r2) && r1 + r2 > 0) {
        const vout = vin * (r2 / (r1 + r2));
        document.getElementById("vd-vout").innerText = formatNum(vout) + " V";
        document.getElementById("vd-ratio").innerText = (
            r2 /
            (r1 + r2)
        ).toFixed(3);
    }
}

// --- LED ---
function setLedV(val) {
    document.getElementById("led-vf").value = val;
    calcLed();
}
function calcLed() {
    const vs = parseFloat(document.getElementById("led-vs").value);
    const vf = parseFloat(document.getElementById("led-vf").value);
    const i = parseFloat(document.getElementById("led-i").value) / 1000;
    if (vs > vf && i > 0) {
        const r = (vs - vf) / i;
        const p = (vs - vf) * i;
        document.getElementById("led-r-calc").innerText = Math.round(r) + " Ω";
        document.getElementById("led-p-rec").innerText =
            p > 0.25 ? "0.5 W" : "0.25 W";
    } else {
        document.getElementById("led-r-calc").innerText = "Err";
    }
}

// --- PARALLEL ---
function calcParallelSeries() {
    const r = document
        .getElementById("res-list")
        .value.split(/[\s,]+/)
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
    if (r.length > 0) {
        const ser = r.reduce((a, b) => a + b, 0);
        const par = 1 / r.reduce((a, b) => a + 1 / b, 0);
        document.getElementById("res-series").innerText = formatNum(ser) + " Ω";
        document.getElementById("res-parallel").innerText =
            formatNum(par) + " Ω";
    }
}

// --- ANTENNA ---
function setFreq(val) {
    document.getElementById("ant-freq").value = val;
    calcAntenna();
}
function calcAntenna() {
    const f = parseFloat(document.getElementById("ant-freq").value);
    if (f > 0) {
        const l = 299.79 / f;
        document.getElementById("ant-wave").innerText = l.toFixed(3) + " м";
        document.getElementById("ant-dipole-total").innerText =
            ((142.5 / f) * 100).toFixed(1) + " см";
        document.getElementById("ant-dipole-arm").innerText =
            ((142.5 / f / 2) * 100).toFixed(1) + " см";
        document.getElementById("ant-quarter").innerText =
            ((71.25 / f) * 100).toFixed(1) + " см";
    }
}

// --- COLORS ---
const colors = [
    { hex: "#000000", val: 0 },
    { hex: "#8B4513", val: 1, tol: 1 },
    { hex: "#FF0000", val: 2, tol: 2 },
    { hex: "#FFA500", val: 3 },
    { hex: "#FFFF00", val: 4 },
    { hex: "#008000", val: 5, tol: 0.5 },
    { hex: "#0000FF", val: 6, tol: 0.25 },
    { hex: "#EE82EE", val: 7, tol: 0.1 },
    { hex: "#808080", val: 8 },
    { hex: "#FFFFFF", val: 9 },
    { hex: "#FFD700", val: -1, tol: 5 },
    { hex: "#C0C0C0", val: -2, tol: 10 },
];
let bands = [1, 0, 2, 10];

function renderColors() {
    [0, 1, 2, 3].forEach((idx) => {
        const div = document.getElementById("col-sel-" + (idx + 1));
        div.innerHTML = "";
        colors.forEach((c, cIdx) => {
            if (idx < 2 && cIdx > 9) return;
            if (idx === 3 && typeof c.tol === "undefined") return;
            const b = document.createElement("button");
            b.className = `h-5 w-full rounded ${
                bands[idx] === cIdx ? "ring-2 ring-white" : ""
            }`;
            b.style.backgroundColor = c.hex;
            b.onclick = () => {
                bands[idx] = cIdx;
                renderColors();
                calcColors();
            };
            div.appendChild(b);
        });
    });
    calcColors();
}
function calcColors() {
    const bCols = bands.map((b) => colors[b].hex);
    bCols.forEach(
        (c, i) =>
            (document.getElementById(
                "band" + (i + 1) + "-disp"
            ).style.backgroundColor = c)
    );
    let val = (bands[0] * 10 + bands[1]) * Math.pow(10, colors[bands[2]].val);
    if (colors[bands[2]].hex === "#FFD700") val *= 0.1;
    if (colors[bands[2]].hex === "#C0C0C0") val *= 0.01;
    document.getElementById("color-result-val").innerText =
        formatNum(val) + " Ω";
    document.getElementById("color-result-tol").innerText =
        "±" + colors[bands[3]].tol + "%";
}

// Init all functions when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    renderColors();
    calcOhm();
    calcPSU();
    calc555();
    calcCapCode();
    calcBattery();
    calcLed();
    calcDivider();
    calcAntenna();
});
