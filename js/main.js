//begin script when window loads
window.onload = setMap();

//map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
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

//set up choropleth map
function setMap(){
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
    console.log(csvData);
            console.log(europe);
            console.log(germany);  

//translate europe TopoJSON
        var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
            germanStates = topojson.feature(germany, germany.objects.german_states).features;

//create graticule generator
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

//add Europe countries to map
        var countries = map.append("path")
            .datum(europeCountries)
            .attr("class", "countries")
            .attr("d", path);

        //add German states to map
        var states = map.selectAll(".states")
            .data(germanStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.NAME_1;
            })
            .attr("d", path);

	};
};