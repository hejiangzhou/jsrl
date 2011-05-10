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


//The kernal of JSRL
var Jsrl = (function() {
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
		if (parent != window && parent.Jsrl)
			return parent.Jsrl.Trace();
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
			res += "<div class=errMsg>" + errMsg + "</div>";
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
			window.setTimeout(function() { reporting = false; }, 100);
		}
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
				ERROR("Error occurs while executing JavaScript code");
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
		data.__args = [];
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
			ASSERT(this.pos < value.length, "No more tag");
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

	function nextIdentifier(scanner) {
		var pos0 = scanner.pos;
		var value = scanner.value;
		if (pos0 < value.length && identBeginner.test(value.charAt(pos0))) {
			scanner.pos++;
			while (pos0 < value.length && identChar.test(value.charAt(scanner.pos)))
				scanner.pos++;
			return value.substring(pos0, scanner.pos);
		}
		ERROR("Expect an indentifier");
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
	
	function nextExpr(scanner, endStr, varTkn, varFunc) {
		skipBlank(scanner);
		var symbolStack = [];
		var str = [];
		var value = scanner.value;
//#ifdef DEBUG
		var startPos = scanner.finalPos(); 
//#endif
		while (scanner.pos < value.length) {
			var ch = value.charAt(scanner.pos++);
			if (ch == varTkn) {
				str.push(varFunc(scanner, value));
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
	
	function nextExprList(scanner) {
		var value = scanner.value;
		if (scanner.end() || value.charAt(scanner.pos) != "{") return [];
		scanner.pos++;
		var result = [];
		while (!scanner.end() && value.charAt(scanner.pos - 1) != "}")
			result.push(nextExpr(scanner, ",}", "$", dollarParseFunc));
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
					evalFuncs.push("([");
					for (i = lastEvaluated; i < evalFuncList.length - 1; i++) {
						evalFuncs.push(evalFuncList[i].txt);
						evalFuncs.push(",");
					}
					evalFuncs.push(evalFuncList[i].txt);
					evalFuncs.push("])");
					var funcArr = eval(evalFuncs.join(""));
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
				eval("func = function (__data) { return (" + arg + "); };");
			} catch (e) {
				Trace().setPos(xarg.pos);
				ERROR("Error occurs while evaluating expression", e);
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
			eval("func = function (__data) { " + arg + "; };");
		} catch (e) {
			Trace().setPos(xarg.pos);
			ERROR("Error occurs while executing statement", e);
		}
		return funcWrapper(func, xarg);
//#else
		return evalFunc("function (__data) { " + arg + "; }");
//#endif
	}
	
	function parseAttribute(arg) {
		var scanner = new Scanner(arg);
		skipBlank(scanner);
		var name = nextIdentifier(scanner);
		var value = null, sep;
		skipBlank(scanner);
		if (!scanner.end()) {
//#ifdef DEBUG
			Trace().setPos(scanner.finalPos());
//#endif
			sep = scanner.current();
			ASSERT(sep == '=' || sep == ':', "Attribute name and value should be separated by '=' or ':'");
			scanner.pos++;
			skipBlank(scanner);
//#ifdef DEBUG
			Trace().setPos(scanner.finalPos());
//#endif
			value = scanner.rest();
		}
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
		ASSERT(args.length == 1, "SelfInsertTag: need only 1 argument");
		this.evalFunc = evaluateFunc(args[0]);
	}
	EvalTag.prototype = {
		generate : function (data, env) {
			var result = this.evalFunc(data);
			if (result == null)
				result = data.undefined_text; 
			else if (typeof(result) == "string")
				result = Q.escape(result);
			env.push(result);
		}
	};

	function ExecTag(args, scanner) {
		ASSERT(args.length == 1, "ExecTag: need only 1 argument");
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

	function Evaluator(tags, prop) {
		this.block = new Block();
		this.block.tags = tags;
		this.undefined_text = undefinedText;
		this.prop = prop;
	}
	Evaluator.prototype = {
		evaluateData : function (data, dataList, env) {
			setupDataObj(data, dataList);
			data.ROOT = env.container;
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
	
	function __renderTemp(node, tmp, args, callback) {
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
	
	function renderTemp(node, tmp, args, callback) {
		postExec(function() { __renderTemp(node, tmp, args, callback); });
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
		if (!elem.jsrlTemplate) elem.jsrlTemplate = getTemplate(":" + name);
		renderData(elem, elem.jsrlTemplate, data, callback);
	}
	
	function clear(node) {
		node.form = undefined;
	}
	
	function rerender(name, data, callback) {
		var elem = (typeof(node) == "string" ? document.getElementById(node): node);
		clear(elem);
		render(elem, data, callback);
	}

	function attachNode(node, tmp, data, callback) {
		var trueName = parseFarTmpName(tmp);
		postExec(function () {
				clear(node);
				if (typeof(node) == "string") node = document.getElementById(node);
				if (node.id == "" || node.id == undefined) node.id = uniqueId();
				node.jsrlTemplate = getTemplate(trueName);
				renderData(node, node.jsrlTemplate, data, callback);
			});
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
	function registerTag(name, obj) {
		ASSERT(tags[name] == undefined, "Tag @" + name + " has been already registered");
		tags[name] = obj;
	}
	
	function loadTemplate(template, prop) {
//#ifdef DEBUG
		Trace().setText(template);
//#endif
		var scanner = new Scanner(template);
		var count = 0;
		var list = [];
		while (!scanner.end()) {
			var tag = scanner.nextTag();
			ASSERT(tag.generator.__type != "DummyTag", "Unknown tag " + tag.type);
			list.push(tag.generator);
		}
		var result = new Evaluator(list, prop);
//#ifdef DEBUG
		result.info = Trace().topInfo();
//#endif
		return result;
	}

	/*
	 * Methods for management of JSRL templates.
	 */
	var loadedUrl = {};
	var loading = 0;
	var uniqueIdCount = 0;
	
	function LazyTemplate(name, path, text, prop) {
		this.name = name;
		this.path = path;
		this.text = text;
		this.prop = prop;
	}
	LazyTemplate.prototype.__type = "LazyTemplate";
	
	function isLoading() {
		return loading > 0 || (parent != window && parent.Jsrl && parent.Jsrl.isLoading());	
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
		ASSERT(!evaluators[name], "Jsrl template names confict - " + name);
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
				if (parent != window && parent.Jsrl)
					result = parent.Jsrl.getTemplate(name, true);
				ASSERT(result, "Cannot find template named " + name);
			}
		} else if (result.__type == "LazyTemplate") {
//#ifdef DEBUG
			Trace().pushTemplate(result.name, result.path);
			Trace().setText(result.text);
//#endif
			evaluators[name] = result = loadTemplate(result.text, result.prop);
//#ifdef DEBUG
			Trace().pop();
//#endif
		}
		return result;
	}

	function parseFarTmpName(farName) {
		var pos = farName.indexOf(':');
		if (pos > 0) {
			loadLibrary(farName.substr(0, pos));
			return farName.substr(pos + 1);
		} else 
			return farName;
	}

	function findTemplate(name, callback) {
		var trueName = parseFarTmpName(name);
		postExec(function () {
			var tmp = getTemplate(trueName);
			if (callback) callback(tmp, trueName);
		});
	}

	var propParsers = {};
	function registerPropParser(name, parser) {
		propParsers[name] = parser;
	}

	function loadXml(absPath, doc) {
		var root = doc.documentElement;
		ASSERT(root.nodeName == "jsrllib", "The Jsrl library " + absPath + " should contain a unique root named jsrllib");
		var nodes = root.childNodes;
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			if (node.nodeType == 1) {
				if (node.nodeName == "require") {
					loadLibrary(node.getAttribute("path"), absPath);
				} else if (node.nodeName == "template") {
					var prop = {};
					var props = node.getElementsByTagName("property");
					var tmpName = node.getAttribute("name");
					for (var k = 0; k < props.length; k++) {
						var name = props[k].getAttribute("name");
						var value = props[k].getAttribute("value");
						ASSERT(name, "A property of \"" + tmpName + "\" in " + absPath + " does not have a name");
						var parser = propParsers[name];
						var parsedVal = (parser ? parser(value, name) : value);
						prop[name] = parsedVal;
					}
					var j;
					for (j = 0; j < node.childNodes.length; j++) {
						var subNode = node.childNodes[j];
						ASSERT(subNode.nodeType == 1 || subNode.nodeType == 3 || subNode.nodeType == 4 || subNode.nodeType == 8, "Unexpected subnode in template node \"" + node.getAttribute("name") + "\"");
						if (subNode.nodeType == 4) {
							registerLazyTemplate(tmpName, new LazyTemplate(tmpName, absPath, subNode.nodeValue, prop));
							break;
						}
					}
					ASSERT(j < node.childNodes.length, "Cannot find template text of \"" + tmpName + "\" template in " + absPath);
				} else {
					ERROR("Cannot resolve tag named " + node.nodeName + " in " + absPath);
				}
			}
		}
	}
	
	function loadLibrary(url, ref) {
		if (ref == null) ref = location.pathname;
		var absPath = Q.toAbsPath(ref, url);
		if (loadedUrl[absPath] == true) return true;
		loadedUrl[absPath] = true;
		loading++;
		Q.ajax(absPath, function (req) {
				ASSERT((req.status == 200 || req.status == 0) && req.responseXML, "Fail to load library " + url);
				loadXml(absPath, req.responseXML);
				loading--;
				if (loading == 0) setTimeout(runPostExec, 0);
			});
		return false;
	}
	
	function loadForTag(tagName) {
		var nodes = document.getElementsByTagName(tagName);
		for (var i = 0; i < nodes.length; i++)
			if ((!nodes[i].id || nodes[i].id.charAt(0) != "!") && getJsrlTemplate(nodes[i]) != null) {
				try {
					renderNode(nodes[i]);
				} catch (e) { }
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
		ASSERT(last.type == "end_foreach", "@foreach: expect a @end_foreach to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@foreach: end_foreach expect no argument");
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
		ASSERT(last.type == "end_for", "@for: expect a @end_for to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@for: end_for expect no argument");
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
		ASSERT(last.type == "end_while", "@while: expect a @end_while to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@end_while: expect no argument");
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
		ASSERT(last.type == "end_do", "@do: expect a @end_do to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 1, "@end_do: expect 1 argument");
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
		while (next.type != "end_if") {
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
		ASSERT(next.generator.args.length == 0, "@end_if: expect no argument");
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
		ASSERT(next.type == "end_grid", "@grid: expect @end_grid, unknown tag @" + next.type);
		ASSERT(next.generator.args.length == 0, "@end_grid: expect no argument");
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
			ASSERT(result == null || typeof(result) == "string", "@_: the argument should be string");
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
			ASSERT(result == null || typeof(result) == "string", "@html: the argument should be string");
			if (result == null) result = env.undefined_text; 
			env.push(result);
		}
	};
	registerTag("html", HtmlTag);

	/*
	 * Support for attributes.
	 */
	function parseAttributes(tag, parsers, args, index) {
		tag.attributes = [];
		for (var i = index; i < args.length; i++) {
			var att = parseAttribute(args[i]);
			var parser = parsers[att.name];
			if (parser == null && att.func)
				parser = new EventAttributeParser(att.name);
			ASSERT(parser != null, "Unable to find parser for attribute " + att.name);
			ASSERT(!parser.isFuncAtt == !att.func, (att.func ? "'=' should be used for non-function attribute, not ':'" : "':' should be used for function attribute, not '='"));
			tag.attributes.push(parser.parse(att.value, tag));
		}
	}
	function generateAttributes(tag, data, ctrl, env) {
		var atts = tag.attributes;
		for (var i = 0; i < atts.length; i++)
			atts[i].generate(data, ctrl, tag, env);
	}
	function CtrlAttributeGenerator(name, value) {
		this.name = name;
		this.value = value;
	}
	CtrlAttributeGenerator.prototype = {
		generate : function (data, ctrl, tag) {
			ctrl[this.name] = this.value(data);
		} 
	};
	function CtrlAttributeParser(name) { this.name = name; }
	CtrlAttributeParser.prototype = {
		parse : function (value, tag) {
			return new CtrlAttributeGenerator(this.name, evaluateFunc(value)); 
		}
	};

	function SimpleAttributeGenerator(name, value) {
		this.name = name;
		this.value = value;
	}
	SimpleAttributeGenerator.prototype = {
		generate : function (data, ctrl, tag, env) {
			var value = this.value(data);
			if (value != null)
				env.push(" " + this.name + "=\"" + Q.escape(value + "") + "\" ");
		} 
	};
	function SimpleAttributeParser(name) { this.name = name; }
	SimpleAttributeParser.prototype = {
		parse : function (value, tag) {
			return new SimpleAttributeGenerator(this.name, evaluateFunc(value)); 
		}
	};
	
	function EventAttributeGenerator(type, handler) {
		this.type = type;
		this.handler = handler;
//#ifdef DEBUG
		this.info = Trace().top();
//#endif
	}
	EventAttributeGenerator.prototype = {
		getCtrlEventFunc : function (data, env) {
			var handler = this.handler;
			var dataClone = Q.clone(data);
			var form = env.form;
			return function (ctrl, event, args) {
				return handler(event, env.doc, dataClone, ctrl, form, form.ctrls, args); 
			}
		},
		generate : function (data, ctrl, tag, env, args) {
			var handler = this.handler;
			var dataClone = Q.clone(data);
			if (ctrl.handlers == null) ctrl.handlers = {};
			var form = env.form;
//#ifdef DEBUG
			var info = this.info;
			var outerPos = data.__outerPos;
//#endif
			ctrl.handlers[this.type] = function (event) {
				var ctrls = (ctrl.__type == "FormCtrl" ? ctrl.ctrls : form.ctrls);
//#ifdef DEBUG
				try {
//#endif
					return handler(event, env.doc, dataClone, ctrl, form, ctrls, args);
//#ifdef DEBUG
				} catch (e) {
					Trace().push(outerPos);
					Trace().pushTmp(info.info);
					Trace().setPos(info.pos);
					ERROR("Error occurs in event handler", e);
				}
//#endif
			};
		}
	};

	function sharpParseFunc(scanner, value) {
		if (scanner.end())
			return "self";
		ch = value.charAt(scanner.pos);
		if (ch == "#") {
			scanner.pos++;
			return "#";
		} else if (identBeginner.test(ch)) {
			return "ctrls.";
		} else {
			return "self";
		}
	}
	
	function EventAttributeParser(type) { this.type = type; }
	EventAttributeParser.prototype = {
		isFuncAtt : true,
		parse : function (value, tag) {
			var scanner = new Scanner(value);
			var s = nextExpr(scanner, null, "#", sharpParseFunc);
//#ifdef DEBUG
			s = s.arg;
			Trace().pushPos(value.pos);
//#endif
			var result;
//#ifdef DEBUG
			try {
				var func;
				eval("func = function (event, document, __data, self, form, ctrls, args) { " + s + "; };");
//#else
				var func = evalFunc("function (event, document, __data, self, form, ctrls, args) { " + s + "; }");
//#endif
				result = new EventAttributeGenerator(this.type, func);
//#ifdef DEBUG
			} catch (e) {
				ERROR("Error occurs while evaluating an event handler", e);
			}
			Trace().pop();
//#endif
			return result; 
		}
	};
	
	/*
	 * Control Commons.
	 */
	var nullGenerator = { generate : function () { } };
	var idAttributeParser = {
		"id" : {
			parse : function (value, tag) { tag.idFunc = evaluateFunc(value); return nullGenerator; }
		}
	};
	
	var hiddenAttribute = { "hidden" : new CtrlAttributeParser("hidden") };
	var valueCtrlAttParsers = hiddenAttribute;
	
	function getId(tag, data, env) {
		return (tag.idFunc ? tag.idFunc(data) : env.generateId()); 
	}
	
	function simpleAttParserMap() {
		var result = {};
		for (var i = 0; i < arguments.length; i++)
			result[arguments[i]] = new SimpleAttributeParser(arguments[i]);
		return result;
	}
	var generalAttParsers = generalAttParsers = Q.union(idAttributeParser, simpleAttParserMap("class", "style"));
	
	function tagByIdName(tagName, id, name) { return "<" + tagName + " id=\"" + id + "\" name=\"" + name + "\" "; }
	function tagById(tagName, id) { return tagByIdName(tagName, id, id); }
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
			func.apply(self);
			return false;
		};
	}
	
	// Define @img
	var imgParserMap = Q.union(generalAttParsers, {"width":new CtrlAttributeParser("width"), "height":new CtrlAttributeParser("height")});
	function ImgTag(args, scanner) {
		this.url = evaluateFunc(args[0]);
		parseAttributes(this, imgParserMap, args, 1);
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
	var cmdClickParser = new EventAttributeParser("onclick");
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
		ASSERT(args.length >= 2, "@cmd: require at least 2 arguments");
		this.text = evaluateFunc(args[0]);
		parseAttributes(this, generalAttParsers, args, 2);
		this.attributes.push(cmdClickParser.parse(args[1], this));
	}
	CmdTag.prototype = {
		generate : function (data, env) {
			var id = getId(this, data, env);
			env.push(tagById("a href=\"#\"", id));
			var cmdCtrl = new CmdCtrl(id, env);
			generateAttributes(this, data, cmdCtrl, env);
			env.push(">" + Q.purify(this.text(data)) + "</a>");
			env.addRenderHook(cmdCtrl);
		}
	};
	registerTag("cmd", CmdTag);
	
	// Define @cmdx
	function CmdxTag(args, scanner) {
		ASSERT(args.length >= 1, "@cmdx: require at least 1 arguments");
		parseAttributes(this, generalAttParsers, args, 1);
		this.attributes.push(cmdClickParser.parse(args[0], this));
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		ASSERT(last.type == "end_cmdx", "@cmdx: expect a @end_cmdx to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@cmdx: end_cmdx expect no argument");
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
			for (var i = 0; i < this.subForms.length; i++)
				this.subForms[i].dispose();
			this.subForms = undefined;
			this.ctrls = undefined;
		},
		addRefreshListener : function (listener) { this.refreshListeners.push(listener); },
		notifyRefresh : function () {
			for (var i = 0; i < this.refreshListeners.length; i++)
				(this.refreshListeners[i])();
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
			var form = this;
			do {
				form.notifyRefresh();
				form = form.parent;
			} while (form);
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
		"__type" : "FormCtrl"
	};
	
	var formParserMap = Q.union(hiddenAttribute, generalAttParsers, {"value": new EventAttributeParser("value")});
	var formEventNames = [ "submit", "show", "hide", "close" ];
	for (var i = 0; i < formEventNames.length; i++) {
		var name = formEventNames[i];
		formParserMap["on" + name] = new EventAttributeParser(name);
	}
	function registerFormNsTag(name, useForm) {
		var Tag = function (args, scanner) {
			this.setter = new Setter(args[0]);
			parseAttributes(this, formParserMap, args, 1);
			this.body = new Block();
			var last = this.body.appendUntilDummy(scanner);
			ASSERT(last.type == "end_" + name, "@" + name + ": expect a @end_" + name + " to finish, unknown tag @" + last.type);
			ASSERT(last.generator.args.length == 0, "@end_" + name + ": expect no argument");
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
	function CtrlBase(args, scanner, extraArg, ctrlClass, parserMap, attIndex) {
		ASSERT(args.length > 0, "expect at least one argument for a control");
		this.setter = new Setter(args[0]);
		this.initVal = (isEmptyArg(args[1]) ? null : evaluateFunc(args[1]));
		this.ctrlInst = new ctrlClass(args, scanner, extraArg);
		parseAttributes(this.ctrlInst, parserMap, args, attIndex);
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
	
	function registerCtrl(tagName, ctrlClass, extraArg, defaultValue, parserMap, extraArgs) {
		if (parserMap == null) parserMap = {};
		if (extraArgs == null) extraArgs = 0;
		var tagClass = function (args, scanner) {
			CtrlBase.call(this, args, scanner, extraArg, ctrlClass, parserMap, extraArgs + 2);
		};
		Q.extend(tagClass, CtrlBase);
		tagClass.prototype.defaultValue = defaultValue;
		registerTag(tagName, tagClass);
	}
	var generalCtrlAttParsers = Q.union(generalAttParsers, valueCtrlAttParsers); 
	
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
	var textParserMap = Q.union(generalCtrlAttParsers, simpleAttParserMap("length", "size"));
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
	registerCtrl("checkbox", CheckboxCtrlTag, null, false, generalCtrlAttParsers);

	// Define @radio_group, @radio
	function RadioGroupCtrl(id, ids, values) {
		this.id = id;
		this.ids = ids;
		this.values = values;
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
		ASSERT(last.type == "end_radio_group", "@radio_group: expect a @end_radio_group to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@end_radio_group: expect no argument");
	}
	RadioGroupCtrlTag.prototype = {
		generate : function (data, env, id) {
			this.values = [];
			this.ids = [];
			this.id = id;
			env.currentRadioGroup = this;
			var ctrl = new RadioGroupCtrl(this.id, this.ids, this.values);
			generateAttributes(this, data, ctrl, env);
			this.body.generate(data, env);
			env.currentRadioGroup = undefined;
			return ctrl;
		}
	};
	registerCtrl("radio_group", RadioGroupCtrlTag, null, null, Q.union(valueCtrlAttParsers, idAttributeParser));

	function RadioTag(args, scanner) {
		this.value = evaluateFunc(args[0]);
		parseAttributes(this, generalAttParsers, args, 1);
	}
	RadioTag.prototype = {
		generate : function (data, env) {
			var group = env.currentRadioGroup;
			ASSERT(group != null, "@radio: must reside in a radio group"); 
			var id = (this.idFunc ? this.idFunc(data) : subId(group.id, group.values.length));
			group.values.push(this.value(data));
			group.ids.push(id);
			env.push(tagByIdName("input type=\"radio\"", id, group.id));
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
		ASSERT(last.type == "end_select", "@select: expect a @end_select to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@end_select: expect no argument");
	}
	SelectCtrlTag.prototype = {
		generate : function (data, env, id) {
			this.values = [];
			var id = env.generateId();
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
		parseAttributes(this, generalAttParsers, args, 2);
	}
	OptionTag.prototype = {
		generate : function (data, env) {
			var select = env.currentSelect;
			ASSERT(select != null, "@option: must reside in select"); 
			select.values.push(this.value(data));
			env.push("<option ");
			generateAttributes(this, data, null, env);
			env.push(">" + Q.purify(this.text(data)) + "</option>");
		}
	};
	registerTag("option", OptionTag);
	
	function OptionxTag(args, scanner) {
		this.value = evaluateFunc(args[0]);
		parseAttributes(this, generalAttParsers, args, 1);
		this.body = new Block();
		var last = this.body.appendUntilDummy(scanner);
		ASSERT(last.type == "end_optionx", "@optionx: expect an end_optionx to finish, unknown tag @" + last.type);
		ASSERT(last.generator.args.length == 0, "@end_optionx: expect no argument");
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
	function ButtonCtrlTag(args, scanner, type) {
		this.type = type;
		this.text = evaluateFunc(args[0]);
		parseAttributes(this, buttonParserMap, args, 1);
	}
	ButtonCtrlTag.prototype = {
		generate : function (data, env) {
			var id = getId(this, data, env);
			var text = this.text(data);
			var ctrl = new ButtonCtrl(id, env);
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
	function registerButtonCtrl(name, type) {
		var tagClass = function (args, scanner) {
			ButtonCtrlTag.call(this, args, scanner, type);
		};
		Q.extend(tagClass, ButtonCtrlTag);
		registerTag(name, tagClass);
	}
	registerButtonCtrl("submit", "submit");
	registerButtonCtrl("button", "button");
	
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
	
	function getCtrlAttList(args, begId) {
		var events = [], atts = [];
		for (var i = begId; i < args.length; i++) {
			var att = parseAttribute(args[i]);
			var parser;
			if (att.func) {
				var event = (new EventAttributeParser(att.name)).parse(att.value);
				events.push({"name":att.name, "e":event})
			} else {
				var func = evaluateFunc(att.value);
				atts.push({"name":att.name, "func":func});
			}
		}
		return [ events, atts ];
	}
	function appendCtrlAtts(newData, data, env, obj) {
		var events = obj[0];
		for (var i = 0; i < events.length; i++)
			newData[events[i].name] = events[i].e.getCtrlEventFunc(data, env);
		var atts = obj[1];
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

	// @C tag and @Cx tag
	function COrCxTag(hasBlk) {
		var CTag = function (args, scanner) {
			ASSERT(args.length >= 2, "@" + (hasBlk ? "Cx" : "C") + ": need at least 2 arguments");
			this.setter = new Setter(args[0]);
			this.tempName = evaluateFunc(args[1]);
			this.attList = getCtrlAttList(args, 2);
			if (hasBlk) {
				this.blocks = [];
				var last;
				do {
					var body = new Block();
					last = body.appendUntilDummy(scanner);
					ASSERT(last.type == "sep_Cx" || last.type == "end_Cx", "@Cx: expect a @sep_Cx or @end_Cx, unknown tag @" + last.type);
					this.blocks.push(body);
				} while (last.type != "end_Cx");
			}
		};
		CTag.prototype = {
			generate : function (data, env) {
				var tempName = this.tempName(data);
				ASSERT(typeof(tempName) == "string", "@" + (hasBlk ? "Cx" : "C") + ": the second argument should be a string");
				var evaluator = getTemplate(tempName);
				//deal with control name
				var setterInst = this.setter.getSetterInstance(data, env);
				var oldInd = env.parCtrlIndexes;
				env.parCtrlIndexes = setterInst;
				//set attributes and events
				var newData = {};
				appendCtrlAtts(newData, data, env, this.attList);
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
				evaluator.evaluateData(newData, [], env);
				env.parCtrlIndexes = oldInd;
				if (env.cContTemp) env.cStop = env.cContTemp = false;
			}
		};
		return CTag;
	}
	registerTag("C", COrCxTag(false));
	registerTag("Cx", COrCxTag(true));
	
	// @I tag and @Ix tag
	function IOrIxTag(hasBlk) {
		var ITag = function (args, scanner) {
			ASSERT(args.length >= 1, "@" + (hasBlk ? "Ix" : "I") + ": need at least 1 arguments");
			this.tempName = evaluateFunc(args[0]);
			this.args = new Array(args.length - 1);
			this.evaluator = null;
			for (var i = 1; i < args.length; i++)
				this.args[i - 1] = evaluateFunc(args[i]);
			if (hasBlk) {
				this.blocks = [];
				var last;
				do {
					var body = new Block();
					last = body.appendUntilDummy(scanner);
					ASSERT(last.type == "sep_Ix" || last.type == "end_Ix", "@Ix: expect a @sep_Ix or @end_Ix, unknown tag @" + last.type);
					this.blocks.push(body);
				} while (last.type != "end_Ix");
			}
		};
		ITag.prototype = {
			generate : function (data, env) {
				var tempName = this.tempName(data);
				ASSERT(typeof(tempName) == "string", "@I: the argument should be a string");
				var evaluator = getTemplate(tempName);
				var arr = new Array(this.args.length);
				for (var i = 0; i < arr.length; i++)
					arr[i] = (this.args[i])(data);
				var newData = {};
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
				evaluator.evaluateData(newData, arr, env);
				if (env.cContTemp) env.cStop = env.cContTemp = false;
			}
		};
		return ITag;
	}
	registerTag("I", IOrIxTag(false));
	registerTag("Ix", IOrIxTag(true));

	function BlockTag(args, scanner) {
		ASSERT(args.length >= 1, "@block: need at least 1 arguments");
		this.argId = evaluateFunc(args[0]);
		this.attList = getCtrlAttList(args, 1);
	}
	BlockTag.prototype = {
		generate : function (data, env) {
			var argId = this.argId(data);
			ASSERT(data.__outerBlocks, "@block can be only used within a callee template");
			var blk = data.__outerBlocks[argId];
			var newData = data.__outerData;
			appendCtrlAtts(newData, data, env, this.attList);
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

	return {
//#ifdef DEBUG
		"Trace": Trace,
		"ASSERT": ASSERT,
		"ERROR": ERROR,
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
		"loadLibrary" : loadLibrary,
		"loadAll" : loadAll,
		"loadTemplate" : loadTemplate,
		"findTemplate" : findTemplate,
		"isLoading" : isLoading,
		"getJsrlTemplate" : getJsrlTemplate,
		"getTemplate" : getTemplate,
		"parseAttributes" : parseAttributes,
		"generalAttParsers" : generalAttParsers,
		"generateAttributes" : generateAttributes,
		"registerTemplate" : registerTemplate,
		"parseFarTmpName" : parseFarTmpName,
		"registerPropParser" : registerPropParser,
		"getId" : getId,
		"tagById" : tagById,
		"uniqueId" : uniqueId,
		"dispose" : dispose
	};

})();

var QJJsrl = (function() {
	// Define @a
	function ATag(args, scanner) {
		Jsrl_ASSERT(args.length >= 2, "@a: require at least 2 arguments");
		this.text = Jsrl.evaluateFunc(args[0]);
		this.path = Jsrl.evaluateFunc(args[1]);
		this.arg = Jsrl.evaluateFunc(args[2]);
		Jsrl.parseAttributes(this, Jsrl.generalAttParsers, args, 3);
	}
	ATag.prototype = {
		generate : function (data, env) {
			var id = Jsrl.getId(this, data, env);
			env.push(Jsrl.tagById("a", id) + " href=\"" + data.WIND.Page.getPath(this.path(data), this.arg(data)) + "\"");
			Jsrl.generateAttributes(this, data, this, env);
			env.push(">" + Q.purify(this.text(data)) + "</a>");
		}
	};
	Jsrl.registerTag("a", ATag);
	
	// Define @ax
	function AxTag(args, scanner) {
		Jsrl_ASSERT(args.length >= 1, "@ax: require at least 1 arguments");
		this.path = Jsrl.evaluateFunc(args[0]);
		this.arg = Jsrl.evaluateFunc(args[1]);
		Jsrl.parseAttributes(this, Jsrl.generalAttParsers, args, 2);
		this.body = new Jsrl.Block();
		var last = this.body.appendUntilDummy(scanner);
		Jsrl_ASSERT(last.type == "end_ax", "@ax: expect a @end_ax to finish, unknown tag @" + last.type);
		Jsrl_ASSERT(last.generator.args.length == 0, "@ax: end_ax expect no argument");
	}
	AxTag.prototype = {
		generate : function (data, env) {
			var id = Jsrl.getId(this, data, env);
			env.push(Jsrl.tagById("a", id) + " href=\"" + data.WIND.Page.getPath(this.path(data), this.arg(data)) + "\"");
			Jsrl.generateAttributes(this, data, this, env);
			env.push(">");
			this.body.generate(data, env);
			env.push("</a>");
		}
	};
	Jsrl.registerTag("ax", AxTag);
	
	var tagLib;
	function initNodeForTag(topNode, tagName) {
		var srcNodes = document.body.getElementsByTagName(tagName);
		var nodes = topNode.getElementsByTagName(tagName);
		Jsrl_ASSERT(srcNodes.length == nodes.length, "Target node must have the same innerHTML with document.body");
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
//#ifdef DEBUG
			Jsrl.Trace().pushPageNode(node);
//#endif
			var text = Jsrl.getJsrlTemplate(srcNodes[i]);
			if (text != null) {
				if (node.id == "" || node.id == undefined) {
					var id = Jsrl.uniqueId();
					if (window != top) id = "s" + id;
					node.id = id;
				}
				var tmp = Jsrl.registerTemplate(node.id, text);
				tagLib[node.id] = { "node" : node, "tmp" : tmp };
			}
//#ifdef DEBUG
			Jsrl.Trace().pop();
//#endif
		}
	}
	
	function init(topNode) {
		tagLib = {};
		initNodeForTag(topNode, "DIV");
		initNodeForTag(topNode, "SPAN");
	};
	
	function load() {
		for (var name in tagLib) {
			var info = tagLib[name];
			if (typeof(info) != "function" && name.charAt(0) != "!") {
				info.node.form = null;
				Jsrl.renderData(info.node, info.tmp, []);
			} 
		}
	};
	
	function dispose() {
		for (var name in tagLib) {
			var info = tagLib[name];
			if (info.node.form) info.node.form.dispose();
		}
		Jsrl.dispose();
	};
	
	function renderArray(name, arr) {
		var info = tagLib[name];
		Jsrl_ASSERT(info != null, "Cannot find node with name " + name);
		Jsrl.renderData(info.node, info.tmp, arr);
	}
	
	function rerenderArray(name, arr) {
		var info = tagLib[name];
		Jsrl_ASSERT(info != null, "Cannot find node with name " + name);
		Jsrl.clear(info.node);
		Jsrl.renderData(info.node, info.tmp, arr);
	}

	function render(name) {
		var arr = new Array(arguments.length);
		for (var i = 1; i < arguments.length; i++)
			arr[i - 1] = arguments[i];
		renderArray(name, arr);
	};
	
	function rerender(name) {
		var arr = new Array(arguments.length);
		for (var i = 1; i < arguments.length; i++)
			arr[i - 1] = arguments[i];
		rerenderArray(name, arr);
	};
	
	return {
		"init" : init,
		"load" : load,
		"dispose" : dispose,
		"render" : render,
		"rerender" : rerender
	};
});
