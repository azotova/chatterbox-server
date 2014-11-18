/*************************************************************

You should implement your request handler function in this file.

requestHandler is already getting passed to http.createServer()
in basic-server.js, but it won't work as is.

You'll have to figure out a way to export this function from
this file and include it in basic-server.js so that it actually works.

*Hint* Check out the node module documentation at http://nodejs.org/api/modules.html.

**************************************************************/
var fs = require("fs");
var path = require('path');

var messages = [];

var domains = {};

var nextObjectId = 0;
var requestHandler = function(request, response) {
  // Request and Response come from node's http module.
  //
  // They include information about both the incoming request, such as
  // headers and URL, and about the outgoing response, such as its status
  // and content.
  //
  // Documentation for both request and response can be found in the HTTP section at
  // http://nodejs.org/documentation/api/

  // Do some basic logging.
  //
  // Adding more logging to your server can be an easy way to get passive
  // debugging help, but you should always be careful about leaving stray
  // console.logs in your code.
  var paths = request.url.split("/");
  console.log("request", request.url, "paths", paths);
  var root = paths[1] || "classes";
  var headers = defaultCorsHeaders;
  if (request.url === '/') {
    var statusCode = 302;
    var redirectPath = 'http://localhost:3000/classes/chatterbox/index.html';
    response.writeHead(statusCode, {'Location': redirectPath});
    response.end();
  } else if (paths[3] && paths[3].charAt(0)!=="?") {
    var statusCode = 200;
    var requPath = "../client/" + paths.slice(3).join("/");
    // remove ?
    if (requPath.indexOf('?') !== -1) {
      requPath = requPath.substring(0, requPath.indexOf('?'));
    }
    console.log("requPath", requPath)
    var filePath = path.join(__dirname, requPath);
    var stat = fs.statSync(filePath);
    fs.readFile(filePath, function(err, data) {
      if (err) throw err;
      var statusCode = 200;
      console.log("Type", headers['Content-Type']);
      console.log("path", requPath);
      var ext = path.extname(request.url);
      headers['Content-Type'] = validExtensions[ext];
      headers['Content-Length'] = stat.size;
      response.writeHead(statusCode, headers);
      response.write(data);
      response.end();
    });
  } else if (root === "classes") {
    var domain = paths[2] || "messages";
    if (!(domain in domains)) {
      domains[domain] = {results:[]};
    }
    var method = request.method;
    if (method === 'OPTIONS') {
      var statusCode = 200;
      headers['Content-Type'] = "text/plain";
      response.writeHead(statusCode, headers);
      response.end();
    } else if (method === 'GET') {
      var statusCode = 200;
      headers['Content-Type'] = "application/json";
      // headers['Content-Length'] = stat.size;
      response.writeHead(statusCode, headers);
      var responseContent = JSON.stringify(domains[domain])
      response.end(responseContent);
    } else if (method === 'POST') {
      var body = '';
      request.on('data', function (data) {
        body += data;
          // Too much POST data, kill the connection!
          if (body.length > 1e6) {
            request.connection.destroy();
          }
        });
      request.on('end', function () {
        var msgData = JSON.parse(body);
        msgData.objectId = parseInt(nextObjectId++);
        var timestamp = new Date().toISOString();
        msgData.createdAt = msgData.updatedAt = timestamp;
        domains[domain].results.push(msgData);

        var statusCode = 201;
        headers['Content-Type'] = "text/plain";
        response.writeHead(statusCode, headers);
        response.end();
      });
    }
  } else {
    // The outgoing status.
    var statusCode = 404;

    // See the note below about CORS headers.
    var headers = defaultCorsHeaders;

    // Tell the client we are sending them plain text.
    //
    // You will need to change this if you are sending something
    // other than plain text, like JSON or HTML.
    headers['Content-Type'] = "text/plain";

    // .writeHead() writes to the request line and headers of the response,
    // which includes the status and all headers.
    response.writeHead(statusCode, headers);

    // Make sure to always call response.end() - Node may not send
    // anything back to the client until you do. The string you pass to
    // response.end() will be the body of the response - i.e. what shows
    // up in the browser.
    //
    // Calling .end "flushes" the response's internal buffer, forcing
    // node to actually send all the data over to the client.
    response.end("Page not found");
  }
};

// These headers will allow Cross-Origin Resource Sharing (CORS).
// This code allows this server to talk to websites that
// are on different domains, for instance, your chat client.
//
// Your chat client is running from a url like file://your/chat/client/index.html,
// which is considered a different domain.
//
// Another way to get around this restriction is to serve you chat
// client from this domain by setting up static file serving.
var defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10 // Seconds.
};

var validExtensions = {
  ".html" : "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".png": "image/png"
};

exports.requestHandler = requestHandler;
exports.defaultCorsHeaders = defaultCorsHeaders;
