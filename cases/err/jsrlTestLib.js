var MultiSelect = {
	"getValue" : function (boxes, values) {
		var result = [];
		for (var i = 0; i < boxes.length; i++) {
			if (boxes[i].final())
				result.push(values[i].final());
		}
		return result;
	}
};
