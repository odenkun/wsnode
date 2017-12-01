"use strict";

const http = require("http");
const WebSocketServer = require('websocket').server;

const server = http.createServer(function(request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	response.writeHead(404);
	response.end();
});
server.listen(80, function() {
	console.log((new Date()) + ' Server is listening on port 8080');
});

const wsServer = new WebSocketServer({
	httpServer: server,
	autoAcceptConnections: false
});

function originIsAllowed(origin) {
	//認証チェック
	return true;
}

wsServer.on('request', (request) =>  {
	//アクセスが許されない場合
	if (!originIsAllowed(request.origin)) {
		//アクセス拒否
		request.reject();
		console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
		return;
	}

	const connection = request.accept('echo-protocol', request.origin);
	console.log((new Date()) + ' Connection accepted.');
	connection.on('message', (message) => {
		if (message.type === 'utf8') {
			console.log('Received Message: ' + message.utf8Data);
			connection.sendUTF(message.utf8Data);
		}
		else if (message.type === 'binary') {
			console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
			connection.sendBytes(message.binaryData);
		}
	});
	connection.on('close', (reasonCode, description) => {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
	});
});



function streamingRecognize() {
	const speech = require('@google-cloud/speech');
	// Creates a client
	const client = new speech.SpeechClient();
	const encoding = 'LINEAR16';
	const sampleRateHertz = 16000;
	const languageCode = 'ja-JP';

	const request = {
		config: {
			encoding: encoding,
			sampleRateHertz: sampleRateHertz,
			languageCode: languageCode,
		},
		interimResults: false,
	};

	// Stream the audio to the Google Cloud Speech API
	const recognizeStream = client
		.streamingRecognize(request)
		.on('error', console.error)
		.on('data', data => {
			const transcript = data.results[0].alternatives[0].transcript;
			console.log(`Transcription: ${transcript}`);
		});

	// pipe(recognizeStream);
}