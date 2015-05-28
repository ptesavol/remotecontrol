"use strict";

var spaceify = require("./libs/spaceifyapplication.js");


function RemoteControl()
{
var self = this;

var currentUrl = null; 
		

self.onClientConnected = function(id)
	{
	console.log("RemoteControl::onClientConnected() "+id);
	//spaceify.getProvidedService("spaceify.org/services/remotecontrol").callRpc("goToUrl",["http://www.amiga.org"], null, id);
	};
	
self.onClientDisconnected = function(id)
	{
	console.log("RemoteControl::onClientDisconnected() "+id);
	};	
	
self.scrollAll = function(x,y)
        {
        console.log("RemoteControl::scrollAll()");
        spaceify.getProvidedService("spaceify.org/services/remotecontrol").notifyAll("scrollTo",[x,y]);
        }
        
self.redirectAllToUrl = function(url)
	{
	console.log("RemoteControl::redirectAllToUrl() "+url);
	spaceify.getProvidedService("spaceify.org/services/remotecontrol").notifyAll("goToUrl",[url]);
	/*
	if (url.substring(0, "http://".length) !== "http://" && url.substring(0, "https://".length) !== "https://")
		currentUrl = "http://" + url;
	else	
		currentUrl = url;
	
	var screenUrl = spaceify.getOwnUrl(false)+"/screen.html";	
	spaceify.getRequiredService("spaceify.org/services/bigscreen").callRpc("setContentURL", [screenUrl, "default", null], self);
	
	spaceify.getProvidedService("spaceify.org/services/urlviewerscreen").notifyAll("showUrl",[currentUrl]);
	*/
	};

self.start = function()
	{
	console.log("RemoteControl::start()");	
	
	spaceify.getProvidedService("spaceify.org/services/remotecontrol").exposeRpcMethod("redirectAllToUrl", self, self.redirectAllToUrl);
	spaceify.getProvidedService("spaceify.org/services/remotecontrol").exposeRpcMethod("scrollAll", self, self.scrollAll);			
	
	console.log("RemoteControl::start() rcp methods exposed");
		
	spaceify.getProvidedService("spaceify.org/services/remotecontrol").setConnectionListener(self, self.onClientConnected);
	console.log("UrlViewer::start() connectionlistener added ");
	
	spaceify.getProvidedService("spaceify.org/services/remotecontrol").setDisconnectionListener(self, self.onClientDisconnected);
	console.log("RemoteControl::start() all listeners added");
	};

var stop = function()
	{
	spaceify.stop();
	};

}


var remoteControl = new RemoteControl();

spaceify.start(remoteControl, function(err,data) 
	{
	if(err) 
		console.log(err);
	});	
	
