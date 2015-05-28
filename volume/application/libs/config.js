// Note that this file is not used inside real spaceify!!
// If running in real spaceify, the file /var/lib/spaceify/code/config.js
module.exports = function()
{
var config = 
	{	
	"API_PATH": "./api/",
	"API_WWW_PATH": "./spaceifyapplication/api/www/",
	"API_NODE_MODULES_DIRECTORY": "./api/node_modules",
	"APPLICATION_PATH": "../",
	"APPLICATION_TLS_PATH": "../tls/",
	"APPLICATION_WWW_PATH": "../www/",
	"FIRST_SERVICE_PORT": 2777,
	"FIRST_SERVICE_PORT_SECURE": 3777,
	"SERVER_CRT": "server.crt",
	"SERVER_KEY": "server.key",
	"SPACEIFY_CRT": "spaceify.crt",
	"EDGE_IP": "10.0.0.1",
	"EDGE_HOSTNAME": "edge.spaceify.net"
	};

return config;
};
