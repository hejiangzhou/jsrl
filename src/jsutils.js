/*
 *   Copyright 2011 Jiangzhou He <hejiangzhou@gmail.com>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

/*
 *   Some code in this file is copied from jQuery and modified. 
 *   Following is the license of jQuery.
 *
 *   Copyright (c) 2011 John Resig, http://jquery.com/
 *
 *   Permission is hereby granted, free of charge, to any person obtaining
 *   a copy of this software and associated documentation files (the
 *   "Software"), to deal in the Software without restriction, including
 *   without limitation the rights to use, copy, modify, merge, publish,
 *   distribute, sublicense, and/or sell copies of the Software, and to
 *   permit persons to whom the Software is furnished to do so, subject to
 *   the following conditions:
 *
 *   The above copyright notice and this permission notice shall be
 *   included in all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *   LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 *   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 *   WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

//#ifdef DEBUG
function ABORT(e) {
	throw e;
}

function ASSERT(cond, msg) {
	if (!cond) {
        LOG("Assertion failure: " + msg, "ERROR");
		ABORT();
	}
}

function WARNING(msg) {
	LOG("Warning: " + msg, "WARN");
}

function ERROR(msg, e) {
	LOG("Error: " + msg, "ERROR");
	ABORT(e);
}

function WARNING_IF(cond, msg) {
	if (cond) WARNING(msg);
}

var __logwin = null, __msg = [];
function LOG(msg, level) {
	var doc;
    if (!level) level = "INFO";
	__msg.push([new Date(), msg, level]);
	if (!__logwin) {
		__logwin = {};
		__logwin = window.open("", "_blank", "toolbar=0,location=0,directories=0,status=0,menubar=0,scrollbars=1,resizable=1,copyhistory=0,width=600,height=400");
		doc = __logwin.document;
		doc.write("<html><head><meta charset=\"utf-8\"/><title>debug log</title>");
		doc.write("<style type=\"text/css\">div { font-size:12pt; } .time { color: #7f7f7f; } .level { margin-right:10px; } .ERROR { color:red; } .WARN { color:green; } .INFO { color:blue; } </style>");
		doc.write("</head><body></body></html>");
		doc.close();
	} else {
		doc = __logwin.document;
		if (!doc) return;
	}

	for (var i = 0; i < __msg.length; i++) {
		var now = __msg[i][0];
        var lv = __msg[i][2];
		var timeStr = Q.fill0(now.getHours(), 2) + ":" + Q.fill0(now.getMinutes(), 2) + ":" + Q.fill0(now.getSeconds(), 2) + "." + Q.fill0(now.getMilliseconds(), 3);
		var newDiv = doc.createElement("div");
		newDiv.innerHTML = "<span class=\"time\">[" + timeStr + "]</span><span class=\"level " + lv + "\">[" + lv + "]</span>" + Q.htmlize(__msg[i][1]);
		doc.body.appendChild(newDiv);
	}
	__msg = [];
}
//#else
ABORT = ASSERT = WARNING = ERROR = WARNING_IF = function() {};
//#endif
//#include "json2.js"
var Q = (function () {
	var Q = {};

	/////////////////////////////////////
	// URL utility
	/////////////////////////////////////
	var lastReg = /\/[^\/]*$/;
	var upReg = new RegExp("\\.\\.\\/", "g");
	Q.toAbsPath = function (ref, path) {
		if (path.charAt(0) == '/') return path;
		var p = ref.replace(lastReg, "");
		var f = path.match(upReg);
		if (f) {
			path = path.substring(f.length * 3);
			for (var i = 0; i < f.length; i++)
				p = p.substring(0, p.lastIndexOf('/'));
		}
		return p + '/' + path;
	};
	
	Q.getBaseUrl = function (prefix) {
		var path = window.location.pathname + "/";
		var index = path.indexOf(prefix + "/");
		if (index >= 0)
			return path.substring(0, index + prefix.length + 1);
		else
			return "/";
	};

	/////////////////////////////////////
	// Object utility
	/////////////////////////////////////
	Q.union = function () {
		var result = {};
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			for (var j in arg)
				if (!(j in result)) result[j] = arg[j];
		}
		return result;
	};
	
	Q.clone = function (obj) {
		var result = {};
		for (var i in obj) result[i] = obj[i];
		return result;
	};
	
	var apply = Q.apply = function (obj, funcName, args) {
		if (args == null) args = [];
		var result = null;
		if (typeof(obj) == "function") {
			return null;
		} else if (Q.isArray(obj)) {
			result = new Array(obj.length);
			for (var i = 0; i < obj.length; i++)
				result[i] = apply(obj[i], funcName, args);
		} else if (typeof(obj) == "object") {
			var func = obj[funcName];
			if (typeof(func) == "function") {
				result = func.apply(obj, args);
			} else {
				result = {};
				for (var i in obj) {
					var val = apply(obj[i], funcName, args);
					if (val != null) result[i] = val;
				}
			}
		}
		return result;
	};

	Q.extend = function (child, father) {
		for (var i in father.prototype)
			if (child.prototype[i] == null)
				child.prototype[i] = father.prototype[i];
	};

	Q.evalJSON = function (obj) { return eval('(' + obj + ')'); };

	/////////////////////////////////////
	// Numeric utility
	/////////////////////////////////////

	Q.inRange = function (value, start, end, exclusive) {
		if (value < start) return false;
		if (exclusive) return value < end;
		return value <= end;
	};

	/////////////////////////////////////
	// Array utility
	/////////////////////////////////////

	Q.arrFind = function (arr, e) {
		ASSERT(Q.isArray(arr), "First parameter of arrFind() should be an array");
		if (arr) {
			for (var i = 0; i < arr.length; i++)
				if (arr[i] == e) return i;
		}
		return -1;
	};

	Q.arrRemove = function (arr, i) {
		ASSERT(Q.isArray(arr), "First parameter of arrRemove() should be an array");
		ASSERT(i >= 0 && i < arr.length, "Invalid index in arrRemove()");
		var r = arr[i];
		for (var j = i; j < arr.length - 1; j++)
			arr[j] = arr[j + 1];
		arr.pop();
		return r;
	};
	
	Q.arrRemovev = function (arr, value) {
		ASSERT(Q.isArray(arr), "First parameter of arrRemovev() should be an array");
		var i = Q.arrFind(arr, value);
		if (i >= 0) {
			Q.arrRemove(arr, i);
			return true;
		} else
			return false;
	};

	Q.isArray = function (obj) { return typeof(obj) == "object" && typeof(obj.length) == "number" && (obj.length == 0 || (0 in obj) && ((obj.length - 1) in obj)); }  

	/////////////////////////////////////
	// Function utility
	/////////////////////////////////////

	Q.nullFunc = function () { return null; };

	Q.constFunc = function (val) {
		return function (data) { return val; };
	};
	
	Q.bind = function (fun, self) {
		return function() {
			return fun.apply(self, arguments);
		}
	};

    Q.constructor = function (func) {
        var Temp = function () {};
        Temp.prototype = func.prototype;

        return function () {
            var inst = new Temp();
            var ret = func.apply(inst, arguments);
            return ret === undefined ? inst : ret;
        };
    };

	Q.seq = function () {
		var args = arguments;
		return function() {
			for (var i = 0; i < args.length; i++)
				args[i].apply(this, arguments);
		}
	};

	Q.mayCall = function (func, a, b, c) {
		if (func) {
			if (arguments.length <= 4)
				return func(a, b, c);
			var arg = new Array(arguments.length - 1);
			for (var i = 1; i < arguments.length; i++)
				arg[i - 1] = arguments[i];
			return func.apply(null, arg);
		}
		return undefined;
	};
	
	/////////////////////////////////////
	// String utility
	/////////////////////////////////////
	Q.fill0 = function (x, n) {
		var s = x + "";
		var r = s;
		for (var i = s.length; i < n; i++)
			r = "0" + r;
		return r;
	};

	Q.escape = function (str) {
		if (str == null) {
			str = "";
		} else {
			str = str + "";
			str = str.replace(/&/g, "&amp;");
			str = str.replace(/</g, "&lt;");
			str = str.replace(/>/g, "&gt;");
			str = str.replace(/\"/g, "&quot;");//"
		}
		return str;
	};

	Q.purify = function (str) {
		str = Q.escape(str);
		str = str.replace(/(^\ )|(\ $)/g, "&nbsp;");
		str = str.replace(/\ \ /g, " &nbsp;");
		str = str.replace(/\t/g, " &nbsp; &nbsp;");
		return str;
	};

	Q.htmlize = function (str) {
		str = Q.purify(str);
		str = str.replace(/\n/g, "<br />");
		return str;
	};
	
	Q.trim = function (str) {
		return str.replace(/^\s*(\S*)\s*$/, "$1");
	};

	Q.leadCapital = function (str) {
		return str.charAt(0).toUpperCase() + str.substr(1);
	};
	
	Q.deindent = function (str) {
		return str.replace(/^\r?\n[ \t]*/, "").replace(/\r?\n[ \t]*$/, "");
	};

	Q.include = function (str, pattern) { return str.indexOf(pattern) > -1; };

	Q.startsWith = function (str, pattern) { return str.length >= pattern.length && str.substr(0, pattern.length) == pattern; };

	Q.endsWith = function (str, pattern) {
    	var d = str.length - pattern.length;
    	return d >= 0 && str.lastIndexOf(pattern) == d;
  	};

	Q.empty = function (str) { return str == null || str == ""; };

	Q.blank = function (str) { return /^[\s\n\r\t]*$/.test(str); };
	
	Q.stringize = function (str) {
		if (str != null) {
			str = str.replace(/\\/g, "\\\\");
			str = str.replace(/'/g, "\\\'"); //');
			str = str.replace(/"/g, "\\\""); //");
		}
		return str;
	};

	Q.shortenText = function (text, maxline, maxlen, points) {
		var shortened = (text.length > maxlen);
		var str = shortened ? text.substr(0, maxlen) : text;
		var idx = ret.indexOf('\n');
		var i = 0;
		while (idx > 0 && (++i) < maxline)
			idx = ret.indexOf('\n', idx + 1);
		if (idx >= 0) {
			str = str.substr(0, idx + 1);
			shortened = true;
		}
		if (shortened && points)
			str += points;
		return str;
	};
	
	/////////////////////////////////////
	// DOM utility
	/////////////////////////////////////

	Q.isDomParent = function (node, parent) {
		while (node && node != parent)
			node = node.parentNode;
		return (node == parent);
	};
	
	Q.$ = function (id) {
		return document.getElementById(id);
	};

	Q.$N = function (name) {
		return document.getElementsByName(name);
	};

	Q.$P = function (id) {
		return parent.document.getElementById(id);
	};

	Q.$S = function (id) {
		var node = (typeof(id) == "string" ? $(id) : id);
		for (var i = 1; i < arguments.length; i += 2) {
			var name = arguments[i];
			var value = arguments[i + 1];
			if (Q.Browser.IE) {
				if (name == "opacity") {
					name = "filter";
					value = "alpha(opacity=" + parseFloat(value) * 100 + ")";
				}
			}
			node.style[name] = value;
		}
		return node;
	};

	Q.$SPX = function (id) {
		var node = (typeof(id) == "string" ? $(id) : id);
		for (var i = 1; i < arguments.length; i += 2) {
			var name = arguments[i];
			var value = arguments[i + 1];
			Q.$S(node, name, (value || 0) + "px");
		}
		return node;
	};

	Q.$GS = function (id, name) {
		var node = (typeof(id) == "string" ? $(id) : id);
		if (Q.Browser.IE) {
			if (name == "opacity") {
				var v = node.style.filter;
				var r = /alpha\(opacity=([^\)]*)\)/;
				if (!v) {
					var m = r.exec(v);
					return (m ? (parseFloat(m[1]) / 100) : null);
				}
			}
		}
		return node.style[name];
	};

	Q.$T = function (id, enable) {
		var node = (typeof(id) == "string" ? $(id) : id);
		node.style.display = (enable ? "block" : "none");
		return node;
	};
	
	Q.$V = function (id, visible) {
		var node = (typeof(id) == "string" ? $(id) : id);
		node.style.visibility = (visible ? "visible" : "hidden");
		return node;
	};

	Q.$CE = function (eleName) {
		return document.createElement(eleName);
	};

	Q.$DIV = function (className) {
		var r = Q.$CE("div");
		if (arguments.length > 1) {
			var arr = new Array(arguments.length);
			for (var i = 0; i < arguments.length; i++)
				arr[i] = arguments[i];
			r.className = arr.join(" ");
		} else if (className)
			r.className = className;
		return r;
	};

	Q.$A = function (id, attName, attValue) {
		var node = (typeof(id) == "string" ? $(id) : id);
		for (var i = 1; i < arguments.length; i += 2)
			node.setAttribute(arguments[i], arguments[i + 1]);
		return node;
	};

	Q.addClass = function (node, className) {
		if (node.className) {
			var classes = node.className.split(/\s+/);
			if (Q.arrFind(classes, className) < 0) {
				classes.push(className);
				node.className = classes.join(" ");
			}
		} else
			node.className = className;
		return node;
	};

	Q.removeClass = function (node, className) {
		if (node.className) {
			var classes = node.className.split(/\s+/);
			var i = Q.arrFind(classes, className);
			if (i >= 0) {
				Q.arrRemove(classes, i);
				node.className = classes.join(" ");
			}
		}
		return node;
	};

	Q.applyStyle = function (node, styles) {
		for (var name in styles)
			$S(node, name, styles[name]); 
	};

	Q.preloadImg = function (src) {
		var img = new Image();
		img.src = src;
	};

	/////////////////////////////////////
	// Cookie utility
	/////////////////////////////////////

	Q.setCookie = function (name, value, expires, path, domain, secure){
		var str = name + "=" + encodeURIComponent(value);
		if (expires) {
			var date = new Date();
			date.setTime(date.getTime() + expires * 86400000);
			str += "; expires=" + date.toGMTString();
		}
		if (path) str += "; path=" + path;
		if (domain) str += "; domain=" + domain;
		if (secure) str += "; secure";
		document.cookie = str;
		if (cookies)
			cookies[name] = value;
	};

	var cookies = null;
	Q.getCookie = function (name) {
		if (cookies == null) {
			cookies = {};
			var list = document.cookie.split(";");
			for (var i = 0; i < list.length; i++) {
				var str = Q.trim(list[i]);
				if (str == "") continue;
				var idx = str.indexOf("=");
				if (idx >= 0) {
					var key = Q.trim(str.substring(0, idx));
					var value = decodeURIComponent(str.substring(idx + 1));
					cookies[key] = value;
				} else
					cookies[Q.trim(str)] = true;
			}
		}
		return cookies[name];				
	};
	
	Q.deleteCookie = function (name) {
		Q.setCookie(name, "", 0);
		if (cookies)
			delete cookies[name];
	};
	
	/////////////////////////////////////
	// Browser test object
	/////////////////////////////////////
	Q.Browser = {
	    IE:     !!(window.attachEvent && !window.opera),
	    Opera:  !!window.opera,
	    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
	    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
	    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
	};

	/////////////////////////////////////
	// Event handling utility
	/////////////////////////////////////

	function createEventHandler (type, handler, args) {
		return function (e) {
			var event = null;
			if (Q.Browser.IE) {
				event = window.event;
				e = {};
				e.time = (new Date()).getTime();
				e.charCode = (type == "keypress") ? event.keyCode : 0;
				e.eventPhase = 2;
				e.isChar = (event.charCode > 0);
				e.pageX = event.clientX + document.body.scrollLeft;
				e.pageY = event.clientY + document.body.scrollTop;
				if (event.button)
					e.button = (event.button == 1 ? 0 : (event.button == 2 ? 2 : 1));
				if (type == "mouseout") {
					e.relatedTarget = event.toElement;
				} else if (type == "mouseover") {
					e.relatedTarget = event.fromElement;
				}
				// event.stopPropagation = function() { this.cancelBubble = true };
				e.target = event.srcElement;
			}
			if (type == "mousescroll") {
				if (!event) event = e;
				if (event.wheelDelta != null)
					e.delta = -event.wheelDelta;
				else
					e.delta = e.detail * 40;
			}
			handler(e, args);
		};
	}

	function attachEvent (target, type, handler) {
		if (target.addEventListener)
			target.addEventListener(type, handler, false);
		else if (target.attachEvent)
			target.attachEvent("on" + type, handler);
	}
	

	Q.attachEvent = function (target, type, handler, args) {
		var h = createEventHandler(type, handler, args);
		ASSERT(target.addEventListener || target.attachEvent, "Neither target.addEventListener nor target.attachEvent is defined");
		attachEvent(target, type, h);
		return h;
	};
		
	Q.detachEvent = function (target, type, handle) {
		ASSERT(target.removeEventListener || target.detachEvent, "Neither target.removeEventListener nor target.detachEvent is defined");
		if (target.removeEventListener)
			target.removeEventListener(type, handle, false);
		else if (target.detachEvent)
			target.detachEvent("on" + type, handle);
	};

	var _oldOnSelStart = null, _selBanned = false, _selUpBinded = false;
	function bindRestoreSel() {
		_selUpBinded = true;
		Q.attachEvent(document, "mouseup", function () {
				if (_selBanned) {
					document.onselectstart = _oldOnSelStart;
					_selBanned = false;
				}
			});
	}
	Q.forbidSelect = function (target) {
		var detachFunc;
		if (Q.Browser.IE) {
			var h = Q.attachEvent(target, "mousedown", function () {
					_oldOnSelStart = document.onselectstart;
					_selBanned = true;
					document.onselectstart = Q.constFunc(false);
				});
			if (!_selUpBinded) bindRestoreSel();
			detachFunc = function () { Q.detachEvent(target, "mousedown", h); };
		} else {
			var old = target.onmousedown;
			target.onmousedown = function (e) {
				if (old) old.call(target, e);
				return false;
			}
			detachFunc = function () { target.onmousedown = old; };
		}
		return { "detach": detachFunc };
	};

	Q.addDragHandler = function (target, mask, handler) {
		var x0, y0;
		var hmove, hup, hout;
		var dragging = false;
		if (!mask) mask = document;
		var fh = Q.forbidSelect(target);
		function onmousemove(e) {
			if (dragging && handler.onDragMove)
				handler.onDragMove(e.pageX - x0, e.pageY - y0, target, e);
		}
		function onmouseup(e) {
			if (dragging) {
				if (handler.onDragEnd)
					handler.onDragEnd(e.pageX - x0, e.pageY - y0, target, e);
				Q.detachEvent(mask, "mousemove", hmove);
				Q.detachEvent(document, "mouseup", hup);
				Q.detachEvent(document, "mouseout", hout);
				dragging = false;
			}
		}
		function onmouseout(e) {
			if (!e.relatedTarget)
				onmouseup(e);
		}
		var h = Q.attachEvent(target, "mousedown", function (e) {
			if (e.button == 0) {
				x0 = e.pageX; y0 = e.pageY;
				if (handler.onDragStart) handler.onDragStart(target, e);
				hmove = Q.attachEvent(mask, "mousemove", onmousemove);
				hup = Q.attachEvent(document, "mouseup", onmouseup);
				hout = Q.attachEvent(document, "mouseout", onmouseout);
				dragging = true;
			}
			return false;
 		});
		function detach() {
			fh.detach();
			Q.detachEvent(target, "mousedown", h);
			if (dragging) {
				Q.detachEvent(mask, "mousemove", hmove);
				Q.detachEvent(document, "mouseup", hup);
				Q.detachEvent(document, "mouseout", hout);
			}
		}
		return { detach: detach };
	};

	var readyHandlers = [];
	var onreadyCalled = false;
	var readyDependentCnt = 0;
    var isReady = false;

	// Handle when the DOM is ready
	var jQueryready = function() {
        isReady = true;
		// Make sure that the DOM is not already loaded
		if ( !onreadyCalled && readyDependentCnt == 0) {
			// Remember that the DOM is ready
			onreadyCalled = true;
	
			// If there are functions bound, to execute
			for (var i = 0; i < readyHandlers.length; i++)
				(readyHandlers[i])();
	
			// Trigger any bound ready events
			// (deleted)
		}
	};

	function addReadyDependency(tracker) {
		if (!onreadyCalled) {
			readyDependentCnt++;
			tracker.onready(function () {
				if (--readyDependentCnt == 0 && isReady)
					jQueryready();
			});
		}
	}

	// Mozilla, Opera and webkit nightlies currently support this event
	if ( document.addEventListener ) {
		// Use the handy event callback
		document.addEventListener( "DOMContentLoaded", function(){
			document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
			jQueryready();
		}, false );

	// If IE event model is used
	} else if ( document.attachEvent ) {
		// ensure firing before onload,
		// maybe late but safe also for iframes
		document.attachEvent("onreadystatechange", function(){
			if ( document.readyState === "complete" ) {
				document.detachEvent( "onreadystatechange", arguments.callee );
				jQueryready();
			}
		});

		// If IE and not an iframe
		// continually check to see if the document is ready
		if ( document.documentElement.doScroll && typeof window.frameElement === "undefined" ) (function(){
			if ( onreadyCalled ) return;

			try {
				// If IE is used, use the trick by Diego Perini
				// http://javascript.nwbox.com/IEContentLoaded/
				document.documentElement.doScroll("left");
			} catch( error ) {
				setTimeout( arguments.callee, 0 );
				return;
			}

			// and execute any waiting functions
			jQueryready();
		})();
	}

	// A fallback to window.onload, that will always work
	Q.attachEvent(window, "load", jQueryready);

	Q.onready = function (handler) {
		if (onreadyCalled)
			handler();
		else
			readyHandlers.push(handler);
	};

	Q.onDomRendered = function (f) {
		if (Q.Browser.IE)
			setTimeout(f, 0);
		else 
			f();
	};

	Q.onhashchange = function (handler) {
		if ("onhashchange" in window && window.addEventListener)
			window.addEventListener("hashchange", handler, false);
		else {
			var lastHash = document.location.hash;
			function checkHashChange() {
				var hash = document.location.hash;
				if (hash != lastHash) {
					lastHash = hash;
					handler();
				}
				Q.addNextEvent(checkHashChange);
			}
			Q.addNextEvent(checkHashChange);
		}
	};

	var scrollHandlers = null;

	function scrollHandlerFunc(e) {
		for (var i = 0; i < scrollHandlers.length; i++) {
			var h = scrollHandlers[i];
			h.f(e, h.args);
		}
	}
	
	Q.addScrollHandler = function (handler, args) {
		if (!scrollHandlers) {
			scrollHandlers = [];
			var h = createEventHandler("mousescroll", scrollHandlerFunc, args);
			if (document.addEventListener) {
				document.addEventListener('DOMMouseScroll', h, false);
			}
			document.onmousewheel = h;
		}
		var r = {f:handler, args:args};
		scrollHandlers.push(r);
		return { detach: function () { Q.arrRemovev(scrollHandlers, r); } };
	};

	Q.getOffset = function (node, target) {
		var x = 0, y = 0;
		target = target || document.body;
		while (node && node != target) {
			x += node.offsetLeft;
			y += node.offsetTop;
			node = node.parentNode;
		}
		return { top: y, left: x };
	};

	Q.MAX_ZINDEX = 9999;

	/////////////////////////////////////
	// Ajax utility
	/////////////////////////////////////

    Q.restUrl = function (fmt) {
        var res = [];
        var lastPos = 0;
        var pos;
        var argPos = 1;
        while ((pos = fmt.indexOf('#', lastPos)) >= 0) {
            res.push(fmt.substring(lastPos, pos));
            ASSERT(arguments[argPos] !== undefined, "Not enough arguments");
            res.push(encodeURIComponent(arguments[argPos++]));
            lastPos = pos + 1;
        }
        res.push(fmt.substr(lastPos));
        return res.join("");
    }

    var DEFAULT_CONTENT_TYPE = "application/x-www-form-urlencoded; charset=utf-8";
	Q.ajax = function (url) {
		var method = "GET", body = null, callback;
        var nargs = arguments.length;
        var pargs = 1;
        var headers = null;

        callback = arguments[--nargs];
        ASSERT(typeof(callback) == "function", "Callback is not provided for Q.ajax().");

        ASSERT(pargs >= nargs || typeof(arguments[pargs]) == "string" || typeof(arguments[pargs]) == "object", "Expect a string or object argument after url in Q.ajax().");

        if (pargs < nargs && typeof(arguments[pargs]) == "string") {
            method = arguments[pargs++];

            if (method == "POST") {
                ASSERT(pargs < nargs, "You need to provide a body for POST Ajax request.");
                body = arguments[pargs++];
                ASSERT(typeof(body) == "string", "Body for POST Ajax must be string.");
            }
        }

        if (pargs < nargs) {
            ASSERT(typeof(arguments[pargs]) == "object", "Expect an object as additional request headers.");
            headers = arguments[pargs++];
        }

        ASSERT(pargs == nargs, "Redundant arguments for Ajax request.");

		var req;
		if (window.XMLHttpRequest)
			req = new XMLHttpRequest();
		else {
			ASSERT(window.ActiveXObject, "The browser does not support Ajax");
			try {
				req = new ActiveXObject("Msxml2.XMLHTTP");
			} catch (e) {
				req = new ActiveXObject("Microsoft.XMLHTTP");
			}
		}
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				var st = req.status;
				callback(req);
			}
		};
		req.open(method, url, true);

        if (headers) {
            for (var key in headers)
                req.setRequestHeader(key, headers[key]);
        }

		if (method == "POST" && !("Content-Type" in headers))
			req.setRequestHeader("Content-Type", DEFAULT_CONTENT_TYPE);

		req.send(body);
	}

	/////////////////////////////////////
	// Namespace utility
	/////////////////////////////////////

	Q.importName = function () {
		for (var i = 0; i < arguments.length; i++) {
			var name = arguments[i];
			ASSERT(Q[name], "Cannot find member \"" + name + "\" in Q");
			window[name] = Q[name];
		}
	};
	   
	Q.importShortcuts = function () {
		Q.importName("$", "$N", "$P", "$S", "$SPX", "$GS", "$T", "$V", "$CE", "$A", "$DIV");
	};

	/////////////////////////////////////
	// Loading Dependency Tracker
	/////////////////////////////////////

	function LoadDependTracker () { this.ref = 0; }

	LoadDependTracker.prototype = {
		add : function (cnt) { this.ref += (cnt || 1); },
		resolve : function (cnt) { this.ref -= (cnt || 1); this._check(); },
		onload : function (cb) { this.cb = cb; this._check(); },
		_check : function () {
			var cb = this.cb;
			if (cb && this.ref == 0) {
				cb();
				this.cb = null;
			}
		}
	};
	Q.newDependTracker = function () { return new LoadDependTracker() };
	

	function LoadReadyTracker(cb) { this.cbs = []; if (cb) this.cbs.push(cb); }

	LoadReadyTracker.prototype = {
		onready : function (cb) { if (cb) { if (this.cbs) this.cbs.push(cb); else cb() } },
		makePageReadyDependent : function () {
			addReadyDependency(this);
		},
		ready : function () {
			var cbs = this.cbs;
			this.cbs = undefined;
			for (var i = 0; i < cbs.length; i++)
				(cbs[i])();
		}
	};
	Q.newReadyTracker = function (cb) { return new LoadReadyTracker(cb); };


	var intervalEvents = [];
	var intervalEventId = null;
	var thisTime = (new Date()).getTime();

	function setupIntervalFunc() {
		if (intervalEventId == null)
			intervalEventId = window.setInterval(intervalFunc, (Q.SCHEDULER_INTERVAL || 40));
	}

	function intervalFunc() {
		var events = intervalEvents;
		lastTime = thisTime;
		thisTime = (new Date()).getTime();
		intervalEvents = [];
		for (var i = 0; i < events.length; i++)
			events[i]();
		if (intervalEvents.length == 0) {
			window.clearInterval(intervalEventId);
			intervalEventId = null;
		}
	}
	
	Q.addNextEvent = function (e) {
		intervalEvents.push(e);
		setupIntervalFunc();
	}
	
	Q.AnimQueue = function () {
		this._queue = null;
		this._current = -1;
	}
	
	Q.AnimQueue.prototype = {
		enque :	function (f) {
			if (f) {
				var q = this._queue;
				if (!q) {
					this._queue = q = [f];
					this._exec();
				} else
					q.push(f);
				var i = q.length - 1;
				return { "cancel" : function () { if (q[i] == f) q[i] = null; } };
			} else {
				return { "cancel" : function () {} };
			}
		},
		top : function (f) {
			if (this._queue && this._queue.length > this._current + 1)
				return this._queue[this._queue.length - 1];
			else
				return undefined;
		},
		pop : function () {
			this._queue.length--;
		},
		cancelAll : function () {
			this._queue.length = 0;
		},
		cancelWaiting : function () {
			this._queue.length = _current + 1;
		},
		empty : function () { return !this._queue; },
		onEmpty : function (f) {
			if (this._queue) {
				var h = (this._emptyHandlers || (this._emptyHandlers = []));
				h.push(f);
			} else f();
		},
		_exec : function () {
			var self = this;
			var q = this._queue;
			var nextTime = (new Date()).getTime() + Q.SCHEDULER_INTERVAL * 3 / 2; 
			var i = 0;
			self._current = 0;
			var e = function () {
				while (!q[i] && ++i < q.length);
				while (q[i] && thisTime >= nextTime) {
					nextTime += Q.SCHEDULER_INTERVAL;
					q[i] = q[i](thisTime >= nextTime);
					while (!q[i] && ++i < q.length);
				}
				if (q[i])
					Q.addNextEvent(e);
				else {
					self._queue = null;
					if (self._emptyHandlers)
						for (var j = 0; j < self._emptyHandlers.length; j++)
							self._emptyHandlers[j]();
					self._emptyHandlers = null;
					i = -1;
				}
				self._current = i;
			};
			if (q[i]) Q.addNextEvent(e);
		}
	}
	
//#include "lazyload.js"
	Q.loadJs = function (url, callback) { LazyLoad.js(url, callback); };
	Q.loadCss = function (url, callback) { LazyLoad.css(url, callback); };
	

	return Q;
})();

