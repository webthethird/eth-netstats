
/* Directives */

angular.module('netStatsApp.directives', [])
	.directive('appVersion', ['version', function (version) {
		return function(scope, elm, attrs) {
			elm.text(version);
		};
}])
// 	.directive('timeAgo', ['$interval', function($interval) {
// 		function link (scope, element, attrs)
// 		{
// 			var timestamp,
// 				timeoutId;

// 			function updateTime() {
// 				element.text(timeAgo())
// 			}

// 			function timeAgo()
// 			{
// 				if(timestamp === 0)
// 					return '∞';

// 				var time = (new Date()).getTime();
// 				var diff = Math.floor((time - timestamp)/1000);

// 				if(diff < 60)
// 					return Math.round(diff) + ' s ago';

// 				return moment.duration(Math.round(diff), 's').humanize() + ' ago';
// 			};

// 			scope.$watch(attrs.timeAgo, function(value) {
// 				timestamp = value;
// 				updateTime();
// 			});

// 			element.on('$destroy', function() {
// 				$interval.cancel(timeoutId);
// 			});

// 			timeoutId = $interval(function () {
// 				updateTime();
// 			}, 200);
// 		};

// 		return {
// 			link: link
// 		};
// }])

	.directive('minerblock', function ($compile) {
		return {
			restrict: 'E',
			template: '<div></div>',
			replace: true,
			link: function (scope, element, attrs)
			{
				var makeClass = function (value)
				{
					if(value <= 6)
						return 'success';

					if(value <= 12)
						return 'info';

					if(value <= 18)
						return 'warning';

					if(value <= 24)
						return 'orange';

					return 'danger';
				}

				attrs.$observe("blocks", function (newValue)
				{
					var content = '';
					var blockClass = 'bg-' + makeClass(newValue);

					for(var i = 0; i < newValue; i++)
					{
						content += '<div class="block ' + blockClass + '"></div>';
					}

					element.empty();
					element.html(content);
				});
			}
		};
})
	.directive('sparkchart', function () {
		return {
			restrict: 'E',
			scope: {
				data: '@'
			},
			compile: function (tElement, tAttrs, transclude)
			{
				tElement.replaceWith('<span>' + tAttrs.data + "</span>");

				return function(scope, element, attrs)
				{
					attrs.$observe("data", function (newValue)
					{
						element.html(newValue);
						element.addClass("big-details");
						element.sparkline('html', {
							type: 'bar',
							tooltipSuffix: (attrs.tooltipsuffix || '')
						});
					});
				};
			}
		};
})
	.directive('nodepropagchart', function() {
		return {
			restrict: 'E',
			scope: {
				data: '@'
			},
			compile: function (tElement, tAttrs, transclude)
			{
				tElement.replaceWith('<span>' + tAttrs.data + "</span>");

				function formatTime (ms) {
					var result = 0;

					if(ms < 1000) {
						return ms + " ms";
					}

					if(ms < 1000*60) {
						result = ms/1000;
						return result.toFixed(1) + " s";
					}

					if(ms < 1000*60*60) {
						result = ms/1000/60;
						return Math.round(result) + " min";
					}

					if(ms < 1000*60*60*24) {
						result = ms/1000/60/60;
						return Math.round(result) + " h";
					}

					result = ms/1000/60/60/24;
					return Math.round(result) + " days";
				};

				return function(scope, element, attrs)
				{
					attrs.$observe("data", function (newValue)
					{
						element.html(newValue);
						element.sparkline('html', {
							type: 'bar',
							negBarColor: '#7f7f7f',
							zeroAxis: false,
							height: 20,
							barWidth : 2,
							barSpacing : 1,
							tooltipSuffix: '',
							chartRangeMax: 8000,
							colorMap: jQuery.range_map({
								'0:1': '#10a0de',
								'1:1000': '#7bcc3a',
								'1001:3000': '#FFD162',
								'3001:7000': '#ff8a00',
								'7001:': '#F74B4B'
							}),
							tooltipFormatter: function (spark, opt, ms) {
								var tooltip = '<div class="tooltip-arrow"></div><div class="tooltip-inner">';
								tooltip += formatTime(ms[0].value);
								tooltip += '</div>';

								return tooltip;
							}
						});
					});
				};
			}
		};
})
	.directive('nodemap', ['$compile', function($compile) {
		return {
			restrict: 'EA',
			scope: {
				data: '='
			},
			link: function(scope, element, attrs) {
				var bubbleConfig = {
					borderWidth: 0,
					highlightOnHover: false,
					popupOnHover: true,
					popupTemplate: function(geo, data) {
						return ['<div class="tooltip-arrow"></div>',
								'<div class="hoverinfo ' + data.fillClass + '">',
									'<div class="propagationBox"></div>',
									'<strong>',
									data.nodeName,
									'</strong>',
								'</div>'].join('');
					}
				};

				scope.init = function() {
					element.empty();

					var width = 628,
						height = 202;

					scope.map = new Datamap({
						element: element[0],
						scope: 'world',
						width: width,
						height: 242,
						fills: {
							success: '#7BCC3A',
							info: '#10A0DE',
							warning: '#FFD162',
							orange: '#FF8A00',
							danger: '#F74B4B',
							defaultFill: '#282828'
						},
						geographyConfig: {
							borderWidth: 0,
							borderColor: '#000',
							highlightOnHover: false,
							popupOnHover: false
						},
						bubblesConfig: {
							borderWidth: 0,
							highlightOnHover: false,
							popupOnHover: true
						},
						done: function(datamap) {
							var ev;

							var zoomListener = d3.behavior.zoom()
								.size([width, height])
								.scaleExtent([1, 3])
								.on("zoom", redraw)
								.on("zoomend", animadraw);

							function redraw() {
								datamap.svg.select(".datamaps-subunits").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
								datamap.svg.select(".bubbles").selectAll("circle")
									.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")")
									.attr("r", 3/d3.event.scale);

								ev = d3.event;
							}

							zoomListener(datamap.svg);

							function animadraw() {
								var x = Math.min(0, Math.max(ev.translate[0], (-1) * width * (ev.scale-1)));
								var y = Math.min(0, Math.max(ev.translate[1], (-1) * height * (ev.scale-1)));

								datamap.svg.select(".datamaps-subunits")
									.transition()
									.delay(150)
									.duration(750)
									.attr("transform", "translate(" + x  + "," + y + ")scale(" + ev.scale + ")");

								datamap.svg.select(".bubbles").selectAll("circle")
									.transition()
									.delay(150)
									.duration(750)
									.attr("transform", "translate(" + x  + "," + y + ")scale(" + ev.scale + ")")
									.attr("r", 3/ev.scale);

								zoomListener.translate([x,y]);
							}
						}
					});

					scope.map.bubbles(scope.data, bubbleConfig);
				}

				scope.init();

				scope.$watch('data', function() {
					scope.map.bubbles(scope.data, bubbleConfig);
				}, true);
			}
		};
}])
	.directive('largemap', ['$compile', function($compile, $filter) {
		return {
			restrict: 'EA',
			scope: {
				data: '='
			},
			link: function(scope, element, attrs) {
				var bubbleConfig = {
					borderWidth: 0,
					highlightOnHover: false,
					popupOnHover: true,
					popupTemplate: function(geo, data) {
						return ['<div class="tooltip-arrow"></div>',
								'<div class="hoverinfo ' + data.fillClass + '">',
									'<div class="propagationBox"></div>',
									'<strong>',
									data.nodeName,
									'</strong>',
								'</div>'].join('');
					}
				};
				var arcConfig = {
	        greatArc: true,
					strokeWidth: 2,
	        animationSpeed: 100
	      };

				var color = d3.scale.linear()
			    .domain([0, 500, 1000, 1500])
			    .range(["green", "yellow", "orange", "red"]);

				var globalRotation = [97,-30];
				var center;

				function dynamicSort(property) {
				    var sortOrder = 1;
				    if(property[0] === "-") {
				        sortOrder = -1;
				        property = property.substr(1);
				    }
				    return function (a,b) {
				        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
				        return result * sortOrder;
				    }
				}

				scope.arcs = [];
				scope.bestBlock = 0;

				scope.redraw = function() {
				  d3.select("#largeMapBody").html('');
				  scope.init();
				}

				scope.rotate = function(lat,lng) {
					globalRotation = [0-lng,0-lat];
					d3.select("#largeMapBody").html('');
				  scope.init();
				}

				scope.drawArcs = function() {
					scope.arcs = [];
					// sort node list according to current block propagation time
					scope.ordered = _.sortBy(scope.data, function (node) {
						return parseInt(node.blockPropagation+1);
					});
					// filter node list for only the best block
					scope.ordered = _.filter(scope.ordered, function (node) {
						return node.blockNumber == scope.bestBlock;
					});
					console.log("Ordered Nodes:",scope.ordered);
					// for each node, search all previous nodes for the closest and create an arc
					scope.ordered.forEach(function(node, index, data){
						var prevNodes = data.slice(0, index);
						if(prevNodes.length > 0){
							var sortedNodes = _.sortBy(prevNodes, function(prevNode){
								return d3.geo.distance([node.longitude, node.latitude],[prevNode.longitude, prevNode.latitude]);
							})
							var closest = sortedNodes[0];		// this is the closest node that has already propagated the current block
							var arc = {
								origin: closest,
								destination: node,
								time: node.blockPropagation,	// the time when this node propagated the block
								delta: node.blockPropagation - closest.blockPropagation	// the time difference between when this node propagated the block and when its neighbor did
							}
							scope.arcs.push(arc);
						}
					});
					addArcs(1);
				}

				function addArcs(index) {
						// console.log('adding arc: '+index)
						var arc = scope.arcs[index-1];
						if(arc == undefined) return;
						arcConfig.animationSpeed = arc.delta;
						arcConfig.strokeColor = color(arc.time);
						console.log('Arc #'+index+' origin: '+arc.origin.nodeName+' destination: '+arc.destination.nodeName+' time: ',arc.time)
		        scope.map.arc( scope.arcs.slice(0, index) , arcConfig);
		        if ( index < scope.arcs.length ) { // iterate through arcs every 100ms
		            window.setTimeout(function() {
		                addArcs(++index)
		            }, 100);
		        }
		    }

				scope.init = function() {
					var data = scope.data;

					element.empty();

					var width = 800,
						height = 800;

					scope.map = new Datamap({
						element: document.getElementById('largeMapBody'),
						scope: 'world',
						width: width,
						height: height,
						setProjection: function(element) {
					    var projection = d3.geoOrthographic()
					      .rotate(globalRotation)
					      .scale(width / 2 - 20)
					      .translate([width / 2, height / 2]);
					    var path = d3.geo.path()
					      .projection(projection);

					    return {path: path, projection: projection};
					  },
						fills: {
							success: '#7BCC3A',
							info: '#10A0DE',
							warning: '#FFD162',
							orange: '#FF8A00',
							danger: '#F74B4B',
							defaultFill: '#282828'
						},
						geographyConfig: {
							borderWidth: 1,
							borderColor: 'lightgray',
							highlightOnHover: false,
							popupOnHover: false
						},
						bubblesConfig: {
							borderWidth: 0,
							highlightOnHover: false,
							popupOnHover: true
						},
						done: function(datamap) {
							var ev;

							var globe = d3.select('#largeMapBody').select('svg').append('g');
							globe.selectAll('circle').data([1]).enter()
									.append('circle')
										.attr('r', width/2 - 20)
										.attr('cx', '50%')
										.attr('cy', '50%')
										.attr('stroke', 'white')
										.attr('stroke-width', 1)
										.attr('fill', 'white')
										.attr('opacity', 0.25);
						}
					});

					scope.map.graticule();

					scope.map.bubbles(scope.data, bubbleConfig);
				}

				scope.init();

				scope.$watch('data', function() {
					console.log('got new data');
					var best = _.min(scope.data, function (node) {
						return parseInt((node.blockPropagation+1)*node.avgPropagation);
					});
					if(best.blockNumber > scope.bestBlock){
						console.log('new best block: '+best.blockNumber);
						scope.bestBlock = best.blockNumber;
						scope.rotate(best.latitude, best.longitude);
						scope.drawArcs();
						scope.map.bubbles(scope.data, bubbleConfig);
					}
				}, true);
			}
		};
	}])
	.directive('histogram', ['$compile', function($compile) {
		return {
			restrict: 'EA',
			scope: {
				data: '='
			},
			link: function(scope, element, attrs)
			{
				var margin = {top: 0, right: 0, bottom: 0, left: 0};
				var width = 280 - margin.left - margin.right,
					height = 63 - margin.top - margin.bottom;

				var TICKS = 40;

				var x = d3.scale.linear()
					.domain([0, 10000])
					.rangeRound([0, width])
					.interpolate(d3.interpolateRound);

				var y = d3.scale.linear()
					.range([height, 0])
					.interpolate(d3.interpolateRound);

				var color = d3.scale.linear()
					.domain([1000, 3000, 7000, 10000])
					.range(["#7bcc3a", "#FFD162", "#ff8a00", "#F74B4B"]);

				var xAxis = d3.svg.axis()
					.scale(x)
					.orient("bottom")
					.ticks(4, ",.1s")
					.tickFormat(function(t){ return t/1000 + "s"});

				var yAxis = d3.svg.axis()
					.scale(y)
					.orient("left")
					.ticks(3)
					.tickFormat(d3.format("%"));

				var line = d3.svg.line()
					.x(function(d) { return x(d.x + d.dx/2) - 1; })
					.y(function(d) { return y(d.y) - 2; })
					.interpolate('basis');

				var tip = d3.tip()
					.attr('class', 'd3-tip')
					.offset([10, 0])
					.direction('s')
					.html(function(d) {
						return '<div class="tooltip-arrow"></div><div class="tooltip-inner"><b>' + (d.x/1000) + 's - ' + ((d.x + d.dx)/1000) + 's</b><div class="small">Percent: <b>' + Math.round(d.y * 100) + '%</b>' + '<br>Frequency: <b>' + d.frequency + '</b><br>Cumulative: <b>' + Math.round(d.cumpercent*100) + '%</b></div></div>';
					})

				scope.init = function()
				{
					var data = scope.data;

					// Adjust y axis
					y.domain([0, d3.max(data, function(d) { return d.y; })]);

					// Delete previous histogram
					element.empty();

					/* Start drawing */
					var svg = d3.select(".d3-blockpropagation").append("svg")
						.attr("width", width + margin.left + margin.right)
						.attr("height", height + margin.top + margin.bottom)
					  .append("g")
						.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

					svg.call(tip);

					svg.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + height + ")")
						.call(xAxis)
						.selectAll("text")
						  .attr("y", 6);

					svg.append("g")
						.attr("class", "y axis")
						.attr("transform", "translate(" + width + ", 0)")
						.call(yAxis);


					var bar = svg.append("g")
						.attr("class", "bars")
					  .selectAll("g")
					  .data(data)
					  .enter().append("g")
						.attr("transform", function(d) { return "translate(" + x(d.x) + ",0)"; })
						.on('mouseover', function(d) { tip.show(d, d3.select(this).select('.bar').node()); })
						.on('mouseout', tip.hide);

					bar.insert("rect")
						.attr("class", "handle")
						.attr("y", 0)
						.attr("width", x(data[0].dx + data[0].x) - x(data[0].x))
						.attr("height", function(d) { return height; });

					bar.insert("rect")
						.attr("class", "bar")
						.attr("y", function(d) { return y(d.y); })
						.attr("rx", 1)
						.attr("ry", 1)
						.attr("fill", function(d) { return color(d.x); })
						.attr("width", x(data[0].dx + data[0].x) - x(data[0].x) - 1)
						.attr("height", function(d) { return height - y(d.y) + 1; });

					bar.insert("rect")
						.attr("class", "highlight")
						.attr("y", function(d) { return y(d.y); })
						.attr("fill", function(d) { return d3.rgb(color(d.x)).brighter(.7).toString(); })
						.attr("rx", 1)
						.attr("ry", 1)
						.attr("width", x(data[0].dx + data[0].x) - x(data[0].x) - 1)
						.attr("height", function(d) { return height - y(d.y) + 1; });

					svg.append("path")
						.attr("class", "line")
						.attr("d", line(data));
				}

				scope.$watch('data', function() {
					if(scope.data.length > 0) {
						scope.init();
					}
				}, true);
			}
		};
	}]);
