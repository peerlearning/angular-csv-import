/*! angular-csv-import - v0.0.26 - 2015-11-11
* Copyright (c) 2015 ; Licensed  */

// Modified by rao@avanti.in to
//		1. Remove a null access error that was coming in the console
//		2. Add preprocessing and validation to CSV imports
//		3. Handling CSV files more robustly
//		4. Put a .csv filter in the file browser

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
				var fldCtr = 0;				// Field Counter
				var entry;						// Current line entry
				var entryCount = 0;	 	// No of entries read
				var fldValue;					// Field Value
				var eof = false;			// End of file
				var newLineIdx;

				var unparsed_str = content.csv;
				var slice_idx = lines[0].length

				while (!eof) {

					unparsed_str = unparsed_str.slice(slice_idx + 1);

					eof = unparsed_str.length == 0;

					if (fldCtr === 0)
						entry = {}

					// Read the unparsed_str string and find the index of the first separator
					slice_idx = unparsed_str.indexOf(content.separator)
					
					if (fldCtr === headerCount - 1) {
						// We've read fields as many as the number of headers
						// See if there's a new line before the next comma.
						newLineIdx = unparsed_str.indexOf('\n')

						// If there is one, then use that as the slicing index
						if (slice_idx < 0 || (newLineIdx >= 0 && newLineIdx < slice_idx)) {
							slice_idx = newLineIdx
						}
					}
					
					if (slice_idx < 0) {
						// No valid index found for slicing

						if (fldCtr == 0 && unparsed_str.trim().length == 0) {
							// We've just started a new entry and 'unparsed_str' is already empty
							// Hence, the end of file has been reached
							break;
						}

						// Reached the end of the unparsed_str string without finding the separator.
						// Use the entire string
						slice_idx = unparsed_str.length - 1
					}

					// Get the field value and preprocess it
					fldValue = unparsed_str.slice(0, slice_idx);
          fldValue = fldValue.replace(/\n/g,""); 	// Remove internal carriage-returns
          fldValue = fldValue.replace(/\"/g,""); 	// Remove double quotes
          fldValue = fldValue.trim();							// Trim
					entry[headers[fldCtr]] = fldValue				// Add it to the entry

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
