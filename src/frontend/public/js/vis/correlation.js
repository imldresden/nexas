import { clearEventListeners, decimals, separateTicks, tooltip } from "./utils.js";
import * as d3 from "https://cdn.skypack.dev/d3@6";
import { colorLinear, mainColors } from "./colors.js";

const opacity = {
    default: 1,
    highlight: 1
}

// exposed elements of the vis
const tag = "NaN";
let where, svg, squares;
let data, metadata, args;
let x, y, z;
let xValues, yValues, zValues;
const eventListeners = {};

const margin = { top: 20, right: 0, bottom: 70, left: 30 }

function draw(_data, _where) {
    metadata = _data.metadata;
    args = _data.arguments;
    data = _data.correlation;
    where = _where;

    // append the svg object to the body of the page
    svg = d3.select(where)
        .append("svg")
        .attr("id", where.replace('#', '') + "-svg")
        .append("g")
        .attr("class", "mainG-cv")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // labels of row and columns
    const set = new Set();
    const _corrs = new Set();
    data.corrs = [];

    function tagInf(n) {
        return n == null ? tag : n;
    }

    data.corrs_0.forEach((d, i) => {
        const sym = data.corrs_1[i];

        const a_c = tagInf(d[2]);
        const b_c = tagInf(sym[2]);

        const a = {
            x: d[0], y: d[1], z: a_c,
            sym: b_c, sem: metadata["0"],
            isup: true
        };
        const b = {
            x: sym[0], y: sym[1], z: b_c,
            sym: a_c, sem: metadata["1"],
            isup: false
        };

        if ((a.z === tag && b.z === tag)) {
            // return; // ignore pairs where both are /0
        }

        set.add(d[0]);

        if (_corrs.has(d[1] + "" + d[0])) {
            data.corrs.push(b);
        } else {
            _corrs.add(d[0] + "" + d[1]);
            data.corrs.push(a);
        }
    });

    xValues = Object.keys(args).reverse(); // si the same as Array.from(set).reverse();
    yValues = xValues;
    zValues = data.corrs.map(d => d.z)//.filter(d => d != tag);

    const color = colorLinear(d3.extent(zValues));

    // add the squares
    squares = svg.selectAll()
        .data(data.corrs, d => d.x + ':' + d.y)
        .enter()
        .append("rect")
        .attr("id", d => d.x + "" + d.y)
        .attr("class", d => "corr arg_" + d.x + " arg_" + d.y)
        .style("fill", d => {
            if (d.x == d.y) { return "#f0f0f0"; }
            if (d.z == tag) { return "white"; }
            return color(d.z);
        })
        .style("opacity", opacity.default)
        .on("mouseover", mouseover)
        .on("mousemove", tooltip.mousemove)
        .on("mouseleave", mouseleave)

    function mouseover(e, d) {
        if (d.x == d.y) {
            return;
        }

        function otherSemantic(sem) {
            return sem === metadata["0"] ? metadata["1"] : metadata["0"]
        }

        function exp(v) {
            return (v !== tag ? v.toExponential(decimals) : v)
        }

        let corr, other_corr, x, y, sem, other_sem;
        if (d.isup) {
            corr = d.z;
            other_corr = d.sym;
            x = d.x;
            y = d.y;
            sem = d.sem;
            other_sem = otherSemantic(d.sem);
        } else {
            corr = d.sym;
            other_corr = d.z;
            x = d.y;
            y = d.x;
            sem = otherSemantic(d.sem);
            other_sem = d.sem;
        }

        tooltip.html(
            "semantic: " + sem +
            "<br>corr " + x + " & " + y + ":<br>" + exp(corr) +
            "<hr>" +
            "semantic: " + other_sem +
            "<br>corr " + y + " & " + x + ":<br>" + exp(other_corr)
        );
        tooltip.mouseover(d3.select("#" + d.x + "" + d.y), d, opacity.highlight);
        tooltip.mouseover(d3.select("#" + d.y + "" + d.x), d, opacity.highlight);
    }

    function mouseleave(e, d) {
        function leave(a) {
            tooltip.mouseleave(a, opacity.default);
        }
        leave(d3.select("#" + d.x + "" + d.y));
        leave(d3.select("#" + d.y + "" + d.x));
    }

    clearEventListeners(eventListeners);
    document.addEventListener("cross-hl", crossHL);
    document.addEventListener("undo-hl", clearSelection);
    eventListeners["cross-hl"] = crossHL;
    eventListeners["undo-hl"] = clearSelection;
    resize();
}

