function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function removeParameter(url, parameter)
{
  var fragment = url.split('#');
  var urlparts= fragment[0].split('?');

  if (urlparts.length>=2)
  {
    var urlBase=urlparts.shift(); //get first part, and remove from array
    var queryString=urlparts.join("?"); //join it back up

    var prefix = encodeURIComponent(parameter)+'=';
    var pars = queryString.split(/[&;]/g);
    for (var i= pars.length; i-->0;) {               //reverse iteration as may be destructive
      if (pars[i].lastIndexOf(prefix, 0)!==-1) {   //idiom for string.startsWith
        pars.splice(i, 1);
      }
    }
    url = urlBase+'?'+pars.join('&');
    if (fragment[1]) {
      url += "#" + fragment[1];
    }
  }
  return url;
}

function getGetParameter(val) 
	{
	var result = null,
	tmp = [];
	location.search.substr(1).split("&").forEach(function (item) 
		{
		tmp = item.split("=");
		if (tmp[0] === val) 
			result = decodeURIComponent(tmp[1]);
		});
	return result;
	}

var spaceifyIframe = null;
var sessionType = null;

function RemoteControlClient()
	{
	var self = this;
	

	self.goToUrl = function(url)
		{
		console.log("RemoteControlClient::goToUrl() "+url);
		if (sessionType != "master")
			window.location = url;
		};
		
	self.scrollTo = function(x,y)
	        {
	        console.log("RemoteControlClient::scrollTo() "+x+","+y);
	                if (sessionType != "master")
	        window.scroll(x,y);
	        };
	
	self.onScroll = function(event)
	        {
	        var y = window.scrollY;
	        var x = window.scrollX;
	        console.log("X was: "+x+", Y was: "+y);
	        spaceify.getRequiredService("spaceify.org/services/remotecontrol").callRpc("scrollAll", [x,y], self, null);
	        }        	
	self.onServicesConnected = function()
		{
		//Now the initialization is complete
		
		console.log("RemoteControlClient::onServicesConnected()");	
		
		if (sessionType ==  "master")
			{
			var urlStr = window.location.href;
			url = removeParameter(urlStr, "spaceifysession");
			
			if (url.charAt(url.length-1)==="?")
			        url = url.substring(0, url.length-1);
			        
			console.log("Stripped url is: " +url);
			spaceify.getRequiredService("spaceify.org/services/remotecontrol").callRpc("redirectAllToUrl", [url], self, null);
			
	                window.addEventListener("scroll", self.onScroll, false);		
			}
		
		}
			
	self.onSpaceletRunning = function()
		{
		console.log("RemoteControlClient::onSpaceletRunning()");
		
		//Connect to the service on the spacelet
		
		spaceify.connectToServices(["spaceify.org/services/remotecontrol"], self.onServicesConnected);
		};
			
	self.onSpaceifyConnected = function()
		{
		console.log("RemoteControlClient::spaceifyConnected()");
		
		//Ensure that the spacelet is running
		spaceify.startSpacelet("spaceify/remotecontrol", self.onSpaceletRunning);
		};

	self.start = function()
		{
		console.log("RemoteControlClient::start()");
		
		spaceify.getRequiredService("spaceify.org/services/remotecontrol").exposeRpcMethod("goToUrl", self, self.goToUrl);
		spaceify.getRequiredService("spaceify.org/services/remotecontrol").exposeRpcMethod("scrollTo", self, self.scrollTo);
		 
		 
		//Connect to the spaceify edge
		spaceify.connect(null, self.onSpaceifyConnected);
		};
	}


function onMessageFromIframe(event)
	{
	console.log("onMessageFromIframe");
	
	var data = JSON.parse(event.data);

        if (data.spaceifyoperation == "iframeloaded")
	        {
                console.log("iframeloaded message received");

                spaceifyIframe.contentWindow.postMessage(JSON.stringify({id: 1, spaceifyoperation:"get", key:"sessiontype"}),"*");
                };	
	
	
	
	if (data.spaceifyoperation == "get")
		{
		sessionType = data.value;
		
		var getParam = getGetParameter("spaceifysession");
		
		if (getParam && (getParam != sessionType))
			{
			sessionType = getParam;
			spaceifyIframe.contentWindow.postMessage(JSON.stringify({id: 1, spaceifyoperation:"put", key:"sessiontype", value: sessionType}),"*");
			}
		
		console.log("sessionType was" +sessionType);
		if (sessionType == "master" || sessionType == "slave")
			remoteControlClient.start();
		}
	
	};
function requestSessionType()
	{
	if (inIframe())
		return;

	window.addEventListener("message", onMessageFromIframe, false);
	spaceifyIframe = document.createElement("iframe");
			
	spaceifyIframe.setAttribute ("hidden","true");
	spaceifyIframe.setAttribute ("tabindex","-1");
	spaceifyIframe.setAttribute ("width","0");
	spaceifyIframe.setAttribute ("height","0");
	spaceifyIframe.setAttribute ("style","display:none;");

	
	var frameUrl = location.protocol + "//" + "edge.spaceify.net/globalstorage.html";
	spaceifyIframe.setAttribute ("src",frameUrl);

	document.body.appendChild(spaceifyIframe);	
	console.log("iframe appended to body");
	}




var remoteControlClient = new RemoteControlClient();
document.addEventListener('DOMContentLoaded', requestSessionType, false);
