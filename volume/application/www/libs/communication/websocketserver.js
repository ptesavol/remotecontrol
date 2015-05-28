"use strict";


// INCLUDES

if (typeof exports !== "undefined")
	{
	global.URL = require("url");
	global.fs = require("fs");
	global.http = require("http");
	global.https = require("https");
	global.WSServer = require("websocket").server;
	global.WebSocketConnection = require("./websocketconnection");	
	global.logger = require("winston");
	}
	
 

/** 
 * @class WebSocketServer
 */

function WebSocketServer()
{
var self = this;

var options = {};
var connectionListener = null; 
var wsServer = null;
var webServer = null;

self.setConnectionListener = function(listener)
	{
	connectionListener = listener;	
	};
	
self.listen = function(opts, callback)
	{
	try	{
		options.host = opts.host || null;
		options.port = opts.port || "";
		options.isSsl = opts.isSsl || false;
		options.sslKey = opts.sslKey || "";
		options.sslCert = opts.sslCert || "";
		options.sslAuthCert = opts.sslAuthCert || "";
		options.owner = opts.owner || "-";
		options.connectionListener = opts.connectionListener || null;
		options.unknMethodListener = opts.unknownMethodListener || null;
		options.protocol = (!options.isSsl ? "ws" : "wss");
		options.class = "WebSocketServer";

		
		
		
		if (!options.isSsl)										// Start a http server
			{
			webServer = http.createServer(function(request, response)
				{
				logger.log("httpServer::on(request)");	
				response.writeHead(501);
				response.end("Not implemented");
				});
			}
		else													// Start a https server
			{
			console.log("Trying to start https server: "+ JSON.stringify({ key: options.sslKey, cert: options.sslCert, ca: options.sslAuthCert}));
			
			var key = fs.sync.readFile(options.sslKey);
			var crt = fs.sync.readFile(options.sslCert);
			var ca_crt = fs.sync.readFile(options.sslAuthCert, "utf8");
			
			//webServer = https.createServer({ key: options.sslKey, cert: options.sslCert, ca: options.sslAuthCert}, function(request, response)
			webServer = https.createServer({ key: key, cert: crt, ca: ca_crt}, function(request, response)
				{
				console.log("httpsServer::on(request)");		
				response.writeHead(501);
				response.end("Not implemented");
				});
			}

		webServer.listen(options.port, options.host, 511, function()
			{
			console.log("webserver of websocketserver listening");
			callback(null, true);
			});

		webServer.on("error", function(err)
			{
			console.log(err);
			callback(err, null);
			});

		// Create the WebSocket server
		console.log("Creating WSServer");	
		wsServer = new WSServer(
			{
			httpServer: webServer,
			autoAcceptConnections: false,

			keepalive: true,							// Keepalive connections and
			keepaliveInterval: 60000,					// ping them once a minute and
			dropConnectionOnKeepaliveTimeout: true,		// drop a connection if there's no answer
			keepaliveGracePeriod: 10000					// within the grace period.
			});

		// Connection request
		wsServer.on("request", function(request)
			{
			logger.info("wsServer::on(request)");	
			// Accept connection - Should the request.origin be checked somehow?{ request.reject(404, <message>); throw ""; }?
			try
				{
				var connection = new WebSocketConnection();
				connection.setSocket(request.accept("json-rpc", request.origin));
				connection.setRemoteAddress(request.remoteAddress);
				connection.setRemotePort(request.remotePort);
				connection.setOrigin(request.origin);
				
				//var query = URL.parse(request.resourceURL,true).query;		
				//console.log("WebSocketServer::listen() accepting connection, given id was "+query.id);
				//if (query && query.id)
				//	connection.setId(query.id);
				
				connectionListener.addConnection(connection);
				}
			catch(err)
				{
				console.log(err);	
				return;
				}
			});
		
		// Connection closed
		wsServer.on("close", function(webSocketConnection, closeReason, description)
			{
			logger.info("wsServer::on(close) ");		
			});
		}	
	catch (e)
		{
		console.log(e);
		}
	};

self.close = function()
	{
	try	{
		if(wsServer)
			{
			wsServer.shutDown();
			wsServer = null;
			}

		if(webServer)
			{
			webServer.close();
			webServer = null;
			}
		}
	catch (e)
		{
		console.log(e);
		}			
	};	
}

if (typeof exports !== "undefined")
	{
	module.exports = WebSocketServer;
	}
