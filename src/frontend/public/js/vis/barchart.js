import { mainColors } from "./colors.js";
import { percentage, tooltip, separateTicks } from "./utils.js";
import * as _correlation from "./correlation.js";
import * as d3 from "https://cdn.skypack.dev/d3@6";

const opacity = {
    default: 0.9,
    highlight: 1
}

// exposed elements of the plot
let where, svg, base, stacks, data, datamap = {}, enabled = document.getElementById("toggleExtensionInspection").checked;
let x, y;
let metadata, extensions = [];
const selected = {}; // captures normal navigation and faceted activations 
const containment = {};
let args_highlighted = [];

const facetedToggle = document.getElementById("toggleFacetedExtensionInspection");
const margin = { top: 20, right: 20, bottom: 70, left: 30 };

function draw(_data, _where) {
    where = _where;
    data = _data;
    metadata = data.metadata;
    data.extensions.forEach((e, i) => {
        e.id = i;
        e.contains = new Set(e.contains);
        extensions.push(e);
    });

    data = Object.keys(data.arguments).map(k => {
        const d = data.arguments[k];
        d.a = k;
        d.details = [];
        let start = 0;
        d.freqs.forEach((f, i) => {
            d.details.push({ start: start, end: start + f, name: k, id: d.id })
            start += f;
            d.total = start;
        });
        d.contained_in = new Set(d.contained_in);
        d.details.splice(0, 0, { start: 0, end: start, name: k, id: d.id });
        return d;
    });

    data.forEach(d => {
        datamap[d.id] = d.a;
    });

    // append the svg object to the body of the page
    svg = d3.select(where)
        .append("svg")
        .attr("id", where.replace('#', '') + "-svg")
        .append("g")
        .attr("class", "mainG-av")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // bars
    base = svg.selectAll("bar")
        .data(data)
        .enter().append("g")
        .style("opacity", opacity.default)
        .attr("id", d => "a" + d.id)
        .on("mouseover", mouseover)
        .on("mousemove", tooltip.mousemove)
        .on("mouseleave", mouseleave)
        .on("click", click);

    // stacks
    stacks = base.selectAll("rect")
        .data(d => d.details)
        .enter()
        .append("rect")
        .style("fill", function (d, i) {
            if (i == 0) {
                return "white";
            }
            return i == 3 ? "url(#stripes)" : mainColors[i - 1];
        })
        .style("opacity", function (d, i) {
            return i == 3 ? opacity.default / 4 : opacity.default
        });

    document.addEventListener("undo-hl", undoHl);
    document.addEventListener("argument-hl", argumentHl);
    document.addEventListener("filter-direction", toggleClick);
    facetedToggle.addEventListener("change", function () {
        document.getElementById("undo-selection").click();
        if (facetedToggle.checked) {
            initFacets();
        }
    });

    if (facetedToggle.checked) {
        initFacets();
    }
    resize();

}

function resize() { //todo: manual resize
    // set the dimensions and margins of the graph
    const width = 200 - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

    d3.select(where)
        .style("width", width + margin.left + margin.right + "px")
        .style("height", height + margin.top + margin.bottom + "px")
    d3.select(where + "-svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

    svg.select("mainG-av")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // scales and axes
    const labels = data.map(d => d.a);
    x = d3.scaleLinear()
        .range([0, width])
        .domain([0, 2]);
    svg.select(".x.axis").remove();
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3
            .axisBottom(x)
            .tickFormat((t, i) => {
                const v = separateTicks(percentage(t), i, data.length, width, 20)
                if (v == 0) {
                    return "100%";
                } else if (v == 100) {
                    return "0%";
                } else if (v == 200) {
                    return "100%";
                }
            })
            .tickSize(1)
        );


    y = d3.scaleBand()
        .range([0, height])
        .domain(labels);
    svg.select(".y.axis").remove();
    svg.append("g")
        .attr("class", "y axis")
        .call(d3
            .axisLeft(y)
            .tickFormat((t, i) => separateTicks(t, i, labels.length, height, 30))
            .tickSize(1)
        );
    svg.select(".split.axis").remove();
    svg.append("g")
        .attr("class", "split axis")
        .attr("transform", `translate(${width / 2}, 0)`)
        .call(d3
            .axisLeft(y)
            .tickFormat((t, i) => null)
            .tickSize(0)
        );

    base.selectAll("rect")
        .attr("y", (d, i) => {
            return y(d.name)
        }) //argument
        .attr("height", function (d, i) {
            return y.bandwidth()
        })
        .attr("x", function (d, i) {
            if (i == 0) {
                return 0;
            }
            if (i == 1) {
                return width / 2 - x(d.end)
            } else if (i == 2) {
                return width / 2;
            } else {
                return width / 2 - (x(d.end) - x(d.start));
            }
        })
        .attr("width", function (d, i) {
            const pr = x(d.end) - x(d.start);
            if (i == 0) {
                return width;
            }
            return i == 3 ? pr * 2 : pr
        });
};



