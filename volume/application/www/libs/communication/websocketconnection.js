"use strict";

//Include only in node, not in browser

if (typeof exports !== "undefined")
	{
	//global.WebSocket = require("websocket").client;
	global.WebSocket = require("websocket").w3cwebsocket;
	global.logger = require("winston");
	}
	
function WebSocketConnection()
{
var self = this;

var socket = null;
var id = null;
var remoteAddress = null;
var remotePort = null;
var origin = null;
var listener = null;

//For client-side use, in both node and the browser

self.connect = function(options, callback)
	{
	options.protocol = (!options.isSsl ? "ws" : "wss");	
	
	try	{	
		var url = options.protocol + "://" + options.host + ":" + options.port + "/"+"json-rpc";
		if (options.id)
			url += "?id="+options.id;
		socket = new WebSocket(url, "json-rpc");
			
		socket.onopen = function() {callback(null); }; 
		socket.onmessage = onMessageEvent;
		socket.onclose = function(reasonCode, description) {onSocketClosed(reasonCode, description, self);};	
		}
	catch (e)
		{
		console.log(e);
		}
	};

//For server-side node.js use only

self.setSocket = function(val) 
	{
	console.log("WebSocketConnection::setSocket()");	
	try	{
		socket = val;		
		socket.on("message", onMessage);
		socket.on("close", function(reasonCode, description) {onSocketClosed(reasonCode, description, self);});
		}
	catch (e)
		{
		console.log(e);
		}	
	};
	
self.setId = function(val) 
	{
	id = val;	
	};
	
self.setRemoteAddress = function(val) 
	{
	remoteAddress	= val;
	};
	
self.setRemotePort = function(val) 
	{
	remotePort = val;	
	};
	
self.setOrigin = function(val) 
	{
	origin = val;	
	};
	
self.setListener = function(val) 
	{
	listener = val;	
	};

self.getId = function() 
	{
	return id;	
	};
	
self.getRemoteAddress = function() 
	{
	return remoteAddress;
	};
	
self.getRemotePort = function() 
	{
	return remotePort;	
	};
	
self.getOrigin = function() 
	{
	return origin;	
	};
	
var onMessage = function(message)
	{
	console.log("WebSocketConnection::onMessage() "+message);	
	try	{
		if (listener)
			listener.onMessage(message.utf8Data, self);
		}
	catch (e)
		{
		console.log(e);
		}	
	};

var onMessageEvent = function(event)
	{
	try	{
		if (listener)
			listener.onMessage(event.data, self);
		}
	catch(e)
		{
		console.log(e);
		}	
	};
	
var onSocketClosed = function(reasonCode, description, obj)
	{
	try	{
		if (listener)
			listener.onDisconnected(obj.getId());
		}
	catch(e)
		{
		console.log(e);
		}	
	};
	
self.send = function(message)
	{
	try	{
		socket.send(message);	
		}
	catch(e)
		{
		console.log(e);
		}	
	};

self.close = function()
	{
	try	{
		socket.close();
		}
	catch(e)
		{
		console.log(e);
		}	
	};
}

if (typeof exports !== "undefined")
	{
	module.exports = WebSocketConnection;	
	}
