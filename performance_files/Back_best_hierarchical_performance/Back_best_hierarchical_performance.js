console.log("Starting main script...")

// Setting up json data
var jsonRoot = "/js/hierarchical_visualisation_2"
//var jsonRoot = "./"
var normFac = 90
var fontSize = 10
var lineSpace = 2
var boxHeight = 60
var boxWidth = 130
var infoBoxHeight = boxHeight*4.5
var infoBoxWidth = boxWidth*4.5
var width = 960
var height = 1000

var yscale_performancebar = d3.scale.linear()
                                .domain([0,1])
                                .rangeRound([boxHeight/2,-boxHeight/2])

function comparator(a,b){
	// Order nodes alphabetically
	return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}
function separation(a, b) {
	  return (a.parent == b.parent ? 1 : 2);
	}
                                
var tree = d3.layout.tree()
    .size([height, width - 160])
	.sort(comparator)
	.separation(separation)

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(80,0)");

//update('back_datos.json')
update('back_datos.json')

function update(fileName) {
    var jsonPath = [jsonRoot, fileName].join("/")

    // Load a json file, and perform the following function when it loads
    console.log('Loading json file: '.concat(jsonPath))
    d3.json(jsonPath, function(error, root) {

        var nodes = tree.nodes(root),
            links = tree.links(nodes);

	    //DATA JOIN: Bind existing objects to new data
        var existingLinks = svg.selectAll(".link")
    		                     .data(links)
        var existingNodes = svg.selectAll(".node")
                                .data(nodes)
        var totalInst = d3.sum(root.children.map(function(d){return d.params.nKPsForThisNode}))
        normFac = 1*totalInst/boxHeight

        //UPDATE: Update old elements (before making new ones)

        //ENTER: Create new objects where necessary
        existingLinks.enter().append("path")
            .attr("class", "link")
            .attr("d", diagonal)

        // Create a box for each classification node, and assign properties
        newNodes = existingNodes.enter().append("g")
        newNodes
            .attr("class", "node")
            .attr("id", function(d){console.log(d.name);return d.name})
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
            .append("rect")
                .attr('class', 'nodebox')
                .attr("x", -boxWidth/2)
                .attr("y", -boxHeight/2)
                .attr("width", boxWidth)
                .attr("height", boxHeight)
        newNodes.append("rect")
            .attr('id', 'performancebar')
            .attr("x", boxWidth/2*1.05)
            .attr("width", boxWidth/10)
            .style("fill", "red")
            .style("stroke", "red")
            .attr("y", boxHeight/2)
            .attr("height", 0)

        //Add text to nodes for title, f1-score and confusion matrix
        newNodes.append("text")
            .attr("id", "nodetitle")
            .attr("class", "nodeTitle")
            .attr("y", -boxHeight/2 + fontSize + 2*lineSpace)
            .attr("text-anchor", "middle")

        newNodes.append("text")
            .attr("text-anchor", "middle")
            .attr("class", "nodeText")
            .attr("id", "f1Text")
            .attr("y", -boxHeight/2 + 2*fontSize + 4*lineSpace)

        newNodes.append("g")
            .attr("class", "confusionmatrix")
            .attr("id", "confusionmatrix")
            .selectAll("g").data(function(d){return d.params.confusionmatrix})
            .enter().append("g")
            .attr("class", "rows")
            .attr("transform", function(d,i) { return "translate(0," + (-boxHeight/2 + (i+4)*fontSize+(i+2)*lineSpace) + ")"; })
            .selectAll("g").data(function(d){return d})
            .enter().append("g")
            .attr("class", "columns")
            .attr("transform", function(d,i) { return "translate(" + i*3*fontSize + ",0)"; })
            .append("text")
            .attr("text-anchor", "middle")
            .attr("class", "nodeText")

        //ENTER + UPDATE: Update all nodes with new attributes (text, edge width)
        existingNodes.select('#performancebar')
            .transition()
            .duration(1000)
            .attr("y", function(d){
                            return yscale_performancebar(d.params["f1-score"])
                            })
            .attr("height", function(d){
                            return boxHeight/2 - yscale_performancebar(d.params["f1-score"])
                            })

        existingLinks
            .transition()
            .duration(1000)
            .style("stroke-width", function(d){return d.target.params.nKPsForThisNode/normFac})
        existingNodes.select("#nodetitle")
            .text(function(d){return d.name.split("_").slice(-1)})

        existingNodes.select("#f1Text")
            .text(node1Text)
        // Update confusion matrix
        existingNodes.select("#confusionmatrix")
            .selectAll(".rows")
            .data(function(d){return d.params.confusionmatrix})
                .selectAll(".columns") //rows
                .data(function(d){return d})
                    .select("text")
                    .text(function(d){return d})


        //Overwrite data in root node, to give the "Tree" f1-score
        var rootNode = svg.select("#RootNode")

        var rootParams = rootNode.data()[0]["params"]
        //Update root node performance bar
          rootNode.select('#performancebar')
          .transition()
          .duration(1000)
          .attr("y", function(d){
              return yscale_performancebar(rootParams["treeF1Score"])
          })
          .attr("height", function(d){
              return boxHeight/2 - yscale_performancebar(rootParams["treeF1Score"])
          })
        rootNode.select("#f1Text")
            .text(rootText)

        // Highlight a node if we mouse-over it, and display the information box
        newNodes.on("mouseenter", function() {
            thisNode = d3.select(this)
            displayInfoBox(thisNode)
            thisNodeCol = thisNode.select(".nodebox").style("stroke")
            thisNode.selectAll(".nodebox")
                .transition()
                .duration(1000)
                .style("fill", thisNodeCol)
            // 	            .style("opacity", 0.6)
            svg.selectAll(".link")
                .transition().duration(1000)
                .style("stroke", thisNodeCol)
                .style("stroke-width",  getLinkWidthClass)
        })

        newNodes.on("mouseleave", function(){
            destroyInfoBox()
            d3.select(this).selectAll(".nodebox")
                .transition()
                .duration(250)
                .style("fill", null)
                .style("opacity", null)
            svg.selectAll(".link")
                .transition().duration(250)
                .style("stroke", null)
                .style("stroke-width", function(d){return d.target.params.nKPsForThisNode/normFac})
        })

    });

    // Display up the info box (for mouse overs)
	function displayInfoBox(node) {
		var nodeName = node.attr("id")
        var infoX = infoBoxWidth/2*0.6
        var infoY = infoBoxHeight/2*1.05
		var infoBox = svg.append("g")
		infoBox
            .attr("class", "popup")
            .attr("transform", function(d) {return "translate(" + infoX + "," + infoY + ")";})

		infoBox
            .append("text")
            .attr("y", -infoBoxHeight/2 + fontSize + 2*lineSpace)
            .attr("text-anchor", "middle")
            .text(nodeName)
            .attr("font-size", fontSize + 8 + "px")

        var imgOffsetX = -infoBoxWidth/2 * 0.95
        var imgOffsetY = -infoBoxHeight/2 + fontSize+8 + 2*lineSpace
		infoBox
            .append("svg:image")
        	.attr("xlink:href", "sample_patches/"+nodeName+".png")
            .attr("width", infoBoxWidth*0.99)
            .attr("height", infoBoxHeight*0.99)
            .attr("transform", function(d) {return "translate(" + imgOffsetX + "," + imgOffsetY + ")";})
	}


    // Destroy the imfo box (when the mouseover ends)
    function destroyInfoBox() {
		svg.selectAll(".popup")
			.remove()
	}

    // Format f1score message
    function node1Text(d) {
        var f1Score = d.params["f1-score"]
        return "F1-Score: " + d3.format("0.1f")(f1Score*100) + "%"
    }
    
    // Format root node message
    function rootText(d) {
        var f1Score = d.params["treeF1Score"]
        return "Tree F1-Score: " + d3.format("0.1f")(f1Score*100) + "%"
    }

    // Calculate the width of the edge between nodes
    function getLinkWidthClass(node) {
    	var className = thisNode.attr("id")
    	var rootNode = d3.select('#RootNode')[0][0].__data__
    	var allInstOfThisClass = d3.sum(rootNode.children.map(function(d){return d.params.numInstToThisNode[className]}))
        var thisNodeTPs = node.target.params.numInstToThisNode[className]
        var myWidth = thisNodeTPs * boxHeight / allInstOfThisClass
        return myWidth
    }
}

d3.select(self.frameElement).style("height", height + "px");
