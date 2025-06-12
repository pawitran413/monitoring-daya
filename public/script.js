// Menggunakan hostname dari URL browser untuk terhubung ke server
const gateway = `ws://${window.location.hostname}:${window.location.port}/`;
let websocket;

// --- Fungsi Utama untuk memulai semuanya ---
window.addEventListener("load", onLoad);

function onLoad(event) {
	initWebSocket();
	initButtons();
}

// --- Logika WebSocket ---
function initWebSocket() {
	console.log("Mencoba membuka koneksi WebSocket...");
	websocket = new WebSocket(gateway);
	websocket.onopen = onOpen;
	websocket.onclose = onClose;
	websocket.onmessage = onMessage; // Fungsi untuk menerima data dari server
}

function onOpen(event) {
	console.log("Koneksi dibuka");
	document.getElementById("status").innerHTML = "Terhubung ke Server";
}

function onClose(event) {
	console.log("Koneksi ditutup");
	document.getElementById("status").innerHTML =
		"Koneksi terputus. Mencoba lagi...";
	// Coba hubungkan kembali setelah 2 detik
	setTimeout(initWebSocket, 2000);
}

// FUNGSI INI MENANGANI DATA YANG DATANG DARI SERVER
function onMessage(event) {
	console.log("Pesan diterima:", event.data);
	const data = JSON.parse(event.data);

	// Cek apakah pesan berisi data sensor sebelum memperbarui UI
	if (data.pzem_mA !== undefined) {
		const pzemValue = Math.round(data.pzem_mA);
		document.getElementById("pzem-value").innerHTML = `${pzemValue} mA`;
		pzemGauge.set(pzemValue);
	}
	if (data.zmct_mA !== undefined) {
		const zmctValue = Math.round(data.zmct_mA);
		document.getElementById("zmct-value").innerHTML = `${zmctValue} mA`;
		zmctGauge.set(zmctValue);
	}

	// Cek apakah pesan berisi status relay sebelum memperbarui UI
	if (data.relay_status !== undefined) {
		const relayStatusElement = document.getElementById("relay-status");
		if (data.relay_status) {
			relayStatusElement.textContent = "NYALA";
			relayStatusElement.className = "status-indicator on";
		} else {
			relayStatusElement.textContent = "MATI";
			relayStatusElement.className = "status-indicator off";
		}
	}
}

// --- Logika Kontrol Tombol ---
function initButtons() {
	document.getElementById("btn-on").addEventListener("click", () => {
		controlRelay("ON");
	});
	document.getElementById("btn-off").addEventListener("click", () => {
		controlRelay("OFF");
	});
}

// ===== PERUBAHAN UTAMA ADA DI SINI =====
function controlRelay(state) {
	console.log(`Mengirim perintah via WebSocket: ${state}`);

	// Buat objek JSON untuk perintah
	const command = {
		command: state.toUpperCase(), // e.g., { "command": "ON" }
	};

	// Kirim objek JSON sebagai string melalui koneksi WebSocket
	if (websocket && websocket.readyState === WebSocket.OPEN) {
		websocket.send(JSON.stringify(command));
	} else {
		console.error("WebSocket tidak terbuka. Perintah tidak dapat dikirim.");
	}
}
// ======================================

// --- Konfigurasi & Inisialisasi Gauge (Tidak Ada Perubahan) ---
const gaugeOptions = {
	angle: -0.2,
	lineWidth: 0.2,
	radiusScale: 1,
	pointer: { length: 0.6, strokeWidth: 0.035, color: "#000000" },
	limitMax: false,
	limitMin: false,
	colorStart: "#6FADCF",
	colorStop: "#8FC0DA",
	strokeColor: "#E0E0E0",
	generateGradient: true,
	highDpiSupport: true,
	staticLabels: {
		font: "12px sans-serif",
		labels: [0, 500, 1000, 1500, 2000],
		color: "#000000",
		fractionDigits: 0,
	},
};
const pzemGaugeElement = document.getElementById("gauge-pzem");
const pzemGauge = new Gauge(pzemGaugeElement).setOptions(gaugeOptions);
pzemGauge.maxValue = 2000;
pzemGauge.set(0);

const zmctGaugeElement = document.getElementById("gauge-zmct");
const zmctGauge = new Gauge(zmctGaugeElement).setOptions(gaugeOptions);
zmctGauge.maxValue = 2000;
zmctGauge.set(0);
