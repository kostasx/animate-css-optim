"use strict";

var fs       = require("fs");
var _        = require("underscore");
var css      = require("css");
var async	 = require("async");
var chalk	 = require("chalk");
var CleanCSS = require("clean-css")

var urls = require("./config.js");

/************ HELPER FUNCTIONS ************/

// GET FILESIZE
function getFilesizeInBytes( filename ) {  return fs.statSync(filename)["size"];  }
// CALCULATE PERCENTAGE
function percentageDiff( before, after ){  return Math.round( ( ( ( before - after ) / before ) * 100 ) ) + "%";  }
// FOR LOOP AND SPLICE ARRAY: THANKS @ http://upshots.org/actionscript/javascript-splice-array-on-multiple-indices-multisplice
function multisplice( array , argsArray ){
    for ( var i = 0; i < argsArray.length; i++ ){  array.splice( argsArray[i] - i, 1);  }	
}

/************ GET LATEST LIBRARY CLASSES ************/

var animateCssFile   = process.cwd() + "/node_modules/animate.css/animate.css";
var file             = fs.readFileSync( animateCssFile, "UTF-8" );	// READ FILE AND STORE IN VARIABLE SYNCHRONOUSLY
var cssAST           = css.parse( file ); 							// EXPORT CSS AST FROM CSS FILE
var animStyles       = [];											// ARRAY HOLDING ALL AVAILABLE ANIMATION STYLES FROM LATEST LIBRARY VERSION
var animStylesActive = [];											// ARRAY HOLDING ACTIVE ANIMATION STYLES USED ON PAGE

_.each( cssAST.stylesheet.rules, function( value, key ){
	// FILTER OUT DUPLICATE VALUES FOR -webkit-keyframes
	( value.type === 'keyframes' && value.vendor !== '-webkit-' ) && animStyles.push( value.name );
});

/************ LOAD PAGE(S) (WE COULD ALSO READ A LOCAL FILE VIA fs) ************/

var request = require('request');
var cheerio = require('cheerio');
var request = request.defaults({
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0' },
});

var asyncRequests = [];

if ( urls.length > 0 ) init();

function init(){

	urls.forEach(function(url){
		var cb = function(done){ requestURL( url, done ); }
		asyncRequests.push(cb);
	});

	async.series( 
		asyncRequests,
		function(err){
			if (err) console.log(err, err.message);
			console.log("FINISHED ASYNC REQUESTS. COMPILED LIST OF ACTIVE .animated CLASSES:\n", animStylesActive, "\n");
			removeUnused(animStylesActive);
		},
		true
	);
	
}

/************ REQUEST PAGE AND SEARCH FOR .animated CLASS ************/
function requestURL( url, done ){

	request( url, function (error, response, html) {

		console.log( chalk.cyan("Requesting page at: ") + chalk.cyan.bold(url) );
	    if (!error && response.statusCode == 200) {

	        var $ = cheerio.load( html,{ normalizeWhitespace: false, xmlMode: false, decodeEntities: true });

	        $('.animated, .wow').each( function ( index, element ) {

	        	var classes = $(element).attr("class").split(/\s+/);

	        		if ( ~classes.indexOf("animated") ){
		        		classes.splice( classes.indexOf("animated"), 1 );	// REMOVE .animated CLASS WHICH WE DON'T NEED
	        		} 

	        		if ( ~classes.indexOf("wow") ){
		        		classes.splice( classes.indexOf("wow"), 1 );	// REMOVE .animated CLASS WHICH WE DON'T NEED
	        		} 

	        	// FILTER USED animate.css CLASSES
	        	classes.forEach(function(_class){
	        		//console.log(chalk.red(_class));
	        		( ~animStyles.indexOf(_class) && !~animStylesActive.indexOf(_class) ) && animStylesActive.push( _class );
	        	});

	        });

	        done();

	    } else { console.log('ERR: %j\t%j',error,response.statusCode); }

	});
	
}

