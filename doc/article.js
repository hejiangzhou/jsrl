var Article = (function () {
	var result = {};
	var refCntMap = {};
	var refKeyMap = {};

	result.reset = function () {
		refCntMap = {};
		refKeyMap = {};
	};

	function splitRefKey(key) {
		var idx = key.indexOf(":");
		var kind, name;
		if (idx >= 0) {
			kind = key.substr(0, idx);
			name = key.substr(idx + 1);
		} else {
			kind = "null";
			name = key;
		}
		return { "kind": kind, "name": name };
	}

	result.registerCaption = function (key) {
		var s = splitRefKey(key);
		var cnt = refCntMap[s.kind];
		cnt = (cnt ? cnt + 1 : 1);
		refCntMap[s.kind] = cnt;
		refKeyMap[key] = cnt;
		return { "titleKey": "Captions." + s.kind, "number": cnt };
	};

	result.initRef = function (ns, key) {
		var s = splitRefKey(key);
		var n = refKeyMap[key];
		var r = { "titleKey": "Captions." + s.kind, "number": (n ? n :  "?") };
		ns.render({ ref: r });
	};

	result.lineNumber = function (n, w) {
		var r = n + "";
		while (r.length < w)
			r = " " + r;
		return r;
	};

    result.loadCodeFromFile = function (ns, file) {
        Q.ajax(file, function (r) {
          if (r.status == 0 || r.status == 200)
            ns.render({ code: r.responseText });
        });
    };

	return result;
})();

