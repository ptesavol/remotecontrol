"use strict";

// Do this only in node.js, not in the browser

if (typeof exports !== "undefined")
	{
	global.CallbackBuffer = require("./callbackbuffer");
	}
		

/* 
* A class that implements the JSON-RPC 2.0 protocol.
* Communicates with the outside world with EngineIOConnection, WebSocketConnection or WebRTCConnection objects.
* on the layer below. This is a two-way class that implements both client and server functionality.
*/

function RpcCommunicator()
{
var self = this;

var callSequence = 1;
var exposedRpcMethods = new Object();

//var logger = new Logger();

var connectionListener = null;
var disconnectionListener = null;
var binaryListener = null;

var uri = "";
var callbackBuffer = new CallbackBuffer();
var connections = new Object();
var connectionSequence = 0;
var latestConnectionId = null;

//** Upwards interface towards business logic

self.exposeRpcMethod = function(name, object_, method_)
	{
	//console.log("RpcCommunicator::exposeRpcMethod name: "+name+", object_: "+object_+", method_: "+ method_);	
	try	{
		exposedRpcMethods[name] = {object: object_, method: method_};
		}
	catch(e)
		{
		console.log(e);
		}	
	};

self.setConnectionListener = function(object_, listener_)
	{
	connectionListener = {object: object_, listener: listener_}; 
	};
	
self.setDisconnectionListener = function(object_, listener_)
	{
	disconnectionListener = {object: object_, listener: listener_};
	};	

self.setBinaryListener = function(lis)
	{
	binaryListener = lis;
	};

//Outgoing RPC call

self.callRpc =  function(method, params, object, listener, connectionId)
	{
	try	{
		if (typeof listener == "function")	// call: expects a response object
			{
			callbackBuffer.pushBack(callSequence, object, listener);
		
			console.log("RpcCommunicator::callRpc() pushed back callback");
		
			if (typeof connectionId != "undefined")						
				sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": callSequence}, connectionId);	
			else
				sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": callSequence}, latestConnectionId);	//assume there is only one connection	
		
			console.log("RpcCommunicator::callRpc() sendMessage returned");
			callSequence++;			
			}
		else	
			{											// notification: doesn't expect a response object
			if (typeof connectionId != "undefined")
				sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": null}, connectionId);
			else
				sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": null}, latestConnectionId);
			}
		}
	catch(e)
		{
		console.log(e);	
		}		
	};

// Sends a RPC notification to all connections	
self.notifyAll =  function(method, params)
	{
	try	{
		for (var key in connections)
			{
			console.log("RpcCommunicator::notifyAll() sending message to "+key);
			sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": null}, key);
			}
		console.log("RpcCommunicator::notifyAll() sending messages completed");
		}
	catch(e)
		{
		console.log(e);	
		}	
	};

self.getBufferedAmount = function(connectionId)
	{
	return connections[connectionId].getBufferedAmount();	
	};
	
self.sendBinary = function(data, connectionId)
	{
	console.log("RPCCommunicator::sendBinary() "+data.byteLength);
	try	{
		connections[connectionId].sendBinary(data);	
		}
	catch (e)
		{
		console.log(e);
		}	
	};
//** Private methods

var sendMessage = function(message, connectionId)
	{
	console.log(message);
	try	{
		connections[connectionId].send(JSON.stringify(message));	
		}
	catch (e)
		{
		console.log(e);
		}	
	};

// Send the return value of the RPC call to the caller  
var sendResponse = function(err, result, id, connectionId)
	{
	try	{
		if (err)
			{
			sendMessage({"jsonrpc": "2.0", "error": err, "id": id});	
			var code = (typeof err.code != "undefined" ? err.code : "");
			var path = (typeof err.path != "undefined" ? err.path : "");
			var msge = (typeof err.message != "undefined" ? err.message : "");
			console.log("Exception in executing a RPC method: " + code + " EngineIoCommunicator::onMessage() >> " + path + " " + msge);		
			}
		else
			sendMessage({"jsonrpc": "2.0", "result": result, "id": id}, connectionId);
		}
	catch (e)
		{
		console.log(e);
		}		
	};

//Handle incoming RPC call
var handleRPCCall = function(message, connectionId)
	{
	console.log("RpcCommunicator::handleRpcCall() connectionId "+connectionId);
	try	{
		if ( !message.jsonrpc || message.jsonrpc != "2.0" || !message.method)		// Invalid JSON-RPC
			{
			sendMessage({"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid JSON-RPC."}, "id": null}, connectionId);
			return;
			}
	
		if (Object.prototype.toString.call(message.params) !== "[object Array]" )	
			{
			sendMessage({"jsonrpc": "2.0", "error": {"code": -32602, "message": "Parameters must be sent inside an array."}, "id": message.id}, connectionId);
			return;
			}
	
		if (!exposedRpcMethods.hasOwnProperty(message.method))				// Unknown method
			{
			if (message.id != null)
				{
				sendMessage({"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method " + message.method + " not found."}, "id": message.id}, connectionId);
				}
			else
				{
				sendMessage({"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method " + message.method + " not found."}, "id": null}, connectionId);
				return;
				}
			}
								// Method exists, call the method 
		var rpcMethod = exposedRpcMethods[message.method];
		
		if (typeof message.params === "undefined")
			message.params = new Array();

		//message.params.unshift(connectionId);	//add connectionId as the first parameter
		//message.params.push(connectionId);	//add connectionId as the last parameter
			
		if (message.id != null)		//It is a call		!!!!!!!!!!!!!!!! ToDO: fix this memory-hog! 
			{
			message.params.push(connectionId);      //add connectionId as the last parameter before callback
			message.params.push(function(err,result) {sendResponse(err,result,message.id, connectionId);});
			
			rpcMethod.method.apply(rpcMethod.object, message.params);
			}
			
		else	
			{					//It is a notification
			message.params.push(connectionId);      //add connectionId as the last parameter before callback
			message.params.push(function(err,result) {});
			rpcMethod.method.apply(rpcMethod.object, message.params);
			}
		}	
	catch (e)
		{
		console.log(e);
		}		
	};