/************ DISPLAY FILE STATISTICS AFTER OPTIMIZATIONS ************/
function displayStats(){

	var prettyBytes = require("pretty-bytes");

	var animateDevBefore  = getFilesizeInBytes( process.cwd() + "/node_modules/animate.css/animate.css" );
	var animateProdBefore = getFilesizeInBytes( process.cwd() + "/node_modules/animate.css/animate.min.css" );
	var animateDevAfter   = getFilesizeInBytes( process.cwd() + "/output/animate.css" );
	var animateProdAfter  = getFilesizeInBytes( process.cwd() + "/output/animate.min.css" );

	console.log("\n");
	console.log( chalk.cyan("Reduced size by ") + percentageDiff( animateProdBefore, animateProdAfter) + " (Saved: " + prettyBytes( animateProdBefore - animateProdAfter ) + ")"+ chalk.cyan(" on ") + chalk.cyan.bold("Production") + chalk.cyan(" version."));
	console.log( chalk.cyan("Reduced size by ") + percentageDiff( animateDevBefore, animateDevAfter) + " (Saved: " + prettyBytes( animateDevBefore - animateDevAfter ) + ")" + chalk.cyan(" on ") + chalk.cyan.bold("Development") + chalk.cyan(" version.\n"));

}

/************ REMOVE UNUSED animate.css CLASSES BASED ON AN ARRAY OF USED CLASSES (doh) ************/
function removeUnused( used ){

	var beforeRules = cssAST.stylesheet.rules;
	var unusedIndex = [];

	var beforeRulesCount = beforeRules.length;

	beforeRules.forEach(function( rule, index, rulesArray ){

		// ENSURE WE ARE WORKING WITH ANIMATION CLASSES THAT CAN BE REMOVED
		// THIS MEANS WE ARE FILTERING OUT CSS DECLARATION THAT ARE NOT 'keyframes' or 'rule' TYPE

		// PROCESS/FILTER 'keyframes' TYPE CSS
		if ( rule.type === "keyframes" ){ // ~animStyles.indexOf()
			if ( ~animStyles.indexOf(rule.name) ){
				if ( !~used.indexOf(rule.name) ) {
					unusedIndex.push(index);	// WE DO NOT USE THIS RULE. DUMP IT!
				} 
			}
		}

		// PROCESS/FILTER 'rule' TYPE CSS 
		if ( rule.type === "rule" && typeof rule.declarations[1] !== "undefined"){
			if ( rule.declarations[1].property === "animation-name" && !~used.indexOf(rule.declarations[1].value) ){
				unusedIndex.push(index);	// WE DO NOT USE THIS RULE. DUMP IT!
			} 
		}

	});

	multisplice( beforeRules, unusedIndex );	

	console.log( chalk.cyan( "FINISHED: ") + ( beforeRulesCount - beforeRules.length ) + chalk.cyan(" unused rules removed.\n" ) );
	cssAST.stylesheet.rules = beforeRules;	// REPLACE OLD RULES WITH USED ONLY
	
	var output = css.stringify(cssAST);

	if ( !fs.existsSync( process.cwd() + "/output" ) ){
		// CREATE OUTPUT DIR IF IT DOESN'T EXIST
	    fs.mkdirSync( process.cwd() + "/output" );
	} 

    // WRITE OPTIMIZED CSS FILE
	fs.writeFile( process.cwd() + "/output/animate.css", output, function(err) {
		if ( !err ) {
			console.log( chalk.cyan("Optimized version saved at:\n") + process.cwd() + "/output/animate.css\n" );
			// MINIFY OPTIMIZED CSS FILE
			var minified = new CleanCSS().minify(output).styles;

			fs.writeFile( process.cwd() + "/output/animate.min.css", minified, function(err) {
				if ( !err ) {
					console.log( chalk.cyan("Minified and Optimized version saved at:\n") + process.cwd() + "/output/animate.min.css" );
					// DISPLAY STATISTICS
					displayStats();

				}
			});
		} 
	});

}