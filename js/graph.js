
(function($){
	$.simplegraph = function(el, options){
		var scope = this;
		this.$el = $(el);
		this.el = el;
		this.$el.data('simplegraph', this);
		if(!options) options = {};
		this.info = {};
		this.coordinates = [];
		this.buffer = {
			top: 20
			, bottom: 30
			, left: 40
			, right: 10
		};
		
		this.init = function(){
			this.setOptions(options);
			this.stage();
			this.size();
		};
		
		this.setOptions = function(opts){
			this.options = $.extend({},$.simplegraph.defaultOptions, opts);
		}
		
		this.setData = function(data){
			//this.graphData = data;
			var newData = [];
			for(var i=0; i<data.length; i++){
				switch(jQuery.type(data[i])){
					case 'array':
						newData.push({label: data[i][0], value: data[i][1]});
						break;
					case 'object':
						newData.push(data[i]);
						break;
				}
			}
			this.graphData = newData;
		}
		
		this.stage = function(){
			scope.width = Math.floor(scope.$el.width());
			if(scope.width < 10) scope.width = scope.options.minSize;
			scope.height = Math.floor(scope.$el.height());
			scope.$el.html('<canvas></canvas>');
			scope.canvas = scope.$el.find('canvas')[0];
			scope.ctx = scope.canvas.getContext('2d');
		};
			
		this.size = function(){
			var ctx = scope.ctx;
			if (ctx.canvas.width !== scope.width || ctx.canvas.height !== scope.height) {
				ctx.canvas.width = scope.width;
				ctx.canvas.height = scope.height;
			}
		};
		
		this.resize = function(){
			scope.stage();
			scope.size();
			var animate = scope.options.animate;
			scope.options.animate = false;
			scope.graph();
			scope.options.animate = animate;
		};
		
		this.graph = function(){
			if(!scope.graphData) return;
			var data = scope.graphData;
			var buffer = scope.buffer;
			
			scope.info.numOfBars = data.length;
			scope.info.maxValue = scope.options.maxValue;
			scope.info.border = scope.options.border;
			scope.info.graphAreaHeight = scope.height - buffer.top - buffer.bottom;
			scope.info.graphAreaWidth = scope.width - buffer.left - buffer.right;
			scope.info.barWidth = scope.info.graphAreaWidth / scope.info.numOfBars - scope.options.margin * 2;
			
			var maxValue = 0;
			var highestValue = 0;
			for (i = 0; i < data.length; i += 1) {
				var value = data[i].value;
				if(value > highestValue) maxValue = highestValue = value;
			}
			scope.info.highestValue = highestValue;
			if(scope.info.maxValue){
				scope.info.increments = scope.options.increments || Math.round(scope.info.maxValue / 8);
			}else{
				for(var i=0; i<scope.options.thresholds.length; i++){
					var threshold = scope.options.thresholds[i];
					if(threshold > maxValue) maxValue = threshold;
				}
				scope.info.increments = scope.options.increments || Math.round(maxValue * 1.2 / 8);
				maxValue = Math.floor(maxValue * 1.2);
				maxValue = Math.round(maxValue / scope.info.increments) * scope.info.increments;
				scope.info.maxValue = maxValue;
			}
			
			if(scope.options.animate){
				var ci = 0;
				var inc = scope.info.highestValue / scope.options.steps;
				var timer = setInterval(function(){
					var tmpData = [];
					for(j=0; j<data.length; j++){
						var item = data[j];
						var tmpVal = ci > item.value ? item.value : ci;
						tmpData.push({label: item.label, value: tmpVal});
					}
					scope.draw(tmpData);
					ci += inc;
					if(ci > scope.info.highestValue){
						clearInterval(timer);
					}
				}, scope.options.animationSpeed);
			}else{
				scope.draw(data);
			}
		};
		
		this.draw = function(data){
			if(!data) return;
			var ctx = scope.ctx;
			ctx.clearRect(0, 0, scope.width, scope.height);
			ctx.fillStyle = scope.options.bgcolor;
			ctx.fillRect(0, 0, scope.width, scope.height);
			
			var numOfBars = scope.info.numOfBars;
			var graphAreaHeight = scope.info.graphAreaHeight;
			var graphAreaWidth = scope.info.graphAreaWidth;
			var barWidth = scope.info.barWidth;
			var maxValue = scope.info.maxValue;
			var buffer = scope.buffer;
			
			scope.draw3dAxis();
			scope.drawYValues(data);
			
			scope.coordinates = [];
			for (var i = 0; i < data.length; i += 1) {
				var label = data[i].label;
				var value = data[i].value;
				var ratio = value / maxValue;
				var barHeight = ratio * scope.info.graphAreaHeight;
				ctx.fillStyle = scope.options.color;
				
				var x = buffer.left + scope.options.margin + (i * graphAreaWidth / numOfBars);
				var y = graphAreaHeight - barHeight + buffer.top;
				var w = barWidth;
				var h = barHeight;
				
				ctx.save();
				// check for 3D
				if(scope.options.is3d){
					ctx.save();
					var depth = scope.options.depth3d;
					ctx.fillStyle = scope.adjustColor(scope.options.color, -.2);
					ctx.beginPath();
					ctx.moveTo(x + w, y);
					ctx.lineTo(x + w + depth, y - depth);
					ctx.lineTo(x + w + depth, y + h - depth);
					ctx.lineTo(x + w, y + h);
					ctx.fill();
					
					ctx.fillStyle = scope.adjustColor(scope.options.color, .2);
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(x + w, y);
					ctx.lineTo(x + w + depth, y - depth);
					ctx.lineTo(x + depth, y - depth);
					ctx.fill();
					
					ctx.restore();
				}
				// check for shadow
				if(scope.options.shadow){
					ctx.shadowColor = scope.options.shadowColor;
					ctx.shadowBlur = scope.options.shadowBlur;
					ctx.shadowOffsetX = scope.options.shadowOffsetX;
					ctx.shadowOffsetY = scope.options.shadowOffsetY;
				}
				ctx.fillRect(x, y, w, h);
				ctx.restore();
				
				ctx.clearRect(x, y + h, x + h + buffer.bottom, y + h + buffer.bottom); // clear extra shadow or 3D
				scope.coordinates.push({x: x, y: y, w: w, h: h, data: data[i]});
				
				// Add text
				ctx.save();
				ctx.fillStyle = 'black';
				var fontSize = Math.floor(scope.info.barWidth / 4);
				if(fontSize > 30) fontSize = 30;
				if(fontSize < 12) fontSize = 12;
				ctx.font = 'bold ' + fontSize + 'px ' + scope.options.font;
				ctx.textAlign = 'center';
				var text = parseInt(value, 10);
				if(scope.options.displayUnits && scope.options.units) text += scope.options.units;
				var textX = buffer.left + i * graphAreaWidth / numOfBars + (graphAreaWidth / numOfBars) / 2 + (scope.options.is3d ? 5 : 0);
				var textY = graphAreaHeight - barHeight + (10 - scope.options.is3d ? 5 : 0);
				ctx.fillText(text, textX, textY);
				ctx.restore();
			}
			scope.drawXAxis();
			scope.drawYAxis();
			scope.drawXLabels(data);
			
			scope.registerEvents();
		};
		
		this.drawXAxis = function(){
			var ctx = scope.ctx;
			var buffer = scope.buffer;
			var depth = scope.options.depth3d;
			
			ctx.beginPath();
			ctx.moveTo(buffer.left, scope.info.graphAreaHeight + buffer.top);
			ctx.lineTo(buffer.left - buffer.right + scope.info.graphAreaWidth, scope.info.graphAreaHeight + buffer.top);
			ctx.strokeStyle = scope.options.axisColor;
			ctx.lineWidth = 2;
			ctx.stroke();
		};
		
		this.drawYAxis = function(){
			var ctx = scope.ctx;
			var buffer = scope.buffer;
			ctx.beginPath();
			ctx.moveTo(buffer.left, buffer.top);
			ctx.lineTo(buffer.left, scope.info.graphAreaHeight + buffer.top);
			ctx.strokeStyle = scope.options.axisColor;
			ctx.lineWidth = 2;
			ctx.stroke();
		};
		
		this.draw3dAxis = function(){
			if(!scope.options.is3d) return;
			var ctx = scope.ctx;
			var buffer = scope.buffer;
			var depth = scope.options.depth3d;
			var baseX = buffer.left;
			var baseY = scope.info.graphAreaHeight + buffer.top;
			var topX = baseX;
			var topY = buffer.top;
			var rightX = baseX - buffer.right + scope.info.graphAreaWidth;
			var rightY = baseY;
			
			ctx.save();
			ctx.strokeStyle = scope.adjustColor(scope.options.axisColor, 0);
			ctx.lineWidth = 1;
			ctx.fillStyle = scope.adjustColor(scope.options.axisColor, .2);
			
			ctx.beginPath();
			ctx.moveTo(baseX, baseY);
			ctx.lineTo(baseX + depth, baseY - depth);
			ctx.lineTo(rightX + depth, rightY - depth);
			ctx.lineTo(rightX, rightY);
			ctx.stroke();
			ctx.fill();
			
			ctx.beginPath();
			ctx.moveTo(baseX, baseY);
			ctx.lineTo(baseX + depth, baseY - depth);
			ctx.lineTo(topX + depth, topY - depth);
			ctx.lineTo(topX, topY);
			ctx.stroke();
			ctx.fill();
			
			ctx.restore();
		};
		
		this.drawXLabels = function(data){
			var ctx = scope.ctx;
			var buffer = scope.buffer;
			
			var graphAreaWidth = scope.info.graphAreaWidth;
			var graphAreaHeight = scope.info.graphAreaHeight;
			var numOfBars = scope.info.numOfBars;
			ctx.fillStyle = 'black';
			var fontSize = Math.floor(scope.info.barWidth / 6);
			if(fontSize > 20) fontSize = 20;
			if(fontSize < 15) fontSize = 15;
			ctx.font = fontSize + 'px ' + scope.options.font;
			ctx.textAlign = 'center';
			for (var i = 0; i < data.length; i += 1) {
				var label = data[i].label;
				var text = label;
				var textX = 40 + i * graphAreaWidth / numOfBars + (graphAreaWidth / numOfBars) / 2;
				var textY = graphAreaHeight + buffer.top + 20;
				ctx.fillText(text, textX, textY);
			}
		};
		
		this.drawYValues = function(data){
			var ctx = scope.ctx;
			var buffer = scope.buffer;
			
			var maxValue = scope.info.maxValue;
			var graphAreaHeight = scope.info.graphAreaHeight;
			var graphAreaWidth = scope.info.graphAreaWidth;
			var depth = scope.options.is3d ? scope.options.depth3d : 0;
			
			ctx.fillStyle = 'black';
			var fontSize = Math.floor(scope.info.barWidth / 8);
			if(fontSize > 20) fontSize = 20;
			if(fontSize < 12) fontSize = 12;
			ctx.font = fontSize + 'px ' + scope.options.font;
			ctx.textAlign = 'center';
			for(var n = 0; n <= maxValue; n += scope.info.increments){
				var y = graphAreaHeight - ((n / maxValue) * graphAreaHeight) + buffer.top - depth;
				ctx.fillText(n, 15, y + (fontSize/2.5));
				
				if(scope.options.displayGrid && n > 0){
					ctx.beginPath();
					ctx.moveTo(buffer.left + depth, y);
					ctx.lineTo(buffer.left - buffer.right + graphAreaWidth + depth, y);
					ctx.strokeStyle = scope.options.gridColor;
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			}
			var thresholds = scope.options.thresholds;
			if(thresholds.length > 0 && scope.options.displayGrid){
				for(var t = 0; t < thresholds.length; t++){
					var y = graphAreaHeight - ((thresholds[t] / maxValue) * graphAreaHeight) + buffer.top - depth;
					ctx.dashedLine(buffer.left + depth, y, buffer.left - buffer.right + graphAreaWidth + depth, y, 8, scope.options.thresholdColor);
				}
			}
		};
		
		this.registerEvents = function(){
			var el = scope.canvas;
			el.removeEventListener('click', scope.onClick);
			el.addEventListener('click', scope.onClick);
		};
		
		this.onClick = function(e){
			var x = e.offsetX;
			var y = e.offsetY;
			for(var i=0; i<scope.coordinates.length; i++){
				var item = scope.coordinates[i];
				if(x > item.x && x < item.x + item.w && y > item.y && y < item.y + item.h){
					scope.$el.trigger('barclick', [item]);
				}
			}
		};
		
		this.adjustColor = function(hex, lum) {
			// validate hex string
			hex = String(hex).replace(/[^0-9a-f]/gi, '');
			if (hex.length < 6) {
				hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
			}
			lum = lum || 0;
			// convert to decimal and change luminosity
			var rgb = "#", c, i;
			for (i = 0; i < 3; i++) {
				c = parseInt(hex.substr(i*2,2), 16);
				c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
				rgb += ("00"+c).substr(c.length);
			}
			return rgb;
		};
		
		this.init();
	};
	
	$.simplegraph.defaultOptions = {
		bgcolor: 'transparent'
		, color: '#3399FF'
		, axisColor: '#CCC'
		, border: 'black'
		, font: 'sans-serif'
		, lineWidth: null
		
		// Animation
		, animate: true
		, animationSpeed: 10
		, steps: 50
		
		//, minSize: 100
		, margin: 20
		, maxValue: null
		
		// Units
		, displayUnits: true
		, units: null
		
		// Grid
		, displayGrid: true
		, gridColor: '#EEE'
		, increments: null
		, thresholds: []
		, thresholdColor: 'green'
		
		, shadow: false
		, shadowColor: '#333'
		, shadowBlur: 8
		, shadowOffsetX: 5
		, shadowOffsetY: 5
		
		, is3d: true
		, depth3d: 8
	};
	
	$.fn.simplegraph = function(v){
		var options = {};
		var data = [];
		var action = 'graph';
		for(var i=0; i<arguments.length; i++){
			var arg = arguments[i];
			switch(jQuery.type(arg)){
				case 'object': options = arg; break;
				case 'array': data = arg; break;
				case 'string': action = arg; break;
			}
		}
		
		return this.each(function(){
			if(!$(this).data('simplegraph')){
				new $.simplegraph(this, options);
			}
			var graph = $(this).data('simplegraph');
			if(data.length > 0) graph.setData(data);
			if(Object.keys(options).length > 0) graph.setOptions(options);
			graph[action]();
			
		});
	};
	
})(jQuery);

CanvasRenderingContext2D.prototype.dashedLine = function(x1, y1, x2, y2, dashLen, color) {
	if (dashLen == undefined) dashLen = 2;
	
	this.beginPath();
	if(color) this.strokeStyle = color;
	this.moveTo(x1, y1);
	
	var dX = x2 - x1;
	var dY = y2 - y1;
	var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
	var dashX = dX / dashes;
	var dashY = dY / dashes;
	
	var q = 0;
	while (q++ < dashes) {
		x1 += dashX;
		y1 += dashY;
		this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
	}
	this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);
	
	this.stroke();
	this.closePath();
};