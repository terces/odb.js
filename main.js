// io
var fs = require( 'fs');
// express
var express = require( 'express');
var bodyParser = require( 'body-parser');
var app = express();
// logger
var logger = require( 'morgan');

// config
var CONFIG = require( './config.json');

app.use( bodyParser.urlencoded( {
	uploadDir: CONFIG.database.prefix
}));
app.use( logger());
app.set( 'title', CONFIG.hosting.title);

app.get( '/', function( req, res) {
	res.send( "Hello, I am an object based backup database.");
});

app.post( '/oput', function( req, res) {
	// parameter f: file
	// output: 200, md5 
	//         500, error
	if( req.param( 'f') {
		var md5 = req.files
		var tmp_path = req.files.thumbnail.path;
		var tar_path = CONFIG.database.prefix + "/" +
	}
	else {

	}
});

app.get( '/oget', function( req, res) {
	// parameter h: md5
	// output: 200, file 
	//         500, error


});

app.get( '/odelete', function( req, res) {
	// parameter h: md5
	// output: 200, deleted
	//         500, error

});

app.get( '/opurge', function( req, res) {
	// limit by valid
	// no parameter
	// output: 200 deleted %% files


});

app.get( '/valid', function( req, res) {
	// get valid list in valid ip 

});

app.post( '/valid', function( req, res) {
	// set valid ip in valid list in valid ip

});

app.listen( CONFIG.hosting.port, CONFIG.hosting.host, function() {
	console.log( "Server bind at port " + CONFIG.hosting.port);
	if( !fs.existsSync( CONFIG.database.prefix)) {
		fs.mkdir( CONFIG.database.prefix, 0755);
	}
});
