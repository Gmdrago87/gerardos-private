// Futuristic Visual Engine
// Handles 3D Topology, Infinite Graph Canvas, and Commit Scrubbing

const DUMMY_REPOS = [
    { name: "gerardos-core", layer: "core", deps: ["utils"] },
    { name: "utils", layer: "data", deps: [] },
    { name: "web-ui", layer: "ui", deps: ["gerardos-core"] },
    { name: "auth-service", layer: "data", deps: ["utils"] },
    { name: "dashboard", layer: "ui", deps: ["web-ui", "auth-service"] }
];

const DUMMY_COMMITS = [
    { hash: "a1b2c3d", message: "Initial commit", code: "function init() {\n  console.log('App started');\n}" },
    { hash: "e4f5g6h", message: "Add 3D support", code: "function init() {\n  console.log('App started');\n  <span class=\"diff-add\">start3DEngine();</span>\n}" },
    { hash: "i7j8k9l", message: "Remove console.log", code: "function init() {\n  <span class=\"diff-remove\">console.log('App started');</span>\n  start3DEngine();\n}" }
];

export function initFuturisticEngine() {
    const btnOpen = document.getElementById("btn-futuristic-engine");
    const btnClose = document.getElementById("btn-close-futuristic");
    const engineContainer = document.getElementById("futuristic-engine");
    
    if(!btnOpen || !engineContainer) return;

    btnOpen.addEventListener("click", () => {
        engineContainer.classList.remove("hidden");
        // We will need to re-render lucide icons if there are new ones
        if (window.lucide) window.lucide.createIcons();
        renderTopology3D(); // Default view
    });

    btnClose.addEventListener("click", () => {
        destroyFuturisticEngine();
    });
}

export function destroyFuturisticEngine() {
    const container = document.getElementById("futuristic-canvas-container");
    if (container) container.innerHTML = "";
    const engineContainer = document.getElementById("futuristic-engine");
    if (engineContainer) engineContainer.classList.add("hidden");
    if (window._mousemoveParallaxHandler) {
        document.removeEventListener("mousemove", window._mousemoveParallaxHandler);
        window._mousemoveParallaxHandler = null;
    }
}
window.destroyFuturisticEngine = destroyFuturisticEngine;

    // Tab switching
    const tabs = {
        topology: document.getElementById("btn-view-topology"),
        graph: document.getElementById("btn-view-graph"),
        commits: document.getElementById("btn-view-commits")
    };

    tabs.topology.addEventListener("click", () => {
        setActiveTab(tabs, tabs.topology);
        renderTopology3D();
    });
    
    tabs.graph.addEventListener("click", () => {
        setActiveTab(tabs, tabs.graph);
        renderGraphCanvas();
    });

    tabs.commits.addEventListener("click", () => {
        setActiveTab(tabs, tabs.commits);
        renderCommitTimeline();
    });
}

function setActiveTab(tabs, activeTab) {
    Object.values(tabs).forEach(tab => tab.classList.remove("active"));
    activeTab.classList.add("active");
}

function renderTopology3D() {
    const container = document.getElementById("futuristic-canvas-container");
    container.innerHTML = `
        <div class="topology-container" id="topology-scene">
            <div class="topology-layer" style="transform: translateZ(-200px) translateY(-50px) rotateX(15deg) rotateY(-10deg);">
                <h3>Data Layer</h3>
                <div class="topology-item"><i data-lucide="database"></i> auth-service</div>
                <div class="topology-item"><i data-lucide="server"></i> utils</div>
            </div>
            
            <div class="topology-layer" style="transform: translateZ(0px) translateY(0px) rotateX(15deg) rotateY(-10deg); border-color: #3b82f6;">
                <h3 style="color: #60a5fa; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">Domain Layer</h3>
                <div class="topology-item"><i data-lucide="cpu"></i> gerardos-core</div>
            </div>

            <div class="topology-layer" style="transform: translateZ(200px) translateY(50px) rotateX(15deg) rotateY(-10deg); border-color: #10b981;">
                <h3 style="color: #34d399; text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);">UI Layer</h3>
                <div class="topology-item"><i data-lucide="layout"></i> dashboard</div>
                <div class="topology-item"><i data-lucide="smartphone"></i> web-ui</div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // Add parallax effect
    const scene = document.getElementById("topology-scene");
    document.addEventListener("mousemove", (e) => {
        if(!document.getElementById("topology-scene")) return;
        const x = (window.innerWidth / 2 - e.pageX) / 50;
        const y = (window.innerHeight / 2 - e.pageY) / 50;
        scene.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    });
}

function renderGraphCanvas() {
    const container = document.getElementById("futuristic-canvas-container");
    container.innerHTML = ""; // Clear
    
    // We use D3.js if available, or fallback to simple HTML
    if (window.d3) {
        // D3 Force Directed Graph implementation
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(d3.zoom().on("zoom", function (event) {
               svg.attr("transform", event.transform)
            }))
            .append("g");

        // Add glowing defs
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        const nodes = DUMMY_REPOS.map(d => Object.create(d));
        const links = [];
        nodes.forEach(n => {
            n.deps.forEach(dep => {
                const target = nodes.find(x => x.name === dep);
                if(target) links.push({source: n, target: target});
            });
        });

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.name).distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svg.append("g")
            .attr("stroke", "rgba(139, 92, 246, 0.4)")
            .attr("stroke-width", 2)
            .selectAll("line")
            .data(links)
            .join("line");

        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation));

        node.append("circle")
            .attr("r", 20)
            .attr("fill", "#0f172a")
            .attr("stroke", "#c084fc")
            .attr("stroke-width", 2)
            .style("filter", "url(#glow)");

        node.append("text")
            .text(d => d.name)
            .attr("x", 25)
            .attr("y", 5)
            .attr("fill", "#e2e8f0")
            .style("font-family", "'JetBrains Mono', monospace")
            .style("font-size", "12px");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function drag(simulation) {
          function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          }
          function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          }
          function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }
          return d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended);
        }

    } else {
        container.innerHTML = "<p style='color:white;text-align:center;margin-top:20%'>D3.js is required for the Graph Canvas</p>";
    }
}

function renderCommitTimeline() {
    const container = document.getElementById("futuristic-canvas-container");
    container.innerHTML = `
        <div class="timeline-slider-container">
            <div class="commit-code-view" id="commit-viewer"></div>
            <div class="timeline-info">
                Commit: <span id="commit-hash" style="color: #c084fc;"></span> - <span id="commit-msg"></span>
            </div>
            <input type="range" id="commit-slider" class="timeline-slider" min="0" max="${DUMMY_COMMITS.length - 1}" value="0">
        </div>
    `;

    const slider = document.getElementById("commit-slider");
    const viewer = document.getElementById("commit-viewer");
    const hashSpan = document.getElementById("commit-hash");
    const msgSpan = document.getElementById("commit-msg");

    const updateCommit = (index) => {
        const commit = DUMMY_COMMITS[index];
        hashSpan.innerText = commit.hash;
        msgSpan.innerText = commit.message;
        viewer.innerHTML = commit.code;
    };

    slider.addEventListener("input", (e) => {
        updateCommit(e.target.value);
    });

    updateCommit(0);
}
