/*\
module-type: relinkwikitextrule

Handles replacement of filtered transclusions in wiki text like,

{{{ [tag[docs]] }}}
{{{ [tag[docs]] |tooltip}}}
{{{ [tag[docs]] ||TemplateTitle}}}
{{{ [tag[docs]] |tooltip||TemplateTitle}}}
{{{ [tag[docs]] }}width:40;height:50;}.class.class

This renames both the list and the template field.

\*/

exports.name = ['filteredtranscludeinline', 'filteredtranscludeblock'];

var filterHandler = require("$:/plugins/flibbles/relink/js/settings").getRelinker('filter');
var utils = require("./utils.js");
var EntryNode = require('$:/plugins/flibbles/relink/js/utils/entry');

var FilteredTranscludeEntry = EntryNode.newType("filteredtransclude");

FilteredTranscludeEntry.prototype.report = function() {
	var output = [];
	var self = this;
	$tw.utils.each(this.children, function(child) {
		if (child.name === "filter") {
			var append = "}}}";
			if (self.template) {
				append = "||" + self.template + append;
			}
			$tw.utils.each(child.report(), function(report) {
				output.push("{{{" + report + append);
			});
		} else {
			// Must be the template
			output.push("{{{" + self.filter + "||}}}");
		}
	});
	return output;
};

exports.relink = function(text, fromTitle, toTitle, options) {
	var m = this.match;
		filter = m[1],
		tooltip = m[2],
		template = m[3],
		style = m[4],
		classes = m[5],
		parser = this.parser,
		entry = new FilteredTranscludeEntry();
	parser.pos = this.matchRegExp.lastIndex;
	var modified = false;

	var filterEntry = filterHandler.relink(filter, fromTitle, toTitle, options);
	if (filterEntry !== undefined) {
		entry.add(filterEntry);
		filter = filterEntry.output;
		modified = true;
	}

	if ($tw.utils.trim(template) === fromTitle) {
		// preserves user-inputted whitespace
		template = template.replace(fromTitle, toTitle);
		entry.add({name: "title", output: template});
		modified = true;
	}
	if (!modified) {
		return undefined;
	}
	var output;
	if (canBePretty(filter) && canBePrettyTemplate(template)) {
		output = prettyList(filter, tooltip, template, style, classes);
	} else {
		output = widget(filter, tooltip, template, style, classes, options.placeholder, entry);
		if (output === undefined) {
			entry.impossible = true;
			output = '';
		}
	}
	// By copying over the ending newline of the original text if present,
	// thisrelink method thus works for both the inline and block rule
	entry.output = output + utils.getEndingNewline(m[0]);
	entry.template = template;
	entry.filter = filter;
	return entry;
};


function canBePretty(filter) {
	return filter.indexOf('|') < 0 && filter.indexOf('}}') < 0;
};

function canBePrettyTemplate(template) {
	return !template || (
		template.indexOf('|') < 0
		&& template.indexOf('{') < 0
		&& template.indexOf('}') < 0);
};

function prettyList(filter, tooltip, template, style, classes) {
	if (tooltip === undefined) {
		tooltip = '';
	} else {
		tooltip = "|" + tooltip;
	}
	if (template === undefined) {
		template = '';
	} else {
		template = "||" + template;
	}
	if (classes === undefined) {
		classes = '';
	} else {
		classes = "." + classes;
	}
	style = style || '';
	return "{{{"+filter+tooltip+template+"}}"+style+"}"+classes;
};

/** Returns a filtered transclude as a string of a widget.
 */
function widget(filter, tooltip, template, style, classes, placeholder, logArguments) {
	var cannotDo = false;
	logArguments.widget = true;
	if (classes !== undefined) {
		classes = classes.split('.').join(' ');
	}
	function wrap(name, value, treatAsTitle) {
		if (!value) {
			return '';
		}
		var wrappedValue = utils.wrapAttributeValue(value);
		if (wrappedValue === undefined) {
			if (!placeholder) {
				cannotDo = true;
				return undefined;
			}
			var category = treatAsTitle ? undefined : name;
			wrappedValue = "<<"+placeholder.getPlaceholderFor(value,category)+">>";
			logArguments.placeholder = true;
		}
		return " "+name+"="+wrappedValue;
	};
	var widget = [
		"<$list",
		wrap("filter", filter),
		wrap("tooltip", tooltip),
		wrap("template", template, true),
		wrap("style", style),
		wrap("itemClass", classes),
		"/>"
	];
	if (cannotDo) {
		return undefined;
	}
	return widget.join('');
};
