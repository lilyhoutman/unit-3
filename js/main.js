//wrap everything is immediately invoked anonymous function so nothing is in global scope
(function (){

    //pseudo-global variables
    var attrArray = ["Waste from Household Sources", "Waste From Organic Sources", "Waste from Garden Sources", "Waste from Recyclable Sources", "Renewable Energy from Gas", "Renewable Energy from Hydro", "Renewable Energy from Wind", "Renewable Energy from Solar", "Renewable Energy from Biomass", "Investment in Waste", "Investment in Sewage", "Investment in Noise", "Investment in Air Pollution", "Investment in Climate", "Investment in Species Protection"];
    var expressed = attrArray[0]; //initial attribute
    var numericClasses;

     //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //make into global variable
    var colorClasses = [
        "#ffffcc",
        "#c2e699",
        "#78c679",
        "#31a354",
        "#006837"
    ];

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

//map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 468;

    //create new svg container for the map
    var map = d3.select("#map")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Germany
    var projection = d3.geoAlbers()
        .center([2, 51])
        .rotate([-8, 0])
        .parallels([48, 53.6])
        .scale(2500)
        .translate([width / 2, height / 2]);

	var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/german_health_environ.csv"),
                    d3.json("data/eur.topojson"),
                    d3.json("data/ger.topojson")
                   ];
    Promise.all(promises).then(callback);

function callback(data){
    csvData = data[0];
    europe = data[1];
    germany = data[2];

//place graticule on the map
        setGraticule(map, path);

//translate europe TopoJSON
        var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
            germanStates = topojson.feature(germany, germany.objects.german_states).features;

//add Europe countries to map
        var countries = map.append("path")
            .datum(europeCountries)
            .attr("class", "countries")
            .attr("d", path);

        germanStates = joinData(germanStates, csvData);

        var colorScale = makeColorScale(csvData);

        setEnumerationUnits(germanStates, map, path, colorScale);

        //add coordinated visualization to the map
            setChart(csvData, colorScale);

            createDropdown();

            d3.select("#classbutton").on("change", function () {
                changeAttribute(expressed, csvData);
            });

            createLegend(csvData, expressed);

    };

};

//create graticule generator
function setGraticule(map, path){
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

//create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

//create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
}

function joinData(germanStates, csvData){
//loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvState = csvData[i]; //the current region
        var csvKey = csvState.NAME_1; //the CSV primary key

 //loop through geojson regions to find correct region
        for (var a=0; a<germanStates.length; a++){

            var geojsonProps = germanStates[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME_1; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvState[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return germanStates;
}


/*//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#ffffcc",
        "#c2e699",
        "#78c679",
        "#31a354",
        "#006837"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};*/


//function to create color scale generator
function makeColorScale(data){

      //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    var radioValue = d3.select('input[name="button"]:checked').node().value;
    
    //if else statement to allow different classification
    if (radioValue == 'breaks') {    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });

    numericClasses = clusters.map(function (d) {
                return d3.max(d);
            });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale
} else if (radioValue == 'quantile') {
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    numericClasses = colorScale.quantiles()

    return colorScale;
} else if (radioValue == 'equal') {
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    numericClasses = colorScale.quantiles()

    return colorScale;
};
};

function setEnumerationUnits(germanStates, map, path, colorScale){
        //add German states to map
        var states = map.selectAll(".states")
            .data(germanStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.NAME_1;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
            if(value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
            })
        .on("mouseover", function(event, d){
            highlight(d.properties);
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    var desc = states.append("desc")
        .text('{"stroke": "#fff", "stroke-width": "0.5px"}');
}

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //create a second svg element to hold the bar chart
    var chart = d3.select("#chart")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each state
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.NAME_1;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        })
        .on("mousemove", moveLabel);

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 30)
        .attr("class", "chartTitle");

    updateChart(bars, csvData.length, colorScale);

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

     var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    };

function createDropdown(){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });

    };

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
    });

//re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);

    createLegend(csvData, expressed);
};

function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
    });

        //at the bottom of updateChart()...add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text("% of " + expressed + " by German State");
}

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.NAME_1)
        .style("stroke", "#54B6E4")
        .style("stroke-width", "2");
        setLabel(props);
};

function dehighlight(props){
    var selected = d3.selectAll("." + props.NAME_1)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    //remove info label
    d3.select(".infolabel")
        .remove();
};

//add legend that changes with attribute/classification scheme
function createLegend(csvData, expressed) {
    var scale = d3.scaleThreshold()
        .domain(numericClasses)
        .range(colorClasses);

    d3.select('#legend').append('svg').attr('class', 'legendBox');

    var legend = d3.select("svg.legendBox");

    legend.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(10,15)");

    var colorLegend = d3.legendColor()
        .shapeWidth(40)
        .orient('vertical')
        .ascending(true)
        .scale(scale)
        .title('% ' + expressed)
        .labels(d3.legendHelpers.thresholdLabels)

    legend.select(".legend")
        .call(colorLegend);
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] + "%" +
        "</h1><b>" + "Percent " + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.NAME_1 + "_label")
        .html(labelAttribute);

    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME_1);
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})(); //last line of main.js