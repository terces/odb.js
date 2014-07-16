odb.js
===
Object based file database

[Credit by terces]

Current Feature:

oput: [POST] upload a file to object database
	curl -XPOST -F "@f=filename" http://$HOST:$PORT/oput 

oget: [GET] Get a file from object database
	curl http://$HOST:$PORT/oget/$HASHSTR

odelete: [POST] make delete tag on files from object database 
	curl -XPOST http://$HOST:$PORT/odelete/$HASHSTR

opurge: [POST] REALLY delete files with delete tag
	curl -XPOST http://$HOST:$PORT/opurge

Future work: 

ovalid: 
	[GET]  make sure your valid status 
		Valid status:
			Valid: All method you can use;
			Allow: Allow you to do oput/oget
			Deny:  Access deined
	[POST] Setup the valid/allow/deny sites
		curl -XPOST http://$HOST:$PORT/$VALID/$SITES
