"use strict";

function Spaceify()
{
var self = this;

var EDGE_IP = "10.0.0.1";
var CORE_ADDRESS = {host: EDGE_IP, port: 2947};
var CORE_PORT_SECURE = 4947;
var serviceConnections = {};
var coreConnection = new WebSocketRpcConnection();


var initializeConnections = function(callback)
	{
	var opts = CORE_ADDRESS;
	
	if (location.protocol === "https:") 
		{
		opts.isSsl=true;
		opts.port = CORE_PORT_SECURE;
		}
		
	coreConnection.connect(opts, function()
		{
		console.log("Websocket Connected to the Core");	
		callback();
		});	
	};

var createServiceConnection = function(serviceName, id, callback)
	{
	coreConnection.callRpc("getService",[serviceName,""], self, function(err, data)
		{
		var connection = serviceConnections[serviceName];
		if (!connection)
			connection = new WebSocketRpcConnection();
		var opts = {};
		opts.host = EDGE_IP;
		opts.port = data.port;
		if (location.protocol === "https:")
			{
			opts.isSsl=true;
			opts.port = data.secure_port;
			}		
		if (id)
			opts.id = id;
		
		connection.connect(opts, function()
			{
			serviceConnections[serviceName] = connection;	
			callback();
			});	
		});
	};

var recurseServiceConnections = function(serviceNames, id, callback)
	{
	if (serviceNames.length > 0)	
		{
		createServiceConnection(serviceNames.pop(), id, function()
			{
			if (serviceNames.length > 0)
				recurseServiceConnections(serviceNames, id, callback);
			else	
				callback();			
			});	
		}
	};

self.connect = function(serviceNames, callback, id)
	{
	initializeConnections(function()	
		{
		if (serviceNames)
			{
			recurseServiceConnections(serviceNames, id, function()
				{
				callback();
				});
			}
		else
			{
			callback();	
			}
		});
	};

self.connectToServices = function(serviceNames, callback, id)
	{
	recurseServiceConnections(serviceNames, id, function()
		{
		callback();
		});	
	};
			
self.getRequiredService = function(serviceName) 
	{
	if (!serviceConnections[serviceName])
		serviceConnections[serviceName] = new WebSocketRpcConnection();
	return serviceConnections[serviceName].getCommunicator();	
	};

self.startSpacelet = function(spaceletName, callback)
	{
	coreConnection.callRpc("startSpacelet",[spaceletName], self, function(err, data)
		{
		if (err)
			console.log("Error in starting spacelet: "+ err);
		else
			callback();
		});
	};	
}

var spaceify = new Spaceify();
