"use strict";

const http = require("http");
const WebSocketServer = require('websocket').server;

const server = http.createServer(function (request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	response.writeHead(404);
	response.end();
});

const port = 6001;
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
	},
	single_utterance: true,
	interim_results: true
	
};

let connections = {};
wsServer.on('request', (request) => {
	const address = request.remoteAddress.toString();
	if (address) {
		console.log("client created: " + address);
		const client = new speech.SpeechClient(auth);
		connections[address] = client
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
		console.log((new Date()) + ' Connection from origin ' + address + ' rejected.');
		return;
	}
	console.log((new Date()) + ' Connection accepted.' + address);
	//サブプロトコル
	const connection = request.accept('recognize', request.origin);
	connection.on('message', (message) => {
		if (message.type === 'utf8') {
			console.log(`received: ${message.utf8Data}`);
			
		} else if (message.type === 'binary') {
			console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
			
			if (connections[address]) {
				const bufferBASE64 = Buffer.from(message.binaryData);
				console.log(bufferBASE64.toString('base64'));
				connections[address].write(message.binaryData);
			}
		}
	}).on('close', (reasonCode, description) => {
		console.log((new Date()) + ' Peer ' + address + ' disconnected.');
		if (connections[address]) {
			connections[address].end();
		}
	});
});