var defaultPage = "main";
var defaultLang = "en_US";
var currentPage;
var LOAD_COMMON = 1;
var LOAD_LANGSPEC = 2;
var languages = {
	en_US: "English",
	zh_CN: "简体中文"
};
var currentLang;

function getCurrentEntry() {
	var entry = location.hash;
	if (Q.blank(entry))
		entry = defaultPage;
	else
		entry = entry.substr(1);
	return entry;
}

function mapEntryDesc(category, map, langType) {
	return function (key) {
		var value = map[key];
		if (typeof(value) == "string")
			return new LeafEntry(category, key, langType);
		else
			return value;
	};
}
function leafEntryDesc(category, langType, titleGetter) {
	return function (key) {
		return new LeafEntry(category, key, langType, titleGetter);
	};
}

function MenuItem(parent, key, langType) {
	this._parent = parent;
	this._key = key;
	this._langType = langType || 0;
	this._name = (parent ? parent.getName() + "." : "") + key;
	this._path = (parent ? parent.getPath() + "/" : "") + key;
}
MenuItem.prototype = {
	getName : function () { return this._name; },
	getKey : function () { return this._key; },
	getPath : function () { return this._path; },
	loadXmls : function () {
		if ((this._langType & LOAD_COMMON) != 0)
			Jsrl.loadLibrary(this._path + ".xml");
		if ((this._langType & LOAD_LANGSPEC) != 0)
			Jsrl.loadLibrary("lang/{majorlang}/" + this._path + ".xml");
	}
};

function Category(parent, key, langType, xmls) {
	MenuItem.call(this, parent, key, langType);
	this._xmls = xmls || [];
}
Category.prototype = {
	getTitle : function () {
		return Jsrl.D("Titles." + this.getName() + "._name");
	},
	loadXmls : function () {
		MenuItem.prototype.loadXmls.call(this);
		for (var i in this._xmls)
			Jsrl.loadLibrary(this._xmls[i]);
	},
	setSubItems : function (subList, subDesc) {
		this._subList = subList;
		this._subDesc = subDesc;
	},
	getSubList : function () { return this._subList; },
	getSubDesc : function () { return this._subDesc; }
};
Q.extend(Category, MenuItem);

function LeafEntry(parent, key, langType, titleGetter) {
	MenuItem.call(this, parent, key, langType);
	this._titleGetter = titleGetter;
}
LeafEntry.prototype = {
	getTitle : function () {
		if (this._titleGetter)
			return this._titleGetter(this);
		else
			return Jsrl.D("Titles." + this.getName());
	},
	getSubList : function () { return null; },
	getSubDesc : function () { return null; }
};
Q.extend(LeafEntry, MenuItem);

var topEntries = {
	main: new LeafEntry(null, "main", LOAD_LANGSPEC),
	tutorial: new Category(null, "tutorial"),
	ref: new Category(null, "ref")
};
topEntries.tutorial.setSubItems([
		"overview",
		"basics",
		"api",
		"ctrls",
		"userCtrls",
		"i18n"
	], leafEntryDesc(topEntries.tutorial, LOAD_LANGSPEC));

var refEntries = {
	concept: new Category(topEntries.ref, "concept"),
	tag: new Category(topEntries.ref, "tag"),
	api: new Category(topEntries.ref, "api")
};
topEntries.ref.setSubItems(refEntries, mapEntryDesc(topEntries.ref, refEntries));

refEntries.concept.setSubItems([
	], leafEntryDesc(refEntries.concept, LOAD_LANGSPEC));

var specialTagNameMap = {
	"_expr": "@{}",
	"_htmlize": "@_"
}
refEntries.tag.setSubItems([
		"_expr",
		"_htmlize",
		"html",
		"set",
		"foreach",
		"for",
		"while",
		"do",
		"if",
		"break",
		"continue",
		"return",
		"exit",
		"img",
		"grid",
		"cmd",
		"cmdx",
		"form",
		"ns",
		"text",
		"password",
		"textarea",
		"checkbox",
		"radio_group",
		"radio",
		"select",
		"option",
		"optionx",
		"submit",
		"button",
		"hidden",
		"id",
		"L",
		"I",
		"Ix",
		"C",
		"Cx",
		"block",
		"D"
	],
	leafEntryDesc(refEntries.tag, LOAD_LANGSPEC,
	function (entry) { return specialTagNameMap[entry.getKey()] || "@" + entry.getKey(); }));

refEntries.api.setSubItems([
		"render",
		"renderTextTemp",
		"rerender",
		"renderData",
		"renderNode",
		"attachNode",
		"clear",
		"loadLibrary",
		"loadAll",
		"loadTemplate",
		"findTemplate",
		"isLoading",
		"getJsrlTemplate",
		"getTemplate",
		"D",
		"dtext"
	],
	leafEntryDesc(refEntries.api, LOAD_LANGSPEC,
	function (entry) { return "Jsrl." + entry.getKey() + "()"; }));

var topDesc = mapEntryDesc(null, topEntries);

function getEntry(key) {
	var keys = key.split(".");
	var d = topDesc, e;
	for (var i = 0; i < keys.length; i++) {
		e = d(keys[i]);
		d = e.getSubDesc();
	}
	return e;
}
	
function loadEntry(key) {
	Article.reset();
	currentEntry = key;
	var e = getEntry(key);
	e.loadXmls();
	Jsrl.render("root", [ key ]);
}

function checkEntry() {
	var entry = getCurrentEntry();
	if (entry != currentEntry)
		loadEntry(entry);
}

function initLanguage() {
	var lang = Q.getCookie("lang");
	if (!lang) lang = defaultLang;
	Q.setCookie("lang", lang, 365);
	currentLang = lang;
}

function setLanguage(lang) {
	Q.setCookie("lang", lang, 365);
	location.reload();
}

initLanguage();
Jsrl.addMajorLang("zh_CN", "zh_TW");
Jsrl.setLanguage(currentLang);
Jsrl.loadLibrary("style.xml");
Jsrl.loadLibrary("lang/{majorlang}/words.xml");
Jsrl.loadLibrary("lang/{majorlang}/titles.xml");

Q.onready(function () {
	loadEntry(getCurrentEntry());
	window.setInterval(checkEntry, 200);
});

