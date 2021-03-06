/*\

Tests the fields

\*/

var utils = require("test/utils");
var relink = utils.relink;

describe('fields', function() {

function testField(value, expected, options) {
	[value, expected, options] = utils.prepArgs(value, expected, options);
	var field = options.field || "test";
	var type = options.type;
	if (type === undefined) {
		type = "title";
	}
	options.wiki.addTiddler(utils.fieldConf(field, type));
	var results = relink({[field]: value}, options);
	var output = results.tiddler.fields[field];
	if (typeof output === "object") {
		output = Array.prototype.slice.call(output);
	}
	expect(output).toEqual(expected);
	return results;
};

function testTags(value, expectedArray, options) {
	return testField(value, expectedArray,
	                 Object.assign({field: "tags", type: "list"}, options));
};

function testList(value, expectedArray, options) {
	return testField(value, expectedArray,
	                 Object.assign({field: "list", type: "list"}, options));
};

it("doesn't touch ineligible tiddlers", function() {
	var results = testTags("nothing here",["nothing", "here"]);
	expect($tw.utils.hop(results.tiddler.fields, 'modified')).toBe(false);
	results = testList("nothing here", ["nothing", "here"]);
	expect($tw.utils.hop(results.tiddler.fields, 'modified')).toBe(false);
});

it("touches eligible tiddlers", function() {
	var results = testTags("[[from here]]", ["to there"]);
	expect($tw.utils.hop(results.tiddler.fields, 'modified')).toBe(true);
});

it('still relinks tags', function() {
	var r = testTags("[[from here]] another", ['to there', 'another']);
	expect(r.log).toEqual(["Renaming 'from here' to 'to there' in tags of tiddler 'test'"]);
});

it('still relinks lists', function() {
	var r = testList("[[from here]] another", ['to there', 'another']);
	expect(r.log).toEqual(["Renaming 'from here' to 'to there' in list field of tiddler 'test'"]);
});

// I can't actually prevent Tiddlywiki from doing this, so might as well
// make it defined behavior.
it('duplicates are removed by TiddlyWiki', function() {
	testList("[[from here]] A [[from here]]", ['to there', 'A']);
	testField("[[from here]] A [[from here]]", "[[to there]] A", {type: "list"});
});

it('relinks filter field', function() {
	var r = testField("[title[from here]] stuff", "[title[to there]] stuff",
	                  {field: "filter", type: "filter"});
	expect(r.log).toEqual(["Renaming 'from here' to 'to there' in filter field of tiddler 'test'"]);
});

it('lists work with strange titles', function() {
	function works(title, wrapped) {
		//var expected = wrapped ? "A [["+title+"]] B" : "A "+title+" B";
		var expected = ["A", title, "B"];
		testList("A [[from here]] B", expected, {to: title});
	};
	works("weird]]");
	works("weird ]]");
	works("weird ]]");
	works("weird[[");
	works("weird [[");
	works("X[[Z]]Y");
	works("X [[ Z ]]Y", true);

	var thisFuckingValue = "weird ]]\xA0value";
	works(thisFuckingValue);
	// Just got to test that the crazy value is actually something
	// Tiddlywiki supports.  Seriously, when do these come up?
	var list = ["A", thisFuckingValue, "A tiddler", "B"];
	var strList = $tw.utils.stringifyList(list);
	var output = $tw.utils.parseStringArray(strList);
	expect(output).toEqual(list);
});

it('lists recognize impossibly strange titles', function() {
	function fails(title) {
		var options = {to: title, ignored: true,
		               field: "example", type: "list"};
		var list = "A [[from here]] B";
		var results = testField(list, options);
		expect(results.fails.length).toEqual(1);
	};
	fails("X and]] Y");
	fails("]] X");
});

it("lists don't fail when toTitle not in list", function() {
	var options = {to: "X and]] Y", field: "list", type: "list"};
	var results = testField("A B C", ["A", "B", "C"], options);
	expect(results.fails.length).toEqual(0);
});

/** I have chosen not to respect dontRenameInTags and dontRenameInLists
 *  because they are literally never used anywhere. Now you can just use
 *  the configuration.
 */
/*
it('still respects dontRenameInTags', function() {
	var t = relink({"tags": "[[from here]] another"}, {dontRenameInTags: true});
	expect(t.fields.tags.slice()).toEqual(['from here', 'another']);
});

it('still respects dontRenameInLists', function() {
	var t = relink({"list": "[[from here]] another"}, {dontRenameInLists: true});
	expect(t.fields.list.slice()).toEqual(['from here', 'another']);
});
*/

it('relinks custom field', function() {
	var r = testField("from here");
	expect(r.log).toEqual(["Renaming 'from here' to 'to there' in test field of tiddler 'test'"]);
});

it('relinks custom list', function() {
	var r = testField("A [[from here]] B", {type: "list"});
	expect(r.log).toEqual(["Renaming 'from here' to 'to there' in test field of tiddler 'test'"]);
});

it('ignores blank custom field settings', function() {
	testField("ignore", {type: "", ignored: true, from: "ignore"});
});

it('ignores unrecognized custom field settings', function() {
	testField("ignore", {type: "bizarre", ignored: true, from: "ignore"});
});

it('removes unnecessary brackets in custom list', function() {
	// The decision to remove brackets may be controversial, but since
	// list and tag automatically remove brackets on their own, I might
	// as well be consistent.
	testField("A [[from here]] B", "A to B", {type: "list", to: "to"});
	testField("A [[from]] B", "A to B",{type:"list", from:"from", to:"to"});
});

/**This is legacy support. The 'title' field type used to be called 'field'
 * But field was unhelpful. What's it mean when a field is set to 'field'?
 */
it('supports "field" field settings', function() {
	testField("from here", {type: "field"});
});

/**It's important that fields can be undefined, since obviously most tiddlers
 * won't have the field.
 */
it("doesn't crash with missing any type of field", function() {
	testField(undefined, undefined, {type: "reference"});
	testField(undefined, undefined, {type: "title"});
	testField(undefined, undefined, {type: "list"});
	testField(undefined, undefined, {type: "filter"});
	testField(undefined, undefined, {type: "wikitext"});
});

});