// Handle an incoming return value for a RPC call that we have made previously
var handleReturnValue = function(message)
	{
	console.log(message);
	try	{
		var error = null;
		var result = null;
	
		if (typeof message.error !== "undefined")
			error = message.error;

		if (typeof message.result !== "undefined")
			result = message.result;
	
		if (message.id)
			callbackBuffer.callMethodAndPop(message.id, error, result);
		else
			console.log("RpcCommunicator::handleReturnValue() error: "+JSON.stringify(error));
		}
	catch (e)
		{
		console.log(e);
		}	
	};


var handleMessage = function(message, connectionId)
	{
	try	{
		if (message.method) 			// Received an RPC Call from outside
			handleRPCCall(message, connectionId);
		else										// Received a return value to an RPC call made by us
			handleReturnValue(message);
		}
	catch (e)
		{
		console.log(e);
		}	
	};

var generateRandomConnectionId = function()
	{
	connectionSequence++; 
	var ret = connectionSequence;
	
	while (true)
		{
		ret = Math.floor(Math.random() * 4294967296);	//2 to power 32
		if (!connections.hasOwnProperty(ret))
			break;
		}
		
	return ret;	
	}

//** Downwards interface towards a connection

//** MessageListener interface implementation

self.onMessage = function(messageData, connection)
	{
	console.log("RpcCommunicator::onMessage() "+messageData);

	try	{
		if (messageData instanceof ArrayBuffer)
			{
			//console.log("received arraybuffer ");
			if (binaryListener)
				binaryListener.onBinary(messageData, connection.getId());
			return;
			}
	
		var parsedMessage;
		try 
			{
			parsedMessage = JSON.parse(messageData);
			}
		catch (err)
			{
			sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null}, connection.getId());
			return;
			}	
		handleMessage(parsedMessage, connection.getId());
		}
	catch(e)
		{
		console.log(e);
		}	
	};

//** ConnectionListener interface implementation

self.addConnection = function(conn)
	{
	try	{	
		console.log("RpcCommunicator::addConnection, connectionid was "+conn.getId());	
	
		//Use random connectionId to make ddos a little more difficult
		
		if (!conn.getId())
			{
			conn.setId(generateRandomConnectionId());
			}
			
		connections[conn.getId()] = conn;
		conn.setListener(self);	
		
		if (connectionListener)
			{
			connectionListener.listener.call(connectionListener.object, conn.getId());
			}
		
		latestConnectionId = conn.getId();	
		return conn.getId();
		}
	catch(e)
		{
		console.log(e);
		}	
	};
	
self.onDisconnected = function(connectionId)	
	{
	try	{
		self.closeConnection(connectionId);
	
		if (disconnectionListener)
			disconnectionListener.listener.call(disconnectionListener.object, connectionId);
		}
	catch(e)
		{
		console.log(e);
		}	
	};

//** ---------------------------------------

self.closeConnection = function(connectionId)
	{
	try	{
		if (connectionId in connections)
			{
			connections[connectionId].close();
			delete connections[connectionId];

			//if(typeof options.connectionListener == "function")								// External connection listener
			//options.connectionListener("close", {remoteAddress: connection.remoteAddress, remotePort: connection.remotePort, origin: connection.origin, id: connection.id});
			}
		}
	catch(e)
		{
		console.log(e);
		}		
	};

}

// Do this only in node.js, not in the browser

if (typeof exports !== "undefined")
	{
	module.exports = RpcCommunicator;
	}
