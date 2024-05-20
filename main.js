const svgWidth = 1200, svgHeight = 900;
const getTootTip = () => {
    return d3
        .select('body')
        .append('div')
        .style('position', 'absolute')
        .style('z-index', '10')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(233,236,236,0.93)')
        .style('border', 'solid')
        .style('border-width', '1px')
        .style('border-radius', '15px')
        .style('padding', '3px');
}
const OCCURRENCE = "Occurrence"
const PARK_NAME = "Park Name"
const ORDER = "Order"
const CATEGORY = "Category"
const FAMILY = "Family"
const COMMON_NAMES = "Common Names"
const EMPTY_STRING = ""
const RECORD_STATUS = "Record Status"
let parksData
let speciesData
let svg
let projection

document.addEventListener('DOMContentLoaded', async () => {
    initSvg()
    plotStates()
    await loadParkData()
    await loadSpeciesData()
    plotParks()
});

const initSvg = () => {
    svg = d3.select("#svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

}
const plotStates = () => {
    const color = d3.scaleOrdinal(d3.schemePastel1);
    projection = d3.geoMercator()
        .center([55, 50])
        .scale(550 )
        .translate([svgWidth / 2, svgHeight / 2])
        .rotate([-180, 0]);

    const path = d3.geoPath()
        .projection(projection);

    const g = svg.append("g");
    const tooltip = getTootTip()

    // loaded and displayed the US Map
    d3.json("us-states.json").then(function (topology) {
        g.selectAll("path")
            .data(topology.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", function (f) {
                return color(parseInt(f.id));
            })
            .attr("id", d => parseInt(d.id))
            .on('mouseover', function (event, d) {
                tooltip.style('visibility', 'visible');

                d3.select(this)
                    .attr("filter", "brightness(80%)")
                    .attr('stroke', 'black')
                    .attr('stroke-width', 3);
            })
            .on('mousemove', function (event, d) {
                tooltip
                    .style('top', event.pageY - 10 + 'px')
                    .style('left', event.pageX + 10 + 'px')
                    .html(`State: ${d.properties.name}`);
            })
            .on('mouseout', function (event, d) {
                tooltip.style('visibility', 'hidden');

                d3.select(this)
                    .style('fill', d => color(parseInt(d.id)))
                    .attr("filter", "brightness(100%)")
                    .attr('stroke', 'black')
                    .attr('stroke-width', 3)
            });

        //States
        svg.selectAll("text")
            .data(topology.features)
            .enter()
            .append("text")
            .attr("fill", "#333333")
            .attr("transform", (d) => {
                return "translate(" + path.centroid(d) + ")";
            })
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text((d) => {
                return d.properties.code;
            })
            .attr("font-size", 9);
    });
}
const plotParks = () => {
    const tooltip = getTootTip()
    d3.csv("Data/archive/parks.csv").then(function (data) {
        const zScale = d3.scaleSqrt()
            .domain([d3.min(data, d=>parseInt(d.Acres)), d3.max(data, d=>parseInt(d.Acres))])
            .range([13,28])
        // Drew circles based on the loaded data
        svg.selectAll("#tree")
            .data(data)
            .enter()
            .append("image")
            .attr("xlink:href", "assets/pine-tree.png")
            .attr("x", d => projection([+d.Longitude, +d.Latitude])[0])
            .attr("y", d => projection([+d.Longitude, +d.Latitude])[1]-5)
            .attr("width", d=>zScale(parseInt(d.Acres)))
            .attr("height", d=>zScale(parseInt(d.Acres)))
            .on('click', (event, d) => {
                tooltip.style('visibility', 'visible')
                document.getElementById("svg3_header").style.visibility="hidden"
                document.getElementById("svg3-wrapper").style.visibility="hidden"
                document.getElementById("svg2_header").innerHTML = `Species distribution across ${d[PARK_NAME]}`
                document.getElementById("svg2_header").style.visibility = "visible"
                plotSpeciesDistribution(d)
            })
            .on('mouseover', function (event, d) {
                this.classList.toggle('enlarged');
                tooltip.style('visibility', 'visible');

            })
            .on('mousemove', function (event, d) {
                tooltip
                    .style('top', event.pageY - 10 + 'px')
                    .style('left', event.pageX + 10 + 'px')
                    .html(`Park Name: ${d["Park Name"]}`);
            })
            .on('mouseout', function (event, d) {
                this.classList.toggle('enlarged');
                tooltip.style('visibility', 'hidden');

            });
    });
}
const loadParkData = async () => {
    return await loadData(parksData, "Data/archive/parks.csv")
}