// linked interactions 
let to; // hack to speed up ui
function mouseover(e, d, style) {
    if (to) {
        clearTimeout(to)
    }

    let facet = "";
    if (facetedToggle.checked && selected[d.id]) {
        facet = `facet ${selected[d.id].v ? "excluded" : "included"} <br>`;
    }

    tooltip.html(
        d.a + " acceptance: <hr>" +
        facet +
        metadata["0"] + ": "
        + percentage(d.freqs[0]) + "% " +
        "<br>" + metadata["1"] + ": "
        + percentage(d.freqs[1]) + "% " +
        "<br>" + "in both: "
        + percentage(d.freqs[2]) + "% "
    );

    tooltip.mouseover(d3.select("#a" + d.id), opacity.highlight);
    to = setTimeout(function () {
        _correlation.crossHL({ detail: [d.a] });
    }, 20);
    //document.dispatchEvent(new CustomEvent('cross-hl', { detail: [d.a] }));
}

function mouseleave(e, d) {
    if (!selected[d.id]) {
        tooltip.mouseleave(d3.select("#a" + d.id), opacity.default);
    } else {
        tooltip.hide();
    }
}

async function dispatchHighlight(d) {
    if (selected[d.id]) {
        d.contained_in.forEach(h => {
            containment[h] = containment[h] ? containment[h] + 1 : 1;
        });
    } else {
        d.contained_in.forEach(h => {
            containment[h] -= 1;
            if (!containment[h]) {
                delete containment[h];
            }
        });
    }

    document.dispatchEvent(new CustomEvent('extension-hl', {
        detail: { containment: Object.keys(containment) } // list of extensions where this argument is contained 
    }));
};

let state = [];
let latest = 0;

async function initFacets() {
    const notFacets = {}, facets = {};
    latest = 0;
    state = [];
    const count = extensions.length;
    data.forEach(a => {
        if (count === a.contained_in.size || a.contained_in.size === 0) {
            // if all extensions would be removed or no extensions would be removed
            notFacets[a.a] = a;
        } else {
            facets[a.a] = a;
        }
    });

    state.push({
        id: "init", d: {}, v: "n/a", notFacets, facets, ext: new Set(Object.keys(extensions).map(n => +n)), count
    });
    assertFacets();
}

Set.prototype.filter = function filter(f) {
    var newSet = new Set();
    for (var v of this) {
        if (f(v)) {
            newSet.add(v);
        }
    }
    return newSet;
};

async function assertFacets(d, ctrl, adding) {
    let res, undoing = false;
    if (d) { // implies user selection
        // undo selection until a certain state
        if (!adding) { // deactivating
            undoing = true;
            let _i = Infinity;

            state.forEach((e, i) => {
                //console.log(e)
                if (e.id === d.a) {
                    _i = i;
                }

                const _s = selected[e.d.id];
                if (_s) {
                    if (_i <= i) {
                        delete selected[e.d.id];
                        mouseleave(null, _s.d);
                    } else {
                        mouseover(null, _s.d, _s.v);
                    }
                }
            });

            latest = _i - 1;
            state = state.splice(0, _i);
        }

        // determine resulting set
        if (undoing) {
            res = state[latest].ext;
        } else {
            if (ctrl) {
                console.log("negatively activating facet: ")
                console.log(d)
                console.log("--")
                res = state[latest].ext.filter(n => !state[latest].facets[d.a].contained_in.has(n));
            } else {
                console.log("positively activating facet: ")
                console.log(d)
                console.log("--")
                res = state[latest].facets[d.a].contained_in;
            }
        }

        // compute next facets / not-facets
        if (!undoing) {
            const count = res.size;

            const facets = {}, notFacets = structuredClone(state[latest].notFacets);
            // propagate solution space to other facets
            const pFacets = structuredClone(state[latest].facets)
            Object.keys(pFacets).forEach(k => {
                const a = pFacets[k];
                a.contained_in = a.contained_in.filter(e => res.has(e));

                if (a.contained_in.size === 0 || a.contained_in.size === res.size) {
                    notFacets[a.a] = a;
                } else {
                    facets[a.a] = a;
                }
            });

            state.push({ id: d.a, d: d, v: ctrl ? "negative" : "positive", notFacets, facets, ext: res, count });
            latest += 1;
        }
    }

    // disable not-facets
    disableNotFacets();

    return res;
}

function disableNotFacets() {
    const finalNotFacets = structuredClone(state[latest].notFacets);
    const d = state[latest].d;
    let s = [
        Object.keys(finalNotFacets).filter(k => {
            let stays = true;
            if (d.a && d.a === finalNotFacets[k].a) {
                return false;
            }
            state.forEach(e => {
                if (e.id === finalNotFacets[k].a) {
                    stays = false;
                }
            });
            return stays;
        }).map(e => "#a" + finalNotFacets[e].id + " rect")
    ].toString();

    while (s[s.length - 1] === ",") {
        s = s.slice(0, s.length - 1);
    }

    if (s !== "") {
        base.selectAll("rect").attr("class", "");
        base.selectAll(s).attr("class", "disabled");
    }
}

