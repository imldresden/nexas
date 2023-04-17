import { clearEventListeners, decimals, fill, tooltip } from "./utils.js";
import * as d3 from "https://cdn.skypack.dev/d3@6";

const opacity = {
    default: 0.2,
    highlight: 1
}

const eventListeners = {};
const margin = { top: 20, right: 20, bottom: 70, left: 30 }

// exposed elements of the plot
let svg, where, circles, metadata, data, enabled = document.getElementById("toggleExtensionArgumentInspection").checked;
const facetedToggle = document.getElementById("toggleFacetedExtensionInspection");
const selected = {};
const containment = {};
let ext_highlighted;
let x, y;

function draw(_data, _where) {
    metadata = _data.metadata;
    where = _where;
    const s = document.getElementById("toggleExtensionsPlot").checked;

    data = _data.extensions.map((d, i) => {
        return {
            id: i,
            x: s ? d.x_s : d.x,
            y: s ? d.y_s : d.y,
            s: d["0"] && d["1"] ? "both" : (d["0"] ? metadata["0"] : metadata["1"]),
            si: d["0"] && d["1"] ? 2 : (d["0"] ? 0 : 1),
            c: d.contains
        };
    });
    
    svg = d3.select(where)
        .append("svg")
        .attr("id", where.replace('#', '') + "-svg")
        .append("g")
        .attr("class", "mainG-ev")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);


    function zoomed(e) {
        d3.select(where + " svg g").attr("transform", e.transform);
    }

    d3.select(where + " svg").call(d3.zoom()
        .scaleExtent([-8, 8])
        .on("zoom", zoomed));


    //svg.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x).tickSize(1) );
    //svg.append("g").call(d3.axisLeft(y).tickSize(1));

    //const radius = 10 / ((metadata.n_0 + metadata.n_1) / 1000);
    //console.log(radius)
    // add the scatterplot
    circles = svg
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("id", d => "e" + d.id)
        .style("fill", d => fill(d.si))
        .style("opacity", opacity.default)
        .on("mouseover", mouseover)
        .on("mousemove", tooltip.mousemove)
        .on("mouseleave", mouseleave)
        .on("click", click);

    clearEventListeners(eventListeners);
    document.addEventListener("undo-hl", undoHl);
    document.addEventListener("extension-hl", extensionHl);
    document.addEventListener("filter-direction", toggleClick);
    eventListeners["undo-hl"] = undoHl;
    eventListeners["extension-hl"] = extensionHl;
    eventListeners["filter-direction"] = toggleClick;
    resize();
    d3.select(window).on('resize', resize);
}

function resize() { //todo: manual resize
    // set the dimensions and margins of the graph
    const dim = window.innerWidth / 2 - 150;
    const width = dim - 150 - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

    d3.select(where)
        .style("width", width + margin.left + margin.right + 15 + "px")
        .style("height", height + margin.top + margin.bottom + "px")
    d3.select(where + "-svg")
        .attr("width", width + margin.left + margin.right + 15)
        .attr("height", height + margin.top + margin.bottom)

    svg.select("mainG-ev")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // scales and axes
    x = d3.scaleLinear().range([0, width]);
    y = d3.scaleLinear().range([height, 0]);

    x.domain(d3.extent(data, d => d.x));
    y.domain(d3.extent(data, d => d.y));

    svg.selectAll("circle")
        .attr("transform", d => {
            d.cx = x(d.x);
            d.cy = y(d.y);
            return `translate(${[d.cx, d.cy]})`;
        })
        .attr("r", 4);
};



// linked interactions 
function mouseover(e, d) {
    tooltip.html(
        "semantic(s): " + (d.s)
        + "<br> x: " + d.x.toFixed(decimals) + ", y: " + d.y.toFixed(decimals)
    );
    tooltip.mouseover(d3.select(this), opacity.highlight);
}

