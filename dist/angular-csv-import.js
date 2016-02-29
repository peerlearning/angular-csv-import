/*! angular-csv-import - v0.0.26 - 2015-11-11
* Copyright (c) 2015 ; Licensed  */

// Modified by rao@avanti.in to
//		1. Remove a null access error that was coming in the console
//		2. Add preprocessing and validation to CSV imports
//		3. Handling CSV files which had implicit carriage returns and double quotes within them

'use strict';

var csvImport = angular.module('ngCsvImport', []);

csvImport.directive('ngCsvImport', function() {
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		scope:{
			content:'=?',
			header: '=?',
			headerVisible: '=?',
			separator: '=?',
			separatorVisible: '=?',
			result: '=?',
			encoding: '=?',
			encodingVisible: '=?',
			accept: '=?'
		},
		template: '<div>'+
		  '<div ng-show="headerVisible"><div class="label">Header</div><input type="checkbox" ng-model="header"></div>'+
			'<div ng-show="encoding && encodingVisible"><div class="label">Encoding</div><span>{{encoding}}</span></div>'+
			'<div ng-show="separator && separatorVisible">'+
			'<div class="label">Seperator</div>'+
			'<span><input class="separator-input" type="text" ng-change="changeSeparator" ng-model="separator"><span>'+
			'</div>'+
			'<div><input class="btn cta gray" type="file" multiple accept=".csv"/></div>'+
			'</div>',
		link: function(scope, element) {
			scope.separatorVisible = scope.separatorVisible || false;
			scope.headerVisible = scope.headerVisible || false;

			angular.element(element[0].querySelector('.separator-input')).on('keyup', function(e) {
				if ( scope.content != null ) {
					var content = {
						csv: scope.content,
						header: scope.header,
						separator: e.target.value,
						encoding: scope.encoding
					};
					scope.result = csvToJSON(content);
					scope.$apply();
				}
			});

			element.on('change', function(onChangeEvent) {
				var reader = new FileReader();
				if (!onChangeEvent.target.files)
					return
				scope.filename = onChangeEvent.target.files[0].name;
				reader.onload = function(onLoadEvent) {
					scope.$apply(function() {
						var content = {
							csv: onLoadEvent.target.result.replace(/\r\n|\r/g,'\n'),
							header: scope.header,
							separator: scope.separator
						};
						scope.content = content.csv;
						scope.result = csvToJSON(content);
						scope.result.filename = scope.filename;
					});
				};

				if ( (onChangeEvent.target.type === "file") && (onChangeEvent.target.files != null || onChangeEvent.srcElement.files != null) )  {
					reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0], scope.encoding);
				} else {
					if ( scope.content != null ) {
						var content = {
							csv: scope.content,
							header: !scope.header,
							separator: scope.separator
						};
						scope.result = csvToJSON(content);
					}
				}
			});

			var csvToJSON = function(content) {
				if (!content.header) {
					window.alert("Invalid CSV File\n\nNo header line present!");
					return [];
				}
				var lines = content.csv.split('\n')
				if (lines.count == 1) {
					window.alert("Invalid CSV File\n\nNo fields found!");
					return [];					
				}

				var result = [];

				// Find Headers: Parse the first \n delimited line and break it into comma-separated tokens
				var headerCount = 0;
        var headers=lines[0].split(content.separator);
        headerCount = headers.length;
        for (var hdrCtr = 0; hdrCtr < headerCount; hdrCtr++) {
          headers[hdrCtr] = headers[hdrCtr].trim();
        }
				
				// Start with the first character after the end of the first line
				var start_idx = lines[0].length+1
				var partial = content.csv.slice(start_idx);
				var fldCtr = 0;				// Field Counter
				var entry;						// Current line entry
				var entryCount = 0;	 	// No of entries read
				var sep;							// Separator
				var fldValue;					// Field Value
				var eof = false;			// End of file

				while (!eof) {

					eof = partial.length == 0;

					if (fldCtr === 0)
						entry = {}
					
					if (fldCtr === headerCount - 1)
						// Separate on the basis of a new line once we've read fields as many as the number of headers
						sep = '\n';
					else
						sep = content.separator;
					
					// Read the partial string and find the index of the first separator
					start_idx = partial.indexOf(sep)
					if (start_idx < 0) 
						// Reached the end of the partial string without finding the separator.
						// Use the entire string
						start_idx = partial.length - 1

					// Get the field value and preprocess it
					fldValue = partial.slice(0, start_idx);
          fldValue = fldValue.replace(/\n/g,""); 	// Remove internal carriage-returns
          fldValue = fldValue.replace(/\"/g,""); 	// Remove double quotes
          fldValue = fldValue.trim();							// Trim
					entry[headers[fldCtr]] = fldValue				// Add it to the entry

					// Update the partial string
					partial = partial.slice(start_idx+1, partial.length);

					// If we've reached the end of one entry, push it into the result
					if (fldCtr === headerCount - 1) {
						result.push(entry)
						entryCount++
					}

					// If the field ctr is at the end, loop it back to the beginning
					fldCtr = (fldCtr + 1) % headerCount
				}

				if (fldCtr !== 0) {
					var msg = "Invalid CSV File\n\nThe last entry could not be read correctly, possibly" +
								"\nbecause it doesn't contain the correct number of fields. Please fix the file and retry.\n\nAborting upload."
					result = []
					window.alert(msg)
				}

				return result;
		};
	}
};
});