async function dispatchFacetedHighlight(d, ctrl, aor) {
    const res = await assertFacets(d, ctrl, aor);

    const _containment = Array.from(res);
    console.log("current extensions: " + _containment.length)

    document.dispatchEvent(new CustomEvent('extension-hl', {
        detail: {
            containment: _containment, // list of extensions where this argument is contained 
            style: 'facet'
        }
    }));
};

function facetedClick(e, d) {
    const ctrl = (e.ctrlKey || e.metaKey);
    const adding = !selected[d.id];
    if (adding) {
        selected[d.id] = {
            d,
            e: d3.select(this),
            v: ctrl
        }
        mouseover(e, d, ctrl);
    } else {
        mouseleave(e, d);
    }
    dispatchFacetedHighlight(d, ctrl, adding);
}

function normalClick(e, d) {
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

function click(e, d) {
    if (!enabled) {
        return;
    }

    if (!facetedToggle.checked) {
        normalClick(e, d);
    } else {
        facetedClick(e, d);
    }
}

function toggleClick(e) {
    const prev = enabled;
    enabled = e.detail.direction === "arg-ext"
    /*if (prev != enabled) {
        stacks.attr("class", "");
        undoSelection();
    }*/
}

function deselectAll() {
    Object.keys(selected).forEach(k => {
        mouseleave(null, selected[k].d);
        delete selected[k];
    });
    base.attr("class", "");
    base.selectAll("rect").attr("class", "");
    base.style("opacity", opacity.default).style("stroke", "none");
}

function undoSelection() {
    deselectAll();
    if (facetedToggle.checked) {
        initFacets();
    }
}

function undoHl(e) {
    if (e.detail.has("arguments")) {
        stacks.attr("class", "");
        undoSelection();
    }
}

function argumentHl(e) {
    let deets = e.detail;
    let stc;
    /*if (facetedToggle.checked) {
        deets = deets.filter(d => !state[latest].notFacets[datamap[+d]])
        stc = stacks.filter((d, i) => i != 0 && !state[latest].notFacets[datamap[+d.id]]);
    } else {
        stc = stacks.filter((d, i) => i != 0);
    }*/

    stc = stacks.filter((d, i) => i != 0);

    args_highlighted = deets; // save copy of current highlights

    const s = deets.map(d => "#a" + d + " rect");
    if (s.length > 0) {
        stc.attr("class", "grayed");
        console.log("current selection count: " + s.length);
        // base.selectAll(s).classed("grayed", false);
        base.selectAll(s).attr("class", "")
    } else {
        stc.attr("class", "");
        if (facetedToggle.checked) {
            disableNotFacets();
        }
    }
}

// controls in the settings bar settings.spy
function controls() {
    // toggle for the arguments
    const argumentsDiv = document.getElementById("arguments");
    const argumentsToggle = document.getElementById("argumentsToggle");
    let argumentsOn = true;
    argumentsToggle.style.backgroundColor = "rgba(0,0,0,0.1)";
    argumentsToggle.addEventListener("click", function () {
        if (argumentsOn) {
            argumentsToggle.style.backgroundColor = "rgba(0,0,0,0)";
            argumentsDiv.style.display = "none";
        } else {
            argumentsToggle.style.backgroundColor = "rgba(0,0,0,0.1)"
            argumentsDiv.style.display = "inline-block";
        }
        argumentsOn = !argumentsOn;
    });
}

function getSelection() {
    let result = "";
    if (facetedToggle.checked) {
        result += "step, argument, facet value, remaining facet amount, remaining facets\n"
        state.forEach((d, i) => {
            console.log(d)
            const remainingFacets = Object.keys(d.facets);
            result += `${i}, ${i == 0 ? "initial state" : d.id}, ${d.v}, ${remainingFacets.length}, [${remainingFacets}]\n`;
        });
    } else {
        Object.keys(selected).forEach(k => {
            result += `${selected[k].d.a}\n`;
        });
    }
    return result;
}

function getHighlighted() {
    let result = ""
    console.log(args_highlighted)
    console.log(data)
    if (args_highlighted.length > 0) {
        result += `arg, relative.freq.${metadata["0"]}, relative.freq.${metadata["1"]}, relative.freq.intersection\n`;
        data.filter(d => args_highlighted.includes("" + d.id)).forEach(d => {
            result += `${d.a}, ${d.freqs[0]}, ${d.freqs[1]}, ${d.freqs[2]}\n`;
        });
    }

    return result;
}

function getSelectedExtensions() {
    let result = ""
    if (facetedToggle.checked) {
        result += `Total extensions: ${state[latest].ext.size}\n`
        result += "id, arguments length, arguments list\n"
        extensions.forEach((e, i) => {
            if (state[latest].ext.has(i)) {
                //console.log(e)
                const printArgs = data.filter(a => e.contains.has(a.id)).map(a => a.a)
                result += `${i}, ${printArgs.length}, [${printArgs}]\n`;
            }
        });
    } else {
        console.log(args_highlighted)
        console.error("wtf no")
    }
    return result;
}

export { draw, argumentHl, undoHl, controls, getSelection, getHighlighted, getSelectedExtensions, resize };

