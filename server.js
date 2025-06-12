const express = require("express");
const http = require("http");
const WebSocket = require("ws");

// --- Konfigurasi ---
const WEB_PORT = 8080;

// --- Inisialisasi Aplikasi Express & Server ---
const app = express();
app.use(express.static("public"));
const server = http.createServer(app);

// --- Inisialisasi WebSocket Server ---
const wss = new WebSocket.Server({ server });

// Blok ini akan dijalankan setiap kali ada klien baru yang terhubung (baik ESP32 maupun Frontend)
wss.on("connection", (ws) => {
	console.log("A client has connected!");

	// Blok ini akan dijalankan setiap kali server menerima pesan dari klien tersebut
	ws.on("message", (message) => {
		console.log("Received message: %s", message);

		// Kita akan meneruskan (broadcast) pesan ini ke SEMUA klien LAIN yang terhubung
		wss.clients.forEach((client) => {
			// Cek apakah klien ini bukan pengirim asli DAN koneksinya terbuka
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(message.toString());
			}
		});
	});

	ws.on("close", () => {
		console.log("A client has disconnected.");
	});

	ws.on("error", (error) => {
		console.error("WebSocket error observed:", error);
	});
});

server.listen(WEB_PORT, () => {
	console.log(`Server is listening on http://localhost:${WEB_PORT}`);
});

console.log("WebSocket server started. Waiting for connections...");
