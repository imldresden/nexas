import { mainColors, colorLinear } from "./colors.js";
import * as d3 from "https://cdn.skypack.dev/d3@6";

function draw(data) {
    document.getElementById("legend").innerHTML = "";

    const metadata = data.metadata;
    const legend = d3.select("#legend").append("svg").attr("width", 500).attr("height", 90)

    let cursor = 20
    legend.append("text").attr("x", 0).attr("y", cursor)
        .text("Color Legend for Semantics:");

    legend.append("circle").attr("cx", 50).attr("cy", cursor + 20)
        .attr("r", 6).style("fill", mainColors[0]);
    legend.append("circle").attr("cx", 50).attr("cy", cursor + 40)
        .attr("r", 6).style("fill", mainColors[1]);
    legend.append("circle").attr("cx", 50).attr("cy", cursor + 60)
        .attr("r", 6).style("fill", mainColors[2]);


    legend.append("rect").attr("x", 15).attr("y", cursor + 15)
        .attr("width", 25)
        .attr("height", 10)
        .style("fill", mainColors[0]);
    legend.append("rect").attr("x", 15).attr("y", cursor + 35)
        .attr("width", 25)
        .attr("height", 10)
        .style("fill", mainColors[1]);
    legend.append("rect").attr("x", 15).attr("y", cursor + 55)
        .attr("width", 25)
        .attr("height", 10)
        .style("fill", "url(#stripes)");
    /*
        .attr("x1", 40)
        .attr("y1", cursor + 60)
        .attr("x2", 60)
        .attr("y2", cursor + 80)
    */

    const weight = "400"
    legend.append("text").attr("x", 65).attr("y", cursor + 25)
        .text(metadata["0"])
        .style("font-size", "15px")
        .style("font-weight", weight);
    legend.append("text").attr("x", 65).attr("y", cursor + 45)
        .text(metadata["1"])
        .style("font-size", "15px")
        .style("font-weight", weight);
    legend.append("text").attr("x", 65).attr("y", cursor + 66)
        .text("intersection")
        .style("font-size", "15px")
        .style("font-weight", weight);

    legend.append("text").attr("x", 185).attr("y", cursor + 25)
        .text(metadata["n_0"] + " extensions")
        .style("font-size", "15px");
    legend.append("text").attr("x", 185).attr("y", cursor + 45)
        .text(metadata["n_1"] + " extensions")
        .style("font-size", "15px");
    legend.append("text").attr("x", 185).attr("y", cursor + 66)
        .text(metadata["n_01"] + " extensions")
        .style("font-size", "15px");

    // append a defs (for definition) element to your SVG
    const legendLinear = d3.select('#legend').append('svg').attr("width", 500).attr("height", 80);
    const defs = legendLinear.append('defs');
    const linearGradient = defs.append('linearGradient').attr('id', 'linear-gradient');

    // horizontal gradient
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    const color = colorLinear([-1, 1]);

    // append multiple color stops by using D3's data/enter step
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: color(-1) },
            { offset: "10%", color: color(-0.8) },
            { offset: "20%", color: color(-0.6) },
            { offset: "30%", color: color(-0.4) },
            { offset: "40%", color: color(-0.2) },
            { offset: "50%", color: color(0) },
            { offset: "60%", color: color(0.2) },
            { offset: "70%", color: color(0.4) },
            { offset: "80%", color: color(0.6) },
            { offset: "90%", color: color(0.8) },
            { offset: "100%", color: color(1) }
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    legendLinear.append("text").attr("x", 0).attr("y", 26)
        .text("Color Legend for Correlation:");

    // draw the rectangle and fill with gradient
    legendLinear.append("rect").attr("x", 20).attr("y", 40)
        .attr("width", 280)
        .attr("height", 15)
        .style("fill", "url(#linear-gradient)");

    //create tick marks
    const scale = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, 280]);

    legendLinear
        .attr("class", "axis")
        .append("g")
        .attr("transform", "translate(20, 60)")
        .call(d3.axisBottom(scale).ticks(6));
}

export { draw };