function mouseleave(e, d) {
    if (!selected[d.id]) {
        tooltip.mouseleave(d3.select(this), opacity.default);
    } else {
        tooltip.hide();
    }
}

function dispatchHighlight(d) {
    if (selected[d.id]) {
        d.c.forEach(h => {
            containment[h] = containment[h] ? containment[h] + 1 : 1;
        });
    } else {
        d.c.forEach(h => {
            containment[h] -= 1;
            if (!containment[h]) {
                delete containment[h];
            }
        });
    }

    console.log(containment)
    document.dispatchEvent(new CustomEvent('argument-hl', {
        detail: Object.keys(containment) // list of extensions where this argument is contained 
    }));
};

function click(e, d) {
    if (!enabled) {
        return;
    }

    if (facetedToggle.checked) {
        Object.keys(selected).forEach(k => {
            if (k != d.id) {
                const s = selected[k];
                delete selected[k];
                tooltip.mouseleave(s.e, opacity.default);
            }
        });
        Object.keys(containment).forEach(k => {
            delete containment[k];
        });
    }

    if (!selected[d.id]) {
        selected[d.id] = {
            d,
            e: d3.select(this)
        }
        mouseover(e, d);
    } else {
        delete selected[d.id];
        mouseleave(e, d);
    }
    dispatchHighlight(d);
}

function toggleClick(e) {
    const prev = enabled;
    enabled = e.detail.direction === "ext-arg";
    /*if (prev != enabled) {
        circles.attr("class", "");
        undoSelection();
    }*/
}

function undoSelection() {
    Object.keys(selected).forEach(k => {
        delete selected[k];
    });
    circles.style("opacity", opacity.default).style("stroke", "none");
}

function undoHl(e) {
    if (e.detail.has("extensions")) {
        circles.attr("class", "");
        undoSelection();
    }
}

function extensionHl(e) {
    if (document.getElementById("extensions").style.display === "none") {
        return;
    }
    const s = e.detail.containment.map(d => "#e" + d);
    ext_highlighted = e.detail.containment
    if (s.length > 0) {
        console.log(e.detail.style)
        circles.attr("class", e.detail.style ? "faceted" : "grayed");
        console.log("current selection count: " + s.length);
        svg.selectAll(s).attr("class", "");
    } else {
        circles.attr("class", "");
    }
}

// controls in the settings bar settings.spy
function controls() {
    // toggle for the extensions scatterplot
    const extensionsDiv = document.getElementById("extensions");
    const extensionsToggle = document.getElementById("extensionsToggle");
    let extensionsOn = true;
    extensionsToggle.style.backgroundColor = "rgba(0,0,0,0.1)";
    extensionsToggle.addEventListener("click", function () {
        if (extensionsOn) {
            extensionsToggle.style.backgroundColor = "rgba(0,0,0,0)";
            extensionsDiv.style.display = "none";
        } else {
            extensionsToggle.style.backgroundColor = "rgba(0,0,0,0.1)";
            extensionsDiv.style.display = "inline-block";
        }
        extensionsOn = !extensionsOn;
    });
}

function getSelection() {
    let result = "";

    Object.keys(selected).forEach(k => {
        console.log(selected[k])
        result += `${selected[k].d.id}, ${selected[k].d.s}`;
    });

    return result;
}

function getHighlighted() {
    let result = "";
    if (ext_highlighted.length > 0) {
        result += `id, semantic, mca.x, mca.y, mca+semantic_flags.x, mca+semantic_flags.y\n`;
        ext_highlighted.forEach((e, i) => {
            result += `${data[e].id}, ${data[e].s}, ${data[e].x}, ${data[e].y}, ${data[e].cx}, ${data[e].cy}\n`;
        });
    } else if (ext_highlighted.length === 0) {
        result += `no selection available.`
    }

    return result;
}

export { draw, undoHl, extensionHl, controls, getSelection, getHighlighted, resize };