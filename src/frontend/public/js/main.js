import * as controls from './controls.js';
import * as legend from './vis/legend.js';
import * as scatterplot_2D from './vis/2d-scatterplot.js';
import * as barchart from './vis/barchart.js';
import * as correlation from './vis/correlation.js';
import * as d3 from "https://cdn.skypack.dev/d3@6";

const data = {};
const url = new URLSearchParams(window.location.search)
const example = url.get('id') || "output";

async function fetchExtensions() {
    const promiseData = await (
        await fetch(
            //"/query?resource=data" // queries backend api
            "/extensions?example=" + example
        )
    ).json();

    data.extensions = Object.keys(promiseData).map(d => promiseData[d]);
}

async function fetchArguments() {
    data.arguments = await (
        await fetch(
            // "/query?resource=arguments" // queries backend api
            "/arguments?example=" + example
        )
    ).json();
}

async function fetchCorrelation() {
    data.correlation = await (
        await fetch(
            // "/query?resource=correlation" //queries backend api
            "/correlation?example=" + example

        )
    ).json();
}

async function fetchMetadata() {
    data.metadata = await (
        await fetch(
            "/metadata?example=" + example
        )
    ).json();
}

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        fetchMetadata(), fetchArguments(), fetchExtensions(), fetchCorrelation()
    ]);
    

    console.log(data.metadata);

    // settings 
    controls.init();

    // cross-view controls
    document.getElementById("toggleExtensionsPlot").addEventListener("change", function () {
        document.getElementById("extensions").innerHTML = "";
        scatterplot_2D.draw(data, "#extensions");
    });

    const undoSelection = document.getElementById("undo-selection");
    let savedFacetState;

    const toggleArgInspector = document.getElementById("toggleExtensionArgumentInspection");
    const toggleExtensionInspector = document.getElementById("toggleExtensionInspection");
    const facetToggle = document.getElementById("toggleFacetedExtensionInspection");

    toggleArgInspector.addEventListener("click", function () {
        document.dispatchEvent(new CustomEvent("filter-direction", { detail: { direction: toggleArgInspector.checked ? "ext-arg" : "arg-ext" } }));
        toggleExtensionInspector.checked = !toggleArgInspector.checked;

        /*if (this.checked) {
            savedFacetState = facetToggle.checked;
            facetToggle.checked = false;
            document.getElementById("toggleFacetedExtensionInspectionDiv").style.display = "none";
        } else {
            facetToggle.checked = savedFacetState;
            document.getElementById("toggleFacetedExtensionInspectionDiv").style.display = "flex";
        }*/
        if (!facetToggle.checked) {
            undoSelection.click();
        }
    });

    toggleExtensionInspector.addEventListener("click", function () {
        document.dispatchEvent(new CustomEvent("filter-direction", { detail: { direction: toggleExtensionInspector.checked ? "arg-ext" : "ext-arg" } }));
        toggleArgInspector.checked = !toggleExtensionInspector.checked;
        /*if (toggleArgInspector.checked) {
            savedFacetState = facetToggle.checked;
            facetToggle.checked = false;
            document.getElementById("toggleFacetedExtensionInspectionDiv").style.display = "none";
        } else {
            facetToggle.checked = savedFacetState;
            document.getElementById("toggleFacetedExtensionInspectionDiv").style.display = "flex";
        }*/

        if (!facetToggle.checked) {
            undoSelection.click();
        }
    });

    document.getElementById("export-selection").addEventListener("click", function () {
        const dir = toggleExtensionInspector.checked;
        const content = `
Exported selection in the ${dir ? "extension space" : "argument space"}. 

=== Selected ${dir ? "arguments" : "extensions"} === 
${dir ?
                barchart.getSelection()
                : scatterplot_2D.getSelection()}

=== Result of the selection ==== 
${dir ?
                (facetToggle.checked ?
                    barchart.getSelectedExtensions() :
                    scatterplot_2D.getHighlighted())
                : barchart.getHighlighted()}
        `
        console.log(content)

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8, ' + encodeURIComponent(content));
        element.setAttribute('download', 'selection.txt');
        //document.body.appendChild(element);
        element.click();
        element.remove();
    });

    document.getElementById("showSettingsMenuButton").click();

    //// new project 
    let file;
    document.getElementById("browseButton").addEventListener("change", function (event) {
        file = event.target.files[0];
    });

    document.getElementById("go-project").addEventListener("click", function () {
        const formData = new FormData();
        const id = document.getElementById('_id').value;
        const n = document.getElementById('_n_solutions').value;
        const sem_A = document.getElementById('_semantic-a').value;
        const sem_B = document.getElementById('_semantic-b').value;
        const route = document.getElementById('_route').value;

        formData.append('id', id);
        formData.append('file', file);
        formData.append('n', n);
        formData.append('sem_a', sem_A);
        formData.append('sem_b', sem_B);
        formData.append('route', route);

        fetch('/create', {
            method: 'POST',
            body: formData
        }).then((e) => {
            console.log(e)
            document.getElementById("loading").style.display = "inline-block";
            waitForResult(id);
        }).catch(error => {
            console.error('Error:', error);
        });

    });

    
    // main
    if (data.metadata.status && data.metadata.status === 'unavailable') {
        return; 
    }

    let filenameapx = data.metadata.apx_input.split('/');
    filenameapx = filenameapx[filenameapx.length-1].split('\\');
    document.getElementById("inputFileAF").innerHTML = filenameapx[filenameapx.length-1];
    legend.draw(data);

    // vis
    barchart.draw(data, "#arguments");
    scatterplot_2D.draw(data, "#extensions");
    correlation.draw(data, "#correlation");

    d3.select(window).on('resize', ()=> {
        barchart.resize();
        scatterplot_2D.resize();
        correlation.resize();
    });
});


function waitForResult(id) {
    let interval;
    const loader = document.getElementById("loading");
    

    interval = setInterval(() => {    
        fetch('/get?id=' + id, {
            method: 'GET',
        }).then(async (e) => {
            const status = await e.json();
            if (status === 'ready') {
                window.location.replace('/?id=' + id);   
            }
        }).catch(error => {
            console.error('Error:', error);
            clearInterval(interval);
            loader.style.display = "none";
        });
    }, 2000);
}