const loadSpeciesData = async () => {
    speciesData = await loadData(speciesData, "Data/archive/species.csv")
    speciesData = speciesData.filter(row => {
        const occurrence = row[OCCURRENCE];
        const order = row[ORDER];
        const family = row[FAMILY];
        const category = row[CATEGORY];
        const parkName = row[PARK_NAME];
        const recordStatus = row[RECORD_STATUS]
        return occurrence !== EMPTY_STRING && occurrence === "Present"
            && order !== EMPTY_STRING
            && family !== EMPTY_STRING
            && category !== EMPTY_STRING
            && parkName !== EMPTY_STRING
            && recordStatus !== EMPTY_STRING && recordStatus === "Approved"
    });
}

const loadData = async (data, path) => {
    return d3.csv(path).then(function (csvData) {
        data = csvData;
        return data
    }).catch(function (error) {
        console.error("Error loading the CSV file: ", error);
    });
}


const plotSpeciesDistribution = (park) => {
    const filteredSpeciesData = speciesData.filter(d => d[PARK_NAME] === park[PARK_NAME])
    const {
        attributeToFreqMap: orderAggregateData,
        freqSum: orderFreqSum
    } = getAttributeToFreqMap(ORDER, filteredSpeciesData)
    const {
        attributeToFreqMap: familyAggregateData,
        freqSum: familyFreqSum
    } = getAttributeToFreqMap(FAMILY, filteredSpeciesData)
    const {
        attributeToFreqMap: categoryAggregateData,
        freqSum: categoryFreqSum
    } = getAttributeToFreqMap(CATEGORY, filteredSpeciesData)

    // set the dimensions and margins of the graph
    const width = 400,
        height = 400,
        margin = 0;

    const svg = d3.select("#svg2")
        .attr("width", width)
        .attr("height",  height)
        .append("g")
        .attr("transform", `translate(${0.5* width },${0.5*height })`);

    const color = d3.scaleOrdinal(d3.schemeSet3)
        // .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56"])

// Computed the position of each group on the pie:
    const pie = d3.pie()
        .value(d => d[1])

    const tooltip = getTootTip()

    svg.append("path")
        .attr("id", "wavy") //Unique id of the path
        .attr("d", "M 10,90 Q 100,15 200,70 Q 340,140 400,30") //SVG path
        .style("fill", "none")
        .style("stroke", "#AAAAAA");

    svg
        .selectAll('.familyArc')
        .data(pie(Object.entries(familyAggregateData)))
        .join('path')
        .attr('d', d3.arc()
            .innerRadius(20)
            .outerRadius(60)
        )
        .attr("class", "familyArc")
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("opacity", 1)
        .on('click', (event, d) => {
            tooltip.style('visibility', 'visible')
            const speciesData = getSpecies(park, d, FAMILY, filteredSpeciesData)
            // console.log(speciesData)
            const family =d["data"][0]
            document.getElementById("svg3_header").innerHTML = `<b>Organisms in ${FAMILY} ${family}</b>`
            document.getElementById("svg3_header").style.backgroundColor= color(d.data[0])
            document.getElementById("svg3_header").style.visibility="visible"
            document.getElementById("svg3-wrapper").style.visibility="visible"
        })
        .on('mouseover', function (event, d) {
            tooltip.style('visibility', 'visible');
            d3.select(this)
                .attr("filter", "brightness(50%)")
                .attr('stroke', 'black')
                .attr('stroke-width', 3);
        })
        .on('mousemove', function (event, d) {
            tooltip
                .style('top', event.pageY - 10 + 'px')
                .style('left', event.pageX + 10 + 'px')
                .html(`Family: ${d.data[0]}<br>Percentage: ${(100 * d.data[1] / familyFreqSum).toFixed(2)}`);
        })
        .on('mouseout', function (event, d) {
            tooltip.style('visibility', 'hidden');
            d3.select(this)
                .attr("filter", "brightness(100%)")
                .attr('stroke', 'black')
                .attr('stroke-width', 3)
        })
    ;

    svg
        .selectAll('.orderArc')
        .data(pie(Object.entries(orderAggregateData)))
        .join('path')
        .attr('d', d3.arc()
            .innerRadius(80)
            .outerRadius(120)
        )
        .attr('class', "orderArc")
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)
        .on('click', (event, d) => {
            tooltip.style('visibility', 'visible')
            const orderData = getSpecies(park, d, ORDER, filteredSpeciesData)
            // console.log(orderData)
            document.getElementById("svg3_header").innerHTML = `<b>Organisms in ${ORDER} ${d["data"][0]}</b>`
            document.getElementById("svg3_header").style.backgroundColor= color(d.data[0])
            document.getElementById("svg3_header").style.visibility="visible"
            document.getElementById("svg3-wrapper").style.visibility="visible"
        })
        .on('mouseover', function (event, d) {
            tooltip.style('visibility', 'visible');
            d3.select(this)
                .attr("filter", "brightness(50%)")
                .attr('stroke', 'black')
                .attr('stroke-width', 3);
        })
        .on('mousemove', function (event, d) {
            tooltip
                .style('top', event.pageY - 10 + 'px')
                .style('left', event.pageX + 10 + 'px')
                .html(`Order: ${d.data[0]}<br>Percentage: ${(100 * d.data[1] / orderFreqSum).toFixed(2)}`);
        })
        .on('mouseout', function (event, d) {
            tooltip.style('visibility', 'hidden');
            d3.select(this)
                .attr("filter", "brightness(100%)")
                .attr('stroke', 'black')
                .attr('stroke-width', 3)
        });

    svg
        .selectAll('.categoryArc')
        .data(pie(Object.entries(categoryAggregateData)))
        .join('path')
        .attr('d', d3.arc()
            .innerRadius(140)
            .outerRadius(180)
        )
        .attr('class', "categoryArc")
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)
        .on('click', (event, d) => {
            tooltip.style('visibility', 'visible')
            const categoriesData = getSpecies(park, d, CATEGORY, filteredSpeciesData)
            // console.log(categoriesData)
            document.getElementById("svg3_header").innerHTML = `<b>Organisms in ${CATEGORY} ${d["data"][0]}</b>`
            document.getElementById("svg3_header").style.backgroundColor= color(d.data[0])
            document.getElementById("svg3_header").style.visibility="visible"
            document.getElementById("svg3-wrapper").style.visibility="visible"
        })
        .on('mouseover', function (event, d) {
            tooltip.style('visibility', 'visible');
            d3.select(this)
                .attr("filter", "brightness(50%)")
                .attr('stroke', 'black')
                .attr('stroke-width', 3);
        })
        .on('mousemove', function (event, d) {
            tooltip
                .style('top', event.pageY - 10 + 'px')
                .style('left', event.pageX + 10 + 'px')
                .html(`Category: ${d.data[0]}<br>Percentage: ${(100 * d.data[1] / categoryFreqSum).toFixed(2)}`);
        })
        .on('mouseout', function (event, d) {
            tooltip.style('visibility', 'hidden');
            d3.select(this)
                .attr("filter", "brightness(100%)")
                .attr('stroke', 'black')
                .attr('stroke-width', 3)
        });


    function arcTween(innerRadius, outerRadius) {
        return function(d) {
            const interpolateStartAngle = d3.interpolate(0, d.startAngle);
            const interpolateEndAngle = d3.interpolate(0, d.endAngle);
            return function (t) {
                d.startAngle = interpolateStartAngle(t);
                d.endAngle = interpolateEndAngle(t);
                return d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius)(d);
            };
        };
    }

    svg
        .selectAll('.categoryArc').transition()
        .duration(3000)
        .attrTween("d", arcTween(20, 60));
    svg
        .selectAll('.orderArc').transition()
        .duration(3000)
        .attrTween("d", arcTween(80, 120));
    svg
        .selectAll('.familyArc').transition()
        .duration(3000)
        .attrTween("d", arcTween(140,180));
}

const getAttributeToFreqMap = (attribute, data) => {
    let attributeToFreqMap = {}
    let freqSum = 0
    data.forEach(d => {
        if (d[attribute] in attributeToFreqMap) {
            attributeToFreqMap[d[attribute]] += 1
        } else {
            attributeToFreqMap[d[attribute]] = 1
        }
        freqSum += 1
    })
    return {attributeToFreqMap, freqSum}
}

const getSpecies = (park, d, attribute, data) => {
    let species = new Set();
    data.forEach(row => {
        if (row[attribute] === d["data"] [0]) {
            if (row[COMMON_NAMES] !== "None") {
                for (const element of row[COMMON_NAMES].split(", ")) {
                    species.add(element)
                }
            }
        }
    })
    const outputDiv = document.getElementById("svg3p")
    outputDiv.innerHTML = '';
    species.forEach(element => {
        const div = document.createElement('div');
        div.textContent = element;
        outputDiv.appendChild(div);
    });
    return species
}

const clearTreeMap = () => {
    if (treemapSvg !== null && treemapSvg !== undefined)
        treemapSvg.selectAll('*').remove();
}