function drawLines(width, height) {
    svg.select(".utl1").remove();
    svg.select(".utl2").remove();
    svg.select(".utl3").remove();
    svg.select(".dtl1").remove();
    svg.select(".dtl2").remove();
    svg.select(".dtl3").remove();

    const offset = 1.5;

    svg.append("line")
        .style("stroke", mainColors[0])
        .attr("class", "triangular-matrix utl1")
        .attr("x1", -offset).attr("y1", height - offset)
        .attr("x2", width - offset).attr("y2", -offset);

    svg.append("line")
        .style("stroke", mainColors[0])
        .attr("class", "triangular-matrix utl2")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", 0).attr("y2", height);

    svg.append("line")
        .style("stroke", mainColors[0])
        .attr("class", "triangular-matrix utl3")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", width).attr("y2", 0);

    svg.append("line")
        .style("stroke", mainColors[1])
        .attr("class", "triangular-matrix dtl1")
        .attr("x1", offset).attr("y1", height + offset)
        .attr("x2", width + offset).attr("y2", offset);

    svg.append("line")
        .style("stroke", mainColors[1])
        .attr("class", "triangular-matrix dtl2")
        .attr("x1", 0).attr("y1", height)
        .attr("x2", width).attr("y2", height);

    svg.append("line")
        .style("stroke", mainColors[1])
        .attr("class", "triangular-matrix dtl3")
        .attr("x1", width).attr("y1", 0)
        .attr("x2", width).attr("y2", height);

}

function resize() { //todo: manual resize
    // set the dimensions and margins of the graph
    const dim = window.innerWidth / 2 - 150;
    const width = dim - 150 - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

    d3.select(where)
        .style("width", width + margin.left + margin.right + 15 + "px")
        .style("height", height + margin.top + margin.bottom + "px")
    d3.select(where+"-svg")
        .attr("width", width + margin.left + margin.right + 15)
        .attr("height", height + margin.top + margin.bottom)

    svg.select("mainG-cv")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // build scales and axes:
    svg.select(".x.axis").remove();
    x = d3.scaleBand()
        .range([0, width])
        .domain(xValues)
        .padding(0.01);
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3
            .axisBottom(x)
            .tickFormat((t, i) => separateTicks(t, i, xValues.length, width, 80))
            .tickSize(1)
        );

    svg.select(".y.axis").remove();
    y = d3.scaleBand()
        .range([height, 0])
        .domain(yValues)
        .padding(0.01);
    svg.append("g")
        .attr("class", "y axis")
        .call(d3
            .axisLeft(y)
            .tickFormat((t, i) => separateTicks(t, i, yValues.length, height, 30))
            .tickSize(1)
        );

    drawLines(width, height);
    // size the squares
    squares = svg.selectAll("rect.corr")
        .attr("x", d => x(d.x))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.y))
        .attr("height", y.bandwidth())

    const offset = 1.5;
    svg.select("utl1")
        .attr("x1", -offset).attr("y1", height - offset)
        .attr("x2", width - offset).attr("y2", -offset);

    svg.select("utl2")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", 0).attr("y2", height);

    svg.select("utl3")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", width).attr("y2", 0);

    svg.select("dtl1")
        .attr("x1", offset).attr("y1", height + offset)
        .attr("x2", width + offset).attr("y2", offset);

    svg.select("dtl2")
        .attr("x1", 0).attr("y1", height)
        .attr("x2", width).attr("y2", height);

    svg.select("dtl3")
        .attr("x1", width).attr("y1", 0)
        .attr("x2", width).attr("y2", height);
};



// linked interactions 
function clearSelection(e) {
    if (!e || e.detail.has("correlation")) {
        squares.style("opacity", opacity.default).style("stroke", "none");
        squares.classed("highlighted", false);
    }
}

function crossHL(e) {
    clearSelection();
    // new selection
    const selection = svg.selectAll(e.detail.map(d => ".arg_" + d))
    selection.classed("highlighted", true)
    //tooltip.mouseover(selection);
}

// controls in the settings bar settings.spy
function controls() {
    // toggle for the correlation matrix
    const correlationDiv = document.getElementById("correlation");
    const correlationToggle = document.getElementById("correlationToggle");
    correlationDiv.style.display = "none";
    let correlationOn = false;
    correlationToggle.addEventListener("click", function () {
        if (correlationOn) {
            correlationToggle.style.backgroundColor = "rgba(0,0,0,0)";
            correlationDiv.style.display = "none";
        } else {
            correlationToggle.style.backgroundColor = "rgba(0,0,0,0.1)"
            correlationDiv.style.display = "inline-block";
        }
        correlationOn = !correlationOn;
    });
}

export { draw, crossHL, controls, resize };