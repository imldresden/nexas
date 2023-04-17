import { grayScale, mainColors } from "./colors.js";
import * as d3 from "https://cdn.skypack.dev/d3@6";

function separateTicks(t, i, length, dim, separation = 1) {

    let skip = Math.round((length * separation) / (dim * 2));
    skip = Math.max(1, skip);
    return (i % skip === 0) ? t : null;
}

const decimals = 3;

const percentage = n => {
    const perc = n * 100;
    return (Number.isInteger(perc)) ? perc : perc.toFixed(decimals);
}

// tooltip for mouse events
const _tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("display", "none") // only visible on mouseover/hover
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("padding", "5px")

const tooltip = {
    html: function (html) {
        _tooltip.html(html)
    },
    mouseover: function (e, d, opacity) {
        _tooltip
            .style("display", "inline-block")
        e.classed("highlighted-hovered", true)
            .style("opacity", opacity);
    },
    mousemove: function (e) {
        _tooltip
            .style("left", (e.pageX + 30) + "px")
            .style("top", (e.pageY - 80) + "px")
    },
    mouseleave: function (e, opacity) {
        _tooltip
            .style("display", "none")
        e.classed("highlighted-hovered", false)
            .style("opacity", opacity);
    }, 
    hide: function () {
        _tooltip.style("display", "none")
    }
}

const fill = d3.scaleQuantile()
    .domain([0, 8]) // clusters
    .range(mainColors);

function clearEventListeners(els) {
    Object.keys(els).forEach(k => {
        document.removeEventListener(k, els[k]);
    });
}


export { separateTicks, percentage, clearEventListeners, fill, decimals, tooltip };