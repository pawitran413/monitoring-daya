// Menggunakan hostname dari URL browser untuk terhubung ke server
const gateway = `ws://${window.location.hostname}:${window.location.port}/`;
let websocket;

// --- Objek untuk menyimpan referensi gauge dan elemen UI ---
const pzem = {};
const outlets = {};

// --- Opsi default untuk gauge ---
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
};

// --- Fungsi Utama ---
window.addEventListener("load", onLoad);

function onLoad(event) {
	initUI();
	initWebSocket();
	initButtons();
}

// Inisialisasi semua elemen UI dan Gauge
function initUI() {
	// Inisialisasi Gauge PZEM
	const pzemGaugeElement = document.getElementById("gauge-pzem");
	// Opsi khusus untuk gauge besar
	const pzemGaugeOptions = {
		...gaugeOptions,
		staticLabels: {
			font: "12px sans-serif",
			labels: [0, 150, 300, 450],
			color: "#000000",
			fractionDigits: 0,
		},
	};
	pzem.gauge = new Gauge(pzemGaugeElement).setOptions(pzemGaugeOptions);
	pzem.gauge.maxValue = 450; // Batas daya total 900W
	pzem.gauge.set(0);
	pzem.valueElement = document.getElementById("pzem-value");

	// Inisialisasi Gauge untuk 3 stop kontak
	for (let i = 1; i <= 3; i++) {
		const gaugeElement = document.getElementById(`gauge-zmct-${i}`);
		// Opsi khusus untuk gauge kecil
		const zmctGaugeOptions = {
			...gaugeOptions,
			staticLabels: {
				font: "10px sans-serif",
				labels: [0, 100, 200, 300],
				color: "#000000",
				fractionDigits: 0,
			},
		};
		const gauge = new Gauge(gaugeElement).setOptions(zmctGaugeOptions);
		gauge.maxValue = 300; // Batas daya per stop kontak 300W
		gauge.set(0);

		outlets[i] = {
			gauge: gauge,
			valueElement: document.getElementById(`zmct${i}-value`),
			statusElement: document.getElementById(`relay${i}-status`),
		};
	}
}

// --- Logika WebSocket ---
function initWebSocket() {
	console.log("Mencoba membuka koneksi WebSocket...");
	websocket = new WebSocket(gateway);
	websocket.onopen = onOpen;
	websocket.onclose = onClose;
	websocket.onmessage = onMessage;
}
function onOpen(event) {
	console.log("Koneksi dibuka");
	document.getElementById("status").innerHTML = "Terhubung ke Server";
}
function onClose(event) {
	console.log("Koneksi ditutup");
	document.getElementById("status").innerHTML =
		"Koneksi terputus. Mencoba lagi...";
	setTimeout(initWebSocket, 2000);
}

// --- Pemrosesan Pesan & Update UI ---
function onMessage(event) {
	const data = JSON.parse(event.data);
	console.log("Pesan diterima:", data);

	// Update Gauge Daya Total PZEM (akan selalu berjalan jika data pzem_w ada)
	if (data.pzem_w !== undefined) {
		const powerValue = data.pzem_w.toFixed(1);
		pzem.valueElement.textContent = `${powerValue} W`;
		pzem.gauge.set(powerValue);
	}

	// =================================================================
	// PENYESUAIAN PENTING: Hanya proses 'outlets' jika datanya ada
	// =================================================================
	if (data.outlets && Array.isArray(data.outlets)) {
		// Kode di dalam blok ini HANYA akan berjalan jika ESP32 mengirim data 'outlets'
		data.outlets.forEach((outletData) => {
			const outletUI = outlets[outletData.id];
			if (outletUI) {
				// Update Gauge dan Nilai Watt ZMCT
				const powerValue = outletData.zmct_w || 0;
				outletUI.valueElement.textContent = `${powerValue.toFixed(1)} W`;
				outletUI.gauge.set(powerValue);

				// Update Status Relay
				updateRelayStatus(outletData.id, outletData.relay_status);
			}
		});
	}
	// =================================================================
}

// Fungsi helper untuk mengupdate status relay
function updateRelayStatus(outletId, status) {
	const statusElement = document.getElementById(`relay${outletId}-status`);
	if (statusElement) {
		if (status) {
			statusElement.textContent = "NYALA";
			statusElement.className = "status-indicator on";
		} else {
			statusElement.textContent = "MATI";
			statusElement.className = "status-indicator off";
		}
	}
}

// --- Logika Kontrol Tombol ---
function initButtons() {
	document.querySelectorAll(".btn-on").forEach((button) => {
		button.addEventListener("click", () => {
			controlRelay(button.dataset.relay, "ON");
		});
	});
	document.querySelectorAll(".btn-off").forEach((button) => {
		button.addEventListener("click", () => {
			controlRelay(button.dataset.relay, "OFF");
		});
	});
}
function controlRelay(relayId, state) {
	console.log(`Mengirim perintah ke relay ${relayId}: ${state}`);
	const command = {
		type: "relayControl",
		relay_id: parseInt(relayId),
		state: state.toUpperCase(),
	};
	if (websocket && websocket.readyState === WebSocket.OPEN) {
		websocket.send(JSON.stringify(command));
	} else {
		console.error("WebSocket tidak terbuka. Perintah tidak dapat dikirim.");
	}
}
