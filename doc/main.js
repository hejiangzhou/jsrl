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

function mapEntryDesc(map) {
	return function (key) {
		return map[key];
	};
}
function subEntryDesc(category, langType) {
	return function (key) {
		return new SubEntry(category, key, langType);
	};
}

function TopEntry(name, xmls, subList, langType) {
	this._name = name;
	this._xmls = xmls;
	if (subList) {
		this._subList = subList;
		this._subDesc = subEntryDesc(name, langType);
	}
}
TopEntry.prototype = {
	getName : function () { return this._name; },
	loadXmls : function () {
		for (var i in this._xmls)
			Jsrl.loadLibrary(this._xmls[i]);
	},
	getSubList : function () { return this._subList; },
	getSubDesc : function () { return this._subDesc; }
};

function SubEntry(category, key, langType) {
	this._category = category;
	this._key = key;
	this._langType = langType;
}
SubEntry.prototype = {
	getName : function () { return this._category + "." + this._key; },
	loadXmls : function () {
		var path = this._category + "/" + this._key + ".xml";
		if ((this._langType & LOAD_COMMON) != 0)
			Jsrl.loadLibrary(path);
		if ((this._langType & LOAD_LANGSPEC) != 0)
			Jsrl.loadLibrary("lang/{majorlang}/" + path);
	},
	getTitle : function () {
		if (this._subDesc)
			return Jsrl.D("Titles." + this._name);
		else
			return Jsrl.D("Titles." + this._name + "._name");
	},
	getSubList : function () { return null; },
	getSubDesc : function () { return null; }
};

var tutorialEntries = [
	"overview",
	"basics",
	"api"
];
var topEntries = {
	main: new TopEntry("main", [ "lang/{majorlang}/main.xml" ]),
	tutorial: new TopEntry("tutorial", null, tutorialEntries, LOAD_LANGSPEC)
};
var topDesc = mapEntryDesc(topEntries);

function loadEntry(key) {
	currentEntry = key;
	var keys = key.split(".");
	var d = topDesc, e;
	for (var i = 0; i < keys.length; i++) {
		e = d(keys[i]);
		d = e.getSubDesc();
	}
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

