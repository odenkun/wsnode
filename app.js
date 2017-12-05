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
		languageCode: 'ja-JP',
	},
	interimResults: false,
};


const recognizeConnections = {};
wsServer.on('request', (request) => {
	if (request.remoteAddress) {
		console.log("client created");
		const client = new speech.SpeechClient(auth);
		recognizeConnections.remoteAddress = client
			.streamingRecognize(requestConf)
			.on('error', error => console.error(error))
			.on('data', data => {
				console.log("received data");
				console.log(data);
			});
		recognizeConnections.remoteAddress.write();
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
		if (message.type === ' utf8') {
			console.log('Received utf8 Message of ' + message.utf8Data);
			if (message.utf8Data === 'stopRecognize') {
				console.log('Stop recognize');
				recognizeConnections.remoteAddress.end();
			}
		} else if (message.type === 'binary') {
			console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
			recognizeConnections.remoteAddress.write(
				{
					audio_content: message.binaryData
				}
			);
		}
	}).on('close', (reasonCode, description) => {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		recognizeConnections.remoteAddress.end();
	});
});