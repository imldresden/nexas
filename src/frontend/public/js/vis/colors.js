import * as d3 from "https://cdn.skypack.dev/d3@6";

const mainColors = [
    "#F4CE85", //"#F4CE85", //"#af8dc3", 
    "#91bfdb", //"#7fbf7b", 
    "#B7BF7A", 
    "#e78ac3", 
    "#a6d854",
    "#ffd92f",
    "#e5c494",
    "#b3b3b3",
]

const grayScale = [
    "#f0f0f0",
    "#bdbdbd",
    "#636363",
];

const colorLinear = function(values) {
    return d3.scaleSequential()
        .interpolator(d3.piecewise(d3.interpolateRgb.gamma(1.8), [
            "#af8dc3",// "#8D97FC", 
            //"#c15770", 
            "#fafafa", 
            //"#a6c16a", 
            "#7fbf7b"// "#FA8C82" 
        ]))
        .domain(values)
}

export { mainColors, grayScale, colorLinear };