"use strict";

// Includes
if (typeof exports !== "undefined")
        {
        global.RpcCommunicator = require("./rpccommunicator");
        global.WebSocketConnection = require("./websocketconnection");
        }
        
function WebSocketRpcConnection()
{
var self = this;

var connection = new WebSocketConnection();
var communicator = new RpcCommunicator();	

self.callRpc =  function(method, params, object, listener)
	{
	return communicator.callRpc(method, params, object, listener);
	}


self.connect = function(options, callback)
		{
		console.log("WebSocketRpcConnection::connect()");
		connection.connect(options, function()
			{
			console.log("WebsocketRpcConnection Connected");	
			//console.log("Creating RPCCommunicator for the Websocket");
							
			communicator.addConnection(connection);
			
			console.log("WebsocketRpcConnection added to communicator");   
			callback(null, null); 
			});
		};
		
		
self.close = function()
	{	
	};			

self.getCommunicator = function()
	{
	return communicator;
	};
}

if (typeof exports !== "undefined")
        {
	module.exports = WebSocketRpcConnection;
	}
                        