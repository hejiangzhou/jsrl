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

//#ifdef DEBUG
//#  define Jsrl_ASSERT Jsrl.ASSERT
//#  define Jsrl_ERROR Jsrl.ERROR
//#else
//#  define Jsrl_ASSERT(A,B)
//#  define Jsrl_ERROR(A)
//#  define _ASSERT(A,B)
//#  define _ERROR(A)
//#endif

function JsrlEval(str) {
	var res = null;
	eval(str);
	return res;
};

//The kernal of JSRL
var Jsrl = (function() {
        var parentJsrl = null;
        if (parent && parent != window) {
          try {
            parentJsrl = parent.Jsrl;
          } catch (e) { }
        }
//#ifdef DEBUG
	/*
	 * Error handling.
	 */
	var _ERROR = window.ERROR;
	var _ASSERT = window.ASSERT;
	var reporting = false;
	function ArgWithPos(arg, pos) {
		this.arg = arg;
		this.pos = pos;
	}
	ArgWithPos.prototype.__type = "ArgWithPos";

	var _Trace = {
		stack : [null],
		clear : function () {
			if (reporting) return;
			this.stack = [null];
		},
		empty : function () {
			if (reporting) return;
			return this.stack.length <= 1;
		},
		top : function () {
			if (reporting) return null;
			_ASSERT(this.stack.length > 0, "stack is empty");
			return this.stack[this.stack.length - 1];
		},
		topInfo : function () {
			if (reporting) return;
			return this.top().info;
		},
		setTop : function (v) {
			if (reporting) return;
			_ASSERT(this.stack.length > 0, "stack is empty");
			this.stack[this.stack.length - 1] = v;
		},
		push : function (value) {
			if (reporting) return;
			this.stack.push(value);
		},
		pop : function () {
			if (reporting) return;
			_ASSERT(this.stack.length > 0, "stack is empty");
			this.stack.pop();
		},
		pushTmp : function (info) {
			if (reporting) return;
			this.setTop({ "info": info, "pos": 0, "next": this.top() });
		},
		popTmp : function () {
			if (reporting) return;
			this.setTop(this.top().next);
		},
		pushPageNode : function (node) {
			if (reporting) return;
			this.push();
			var info = { "kind": 1, "node": node};
			this.setTop({ "info": info, "pos": 0, "next": null });
		},
		pushTemplate : function (name, file) {
			if (reporting) return;
			this.push();
			var info = { "kind": 2, "name": name, "file": file };
			this.setTop({ "info": info, "pos": 0, "next": null });
		},
		setText : function (text) {
			if (reporting) return;
			this.top().info.text = text;
		},
		setPos : function (pos) {
			if (reporting) return;
			_ASSERT(typeof(pos) == "number", "Trace().setPos: undefined pos");
			var node = this.top();
			if (node.pos != pos) {
				var newNode = { "info": node.info, "pos": pos, "next": node.next };
				this.setTop(newNode);
			}
		},
		pushPos : function (pos) {
			if (reporting) return;
			_ASSERT(typeof(pos) == "number", "Trace().pushPos: undefined pos");
			var top = this.top();
			this.push({ "info": top.info, "pos": pos, "next": top.next });
		}
	};
	function Trace() {
		if (parentJsrl)
			return parentJsrl.Trace();
		else
			return _Trace;
	}
	
	Reporter = {
		getTmpName : function (info) {
			switch (info.kind) {
			case 0:
				return "";
			case 1:
				return "<span class=tmpName>" + info.node.id + "</span> in " + location.pathname;
			case 2:
				return "<span class=tmpName>" + info.name + "</span> in " + info.file;
			}
		},
		getNearLines : function (node, cnt) {
			var res = "";
			res += "<div class=code>";
			var text = node.info.text;
			var pos = node.pos;
			var lineStart = text.lastIndexOf("\n", pos - 1) + 1;
			var lineEnd = text.indexOf("\n", pos);
			if (lineEnd < 0) lineEnd = text.length;
			
			var lines = [];
			var pos1 = lineStart;
			for (var i = 0; i < cnt && pos1 > 0; i++) {
				var end = pos1 - 1;
				pos1 = (end == 0 ? 0 : text.lastIndexOf("\n", end - 1) + 1);
				lines.push(text.substring(pos1, end));
			}
			lines.reverse();
			
			var lineno = 0;
			while (pos1 > 0) {
				var end = pos1 - 1;
				pos1 = (pos1 == 1 ? 0 : text.lastIndexOf("\n", end - 1) + 1);
				lineno++;
			}
			var row = lines.length;
			var col = pos - lineStart;
			lines.push(text.substring(lineStart, lineEnd));

			var pos2 = lineEnd;
			for (var i = 0; i < cnt && pos2 < text.length; i++) {
				var start = pos2 + 1;
				pos2 = text.indexOf("\n", start);
				if (pos2 < 0) pos2 = text.length;
				lines.push(text.substring(start, pos2));
			}
			
			var linenoWidth = Math.max((lineno + lines.length - 1 + "").length, 3);
			for (var i = 0; i < lines.length; i++) {
				var css = "codeline" + (i == row ? " highlighten" : "");
				res += "<div class=\"" + css + "\">";
				var linenostr = (lineno + i) + "";
				for (var j = linenostr.length; j < linenoWidth; j++)
					linenostr = "&nbsp;" + linenostr;
				res += "<span class=lineno>" + linenostr + "</span>";
				if (i == row) {
					res += Q.purify(lines[i].substring(0, col));
					res += "<span class=highlightenletter>";
					res += lines[i].charAt(col);
					res += "</span>";
					res += Q.purify(lines[i].substring(col + 1));
				} else {
					res += Q.purify(lines[i]);
				}
				res += "</div>";
			}
			res += "</div>";
			return res;
		},
		getBlock : function (msg, node, lines) {
			var res = "";
			res += "<div class=block>";
			res += "<div class=btitle>";
			res += msg + ": " + this.getTmpName(node.info);
			res += "</div>";
			if (node != null && node.info.text) {
				res += this.getNearLines(node, lines);
			}
			res += "</div>";
			return res;
		},
		report : function (errMsg) {
			if (reporting) return;
			var title = "JSRL error message";
			var res = "";
			res += "<HTML><HEAD>";
			res += "<TITLE>" + title + "</TITLE>";
			res += "<style type=\"text/css\">";
			res += "body { background-color:#dfdfdf; }";
			res += ".title { font-size:18pt; font-weight:bold; text-align:center; margin-top:15pt; margin-bottom:5pt; }";
			res += ".block { border-bottom:1px solid black; padding-top:3pt; padding-bottom:3pt; }";
			res += ".tmpName { color:blue; font-weight:bold; }";
			res += ".btitle { font-size:11pt; }";
			res += ".code { margin-top:5pt; margin-bottom:5pt; }";
			res += ".codeline { font-size:10pt; font-family:Courier New; white-space:nowrap;}";
			res += ".highlighten { background-color:#ffffaf; }";
			res += ".highlightenletter { background-color:#ff0000; color:#ffffff; }";
			res += ".errMsg { color:red; font-weight:bold; }";
			res += ".lineno { margin-right:4pt; color:#7f7f7f; }";
			res += "</style>";
			res += "</HEAD><BODY>";
			res += "<div class=title>" + title + "</div>";
			res += "<div class=errMsg>" + Q.htmlize(errMsg) + "</div>";
			if (!Trace().empty()) {
				var node = Trace().top();
				res += this.getBlock("Position", node, 7);
				Trace().popTmp();
				while (node = Trace().top()) {
					res += this.getBlock("Called by", node, 5);
					Trace().popTmp();
				}
			}			res += "</BODY></HTML>";

			var wind = window.open("", "_blank", "toolbar=0,location=0,directories=0,status=0,menubar=0,scrollbars=1,resizable=1,copyhistory=0,width=800,height=600");
			var doc = wind.document;
			doc.write(res);
			doc.close();
			
			reporting = true;
			window.setTimeout(function() { reporting = false; }, 100);}
			
	};
	
	function ERROR(msg, e) {
		Reporter.report(msg);
		Trace().clear();
		ABORT(e);
	} 

	function ASSERT(cond, msg) {
		if (!cond) ERROR(msg);
	}
//#endif

	/*
	 * RegExps
	 */
	var whitespace = /\s/;
	var identBeginner = /[A-Za-z_]/; 
	var identChar = /\w/;
	var digitChar = /[0-9]/;
	var intReg = /^[0-9]+$/;
	var floatReg = /^[0-9]*\.[0-9]*$/;
	var strReg = /^\"[^\"\\]*\"$/;//"

	/*
	 * Functions
	 */
	// Wrapper for function to report error
	function funcWrapper(func, arg) {
//#ifdef DEBUG 
		return function (data) {
			try {
				return func(data);
			} catch (e) {
				Trace().setPos(arg.pos);
				ERROR("Error occurs while executing JavaScript code" + (e.message ? ": " + e.message : ""), e);
			}
		};
//#else
		return func;
//#endif
	}
	
	// Get a function to return a constant
	var ConstFunc = Q.constFunc;
	var trueConstFunc = ConstFunc(true);
	var falseConstFunc = ConstFunc(false);
	var nullConstFunc = ConstFunc(null);
	var emptyStrFunc = ConstFunc("");
	var nullObj = {};

	// Put input data list into data object.
	function setupDataObj(data, dataList) {
		if (!data.__args) data.__args = [];
		if (!dataList) return;
		for (var i in dataList)
			if (intReg.test(i))
				data.__args[i] = dataList[i];
			else
				data[i] = dataList[i];
	}
	
	/*
	 * The JSRL parser.
	 */
	function Scanner(value) {
		this.value = value;
//#ifdef DEBUG
		if ((typeof value) == "object" && value.__type == "ArgWithPos") {
			this.value = value.arg;
			this.basePos = value.pos;
		} else {
			this.basePos = 0;
		}
//#endif
		this.pos = 0;
	}
	Scanner.prototype = {
//#ifdef DEBUG
		finalPos : function () {
			return this.basePos + this.pos;
		},
//#endif
		end : function () {
			return this.pos >= this.value.length;
		},
		current : function () { return this.value.charAt(this.pos); },
		rest : function () { return this.value.substr(this.pos); },
		nextTag : function () {
			var str = [];
			var strVal;
			var value = this.value;
			var len = value.length;
			ASSERT(this.pos < value.length, "Expect more tag");
			var type, generator;
			var cont;
			var npos; 

			do {		
				cont = false;
				npos = value.indexOf("@", this.pos);
				if (npos < 0) npos = len;
//#ifdef DEBUG
				Trace().setPos(npos);
//#endif
				str.push(value.substring(this.pos, npos));
				if (npos == len) {
					this.pos = npos;
					type = "$self_insert";
					generator = new SelfInsertTag([Q.deindent(str.join(""))], this);
				} else {
					ASSERT(npos + 1 < len, "Expect another character after '@'");
					var ch = value.charAt(npos + 1); 
					switch (ch) {
					case "@":
						str.push("@");
						this.pos = npos + 2;
						cont = true;
						break;
					case "#":
						npos = value.indexOf("\n", npos);
						this.pos = (npos > 0 ? npos : len);
						cont = true;
						break;
					case "*":
						npos = value.indexOf("*@", npos);
						ASSERT(npos >= 0, "Expect '*@' to finish the comment area");
						this.pos = npos + 2;
						cont = true;
						break;
					default:
						strVal = Q.deindent(str.join(""));
						if (strVal != "") {
							this.pos = npos;
							type = "$self_insert";
							generator = new SelfInsertTag([strVal], this);
							break;
						}
						if (ch == "!") { 
							this.pos = npos + 2;
							skipBlank(this);
							var exprList = nextExprList(this);
							type = "$exec";
							generator = new ExecTag(exprList, this);
							break;
						}
						this.pos = npos + 1;
						skipBlank(this);
						ASSERT(this.pos < len, "Expect some other character after '@'"); 
						str = [];
						if (ch == '{') {
							var exprList = nextExprList(this);
							type = "$expr";
							generator = new EvalTag(exprList, this);
						} else {
							tagName = nextIdentifier(this);
							skipBlank(this);
							var exprList = nextExprList(this);
							var tagFunc = tags[tagName];
							type = tagName;
							if (tagFunc == undefined)
								generator = new DummyTag(exprList);
							else
								generator = new tagFunc(exprList, this);
						}
					}
				}
			} while (cont);

//#ifdef DEBUG
			generator.pos = npos;
//#endif
			return { "type" : type, "generator" : generator };
		}
	};
	
	function skipBlank(scanner) {
		var value = scanner.value;
		while (!scanner.end() && whitespace.test(value.charAt(scanner.pos)))
			scanner.pos++;
	}
	
	function tryNextIdentifier(scanner) {
		var pos0 = scanner.pos;
		var value = scanner.value;
		if (pos0 < value.length && identBeginner.test(value.charAt(pos0))) {
			scanner.pos++;
			while (pos0 < value.length && identChar.test(value.charAt(scanner.pos)))
				scanner.pos++;
			return value.substring(pos0, scanner.pos);
		}
		return null;
	}

	function nextIdentifier(scanner) {
//#ifdef DEBUG
		return tryNextIdentifier(scanner) || ERROR("Expect an indentifier");
//#else
		return tryNextIdentifier(scanner);
//#endif
	}
	
	function nextNumber(scanner) {
		var pos0 = scanner.pos;
		var value = scanner.value;
		while (!scanner.end() && digitChar.test(value.charAt(scanner.pos)))
			scanner.pos++;
		ASSERT(pos0 != scanner.pos, "Expect a decimal number");
		return value.substring(pos0, scanner.pos);
	}
	
	function nextString(scanner) {
		var value = scanner.value;
		var pos0 = scanner.pos;
		ASSERT(!scanner.end(), "Reached the end of the string");
		var quote = value.charAt(scanner.pos);
		scanner.pos++;
		while (scanner.pos < value.length) {
			var ch = value.charAt(scanner.pos++);
			if (ch == quote) break;
			if (ch == "\\") scanner.pos++;
		}
		ASSERT(scanner.pos <= value.length, "The string isn't complete");
		return value.substring(pos0, scanner.pos);
	}
	
	function nextExpr(scanner, endStr, varTkn) {
		skipBlank(scanner);
		var symbolStack = [];
		var str = [];
		var value = scanner.value;
		var last = null;
//#ifdef DEBUG
		var startPos = scanner.finalPos(); 
//#endif
		while (scanner.pos < value.length) {
			var ch = value.charAt(scanner.pos++);
			var ti = (varTkn ? varTkn.indexOf(ch) : -1);
			if (ti >= 0) {
				str.push(arguments[3 + ti](scanner, value, last));
			} else {
				switch (ch) {
				case "(":
					str.push(ch);
					symbolStack.push(")");
					break;
				case "[":
					str.push(ch);
					symbolStack.push("]");
					break;
				case "{":
					str.push(ch);
					symbolStack.push("}");
					break;
				case "\\":
					str.push(ch);
					if (scanner.pos < value.length)
						str.push(value.charAt(scanner.pos++));
					break;
				case "\"":
				case "\'":
					scanner.pos--;
					str.push(nextString(scanner));
					break;
				default:
					if (symbolStack.length == 0) {
						if (endStr && endStr.indexOf(ch) >= 0) {
//#ifdef DEBUG
							return new ArgWithPos(Q.trim(str.join("")), startPos);
//#else
							return Q.trim(str.join(""));
//#endif
						}
					} else if (ch == symbolStack[symbolStack.length - 1])
						symbolStack.pop();
					str.push(ch);
				}
			}
			last = ch;
		}
		var result = Q.trim(str.join(""));
//#ifdef DEBUG
		result = new ArgWithPos(result, startPos);
//#endif
		return result;
	}
	
	function dollarParseFunc(scanner, value) {
		ASSERT(!scanner.end(), "Expect an expression");
		ch = value.charAt(scanner.pos);
		if (ch == "$") {
			scanner.pos++;
			return "$";
		} else if (digitChar.test(ch)) {
			var num = nextNumber(scanner);
			return "__data.__args[" + num + "]";
		} else if (ch == "?") {
			scanner.pos++;
			return "__data.__args.length";
		} else if (ch == "*") {
			scanner.pos++;
			return "__data.__args";
		} else if (identBeginner.test(ch)) {
			var ident = nextIdentifier(scanner);
			return "__data['" + ident + "']";
		} else {
			return "$";
		}
	}

	function replaceVar(str, vars) {
		var varExp = /{(\w+)}/g;
		var result = [], lastIdx = 0;
		var m;
		while (m = varExp.exec(str)) {
			ASSERT(vars[m[1]], "Undefined variable \"" + m[1] + "\" in \"" + str + "\"");
			result.push(str.substring(lastIdx, m.index));
			result.push(vars[m[1]]);
			lastIdx = m.index + m[0].length;
		}
		result.push(str.substr(lastIdx));
		return result.join("");
	}

	function getAbsPath(url, ref) {
		if (ref == null) ref = location.pathname;
		url = replaceVar(url, metaVars);
		return Q.toAbsPath(ref, url);
	}
	
	function atParseFunc(scanner, value) {
		skipBlank(scanner);
		ASSERT(!scanner.end(), "Expect a string or expression");
		ch = value.charAt(scanner.pos);
		var expr = null;
		if (ch == "\"") {
			var p = nextString(scanner);
			if (strReg.test(p))
				return "\"" + Q.stringize(getAbsPath(p.substr(1, p.length - 2), basePath)) + "\"";
			else
				expr = p;
		} else if (ch == "(") {
			scanner.pos++;
			var e = nextExpr(scanner, ")", "$", dollarParseFunc);
//#ifdef DEBUG
			e = e.arg;
//#endif
			expr = "(" + e + ")";
		}
		return (expr ? "Jsrl.getAbsPath(" + expr + "," + basePathStr + ")" : "@");
	}
	
	function nextExprList(scanner) {
		var value = scanner.value;
		if (scanner.end() || value.charAt(scanner.pos) != "{") return [];
		scanner.pos++;
		var result = [];
		while (!scanner.end() && value.charAt(scanner.pos - 1) != "}")
			result.push(nextExpr(scanner, ",}", "$@", dollarParseFunc, atParseFunc));
		ASSERT(scanner.pos > 0 && scanner.pos <= value.length && value.charAt(scanner.pos - 1) == "}", "expect '}' to end"); 
		return result;
	}

	var evalFuncList = [];
	var lastEvaluated = 0;
	function evalFunc(func) {
		var index = evalFuncList.length;
		evalFuncList.push({"txt":func});
		var ff = null;
		return function () {
			if (!ff) {
				var f = evalFuncList[index];
				var i;
				if (f.func) 
					ff = f.func;
				else {
					var evalFuncs = [];
					evalFuncs.push("res = ([");
					for (i = lastEvaluated; i < evalFuncList.length - 1; i++) {
						evalFuncs.push(evalFuncList[i].txt);
						evalFuncs.push(",");
					}
					evalFuncs.push(evalFuncList[i].txt);
					evalFuncs.push("])");
					var funcArr = JsrlEval(evalFuncs.join(""));
					for (i = lastEvaluated; i < evalFuncList.length; i++) {
						evalFuncList[i].txt = undefined;
						evalFuncList[i].func = funcArr[i - lastEvaluated];
					}
					lastEvaluated = evalFuncList.length;
					ff = evalFuncList[index].func;
				}
			}
			return ff.apply(null, arguments);
		};
	}

    function isEmptyArg(xarg) {
//#ifdef DEBUG
		return !xarg || Q.blank(xarg.arg);
//#else
		return Q.blank(xarg);
//#endif
	}

	/*
	 * Evaluators
	 */
	function evaluateFunc (xarg) {
		if (xarg == null) return nullConstFunc;
//#ifdef DEBUG
		var arg = xarg.arg;
//#else
		var arg = xarg;
//#endif
		arg = Q.trim(arg);
		if (intReg.test(arg))
			return ConstFunc(parseInt(arg));
		else if (floatReg.test(arg))
			return ConstFunc(parseFloat(arg));
		else if (strReg.test(arg))
			return ConstFunc(arg.substr(1, arg.length - 2));
		else if (arg == "true")
			return trueConstFunc;
		else if (arg == "false")
			return falseConstFunc;
		else if (arg == "")
			return nullConstFunc;
		else {
//#ifdef DEBUG
			var func;
			try {
				func = JsrlEval("res = function (__data) { return (" + arg + "); };");
			} catch (e) {
				Trace().setPos(xarg.pos);
				ERROR("Error occurs while evaluating expression" + (e.message ? ": " + e.message : ""), e);
			}
			return funcWrapper(func, xarg);
//#else
			return evalFunc("function (__data) { return (" + arg + "); }");
//#endif
		}
	}
	
	function executeFunc(xarg) {
//#ifdef DEBUG
		var arg = xarg.arg;
//#else
		var arg = xarg;
//#endif
//#ifdef DEBUG
		var func;
		try {
			func = JsrlEval("res = function (__data) { " + arg + "; };");
		} catch (e) {
			Trace().setPos(xarg.pos);
			ERROR("Error occurs while executing statement" + (e.message ? ": " + e.message : ""), e);
		}
		return funcWrapper(func, xarg);
//#else
		return evalFunc("function (__data) { " + arg + "; }");
//#endif
	}
	
	function parseAttribute(arg) {
		var scanner = new Scanner(arg);
		skipBlank(scanner);
		var name = tryNextIdentifier(scanner);
		if (!name) return null;
		skipBlank(scanner);
		var value = null;
		if (scanner.end()) return null;
		var sep = scanner.current();
		if (sep != '=' && sep != ':') return null;
		scanner.pos++;
		skipBlank(scanner);
//#ifdef DEBUG
		Trace().setPos(scanner.finalPos());
//#endif
		value = scanner.rest();
//#ifdef DEBUG
		return { "name" : name, "func" : sep == ':', "value" : new ArgWithPos(value, scanner.finalPos())};
//#else
		return { "name" : name, "func" : sep == ':', "value" : value };
//#endif
	};
	
	function Setter(xarg) {
		var arg = xarg;
//#ifdef DEBUG
		if (xarg) arg = xarg.arg;
//#endif
		arg = (arg ? Q.trim(arg) : "");
		this.anony = this.usePar = false;
		if (arg == "") {
			this.accessList = { anony : true, length : 0 };
			return;
		}
		var scanner = new Scanner(xarg);
		ASSERT(arg.length > 0 && arg.charAt(0) != "[", "lvalue must begin with an identifier"); 
		var accessList;
		if (arg.charAt(0) == "#") {
			accessList = [];
			scanner.pos++;
			this.usePar = true;
		} else {
			accessList = [ConstFunc(nextIdentifier(scanner))];
		}
		this.accessList = accessList;
		while (!scanner.end()) {
			ASSERT(arg.charAt(scanner.pos) == "[" || arg.charAt(scanner.pos) == ".", arg + ": '[' or '.' expected");
			if (arg.charAt(scanner.pos++) == "[") {
				accessList.push(evaluateFunc(nextExpr(scanner, "]")));
				ASSERT(arg.charAt(scanner.pos - 1) == "]", arg + ": ']' expected");
			} else {
				accessList.push(ConstFunc(nextIdentifier(scanner)));
			}
		}
	}
	function SetterInstance(usePar, accessList, data, env) {
		var pcind = env.parCtrlIndexes;
		var pind = pcind.indexes;
		this.anony = usePar && pcind.anony || accessList.anony; 
		if (this.anony) {
			this.indexes = [env.generateName()];
		} else {
			var indexes = new Array((usePar ? pind.length : 0) + accessList.length);
			var j = 0;
			if (usePar)
				for (var i = 0; i < pind.length; i++)
					indexes[j++] = pind[i];
			for (var i = 0; i < accessList.length; i++) indexes[j++] = accessList[i](data);
			this.indexes = indexes;
		}
	}
	SetterInstance.prototype = {
		set : function (obj, value) {
			var indexes = this.indexes;
			if (indexes.length == 0) {
				obj["__default"] = value;
				return;
			}
			for (var i = 0; i < indexes.length - 1; i++) {
				var id = indexes[i];
				var next = obj[id];
				if (next == null) obj[id] = next = (typeof(indexes[i + 1]) == "string" ? {} : []);
				obj = next;
			}
			obj[indexes[indexes.length - 1]] = value;
		},
		get : function (obj) {
			var indexes = this.indexes;
			if (indexes.length == 0) return (obj ? obj["__default"] : null);
			for (var i = 0; i < indexes.length; i++) {
				if (obj == null) return null;
				obj = obj[indexes[i]];
			}
			return obj;
		}
	};
	Setter.prototype = {
		set : function (data, env, obj, value) {
			(new SetterInstance(this.usePar, this.accessList, data, env)).set(obj, value);
		},
		getSetterInstance : function (data, env) {
			return new SetterInstance(this.usePar, this.accessList, data, env);
		}
	};
	
	/*
	 * Special tags.
	 */
	function SelfInsertTag(args, scanner) {
		ASSERT(args.length == 1, "SelfInsertTag: need only 1 argument");
		this.text = args[0];
	}
	SelfInsertTag.prototype = {
		generate : function (data, env) {
			env.push(this.text);
		}
	};
	
	function EvalTag(args, scanner) {
		ASSERT(args.length == 1, "@{}: need only 1 argument");
		this.evalFunc = evaluateFunc(args[0]);
	}
	EvalTag.prototype = {
		generate : function (data, env) {
			var result = this.evalFunc(data);
			if (result == null)
				result = data.undefined_text; 
			else
				result = Q.escape(result);
			env.push(result);
		}
	};

	function ExecTag(args, scanner) {
		ASSERT(args.length == 1, "@!: need only 1 argument");
		this.exec = executeFunc(args[0]);
	}

	ExecTag.prototype = {
		generate : function (data, env) {
			this.exec(data);
		}
	};

	function Block() {
		this.tags = [];
	}
	Block.prototype = {
		generate : function (data, env) {
			var result = [];
			var tags = this.tags;
			for (var i = 0; i < tags.length; i++) {
				var tag = tags[i];
//#ifdef DEBUG
				Trace().pushPos(tag.pos);
//#endif				
				tags[i].generate(data, env);
//#ifdef DEBUG
				Trace().pop();
//#endif				
				if (env.cStop) break;
			}
			return result.join("");
		},
		appendUntilDummy : function (scanner) {
			var tag = scanner.nextTag();
			while (!(tag.generator.__type == "DummyTag")) {
				this.tags.push(tag.generator);
				tag = scanner.nextTag();
			}
			return tag;
		}
	};

	function DummyTag(args) { this.args = args; }
	DummyTag.prototype = {
		generate : function (data, env) {
			ERROR("DummyTag is not expected to be evaluated");
		},
		"__type" : "DummyTag"
	};
	
	/*
	 * Post executer.
	 */
	 var postExecList = [];
	 function runPostExec() {
	 	for (var i = 0; i < postExecList.length; i++) {
	 		var elem = postExecList[i];
//#ifdef DEBUG
			if (elem.p)
				Trace().push(elem.p);
	 		elem.f();
			if (elem.p)
				Trace().pop();;
//#else
			elem();
//#endif
		}
		postExecList = [];
	 }
	 function postExec(func) {
//#ifdef DEBUG
		postExecList.push({f:func, p:Trace().top()});
//#else
		postExecList.push(func);
//#endif
	 	if (postExecList.length == 1 && !isLoading()) setTimeout(runPostExec, 0);
	 }
	 function dispose() {
	 	postExecList = [];
	 }

	/*
	 * JSRL render process.
	 */
	var evaluators = {};
	var undefinedText = "";
	
	function EnvManager(container, doc, wind) {
		this.container = container;
		this.cname = "__" + container.id;
		this.id = 0;
		this.nid = 0;
		this.parCtrlIndexes = { anony: false, indexes: [] };
		this.doc = doc;
		this.wind = wind;
		this.hasForm = false;
	}
	EnvManager.prototype = {
		generateId : function () {
			return this.cname + "_S_" + (this.id++);
		},
		generateName : function () {
			return "__anony_" + (this.nid++);
		},
		pushScope : function (cname) {
			var result = [this.cname, this.id, this.nid, this.hasForm];
			this.cname = cname;
			this.id = 0;
			this.nid = 0;
			return result;
		},
		popScope : function (arg) {
			this.cname = arg[0];
			this.id = arg[1];
			this.nid = arg[2];
			this.hasForm = arg[3];
		},
		addRenderHook : function (handler) {
//#ifdef DEBUG
			handler.handlerPos = Trace().top();
//#endif
			this.form.onrenderHooks.push(handler);
		},
		prerender : function (form) {
			this.form = form;
			form.onrenderHooks = [];
		},
		callRenderHook : function () {
			var hooks = this.form.onrenderHooks;
			for (var i = 0; i < hooks.length; i++) {
//#ifdef DEBUG
				Trace().push(hooks[i].handlerPos);
//#endif
				hooks[i].onrender(this);
//#ifdef DEBUG
				Trace().pop();
//#endif
			}
		},
		initRender : function () { this.htmlList = []; },
		push : function (str) { if (str != null) this.htmlList.push(str); },
		getHtml : function () { return this.htmlList.join(""); }
	};

	function Evaluator(tags, prop, lang) {
		this.block = new Block();
		this.block.tags = tags;
		this.undefined_text = undefinedText;
		this.prop = prop;
		this.lang = lang;
	}
	Evaluator.prototype = {
		evaluateData : function (data, dataList, env) {
			setupDataObj(data, dataList);
			data.ROOT = env.container;
			data.TOP = env.form;
			data.WIND = env.wind;
//#ifdef DEBUG
			Trace().pushTmp(this.info);
//#endif
			this.block.generate(data, env);
//#ifdef DEBUG
			Trace().popTmp();
//#endif
		}
	};

	function finalFinalFunc() {
		if (this.hidden)
			return null;
		else
			return this.eval();
	};
	
	function __renderTemp(node, tmp, args, callback, path) {
		var env = new EnvManager(node, node.ownerDocument, window);
		var data;
		if (node.form) {
			var oldSt = node.form.status();
			env.oldStatus = oldSt.ctrls;
			data = oldSt.data;
			node.form.dispose();
			node.form = null;
		} else {
			data = {};
		}
		var form = new FormCtrl(null, false);
		form.data = form.__data = data;
		env.prerender(form);
		env.initRender();
		tmp.evaluateData(data, args, env);
		node.innerHTML = env.getHtml();
		node.form = env.form;
		env.callRenderHook();
		if (callback && (typeof(callback) == "function")) callback(node);
	}
	
	function renderTemp(node, tmp, args, callback, path) {
		postExec(function() { __renderTemp(node, tmp, args, callback, path); });
	}
	
	function renderTextTemp(node, text, data, callback) {
		if (node.id == "" || node.id == undefined) node.id = uniqueId();
//#ifdef DEBUG		
		Trace().pushPageNode(node);
//#endif
		var tmp = loadTemplate(text);
//#ifdef DEBUG
		Trace().pop();
//#endif
		renderTemp(node, tmp, data, callback);
	}

	function renderData(obj, temp, data, callback) {
//#ifdef DEBUG
		Trace().push();
//#endif
		renderTemp(obj, temp, data, callback);
//#ifdef DEBUG
		Trace().pop();
//#endif
	}
	
	function render(node, data, callback) {
		var elem = (typeof(node) == "string" ? document.getElementById(node): node);
		if (!elem.jsrlTemplate) elem.jsrlTemplate = getTemplate(":" + elem.id);
		renderData(elem, elem.jsrlTemplate, data, callback);
	}
	
	function clear(node) {
		if (node.form) {
			node.form.dispose();
			node.form = undefined;
		}
	}
	
	function rerender(node, data, callback) {
		var elem = (typeof(node) == "string" ? document.getElementById(node): node);
		clear(elem);
		render(elem, data, callback);
	}

	function attachNode(node, tmp, data, callback) {
		function attach (t) {
			clear(node);
			if (typeof(node) == "string") node = document.getElementById(node);
			if (node.id == "" || node.id == undefined) node.id = uniqueId();
			node.jsrlTemplate = t;
			renderData(node, t, data, callback);
		}
		if (typeof tmp == "string")
			parseFarTmpName(tmp, function (name) { attach(getTemplate(name)); });
		else
			attach(tmp);
	}
	
	function renderNode(node, data, callback) {
		if (node.id == "" || node.id == undefined) node.id = uniqueId();
		if (!node.jsrlTemplate) node.jsrlTemplate = getTemplate(":" + node.id);
		renderData(node, node.jsrlTemplate, data, callback);
	}
	
	/*
	 * JSRL tag library.
	 */
	var tags = {};
	var basePath, basePathStr;

	function registerTag(name, obj) {
		ASSERT(!(name in tags), "Tag @" + name + " has been already registered");
		tags[name] = obj;
	}

	function getAbsTempNameTransformer(ref) {
		var r = (ref || basePath);
		return function (name)  {
			var pos = name.indexOf(':');
			if (pos > 0)
				return getAbsPath(name.substr(0, pos), r) + ":" + name.substr(pos + 1);
			else
				return r + ":" + name;
		};
	}

	function getAbsTempName(ref, name) {
		var f = getAbsTempNameTransformer(ref);
		return f(name);
	}
	
	function loadTemplate(template, prop, lang, path) {
//#ifdef DEBUG
		Trace().setText(template);
//#endif
		if (!path) path = location.href;
		basePath = path;
		basePathStr = "\"" + Q.stringize(path) + "\"";
		var scanner = new Scanner(template);
		var count = 0;
		var list = [];
		while (!scanner.end()) {
			var tag = scanner.nextTag();
			ASSERT(tag.generator.__type != "DummyTag", "Unknown tag " + tag.type);
			list.push(tag.generator);
		}
		var result = new Evaluator(list, prop, lang);
//#ifdef DEBUG
		result.info = Trace().topInfo();
//#endif
		basePath = basePathStr = null;
		return result;
	}

	/*
	 * Methods for management of JSRL templates.
	 */
	var loadedUrl = {}, loadedJs = {}, loadedCss = {};
	var loading = 0;
	var uniqueIdCount = 0;
	
	function LazyTemplate(name, path, text, prop, lang) {
		this.name = name;
		this.path = path;
		this.text = text;
		this.prop = prop;
		this.lang = lang;
	}
	LazyTemplate.prototype.__type = "LazyTemplate";
	
	function isLoading() {
		return loading > 0 || (parentJsrl && parentJsrl.isLoading());	
	}
	
	function uniqueId() {
		return "__unique_" + (uniqueIdCount++);
	}
	
	function registerTemplate(name, text) {
		ASSERT(!evaluators[name], "Jsrl template names confict - " + name);
		var result = loadTemplate(text);
		evaluators[name] = result;
		return result;
	}
	
	function registerLazyTemplate(name, tmp) {
		evaluators[name] = tmp;
	}
	
	function getJsrlTemplate(node) {
		if (node.tagName == "DIV" || node.tagName == "SPAN") {
			var elem = node.firstChild;
			if (elem != null && elem.nodeType == 8 && node.childNodes.length == 1)
				return elem.data;
		}
		return null;
	}

	function loadTemplateInPage(name) {
		var node = document.getElementById(name);
		ASSERT(node != undefined, "Cannot find element named \"" + name + "\"");
		var tempText = getJsrlTemplate(node);
		ASSERT(tempText != null, "The node \"" + name + "\" is not a JSRL node");
//#ifdef DEBUG
		Trace().pushPageNode(node);
//#endif
		var result = registerTemplate(":" + name, tempText);
//#ifdef DEBUG
		Trace().pop();
//#endif
		return result;
	}

	function getTemplate(name) {
		var result = evaluators[name];
		if (result == null) {
			if (name.charAt(0) == ":") {
				result = loadTemplateInPage(name.substr(1));
				ASSERT(result != undefined, "Cannot find template with name " + name);
			} else if (name.charAt(0) == "!") {
				result = loadTemplateInPage(name);
				ASSERT(result != undefined, "Cannot find template with name " + name);
			} else {
				if (parentJsrl)
					result = parentJsrl.getTemplate(name, true);
				ASSERT(result, "Cannot find template named " + name);
			}
		} else if (result.__type == "LazyTemplate") {
//#ifdef DEBUG
			Trace().pushTemplate(result.name, result.path);
			Trace().setText(result.text);
//#endif
			evaluators[name] = result = loadTemplate(result.text, result.prop, result.lang, result.path);
//#ifdef DEBUG
			Trace().pop();
//#endif
		}
		return result;
	}

	function parseFarTmpName(farName, callback) {
		var pos = farName.indexOf(':');
		var name;
		var cb = function () { callback(name); };
		if (pos > 0) {
			name = farName.substr(pos + 1);
			loadLibrary(farName.substr(0, pos), cb);
		} else 
			callback(farName);
	}

	function findTemplate(name, callback) {
		parseFarTmpName(name, function (name) {
			var tmp = getTemplate(name);
			if (callback) callback(tmp, name);
		});
	}

	var propParsers = {};
	function registerPropParser(name, parser) {
		propParsers[name] = parser;
	}

	function loadXml(absPath, doc, callback) {
		var root = doc.documentElement;
		ASSERT(root.nodeName == "jsrllib", "The Jsrl library " + absPath + " should contain a unique root named jsrllib");
		var rootLang = root.getAttribute("lang");
		var nodes = root.childNodes;
		var tracker = Q.newDependTracker();
		var onresolve = Q.bind(tracker.resolve, tracker);
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			if (node.nodeType == 1) {
				if (node.nodeName == "require") {
					tracker.add();
					loadLibrary(node.getAttribute("path"), onresolve, absPath);
				} else if (node.nodeName == "script") {
					tracker.add();
					loadResource(node.getAttribute("path"), onresolve, absPath, loadedJs, Q.loadJs);
				} else if (node.nodeName == "style") {
					tracker.add();
					loadResource(node.getAttribute("path"), onresolve, absPath, loadedCss, Q.loadCss);
				} else {
					var lang = node.getAttribute("lang");
					if (!lang) lang = rootLang;
					if (!isCompatibleLang(language, lang)) continue;
					var txt = null;
					var j, name, isTmp;
					ASSERT(node.nodeName == "template" || node.nodeName == "dict", "Cannot resolve tag named " + node.nodeName + " in " + absPath);
					if (node.nodeName == "template") {
						isTmp = true;
						name = node.getAttribute("name");
					} else {
						isTmp = false;
						name = node.getAttribute("key");
					} 

					for (j = 0; j < node.childNodes.length; j++) {
						var subNode = node.childNodes[j];
						ASSERT(subNode.nodeType == 1 || subNode.nodeType == 3 || subNode.nodeType == 4 || subNode.nodeType == 8, "Unexpected subnode in " + node.nodeName + " node \"" + name + "\"");
						if (subNode.nodeType == 4) {
							txt = subNode.nodeValue;
							break;
						}
					}
					ASSERT(j < node.childNodes.length, "Cannot find text in " + node.nodeName + " \"" + name + "\" template in " + absPath);
					
					if (isTmp) {
						var oldTmp = evaluators[name];
//#ifdef DEBUG
						if (!oldTmp || needsOverrideLang(lang, oldTmp.lang, "Template \"" + name + "\""))
//#else
						if (!oldTmp || needsOverrideLang(lang, oldTmp.lang))
//#endif
						{
							var prop = {};
							var props = node.getElementsByTagName("property");
							for (var k = 0; k < props.length; k++) {
								var pname = props[k].getAttribute("name");
								var value = props[k].getAttribute("value");
								ASSERT(pname, "A property of \"" + name + "\" in " + absPath + " does not have a name");
								var parser = propParsers[pname];
								var parsedVal = (parser ? parser(value, pname) : value);
								prop[pname] = parsedVal;
							}
							registerLazyTemplate(name, new LazyTemplate(name, absPath, txt, prop, lang));
						}
					} else if (node.nodeName == "dict") {
//#ifdef DEBUG
						var data;
						try {
							data = Q.evalJSON(txt);
						} catch (e) {
							ERROR("JSON syntax error in dictionary \"name\"", e);
						}
						registerDictItem(lang, name, data);
//#else
						registerDictItem(lang, name, Q.evalJSON(txt));
//#endif
					}
				}
			}
		}
		if (callback) tracker.onload(callback);
	}

	function loadLibrary(url, callback, ref) {
		var absPath = getAbsPath(url, ref);
		var t = loadedUrl[absPath];
		if (t) {
			t.onready(callback);
			return true;
		} 
		loadedUrl[absPath] = t = Q.newReadyTracker(callback);
		t.makePageReadyDependent();
		loading++;
		Q.ajax(absPath, function (req) {
				ASSERT((req.status == 200 || req.status == 0) && req.responseXML, "Fail to load library " + url);
				loadXml(absPath, req.responseXML, Q.bind(t.ready, t));
				loading--;
				if (loading == 0) setTimeout(runPostExec, 0);
			});
		return false;
	}

	function loadResource(url, callback, ref, map, loadFunc) {
		var absPath = getAbsPath(url, ref);
		var t = map[absPath];
		if (t) {
			t.onready(callback);
			return;
		}
		map[absPath] = t = Q.newReadyTracker(callback);
		loadFunc(absPath, Q.bind(t.ready, t));
	}

	function loadForTag(tagName) {
		var nodes = document.getElementsByTagName(tagName);
		for (var i = 0; i < nodes.length; i++)
			if ((!nodes[i].id || nodes[i].id.charAt(0) != "!") && getJsrlTemplate(nodes[i]) != null) {
				try {
					renderNode(nodes[i]);
				} catch (e) {
//#ifdef DEBUG
					throw e;
//#endif
				}
			}
	}
	 
	function loadAll(callback) {
		loadForTag("DIV");
		loadForTag("SPAN");
		if (callback) postExec(callback);
	}

	/*
	 * JSRL basic tags
	 */

//#ifdef DEBUG
	function __check_end(startTagName, tag, name) {
		ASSERT(tag.type == "E" || tag.type == name, startTagName + ": expect @E or @" + name);
		ASSERT(tag.generator.args.length == 0, startTagName + ": @" + tag.type + " expect no argument");
	}
//# define CHECK_END(A, B, C) __check_end(A, B, C);
//#else
//# define CHECK_END(A, B, C)
//#endif
       
	function SetTag(args, scanner) {
		ASSERT(args.length == 2, "@set: need 2 arguments");
		this.setter = new Setter(args[0]);
		this.value = evaluateFunc(args[1]);
	}
	SetTag.prototype = {
		generate : function (data, env) {
			this.setter.set(data, env, data, this.value(data));
		}
	};
	registerTag("set", SetTag);
	
	function ForEachTag(args, scanner) {
		ASSERT(args.length == 2, "@foreach: need 2 arguments");
		this.setter = new Setter(args[0]);
		this.listSrc = evaluateFunc(args[1]);
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@foreach", last, "end_foreach")
	}
	ForEachTag.prototype = {
		generate : function (data, env) {
			var list = this.listSrc(data);
			var isArray = Q.isArray(list);
			for (var i in list) {
				if (typeof(list[i]) == "function") continue;
				this.setter.set(data, env, data, isArray ? list[i] : i);
				this.body.generate(data, env);
				if (env.cContLoop) env.cStop = env.cContLoop = false;
				if (env.cStop) break;
			}
			if (env.cContOutLoop) env.cStop = env.cContOutLoop = false;
		}
	};
	registerTag("foreach", ForEachTag);
	
	function ForTag(args, scanner) {
		ASSERT(args.length == 3, "@for: need 3 arguments");
		this.init = executeFunc(args[0]);
		this.cond = evaluateFunc(args[1]);
		this.incr = executeFunc(args[2]);
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@for", last, "end_for")
	}
	ForTag.prototype = {
		generate : function (data, env) {
			for (this.init(data); this.cond(data); this.incr(data)) {
				this.body.generate(data, env);
				if (env.cContLoop) env.cStop = env.cContLoop = false;
				if (env.cStop) break;
			}
			if (env.cContOutLoop) env.cStop = env.cContOutLoop = false;
		}
	};
	registerTag("for", ForTag);
	
	function WhileTag(args, scanner) {
		ASSERT(args.length == 1, "@while: need 1 argument");
		this.cond = evaluateFunc(args[0]);
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@while", last, "end_while")
	}
	WhileTag.prototype = {
		generate : function (data, env) {
			while (this.cond(data)) {
				this.body.generate(data, env);
				if (env.cContLoop) env.cStop = env.cContLoop = false;
				if (env.cStop) break;
			}
			if (env.cContOutLoop) env.cStop = env.cContOutLoop = false;
		}
	};
	registerTag("while", WhileTag);
	
	function DoTag(args, scanner) {
		ASSERT(args.length == 0, "@do: expect no argument");
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@while", last, "end_while")
		this.cond = evaluateFunc(last.generator.args[0]);
	}
	DoTag.prototype = {
		generate : function (data, env) {
			do {
				this.body.generate(data, env);
				if (env.cContLoop) env.cStop = env.cContLoop = false;
				if (env.cStop) break;
			} while (this.cond(data));
			if (env.cContOutLoop) env.cStop = env.cContOutLoop = false;
		}
	};
	registerTag("do", DoTag);

	function IfTag(args, scanner) {
		ASSERT(args.length == 1, "@if: need 1 argument");
		this.cases = [];
		this.cases.push({ "cond" : evaluateFunc(args[0]), "body" : new Block() });
		var next = this.cases[0].body.appendUntilDummy(scanner);
		this.elseBody = null;
		while (next.type != "end_if" && next.type != "E") {
			ASSERT(next.type == "elseif" || next.type == "else", "@if: expect @elseif or @else or @end_if, unknown tag @" + next.type);
			var body = new Block();
			if (next.type == "elseif") {
				ASSERT(this.elseBody == null, "@if: @elseif cannot appear after @else");
				ASSERT(next.generator.args.length == 1, "@elseif: need 1 argument");
				this.cases.push({ "cond" : evaluateFunc(next.generator.args[0]), "body" : body });
			} else if (next.type == "else") {
				ASSERT(next.generator.args.length == 0, "@else: expect no argument");
				this.elseBody = body;
			}
			next = body.appendUntilDummy(scanner);
		}
		CHECK_END("@if", next, "end_if");
	}
	IfTag.prototype = {
		generate : function (data, env) {
			for (var i = 0; i < this.cases.length; i++)
				if ((this.cases[i].cond)(data)) {
					this.cases[i].body.generate(data, env);
					return;
				}
			if (this.elseBody != null)
				this.elseBody.generate(data, env);
		}
	};
	registerTag("if", IfTag);

	function GridTagLoopBody(preTags, postTags, oldLoop, colSize) {
		this.preTags = preTags;
		this.postTags = postTags;
		this.oldLoop = oldLoop;
		this.colSize = colSize;
		this.iter = 0;
	}
	GridTagLoopBody.prototype = {
		generate : function (data, env) {
			if (this.iter % this.colSize == 0) this.preTags.generate(data, env);
			this.oldLoop.body.generate(data, env);
			this.iter++; 
			if (this.iter % this.colSize == 0) this.postTags.generate(data, env);
		}
	};
	function GridTag(args, scanner) {
		ASSERT(args.length == 1, "@grid: don't need 1 argument");
		this.colSize = evaluateFunc(args[0]);
		
		this.preTags = new Block();
		var next = this.preTags.appendUntilDummy(scanner);
		ASSERT(next.type == "cell", "@grid: expect @cell, unknown tag @" + next.type);
		ASSERT(next.generator.args.length == 0, "@cell: expect no argument");

		this.loop = scanner.nextTag().generator;
		ASSERT(this.loop.body != undefined, "@cell: expect a loop after that");

		this.postTags = new Block();
		next = this.postTags.appendUntilDummy(scanner);
		if (next.type == "empty") {
			ASSERT(next.generator.args.length == 0, "@empty: expect no argument");
			this.emptyBody = new Block();
			next = this.emptyBody.appendUntilDummy(scanner);
		}
		CHECK_END("@grid", next, "end_grid")
	}
	GridTag.prototype = {
		generate : function (data, env) {
			var loop = Q.clone(this.loop);
			var colSize = this.colSize(data);
			loop.body = new GridTagLoopBody(this.preTags, this.postTags, this.loop, colSize);
			loop.generate(data, env);
			var needOver = (loop.body.iter % colSize != 0);
			if (this.emptyBody) {
				for (var i = loop.body.iter; i % colSize != 0; i++)
					this.emptyBody.generate(data, env);
			}
			if (needOver) this.postTags.generate(data, env);
		}
	};
	registerTag("grid", GridTag);
	
	function BreakTag(args, scanner) {
		ASSERT(args.length == 0, "@break: expect no argument");
	}
	BreakTag.prototype = {
		generate : function (data, env) {
			env.cStop = true;
			env.cContOutLoop = true;
		}
	};
	registerTag("break", BreakTag);

	function ContinueTag(args, scanner) {
		ASSERT(args.length == 0, "@continue: expect no argument");
	}
	ContinueTag.prototype = {
		generate : function (data, env) {
			env.cStop = true;
			env.cContLoop = true;
		}
	};
	registerTag("continue", ContinueTag);

	function ReturnTag(args, scanner) {
		ASSERT(args.length == 0, "@return: expect no argument");
	}
	ReturnTag.prototype = {
		generate : function (data, env) {
			env.cStop = true;
			env.cContTemp = true;
		}
	};
	registerTag("return", ReturnTag);

	function ExitTag(args, scanner) {
		ASSERT(args.length == 0, "@exit: expect no argument");
	}
	ExitTag.prototype = {
		generate : function (data, env) {
			env.cStop = true;
		}
	};
	registerTag("exit", ExitTag);

	function HtmlizeTag(args, scanner) {
		ASSERT(args.length == 1, "@_: expect 1 argument");
		this.value = evaluateFunc(args[0]);
	}
	HtmlizeTag.prototype = {
		generate : function (data, env) {
			var result = this.value(data);
			if (result == null) result = env.undefined_text; 
			env.push(Q.htmlize(result));
		}
	};
	registerTag("_", HtmlizeTag);

	function HtmlTag(args, scanner) {
		ASSERT(args.length == 1, "@html: expect 1 argument");
		this.value = evaluateFunc(args[0]);
	}
	HtmlTag.prototype = {
		generate : function (data, env) {
			var result = this.value(data);
			if (result == null) result = env.undefined_text; 
			env.push(result);
		}
	};
	registerTag("html", HtmlTag);

	/*
	 * Support for attributes.
	 */
	function parseAttributes(tag, parsers, args, index) {
		var j = index || 0;
		var res = [];
		tag.attributes = [];
		for (var i = j; i < args.length; i++) {
			var att = parseAttribute(args[i]);
			if (att) {
				var parser = parsers[att.name];
				if (parser == null && att.func)
					parser = new EventAttParser(att.name);
				ASSERT(parser != null, "Unable to find parser for attribute " + att.name);
				ASSERT(!parser.isFuncAtt == !att.func, (att.func ? "'=' should be used for non-function attribute, not ':'" : "':' should be used for function attribute, not '='"));
				tag.attributes.push(parser.parse(att.value, tag));
			} else
				args[j++] = args[i];
		}
		args.length = j;
	}
	function generateAttributes(tag, data, ctrl, env) {
		var atts = tag.attributes;
		for (var i = 0; i < atts.length; i++)
			atts[i].generate(data, ctrl, tag, env);
	}
	function CtrlAttGenerator(name, value) {
		this.name = name;
		this.value = value;
	}
	CtrlAttGenerator.prototype = {
		generate : function (data, ctrl, tag) {
			ctrl[this.name] = this.value(data);
		} 
	};
	function CtrlAttParser(name) { this.name = name; }
	CtrlAttParser.prototype = {
		parse : function (value, tag) {
			return new CtrlAttGenerator(this.name, evaluateFunc(value)); 
		}
	};

	function SimpleAttGenerator(name, value) {
		this.name = name;
		this.value = value;
	}
	SimpleAttGenerator.prototype = {
		generate : function (data, ctrl, tag, env) {
			var value = this.value(data);
			if (ctrl) ctrl[this.name] = value;
			if (value != null)
				env.push(" " + this.name + "=\"" + Q.escape(value + "") + "\" ");
		} 
	};
	function SimpleAttParser(name) { this.name = name; }
	SimpleAttParser.prototype = {
		parse : function (value, tag) {
			return new SimpleAttGenerator(this.name, evaluateFunc(value)); 
		}
	};

    function ValueAttGenerator(name, value) {
        this.name = name;
        this.value = value;
    }
	ValueAttGenerator.prototype = {
		generate : function (data, ctrl, tag, env) {
			ctrl[this.name] = this.value(data);
		}
	};
	function ValueAttParser(name) { this.name = name; }
	ValueAttParser.prototype = {
		parse : function (value, tag) {
			return new ValueAttGenerator(this.name, evaluateFunc(value));
		}
	};
	
	function createEventHandler(handler, data, env, ctrl, ctrls, args, info) {
		var dataClone = Q.clone(data);
		var form = env.form;
//#ifdef DEBUG
		var outerPos = data.__outerPos;
//#endif
		return function (event) {
//#ifdef DEBUG
			try {
//#endif
				return handler(event, env.doc, dataClone, ctrl, form, ctrls, args);
//#ifdef DEBUG
			} catch (e) {
				Trace().push(outerPos);
				Trace().pushTmp(info.info);
				Trace().setPos(info.pos);
				ERROR("Error occurs in event handler" + (e.message ? ": " + e.message : ""), e);
			}
//#endif
		};

	}
	function EventAttGenerator(type, handler) {
		this.type = type;
		this.handler = handler;
//#ifdef DEBUG
		this.info = Trace().top();
//#endif
	}
	EventAttGenerator.prototype = {
		getCtrlEventFunc : function (data, env) {
			var handler = this.handler;
			var dataClone = Q.clone(data);
			var form = env.form;
			return function (ctrl, event, args) {
				return handler(event, env.doc, dataClone, ctrl, form, form.ctrls, args); 
			}
		},
		generate : function (data, ctrl, tag, env, args) {
			if (ctrl.handlers == null) ctrl.handlers = {};
			var ctrls = (ctrl.__type == "FormCtrl" ? ctrl.ctrls : env.form.ctrls);
			ctrl.handlers[this.type] = createEventHandler(this.handler, data, env, ctrl, ctrls, args, this.info);
		}
	};

	function sharpParseFunc(scanner, value, last) {
		if (scanner.end())
			return "self";
		ch = value.charAt(scanner.pos);
		if (ch == "#") {
			scanner.pos++;
			return "#";
		} else if (identBeginner.test(ch)) {
			if (last == ".")
				return "ctrls."
			else {
				var ident = nextIdentifier(scanner);
				return "(ctrls['" + ident + "'] || form.findIdent('" + ident + "'))";
			}
		} else {
			return "self";
		}
	}
	
	function createEventFunc(value) {
		var scanner = new Scanner(value);
		var s = nextExpr(scanner, null, "#", sharpParseFunc);
		var r;
//#ifdef DEBUG
		Trace().pushPos(value.pos);
		try {
			r = JsrlEval("res = function (event, document, __data, self, form, ctrls, args) { " + s.arg + "; };");
			Trace().pop();
		} catch (e) {
			ERROR("Error occurs while evaluating an event handler" + (e.message ? ": " + e.message : ""), e);
		}
//#else
		r = evalFunc("function (event, document, __data, self, form, ctrls, args) { " + s + "; }");
//#endif
		return r;
	}
		
	function EventAttParser(type) { this.type = type; }
	EventAttParser.prototype = {
		isFuncAtt : true,
		parse : function (value, tag) {
			return new EventAttGenerator(this.type, createEventFunc(value));
		}
	};
	
	/*
	 * Control Commons.
	 */
	var nullGenerator = { generate : function () { } };
	var idAttParser = {
		"id" : {
			parse : function (value, tag) { tag.idFunc = evaluateFunc(value); return nullGenerator; }
		}
	};
	
	var hiddenAttribute = { "hidden" : new CtrlAttParser("hidden") };
	var valueCtrlAttParsers = Q.union(hiddenAttribute);
	
	function getId(tag, data, env) {
		return (tag.idFunc ? tag.idFunc(data) : env.generateId()); 
	}
	
	function simpleAttParserMap() {
		var result = {};
		for (var i = 0; i < arguments.length; i++)
			result[arguments[i]] = new SimpleAttParser(arguments[i]);
		return result;
	}
	function valueAttParserMap() {
		var result = {};
		for (var i = 0; i < arguments.length; i++)
			result[arguments[i]] = new ValueAttParser(arguments[i]);
		return result;
	}
	var generalAttParsers =  Q.union(idAttParser, simpleAttParserMap("class", "style"));
	var pseudoValueParsers = simpleAttParserMap("value");
	
	function tagByIdName(tagName, id, name) { return "<" + tagName + " id=\"" + id + "\" name=\"" + name + "\" "; }
	function tagById(tagName, id) { return "<" + tagName + " id=\"" + id + "\" "; }
	function subId(id, index) { return id + "_" + index; }
	function addEvent(node, type, ctrl, name) {
		var h = ctrl.handlers[name];
		if (h != null)
			Q.attachEvent(node, type, h);
	}
	var handlerMap = {};
	var commonEvents = [ "change", "click", "dbclick", "focus", "blur", "mouseover", "mouseout", "mouseup", "mousedown", "keyup", "keydown", "keypress" ];
	for (var i = 0; i < commonEvents.length; i++)
		handlerMap["on" + commonEvents[i]] = commonEvents[i];

	function addCommonEvents(ctrl, node) {
		if (!ctrl.handlers) ctrl.handlers = nullObj;
		if (!node) node = ctrl.node;
		var handlers = ctrl.handlers;
		for (var i in handlers) {
			var name = handlerMap[i];
			if (name)
				Q.attachEvent(node, name, handlers[i]);
		}
	}
	function getSafeFunc(func, self) {
		return function () {
			try {
				func.apply(self);
			} catch (e) { }
			return false;
		};
	}
	
	// Define @img
	var imgParserMap = Q.union(generalAttParsers, {"width":new CtrlAttParser("width"), "height":new CtrlAttParser("height")});
	function ImgTag(args, scanner) {
		parseAttributes(this, imgParserMap, args);
		this.url = evaluateFunc(args[0]);
	}
	function ImgTagOnRender(id, url, width, height) {
		this.id = id;
		this.url = url;
		this.width = width;
		this.height = height;
	}
	function imgOnload(img, timg, w, h, oldVis) {
		if (!timg) return;
		var width, height;
		if (w < 0) {
			if (h < 0) {
				width = img.width;
				height = img.height;
			} else {
				height = Math.min(h, img.height);
				width = img.width * height / img.height;
			}
		} else {
			if (h < 0) {
				width = Math.min(w, img.width);
				height = img.height * width / img.width;
			} else {
				if (img.width * h > img.height * w) {
					width = Math.min(w, img.width);
					height = img.height * width / img.width;
				} else {
					height = Math.min(h, img.height);
					width = img.width * height / img.height;
				}
			}
		}
		timg.width = width;
		timg.height = height;
		timg.src = img.src;
		timg.style.visibility = oldVis;
	}
	ImgTagOnRender.prototype = {
		onrender : function (env) {
			var img = new Image();
			var timg = env.doc.getElementById(this.id);
			var oldVis = timg.style.visibility; 
			timg.style.visibility = "hidden";
			var w = this.width, h = this.height;
			img.onload = function () { imgOnload(img, timg, w, h, oldVis); };
			img.src = this.url;
		}
	};
	ImgTag.prototype = {
		generate : function (data, env) {
			var name = getId(this, data, env);
			env.push(tagById("img", name));
			generateAttributes(this, data, this, env);
			var width = (this.width == null ? -1 : this.width);
			var height = (this.height == null ? -1 : this.height);
			var url = this.url(data);
			if (width >= 0) env.push("width=\"" + width + "\" ");
			if (height >= 0) env.push("height=\"" + height + "\" ");
			env.addRenderHook(new ImgTagOnRender(name, url, width, height));
			env.push("/>");
		}
	};
	registerTag("img", ImgTag);
	
	// Define @cmd
	var cmdClickParser = new EventAttParser("onclick");
	function CmdCtrl(id, env) {
		this.id = id;
		this.parent = env.form;
	}
	CmdCtrl.prototype = {
		onrender : function (env) {
			var ctrl = env.doc.getElementById(this.id);
			ctrl.onclick = getSafeFunc(this.handlers.onclick);
		}
	};

	function CmdTag(args, scanner) {
		parseAttributes(this, focusableAttParsers, args);
		ASSERT(args.length == 2, "@cmd: require 2 ordinary arguments");
		this.text = evaluateFunc(args[0]);
		this.attributes.push(cmdClickParser.parse(args[1], this));
	}
	CmdTag.prototype = {
		generate : function (data, env) {
			var id = getId(this, data, env);
			env.push(tagById("a href=\"#\"", id));
			var cmdCtrl = new CmdCtrl(id, env);
			generateAttributes(this, data, cmdCtrl, env);
			env.push(">" + Q.escape(this.text(data)) + "</a>");
			env.addRenderHook(cmdCtrl);
		}
	};
	registerTag("cmd", CmdTag);
	
	// Define @cmdx
	function CmdxTag(args, scanner) {
		parseAttributes(this, generalAttParsers, args);
		ASSERT(args.length == 1, "@cmdx: require 1 ordinary argument");
		this.attributes.push(cmdClickParser.parse(args[0], this));
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@cmdx", last, "end_cmdx")
	}
	CmdxTag.prototype = {
		generate : function (data, env) {
			var id = getId(this, data, env);
			env.push(tagById("a href=\"#\"", id));
			var cmdCtrl = new CmdCtrl(id, env);
			generateAttributes(this, data, cmdCtrl, env);
			env.push(">");
			this.body.generate(data, env);
			env.push("</a>");
			env.addRenderHook(cmdCtrl);
		}
	};
	registerTag("cmdx", CmdxTag);


	// Define @form
	function FormCtrl(parent, isForm) {
		this.reset();
		this.parent = parent;
		this.isForm = isForm;
//#ifdef DEBUG
		this.__info = Trace().top();
//#endif
		this.onrenderHooks = [];
		this.refreshListeners = [];
	}
	FormCtrl.prototype = {
		reset : function () {
			this.subForms = [];
			this.ctrls = {};
		},
		status : function () { return { data: this.data, ctrls: Q.apply(this.ctrls, "status", []) }; }, 
		get : function () { return Q.apply(this.ctrls, "get", []); }, 
		eval : function () {
		return (!this.handlers || !this.handlers.value) ? Q.apply(this.ctrls, "_eval", []) : this.handlers.value();
		},
		_eval : finalFinalFunc,
		submit : function () {
			var result = true;
			for (var i = 0; i < this.subForms.length; i++)
				result &= this.subForms[i].submit();
			return result && (!this.handlers || !this.handlers.submit || this.handlers.submit());
		},
		onshow : function () {
			for (var i = 0; i < this.subForms.length; i++)
				this.subForms[i].onshow();
			return (!this.handlers || !this.handlers.show || this.handlers.show());
		},
		onhide : function () {
			for (var i = 0; i < this.subForms.length; i++)
				this.subForms[i].onhide();
			return (!this.handlers || !this.handlers.hide || this.handlers.hide());
		},
		onclose : function () {
			var result = true;
			for (var i = 0; i < this.subForms.length; i++)
				result &= this.subForms[i].onclose();
			return result && (!this.handlers || !this.handlers.close || this.handlers.close());
		},
		dispose : function () {	// eliminate circulate reference
			if (this.subForms) {
				for (var i = 0; i < this.subForms.length; i++)
					this.subForms[i].dispose();
			}
			if (this.handlers && this.handlers.dispose) this.handlers.dispose();
			this.subForms = undefined;
			this.ctrls = undefined;
		},
		addRefreshListener : function (listener) { this.refreshListeners.push(listener); },
		refresh : function () {
			for (var i = 0; i < this.refreshListeners.length; i++)
				(this.refreshListeners[i])();
			if (this.parent) this.parent.refresh();
		},
		_render : function (args) {
			if (!this.ctrls) return;
			if (this.env.doc.getElementById(this.node.id) != this.node) {
				this.dispose();
				return;
			} 
			setupDataObj(this.data, args);
			var env = Q.clone(this.env);
			env.prerender(this);
			env.oldStatus = this.status().ctrls;
			this.dispose();
			this.reset();
//#ifdef DEBUG
			Trace().push(this.__info);
//#endif
			env.initRender();
			this.body.generate(this.data, env);
//#ifdef DEBUG
			Trace().pop();
//#endif
			this.node.innerHTML = env.getHtml();
			env.callRenderHook();
			this.refresh();
		},
		render : function (args) {
			if (!this.ctrls) return; 
			var obj = this;
			postExec(function() { obj._render(args); }); 
		},
		rerender : function (args) { this.ctrls = {}; this.render(args); },
		onrender : function (env) {
			this.node = env.doc.getElementById(this.id);
			var hooks = this.onrenderHooks;
			for (var i = 0; i < hooks.length; i++) {
//#ifdef DEBUG
				Trace().push(hooks[i].pos);
//#endif
				hooks[i].onrender(env);
//#ifdef DEBUG
				Trace().pop();
//#endif
			}
			if (this.isForm) this.node.onsubmit = getSafeFunc(this.submit, this);
			if (this.handlers && this.handlers.onload) this.handlers.onload();
		},
		findIdent : function (name) {
			var f = this;
			while (f) {
				if (name in f.ctrls)
					return f.ctrls[name];
				f = f.parent;
			}
			throw new Error("Cannot find control by #" + name);
		},
		"__type" : "FormCtrl"
	};
	
	var formParserMap = Q.union(hiddenAttribute, generalAttParsers, {"value": new EventAttParser("value")});
	var formEventNames = [ "submit", "show", "hide", "close" ];
	for (var i = 0; i < formEventNames.length; i++) {
		var name = formEventNames[i];
		formParserMap["on" + name] = new EventAttParser(name);
	}
	function registerFormNsTag(name, useForm) {
		var Tag = function (args, scanner) {
			this.setter = new Setter(args[0]);
			parseAttributes(this, formParserMap, args, 1);
			this.body = new Block();
			var last = this.body.appendUntilDummy(scanner);
			CHECK_END("@" + name, last, "end_" + name)
		};
		Tag.prototype = {
			generate : function (data, env) {
				var oldForm = env.form;
				var isForm = (!env.hasForm && useForm);
				var tagName = (isForm ? "form" : "div");
				var sinst = this.setter.getSetterInstance(data, env);

				// Restore the data
				var oldOldStatus = env.oldStatus;
				var formSt = sinst.get(oldOldStatus);
				env.oldStatus = (formSt ? formSt.ctrls : null);
				var newData;
				if (formSt && formSt.data) {
					newData = formSt.data;
					for (var i in data)
						newData[i] = data[i];
				} else
					newData = Q.clone(data);
				
				// Create the control
				var ctrl = new FormCtrl(oldForm, isForm);
				ctrl.data = ctrl.__data = newData;
				if (sinst.anony) ctrl.hidden = true;
				
				// Set the attributes
				ctrl.id = getId(this, newData, env);
				env.push(tagById(tagName, ctrl.id));
				generateAttributes(this, newData, ctrl, env);
				env.push(">");
				oldForm.subForms.push(ctrl);
				env.addRenderHook(ctrl);
				
				sinst.set(oldForm.ctrls, ctrl);
				env.form = ctrl;
				var oldScope = env.pushScope(ctrl.id);
				env.hasForm |= isForm;
				ctrl.env = Q.clone(env);
				ctrl.body = this.body;
				this.body.generate(newData, env);
				env.push("</" + tagName + ">");
				
				//Pass the value from newData to data
				for (var i in data)
					data[i] = newData[i];
				//Keep the status of the form
				ctrl.data.__outerData = Q.clone(newData.__outerData);
				ctrl.data.__args = Q.clone(newData.__args);
				
				env.popScope(oldScope);		
				env.form = oldForm;
				env.oldStatus = oldOldStatus;
			}
		};
		registerTag(name, Tag);
	}
	registerFormNsTag("form", true);
	registerFormNsTag("ns", false);
	
	// Define the base functions of Jsrl controls
	function CtrlBase(args, scanner, extraArg, ctrlClass, parserMap) {
		ASSERT(args.length > 0, "expect at least one argument for a control");
		this.setter = new Setter(args[0]);
		parseAttributes(this, parserMap, args, 1);
		this.initVal = (isEmptyArg(args[1]) ? null : evaluateFunc(args[1]));
		this.ctrlInst = new ctrlClass(args, scanner, extraArg);
		this.ctrlInst.attributes = this.attributes;
	}
	function CtrlOnRender(ctrl, status) {
		this.ctrl = ctrl;
		this.status = status;
	}
	CtrlOnRender.prototype = {
		onrender : function (env) {
			var ctrl = this.ctrl;
			ctrl.init(env);
			if (this.status)
				ctrl.restore(this.status);
			else
				ctrl.set(ctrl.initVal);
		}
	};
	CtrlBase.prototype = {
		generate : function (data, env) {
			var sinst = this.setter.getSetterInstance(data, env);
			var res = this.ctrlInst.generate(data, env, getId(this, data, env));
			if (sinst.anony && res.hidden == null) res.hidden = true;
			if (!res.eval) res.eval = res.get;
			if (!res.status) res.status = res.get;
			if (!res.restore) res.restore = res.set;
			res._eval = finalFinalFunc;
			res.parent = env.form;
			sinst.set(env.form.ctrls, res);
			var status = sinst.get(env.oldStatus);
			res.initVal = (this.initVal == null ? this.defaultValue : this.initVal(data));
			if (res.initVal == null) res.initVal = this.defaultValue;
			env.addRenderHook(new CtrlOnRender(res, status));
		}
	};
	
	function registerCtrl(tagName, ctrlClass, extraArg, defaultValue, parserMap) {
		if (parserMap == null) parserMap = {};
		var tagClass = function (args, scanner) {
			CtrlBase.call(this, args, scanner, extraArg, ctrlClass, parserMap);
		};
		Q.extend(tagClass, CtrlBase);
		tagClass.prototype.defaultValue = defaultValue;
		registerTag(tagName, tagClass);
	}
    var focusableAttParsers = Q.union(generalAttParsers, simpleAttParserMap("tabindex", "accesskey"));
	var generalCtrlAttParsers = Q.union(focusableAttParsers, valueCtrlAttParsers, simpleAttParserMap("name")); 
	
	// Define @text, @textarea, @password
	function TextCtrl(id, needTrim) {
		this.id = id;
		this.needTrim = needTrim;
	}
	TextCtrl.prototype = {
		init : function (env) {
			this.node = env.doc.getElementById(this.id);
			addCommonEvents(this);
		},
		set : function (value) {
			this.node.value = value;
		},
		get : function () {
			return this.node.value;
		},
		eval : function () {
			return (this.needTrim ? Q.trim(this.node.value) : this.node.value);
		},
		focus : function () { this.node.focus(); }
	};
	function TextCtrlTag(args, scanner, extraArg) { this.typeName = extraArg; }
	TextCtrlTag.prototype = {
		generate : function (data, env, id) {
			var ctrl = new TextCtrl(id, true);
			env.push(tagById("input type=\"" + this.typeName + "\"", id));
			generateAttributes(this, data, ctrl, env);
			env.push("/>");
			return ctrl;
		}
	};
	var textParserMap = Q.union(generalCtrlAttParsers, simpleAttParserMap("maxlength", "size"));
	registerCtrl("text", TextCtrlTag, "text", "", textParserMap);
	registerCtrl("password", TextCtrlTag, "password", "", textParserMap);

	function TextAreaCtrlTag(args, scanner) { }
	TextAreaCtrlTag.prototype = {
		generate : function (data, env, id) {
			var ctrl = new TextCtrl(id, false);
			env.push(tagById("textarea", id));
			generateAttributes(this, data, ctrl, env);
			env.push("></textarea>");
			return ctrl;
		}
	};
	registerCtrl("textarea", TextAreaCtrlTag, null, "", Q.union(generalCtrlAttParsers, simpleAttParserMap("rows", "cols")));
	
	// Define @checkbox
	function CheckboxCtrl(id) { this.id = id; }
	CheckboxCtrl.prototype = {
		init : function (env) {
			this.node = env.doc.getElementById(this.id);
			addCommonEvents(this);
		},
		set : function (value) { this.node.checked = value; },
		get : function () { return this.node.checked; },
		focus : function () { this.node.focus(); }
	};
	function CheckboxCtrlTag() {}
	CheckboxCtrlTag.prototype = {
		generate : function (data, env, id) {
			var ctrl = new CheckboxCtrl(id);
			env.push(tagById("input type=\"checkbox\"", id));
			generateAttributes(this, data, ctrl, env);
			env.push("/>");
			return ctrl;
		}
	};
	registerCtrl("checkbox", CheckboxCtrlTag, null, false, Q.union(generalCtrlAttParsers, pseudoValueParsers));

	// Define @radio_group, @radio
	function RadioGroupCtrl(id) {
		this.id = id;
		this.ids = [];
		this.values = [];
	}
	RadioGroupCtrl.prototype = {
		init : function (env) {
			this.nodes = new Array(this.values.length);
			if (!this.handlers) this.handlers = nullObj;
			for (var i = 0; i < this.values.length; i++) {
				this.nodes[i] = env.doc.getElementById(this.ids[i]);
				addEvent(this.nodes[i], "click", this, "onchange");
			}
		},
		set : function (value) {
			for (var i = 0; i < this.nodes.length; i++)
				this.nodes[i].checked = (value == this.values[i]);
		},
		get : function () {
			for (var i = 0; i < this.nodes.length; i++)
				if (this.nodes[i].checked) return this.values[i];
			return null;
		},
		focus : function () {
			for (var i = 0; i < this.nodes.length; i++)
				if (this.nodes[i].checked) {
					this.nodes[i].focus();
					return;
				}
		}
	};

	function RadioGroupCtrlTag(args, scanner) {
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@radio_group", last, "end_radio_group")
	}
	RadioGroupCtrlTag.prototype = {
		generate : function (data, env, id) {
			var ctrl = new RadioGroupCtrl(id);
			env.currentRadioGroup = ctrl;
			generateAttributes(this, data, ctrl, env);
			ctrl.name = (ctrl.name || id);
			this.body.generate(data, env);
			env.currentRadioGroup = undefined;
			return ctrl;
		}
	};
	registerCtrl("radio_group", RadioGroupCtrlTag, null, null, Q.union(valueCtrlAttParsers, idAttParser, valueAttParserMap("name")));

	function RadioTag(args, scanner) {
		this.value = evaluateFunc(args[0]);
		parseAttributes(this, Q.union(focusableAttParsers, pseudoValueParsers), args, 1);
	}
	RadioTag.prototype = {
		generate : function (data, env) {
			var group = env.currentRadioGroup;
			ASSERT(group != null, "@radio: must reside in a radio group"); 
			var id = (this.idFunc ? this.idFunc(data) : subId(group.id, group.values.length));
			group.values.push(this.value(data));
			group.ids.push(id);
			env.push(tagByIdName("input type=\"radio\"", id, group.name));
			generateAttributes(this, data, null, env);
			env.push("/>");
		}
	};
	registerTag("radio", RadioTag);
	
	// Define @select, @option
	function SelectCtrl(id, values) {
		this.id = id;
		this.values = values;
	}
	SelectCtrl.prototype = {
		init : function (env) {
			this.node = env.doc.getElementById(this.id);
			addCommonEvents(this);
		},
		set : function (value) {
			for (var i = 0; i < this.values.length; i++)
				if (this.values[i] == value) {
					this.node.selectedIndex = i;
					return;
				}
			if (value != this.initVal)
				this.set(this.initVal);
//#ifdef DEBUG
			else
				ERROR("Invalid default value " + value + " for current SelectCtrl");
//#endif
		},
		get : function () { return this.values[this.node.selectedIndex]; },
		focus : function () { this.node.focus(); }
	};

	function SelectCtrlTag(args, scanner) {
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@select", last, "end_select")
	}
	SelectCtrlTag.prototype = {
		generate : function (data, env, id) {
			this.values = [];
			env.currentSelect = this;
			var ctrl = new SelectCtrl(id, this.values);
			env.push(tagById("select", id));
			generateAttributes(this, data, ctrl, env);
			env.push(">");
			this.body.generate(data, env)
			env.push("</select>");
			env.currentSelect = undefined;
			return ctrl;
		}
	};
	registerCtrl("select", SelectCtrlTag, null, null, generalCtrlAttParsers);
	
	function OptionTag(args, scanner) {
		this.value = evaluateFunc(args[0]);
		this.text = evaluateFunc(args[1]);
		parseAttributes(this, Q.union(generalAttParsers, pseudoValueParsers), args, 2);
	}
	OptionTag.prototype = {
		generate : function (data, env) {
			var select = env.currentSelect;
			ASSERT(select != null, "@option: must reside in select"); 
			select.values.push(this.value(data));
			env.push("<option ");
			generateAttributes(this, data, null, env);
			env.push(">" + Q.escape(this.text(data)) + "</option>");
		}
	};
	registerTag("option", OptionTag);
	
	function OptionxTag(args, scanner) {
		this.value = evaluateFunc(args[0]);
		parseAttributes(this, Q.union(generalAttParsers, pseudoValueParsers), args, 1);
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		CHECK_END("@optionx", last, "end_optionx")
	}
	OptionxTag.prototype = {
		generate : function (data, env) {
			var select = env.currentSelect;
			ASSERT(select != null, "@optionx: must reside in select"); 
			select.values.push(this.value(data));
			env.push("<option ");
			generateAttributes(this, data, null, env);
			env.push(">");
			this.body.generate(data, env);
			env.push("</option>");
		}
	};
	registerTag("optionx", OptionxTag);
	
	// Define @button, @submit
	var buttonParserMap = Q.union(generalAttParsers);
	function ButtonCtrl(id, env) {
		this.parent = env.form;	
		this.id = id;
	}
	ButtonCtrl.prototype = {
		onrender : function (env) {
			this.node = env.doc.getElementById(this.id);
			addCommonEvents(this);
		}
	};
	function ButtonCtrlTag(args, scanner, type, withId) {
        var p = 0;
        this.withId = withId;
        if (withId)
            this.setter = new Setter(args[p++]);
		this.type = type;
		this.text = evaluateFunc(args[p++]);
		parseAttributes(this, buttonParserMap, args, p++);
	}
	ButtonCtrlTag.prototype = {
		generate : function (data, env) {
			var id = getId(this, data, env);
			var text = this.text(data);
			var ctrl = new ButtonCtrl(id, env);
            if (this.withId) {
                var sinst = this.setter.getSetterInstance(data, env);
                sinst.set(env.form.ctrls, ctrl);
            }
			var tagName = this.type;
			var form = env.form;
			if (tagName == "submit" && !form.isForm) tagName = "button";
			env.push(tagById("input type=\"" + tagName + "\" value=\"" + Q.escape(text) + "\"", id));
			generateAttributes(this, data, ctrl, env);
			ASSERT(this.type != "submit" || !ctrl.handlers, "@submit tag cannot have an user defined event");
			if (this.type == "submit" && !form.isForm)
				ctrl.handlers = { onclick: function() { form.submit(); } };
			env.addRenderHook(ctrl);
			env.push("/>");
		}
	};
	function registerButtonCtrl(name, type, withId) {
		var tagClass = function (args, scanner) {
			ButtonCtrlTag.call(this, args, scanner, type, withId);
		};
		Q.extend(tagClass, ButtonCtrlTag);
		registerTag(name, tagClass);
	}
	registerButtonCtrl("submit", "submit");
	registerButtonCtrl("button", "button");
	registerButtonCtrl("isubmit", "submit", true);
	registerButtonCtrl("ibutton", "button", true);
	
	// Define @hidden
	function HiddenCtrl() {}
	HiddenCtrl.prototype = {
		init : function () {},
		set : function (value) { this.value = value; },
		get : function () { return this.value; }
	};
	function HiddenCtrlTag(args, scanner) {}
	HiddenCtrlTag.prototype = {
		generate : function (data, env) {
			var ctrl = new HiddenCtrl();
			generateAttributes(this, data, ctrl, env);
			return ctrl;
		}
	};
	registerCtrl("hidden", HiddenCtrlTag, null, null, hiddenAttribute);
	
	function setCtrlAttList(tag, args, begId) {
		var events = [], atts = [], argList = [];
		for (var i = begId; i < args.length; i++) {
			var att = parseAttribute(args[i]);
			if (att) {
				if (att.func) {
					var event = (new EventAttParser(att.name)).parse(att.value);
					events.push({"name":att.name, "e":event})
				} else {
					var func = evaluateFunc(att.value);
					atts.push({"name":att.name, "func":func});
				}
			} else
				argList.push(evaluateFunc(args[i]));	
		}
		tag.events = events;
		tag.atts = atts;
		tag.args = argList;
	}
	function appendCtrlAtts(newData, data, env, events, atts) {
		for (var i = 0; i < events.length; i++)
			newData[events[i].name] = events[i].e.getCtrlEventFunc(data, env);
		for (var i = 0; i < atts.length; i++)
			newData[atts[i].name] = atts[i].func(data);
	}
	
	// Define @id
	function IdCtrl(id) { this.id = id; }
	IdCtrl.prototype = {
		onrender : function (env) {
			this.node = env.doc.getElementById(this.id);
			addCommonEvents(this);
		},
		get : Q.nullFunc,
		eval : Q.nullFunc,
		_eval : Q.nullFunc,
		status : Q.nullFunc,
		restore : Q.nullFunc
	};
	function IdCtrlTag(args) {
		this.setter = new Setter(args[0]);
		parseAttributes(this, generalCtrlAttParsers, args, 1);
	}
	IdCtrlTag.prototype = {
		generate : function (data, env) {
			var id = getId(this, data, env);
			var sinst = this.setter.getSetterInstance(data, env);
			var ctrl = new IdCtrl(id);
			sinst.set(env.form.ctrls, ctrl);
			env.addRenderHook(ctrl);
			env.push("id=\"" + id + "\" name=\"" + id + "\" ");
			generateAttributes(this, data, ctrl, env);
		}
	};
	registerTag("id", IdCtrlTag);
	
	// Define @load
	function LoadTag(args, scanner) {
		ASSERT(args.length == 1, "@load: require exactly 1 argument");
		this.e = createEventFunc(args[0]);
	};
	LoadTag.prototype = {
		generate : function (data, env) {
//#ifdef DEBUG
			var h = createEventHandler(this.e, data, env, env.form, env.form.ctrls, null, Trace().top());
//#else
			var h = createEventHandler(this.e, data, env, env.form, env.form.ctrls, null);
//#endif
			env.addRenderHook({ onrender: h });
		}
	};
	registerTag("L", LoadTag);

	// @C tag and @Cx tag
	function COrCxTag(tagName, hasBlk, hasId) {
		var sepTagName, endTagName;
		var argOfst = (hasId ? 1 : 0);
		if (hasBlk) {
			sepTagName = "sep_" + tagName;
			endTagName = "end_" + tagName;
		}
		var CTag = function (args, scanner) {
			ASSERT(args.length >= argOfst + 1, "@" + tagName + ": need at least " + argOfst + " arguments");
			this.setter = new Setter(hasId ? args[0] : null);
			this.tempName = evaluateFunc(args[argOfst]);
			setCtrlAttList(this, args, argOfst + 1);

			if (hasBlk) {
				this.blocks = [];
				var last;
				do {
					var body = new Block();
					last = body.appendUntilDummy(scanner);
					ASSERT(last.type == sepTagName || last.type == endTagName || last.type == "E", "@Cx: expect a @" + sepTagName + ", @" + endTagName + " or @E, unknown tag @" + last.type);
					this.blocks.push(body);
				} while (last.type != endTagName && last.type != "E");
			}
		};
		CTag.prototype = {
			generate : function (data, env) {
				var tempName = this.tempName(data);
				ASSERT(typeof(tempName) == "string", "@" + tagName + ": the second argument should be a string");
				var evaluator = getTemplate(tempName);
				var arr = new Array(this.args.length);
				for (var i = 0; i < arr.length; i++)
					arr[i] = (this.args[i])(data);
				//deal with control name
				var setterInst = this.setter.getSetterInstance(data, env);
				var oldInd = env.parCtrlIndexes;
				env.parCtrlIndexes = setterInst;
				//set attributes and events
				var newData = {};
				appendCtrlAtts(newData, data, env, this.events, this.atts);
				if (hasBlk) {
					var blks = new Array(this.blocks.length);
					for (var i = 0; i < blks.length; i++)
						blks[i] = this.blocks[i];
					newData.__outerBlocks = blks;
					newData.NUMBLOCKS = blks.length;
					newData.__outerData = data;
				}
//#ifdef DEBUG
				newData.__outerPos = Trace().top(); 
//#endif
				//evaluate
				evaluator.evaluateData(newData, arr, env);
				env.parCtrlIndexes = oldInd;
				if (env.cContTemp) env.cStop = env.cContTemp = false;
			}
		};
		return CTag;
	}
	registerTag("C", COrCxTag("C", false, true));
	registerTag("Cx", COrCxTag("Cx", true, true));
	registerTag("I", COrCxTag("I", false, false));
	registerTag("Ix", COrCxTag("Ix", true, false));
	

	function BlockTag(args, scanner) {
		ASSERT(args.length >= 1, "@block: need at least 1 arguments");
		this.argId = evaluateFunc(args[0]);
		setCtrlAttList(this, args, 1);
	}
	BlockTag.prototype = {
		generate : function (data, env) {
			var argId = this.argId(data);
			ASSERT(data.__outerBlocks, "@block can be only used within a callee template");
			var blk = data.__outerBlocks[argId];
			var newData = data.__outerData;
			appendCtrlAtts(newData, data, env, this.events, this.atts);
//#ifdef DEBUG
			Trace().pushTmp(data.__outerPos.info);
//#endif
			blk.generate(newData, env);
//#ifdef DEBUG
			Trace().popTmp();
//#endif
		}
	};
	registerTag("block", BlockTag);


	/*
	 * JSRL i18n support
	 */
	var metaVars = {};
	var dict = {};
	var language;
	var majorLangs = {};
	var langTrans = {};

	function DictPattern(pattern) {
		this.compile(pattern);
	}
	
	function registerLangTransformer(c, trans) {	
		langTrans[c] = trans;
	}

	DictPattern.prototype = {
		compile : function (pattern) {
			var li = 0, strs = [];
			this.list = [];
			for (var i = 0; i < pattern.length; i++) {
				var c = pattern.charAt(i);
				switch (c) {
				case '{':
					strs.push(pattern.substring(li, i));
					if (i + 1 < pattern.length && pattern.charAt(i + 1) == '{') {
						li = ++i;
					} else {
						this.appendStr(strs);
						strs = [];
						var j = pattern.indexOf("}", i + 1);
						ASSERT(j > 0, "Cannot find matching '}' for '{'");
						var keys = pattern.substring(i + 1, j).split(".");
						for (var k = 0; k < keys.length; k++)
							if (intReg.test(keys[k]))
								keys[k] = parseInt(keys[k]);
							else if (k == 0)
								keys.fromDict = true;
						this.list.push(keys);
						i = j;
						li = i + 1;
					}
					break;
				case '}':
					if (i + 1 < pattern.length && pattern.charAt(i + 1) == '}') {
						strs.push(pattern.substring(li, i));
						li = ++i;
					}
					break;
				}
			}
			strs.push(pattern.substring(li));
			this.appendStr(strs);
			delete this.pattern;
		},
		apply : function (args) {
			if (!this.list) this.compile();
			var l = this.list;
			var result = new Array(l.length);
			for (var i = 0; i < l.length; i++) {
				var v = l[i], s;
				if (typeof(v) == "string")
					s = v;
				else {
					s = (v.fromDict ? dict : args);
					for (var j = 0; j < v.length; j++)
						if (s) s = s[v[j]];
					if (s == null)
						s = undefinedText;
				}
				result[i] = s;
			}
			return result.join("");
		},
		appendStr : function (strs) {
			var s = strs.join("");
			if (s.length > 0) this.list.push(s);
		}
	};

	function registerDictItem(lang, key, value) {
		var fields = key.split(".");
		var v = dict;
		for (var i = 0; i < fields.length - 1; i++) {
			var name = fields[i];
			if (name in v)
				v = v[name];
			else {
				var o = {};
				v[name] = o;
				v = o;
			}
		}
		var n = fields.pop();
//#ifdef DEBUG
		if (!(n in v) || needsOverrideLang(lang, v[n].__info.lang, "Key \"" + key + "\""))
//#else
		if (!(n in v) || needsOverrideLang(lang, v[n].__info.lang))
//#endif
		{
			v[n] = value;
			v[n].__info = { lang: lang };
		}
	}

	function getDictText(key, args) {
		var p = key.indexOf(":"), t = "";
		if (p > 0) {
			t = key.substr(0, p);
			key = key.substr(p + 1);
		}
		var fields = key.split(".");
		var v = dict, lv;
		for (var i = 0; i < fields.length; i++) {
			lv = v;
			v = v[fields[i]];
			ASSERT(v, "Key \"" + key + "\" not found in dictionary");
		}
		ASSERT(typeof(v) == "string" || v instanceof DictPattern, key + " is not a valid key in dictionary"); 
		if (typeof(v) == "string") {
			v = new DictPattern(v);
			lv[fields.pop()] = v;
		}
		var r = v.apply(args);	
		for (var i = 0; i < t.length; i++) {
			var c = t.charAt(i);
			if (c in langTrans)
				r = langTrans[c](r);
		}
		return r;
	}
	
	function D(key) {
		var n = arguments.length - 1;
		var args = new Array(n);
		for (var i = 0; i < n; i++)
			args[i] = arguments[i + 1];
		return getDictText(key, args);
	}

	function dtext(v) {
		if (v && v.length > 2 && v.charAt(0) == "@") {
			v = v.substr(1);
			if (v.charAt(0) != "@") v = D(v);
		}
		return v;
	}
	
	function isCompatibleLang(lang, ref) {
		return lang == ref || isSubLang(lang, ref);
	}

    function isSubLang(lang, ref) {
		return (ref == null || ref.length == 0 || lang && Q.startsWith(lang, ref + "_"))
	}

//#ifdef DEBUG
	function needsOverrideLang(lang, ref, name)
//#else
	function needsOverrideLang(lang, ref)
//#endif
	{
		if (isSubLang(ref, lang)) return false;
		ASSERT(ref != lang, name + " duplicates with the same language \"" + lang + "\"");
		ASSERT(!isCompatibleLang(language, ref) || isSubLang(lang, ref), name + "\" has two different languages without partial order (\"" + language + "\" and \"" + ref + "\"). To avoid such problem, you can set the language before loading the templates.");
		return true;
	}

	function addMajorLang() {
		for (var i = 0; i < arguments.length; i++)
			majorLangs[arguments[i]] = true;
	}

	function setLanguage(lang) {
		language = lang;
		metaVars.lang = lang;
		var i;
		while ((i = lang.indexOf("_")) > 0 && !(lang in majorLangs))
			lang = lang.substr(0, i);
		metaVars.majorlang = lang;
	}

	// @D tag
	var DTag = function (args, scanner) {
		ASSERT(args.length >= 1, "@D: need at least 1 argument");
		this.keyName = evaluateFunc(args[0]);
		this.args = new Array(args.length - 1);
		for (var i = 1; i < args.length; i++)
			this.args[i - 1] = evaluateFunc(args[i]);
	};
	DTag.prototype = {
		generate : function (data, env) {
			var key = this.keyName(data);
			ASSERT(typeof(key) == "string", "@D: the first argument should be a string");
			var rargs = new Array(this.args.length);
			for (var i = 0; i < rargs.length; i++)
				rargs[i] = this.args[i](data);
			env.push(Q.escape(getDictText(key, rargs)));
		}
	};
	registerTag("D", DTag);

	return {
//#ifdef DEBUG
		"Trace": Trace,
		"ASSERT": ASSERT,
		"ERROR": ERROR,
//#else
		"ASSERT": Q.nullFunc,
		"ERROR": Q.nullFunc,
//#endif
		"evaluateFunc": evaluateFunc,
		"executeFunc": executeFunc,
		"Setter": Setter,
		"Block": Block,
		"DummyTag": DummyTag,
		"registerTag" : registerTag,
		"render" : render,
		"renderTextTemp" : renderTextTemp,
		"rerender" : rerender,
		"renderData" : renderData,
		"renderNode" : renderNode,
		"attachNode" : attachNode,
		"clear" : clear,
		"getAbsPath" : getAbsPath,
		"loadLibrary" : loadLibrary,
		"loadAll" : loadAll,
		"loadTemplate" : loadTemplate,
		"findTemplate" : findTemplate,
		"isLoading" : isLoading,
		"getJsrlTemplate" : getJsrlTemplate,
		"getTemplate" : getTemplate,
		"parseAttributes" : parseAttributes,
		"generalAttParsers" : generalAttParsers,
		"focusableAttParsers" : focusableAttParsers,
		"generateAttributes" : generateAttributes,
		"simpleAttParserMap" : simpleAttParserMap,
		"valueAttParserMap" : valueAttParserMap,
		"registerTemplate" : registerTemplate,
		"parseFarTmpName" : parseFarTmpName,
		"getAbsTempNameTransformer" : getAbsTempNameTransformer,
		"getAbsTempName" : getAbsTempName,
		"registerPropParser" : registerPropParser,
		"getId" : getId,
		"tagById" : tagById,
		"uniqueId" : uniqueId,
		"dispose" : dispose,
		"setLanguage" : setLanguage,
		"registerLangTransformer" : registerLangTransformer,
		"addMajorLang" : addMajorLang,
		"isSubLang" : isSubLang,
		"D": D,
		"dtext": dtext
	};

})();
