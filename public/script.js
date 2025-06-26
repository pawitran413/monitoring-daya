// Menggunakan hostname dari URL browser untuk terhubung ke server
const gateway = 'wss://monitoring-daya-production.up.railway.app';
let websocket;

// --- Objek untuk menyimpan referensi gauge dan elemen UI ---
const pzem = {};
const outlets = {};

// --- Opsi default untuk gauge ---
const pzemGaugeOptions = {
	angle: -0.5,
	lineWidth: 0.1,
	radiusScale: 1,
	pointer: { length: 0, strokeWidth: 0, color: "#000000" },
	limitMax: false,
	limitMin: false,
	colorStart: "#DCE995",
	colorStop: "#BBEBC6",
	strokeColor: "#78A1DF",
	generateGradient: true,
	highDpiSupport: true,
};
const zmctGaugeOptions = {
	angle: -0.5,
	lineWidth: 0.09,
	radiusScale: 1,
	pointer: { length: 0, strokeWidth: 0, color: "#000000" },
	limitMax: false,
	limitMin: false,
	colorStart: "#DCE995",
	colorStop: "#BBEBC6",
	// strokeColor: "#78A1DF",
	// colorStart: "#3767D1",
	// colorStop: "#78A1DF",
	strokeColor: "rgba(143, 208, 235, .3)",
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
	// const pzemGaugeOptions = {
		// ...pzemGaugeOptions,
		// staticLabels: {
		// 	font: "12px sans-serif",
		// 	labels: [0, 150, 300, 450], // Label untuk daya hingga 900W
		// 	color: "#000000",
		// 	fractionDigits: 0,
		// },
	// };
	pzem.gauge = new Gauge(pzemGaugeElement).setOptions(pzemGaugeOptions);
	pzem.gauge.maxValue = 450; // Batas daya total 900W
	pzem.gauge.set(0);
	pzem.valueElement = document.getElementById("pzem-value");

	// Inisialisasi Gauge untuk 2 stop kontak
	for (let i = 1; i <= 2; i++) {
		const gaugeElement = document.getElementById(`gauge-zmct-${i}`);
		// const zmctGaugeOptions = {
		// 	...gaugeOptions,
		// 	staticLabels: {
		// 		font: "10px sans-serif",
		// 		labels: [0, 150, 300, 450],
		// 		color: "#000000",
		// 		fractionDigits: 0,
		// 	},
		// };
		const gauge = new Gauge(gaugeElement).setOptions(zmctGaugeOptions);
		gauge.maxValue = 450;
		gauge.set(0);

		// PERBAIKAN: Gunakan ID yang benar dari HTML
		outlets[i] = {
			gauge: gauge,
			valueElement: document.getElementById(`zmct-value-${i}`),
			statusElement: document.getElementById(`relay-status-${i}`),
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

// =================================================================
// --- FUNGSI onMessage() YANG TELAH DISESUAIKAN UNTUK FORMAT BARU ---
// =================================================================
function onMessage(event) {
	const data = JSON.parse(event.data);
	console.log("Pesan diterima:", data);

	// Update Gauge Daya Total PZEM
	if (data.pzem_w !== undefined) {
		const powerValue = data.pzem_w.toFixed(1);
		pzem.valueElement.textContent = `${powerValue} W`;
		pzem.gauge.set(powerValue);
	}

	// Update setiap stop kontak dari array 'outlets'
	if (data.outlets && Array.isArray(data.outlets)) {
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
}

// Fungsi helper untuk mengupdate status relay
function updateRelayStatus(outletId, status) {
	const statusElement = document.getElementById(`relay-status-${outletId}`);
	if (statusElement) {
		if (status) {
			// statusElement.textContent = "NYALA";
			statusElement.className = "status-indicator on";
		} else {
			// statusElement.textContent = "MATI";
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

// SCROLL
document.addEventListener("DOMContentLoaded", function () {
	const pzemContainer = document.querySelector('.pzem-section');

    // Pastikan elemennya ada sebelum menambahkan event listener
    if (pzemContainer) {
        function handleScrollFade() {
            const scrollY = window.scrollY;
            
            // Jarak scroll di mana elemen akan memudar sepenuhnya (dalam pixel)
            // Anda bisa mengubah angka ini untuk mengatur kecepatan pudar
            const fadeOutDistance = 300; 

            // Hitung opacity baru (dari 1 ke 0)
            let newOpacity = 1 - (scrollY / fadeOutDistance);

            // Pastikan opacity tidak kurang dari 0 atau lebih dari 1
            newOpacity = Math.max(0, Math.min(1, newOpacity));
            
            // Terapkan style opacity ke elemen
            pzemContainer.style.opacity = newOpacity;
        }

        // Tambahkan event listener untuk event 'scroll'
        window.addEventListener('scroll', handleScrollFade);
    }
});