// io
var fs = require( 'fs');
// express
var express = require( 'express');
var app = express();
// bodyparser
var bodyParser = require( 'body-parser');
// multer
var multer = require( 'multer');
// logger
var logger = require( 'morgan');
// crypto 
var crypto = require( 'crypto');
// cron
var cron = require( 'cron');

// config
var CONFIG = require( './config.json');

// logfile
var logfile = fs.createWriteStream( CONFIG.database.prefix + ".log", { flags: 'a'});

var database = {};
var del_pool = { deleteHash: []};

app.use( bodyParser.urlencoded({
	extended: true
}));

app.use( multer());
app.use( logger({
	stream: logfile
}));
app.set( 'title', CONFIG.hosting.title);

app.get( '/', function( req, res) {
	res.send( "Hello, I am an object based backup database.");
});

function initial_db() {
	// initial meta database 
	var dbname = CONFIG.database.prefix + "/.odb_meta";
	var init_tbl = {
		createTime: new Date().getTime(),
		lastUpdate: new Date().getTime(),
		algorithm: CONFIG.database.hashAlgorithm || 'md5'
	};
	fs.writeFileSync( dbname, JSON.stringify( init_tbl));

	var delname = CONFIG.database.prefix + "/.odb_delete";
	init_tbl = { 
		deleteHash : []
	}
	fs.writeFileSync( delname, JSON.stringify( init_tbl));
}

function load_db() {
	// loading meta database
	var dbname = CONFIG.database.prefix + "/.odb_meta";
	var raw = fs.readFileSync( dbname, "utf-8");
	database = JSON.parse( raw);
	// loading delete pool 
	var delname = CONFIG.database.prefix + "/.odb_delete";
	raw = fs.readFileSync( delname, "utf-8");
	del_pool = JSON.parse( raw);

}

function sync_db() {
	// write meta from memory to database
	var dbname = CONFIG.database.prefix + "/.odb_meta";
	fs.writeFileSync( dbname, JSON.stringify( database));
	var delname = CONFIG.database.prefix + "/.odb_delete";
	fs.writeFileSync( delname, JSON.stringify( del_pool));
	// printout sync
	console.log( new Date() + ": Sync now!");
}

app.post( '/oput', function( req, res) {
	// parameter f: file
	// output: 200, checksum
	//         500, error
	if( req.files.f) {
		var files = req.files.f.path;
		var rfd = fs.ReadStream( files);
		var hashsum = crypto.createHash( database.algorithm);

		rfd.on( 'data', function( d) {
			hashsum.update( d);
		});

		rfd.on( 'end', function() {
			var hashstr = hashsum.digest( 'hex');
			var tmp_path = req.files.f.path;
			var tar_path = CONFIG.database.prefix + "/" + hashstr[31] + "/" + hashstr;

			if( database[ hashstr] && !database[ hashstr].deleteFlag) {
				res.send( 500, {
					"put" : "fail",
					"error" : "Entry exists"
				});
			}
			else {
				var is = fs.createReadStream( tmp_path);
				var os = fs.createWriteStream( tar_path);

				is.pipe( os);
				is.on( 'end', function( err) {
					if( err) {
						res.send( 500, {
							"put" : "fail",
							"error" : err
						});
					}
					else {
						res.send( 200, {
							"put" : "success",
							"hash" : hashstr
						});
					}
					fs.unlinkSync( tmp_path);
					// set odb record
					database[hashstr] = {
						name: req.files.f.originalname,
						size: req.files.f.size,
						createTime: new Date().getTime(),
						deleteFlag: false,
						downloadCount: 0
					};
					database['lastUpdate'] = new Date().getTime();
				});
			}
		});
	}
	else {
		res.send( 500, {
			"put" : "fail",
			"error" : "File not found"
		});
	}
});

app.get( '/oget', function( req, res) {

	res.send( 200, {
		"get" : "fail",
		"error" : "Please set checksum"
	});
});

app.get( '/oget/:h', function( req, res) {
	// parameter h: checksum
	// output: 200, file 
	//         500, error
	if( req.params.h) {
		var hashstr = req.params.h; 
		var filename = CONFIG.database.prefix + "/" + hashstr[31] + "/" + hashstr;
		if( fs.existsSync( filename) && !database[hashstr].deleteFlag) {
			database[hashstr].downloadCount += 1;
			res.download( filename, database[hashstr].name);
		}
		else {
			res.send( 500, {
				'get': 'fail',
				'error': 'Entry not found'
			});
		}
	}
	else {
		res.send( 500, {
			'get': 'fail',
			'error': 'Empty entry?'
		});
	}

});

app.post( '/odelete', function( req, res) {
	// limit by allow
	// parameter h: checksum
	// output: 200, deleted
	//         500, error
	res.send( 500, {
		'delete': 'fail',
		'error': 'Empty entry?'
	});
});

app.post( '/odelete/:h', function( req, res) {
	// limit by allow
	// parameter h: checksum
	// output: 200, deleted
	//         500, error
	if( req.params.h) {
		var hashstr = req.params.h; 
		var filename = CONFIG.database.prefix + "/" + hashstr[31] + "/" + hashstr;
		if( fs.existsSync( filename) && !database[hashstr].deleteFlag) {
			database[hashstr].deleteFlag = true;
			del_pool.deleteHash.push( hashstr);
			database['lastUpdate'] = new Date().getTime();
			res.send( 200, {
				'delete': 'success',
				'hash' : hashstr
			});
		}
		else {
			res.send( 500, {
				'delete': 'fail',
				'error': 'Entry not found'
			});
		}
	}
	else {
		res.send( 500, {
			'delete': 'fail',
			'error': 'Empty entry?'
		});
	}
});

app.post( '/opurge', function( req, res) {
	// limit by valid
	// no parameter
	// output: 200 deleted %% files
	var cnt;
	for( cnt = 0; cnt < del_pool.deleteHash.length; ++cnt) {
		fs.unlinkSync( CONFIG.database.prefix + "/" + del_pool.deleteHash[cnt][31] + "/" + del_pool.deleteHash[cnt]);
		delete database[ del_pool.deleteHash[cnt]];
		del_pool.deleteHash.splice( cnt, 1);
		console.log( del_pool);
	}
	if( cnt != 0) {
		database['lastUpdate'] = new Date().getTime();
		sync_db();
		res.send( 200, {
			'purge' : 'success',
			'count' : cnt
		});
	}
	else { 
		res.send( 200, {
			'purge' : 'Failed',
			'error' : 'No entries to delete'
		});
	}
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
		var n = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
		for( var i = 0; i < n.length; i++) {
			fs.mkdir( CONFIG.database.prefix + "/" + n[i], 0755);
		}
		initial_db();
	}
	load_db();
});

process.on( 'exit', function() {
	sync_db();
});
process.on( 'SIGINT', function() {
	process.exit();
});

var cronJob = cron.job( '0 0 */2 * * *', function() {
	sync_db();
});
cronJob.start();
