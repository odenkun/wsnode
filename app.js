"use strict";

const http = require("http");
const WebSocketServer = require('websocket').server;

const server = http.createServer(function (request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	response.writeHead(404);
	response.end();
});
const port = 80;
server.listen(port, function () {
	console.log((new Date()) + ' Server is listening on port ' + port);
});

const wsServer = new WebSocketServer({
	httpServer: server,
	autoAcceptConnections: false
});

function originIsAllowed(origin) {
	//認証チェック
	return true;
}

const speech = require('@google-cloud/speech');
const auth = {
	projectId: 'yutaroproject-185304',
	keyFilename: 'auth/google.json'
};

const requestConf = {
	config: {
		encoding: 'LINEAR16',
		sampleRateHertz: 16000,
		languageCode: 'ja-jp',
	}
};
// const request = {
// 	config: {
// 		encoding: 'LINEAR16',
// 		sampleRateHertz: 16000,
// 		languageCode: 'en-US',
// 	},
// 	interimResults: false, // If you want interim results, set this to true
// };

// const fs = require('fs');
// let fileStem = fs.createReadStream('./audio.raw').on('error', console.error);
// fileStem.pipe(recognizeConnections);

let recognizeConnections;
wsServer.on('request', (request) => {
	if (request.remoteAddress) {
		console.log("client created: " + request.remoteAddress);
		const client = new speech.SpeechClient(auth);
		recognizeConnections = client
			.streamingRecognize(requestConf)
			.on('error', error => console.log(error))
			.on('data', data => {
				console.log("received recognize data");
				console.log(data);
				console.log(`Transcription: ${data.results[0].alternatives[0].transcript}`);
			});
	} else {
		request.reject();
	}
	//アクセスが許されない場合
	if (!originIsAllowed(request.origin)) {
		//アクセス拒否
		request.reject();
		console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
		return;
	}
	console.log((new Date()) + ' Connection accepted.' + request.origin);
	//サブプロトコル
	const connection = request.accept('recognize', request.origin);
	connection.on('message', (message) => {
		if (message.type === 'utf8') {
			console.log(`received: ${message.utf8Data}`);

		} else if (message.type === 'binary') {
			console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
			// const bufferBASE64 = Buffer.from(message.binaryData);
			// console.log(bufferBASE64.toString('base64'));
			if (recognizeConnections) {
				recognizeConnections.write(message.binaryData);
			}
		}
	}).on('close', (reasonCode, description) => {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		if (recognizeConnections) {
			recognizeConnections.end();
		}
	});
});