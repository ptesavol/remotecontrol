
/**
 * SpaceifyApplication, 14.4.2015 Spaceify Inc.
 * 
 * @class SpaceifyApplication
 *
 * This is the class that implements functionality common to all Spaceify applications
 *
 */

var isRealSpaceify = process.env["PORT_80"];

var fs = require("fs");
var url = require("url");

var HTTP_PORT = null;
var HTTPS_PORT = null;
var Config = null;

if (isRealSpaceify)
	{
	Config = require("/api/config")();
	HTTP_PORT = 80;
	HTTPS_PORT = 443;
	}
else
	{
	Config = require("./config")();	
	HTTP_PORT = 6080;
	HTTPS_PORT = 6443;
	}



var API_PATH = Config.API_PATH || "";
var MANIFEST_PATH = Config.APPLICATION_PATH || "";
var APPLICATION_WWW_PATH = Config.APPLICATION_WWW_PATH || "";
var APPLICATION_TLS_PATH = Config.APPLICATION_TLS_PATH || "";
var API_WWW_PATH = Config.API_WWW_PATH || "";
var SHARED_MODULES_PATH = Config.API_NODE_MODULES_DIRECTORY+"/" || "";



var fibrous = require(SHARED_MODULES_PATH+"fibrous");
var logger = require(API_PATH+"logger");
var Utility = require(API_PATH+"utility");
var Config = require(API_PATH+"config")();
var WebServer = require(API_PATH+"webserver");


Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH+"spaceify.manifest", "utf8"));

var WebSocketRpcConnection = require("./communication/websocketrpcconnection.js");
var RpcCommunicator = require("./communication/rpccommunicator.js");
var WebSocketServer = require("./communication/websocketserver.js");

function ProvidedService(serviceName)
{
var self = this;

var communicator = new RpcCommunicator();
var webSocketServer = new WebSocketServer();
var secureWebSocketServer = new WebSocketServer();

webSocketServer.setConnectionListener(communicator);
secureWebSocketServer.setConnectionListener(communicator);

self.start = function(port, securePort, key, certificate, authorityCertificate)
	{
	console.log("ProvidedService::start() port: "+port+", securePort: "+securePort+", key: "+key+", certificate: "+certificate +", authorityCertificate: "+authorityCertificate);
	webSocketServer.listen({host: "", port: port}, function(err,data)
		{
		if (err)
			console.log(err);
		});
	console.log("websocketsever of "+serviceName+ " started on port "+port);
	secureWebSocketServer.listen({host: "", port: securePort, isSsl: true, sslKey: key, sslCert: certificate, sslAuthCert: authorityCertificate}, function(err,data)
		{
		if (err)
			console.log(err);
		});
	console.log("Secure websocketsever of " +serviceName + " started on port " +securePort);
	};

self.stop = function()
	{
	webSocketServer.close();
    secureWebSocketServer.close();
    };

self.getCommunicator = function()
	{
	return communicator;
	};
}

function SpaceifyApplication()
{
var self = this;


var requiredServices = {};
var providedServices = {};	//a providedservice contains a websocketserver, secureWebSocketServer, communicator	


var httpServer = new WebServer();
var httpsServer = new WebServer();
	
var coreConnection = null; 

var serviceConnections = {};
	
var www_path = APPLICATION_WWW_PATH;

var ca_crt = API_WWW_PATH + Config.SPACEIFY_CRT;
var key = APPLICATION_TLS_PATH + Config.SERVER_KEY;
var crt = APPLICATION_TLS_PATH + Config.SERVER_CRT;

self.start = fibrous( function(app)
	{
	try
		{
		console.log("SpaceifyApplication::start() "+Manifest.name);
		
		// Establish a RPC connection to the Spaceify Core
		
		if (isRealSpaceify)
			{
			coreConnection = new WebSocketRpcConnection();
			coreConnection.connect.sync({host: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, persistent: true, owner: Manifest.name});
			console.log("core connected");
			}
		
		// Start applications http and https web servers
		httpServer.connect.sync({hostname: null, port: HTTP_PORT, www_path: www_path, owner: Manifest.name});
		console.log("httpsever started on port "+HTTP_PORT);
		httpsServer.connect.sync({hostname: null, port: HTTPS_PORT, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, www_path: www_path, owner: Manifest.name});
		console.log("httpssever started on port "+HTTPS_PORT);
		
		// Connect to required services
		console.log("Starting to connect to required services");
		
		if (Manifest.requires_services)
			{
			for (var i=0; i<Manifest.requires_services.length; i++)
				{
				var data = coreConnection.sync.callRpc("getService", [Manifest.requires_services[i].service_name,""],self);
				var connection = new WebSocketRpcConnection();
				var opts = {};
				opts.host = Config.EDGE_HOSTNAME;
				opts.port = data.port;
				connection.sync.connect(opts);
				serviceConnections[Manifest.requires_services[i].service_name] = connection;
				}
			}			
		// Register provided services
		console.log("starting to register services");	
		
		if (Manifest.provides_services)
			{
			var serviceName = "";
			var port = Config.FIRST_SERVICE_PORT;
			var securePort = Config.FIRST_SERVICE_PORT_SECURE;
			
			for (var i=0; i<Manifest.provides_services.length; i++)
				{
				serviceName = Manifest.provides_services[i].service_name;
				
				console.log("registering service "+ serviceName);
				
				providedServices[serviceName] = new ProvidedService(serviceName);	
				providedServices[serviceName].start(port, securePort, key, crt, ca_crt);	
				
				if (isRealSpaceify)
					{
					coreConnection.sync.callRpc("registerService", [serviceName], self);
					}
				port++;
				securePort++
				}
			}	
		//Call the initialize method of the actual application
		
		app.start();
		console.log("app.start() returned");
		//communicator.setConnectionListener(app);
		
		// Notify the core application initialialized itself successfully
		if (isRealSpaceify)
		    {
		    console.log("calling initialized");
		    coreConnection.sync.callRpc("initialized", [true, null],self);
		    }
		}
	catch(err)
		{
		logger.error(err.message);

		// Notify the core application failed to initialialize itself. The error message can be passed to the core.
		if (isRealSpaceify)
		 {
		 coreConnection.sync.call("initialized", [false, err.message], self);
		 }
		stop.sync();
		}
	finally
		{
		if (isRealSpaceify)
		 {
		 coreConnection.sync.close();
		 }
		}
	});
	
self.stop = fibrous( function()
	{
	httpServer.sync.close();
	httpsServer.sync.close();
	
	for (key in providedServices)
	        providedServices[key].stop();
	});

self.getRequiredService = function(serviceName) 
	{
	return serviceConnections[serviceName].getCommunicator();	
	};	
	
self.getProvidedService = function(serviceName)
       {
       return providedServices[serviceName].getCommunicator();
       };

self.getOwnUrl = function(isSecure)
      {
      var port = (!isSecure ? process.env["PORT_80"] : process.env["PORT_443"]);
      var ownUrl = (!isSecure ? "http://" : "https://") + Config.EDGE_HOSTNAME + ":" + port;
      return ownUrl;
      };
	
}

if (typeof exports !== "undefined")
	{
	module.exports = new SpaceifyApplication();
	}
