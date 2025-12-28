console.log("Visualization JS loaded!");

// Icons for the different dinosaur types
const typeIcons = {
  "small theropod": "assets/small-theropod-sticker.png",
  "large theropod": "assets/large-theropod-sticker.png",
  sauropod: "assets/sauropods-sticker.png",
  ornithopod: "assets/ornithopods-sticker.png",
  ceratopsian: "assets/ceratopsians-sticker.png",
  "armored dinosaur": "assets/armored-dinosaurs-sticker.png",
};

// Colors for the different dinosaur types
const typeColors = {
  "small theropod": "#e7d63cff",
  "large theropod": "#c91c09ff",
  sauropod: "#11a0d0ff",
  ornithopod: "#5216a0ff",
  ceratopsian: "#48ba0aff",
  "armored dinosaur": "#f39c12",
};

// SVG dimensions
const width = 1400;
const height = 750;

// Append SVG to the page
const svg = d3
  .select("#visualization")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Tooltip div
const tooltip = d3.select("#tooltip");

// World map projection and path generator
const projection = d3
  .geoMercator()
  .scale(180)
  .translate([width / 2, height / 1.6]);

const path = d3.geoPath().projection(projection);

// Load CSV data (make sure dinosaurs.csv exists in same folder)
d3.csv("dinosaurs.csv").then((raw) => {
  const data = raw.map((d) => ({
    ...d,
    length_m: +d.length_m,
    max_ma: +d.max_ma,
    min_ma: +d.min_ma,
    lng: +d.lng,
    lat: +d.lat,
  }));

  // Size scale based on body length
  const sizeScale = d3
    .scaleSqrt()
    .domain([0, d3.max(data, (d) => d.length_m) || 1])
    .range([8, 35]);

  // Load world geometry
  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  ).then((world) => {
    // Draw countries
    svg
      .append("g")
      .selectAll("path")
      .data(topojson.feature(world, world.objects.countries).features)
      .join("path")
      .attr("class", "map-path")
      .attr("d", path);

    // Latitude/Longitude lines
    const graticule = d3.geoGraticule();
    svg
      .append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-width", 0.5);

    // Group for dinosaur glyphs
    const dinos = svg
      .append("g")
      .attr("class", "dino-layer")
      .selectAll("g")
      .data(data)
      .join("g")
      .attr(
        "class",
        (d) => `dino-glyph glyph-type-${d.type.replace(/\s+/g, "-")}`
      )
      .attr("transform", (d) => {
        const [x, y] = projection([d.lng, d.lat]);
        return `translate(${x},${y})`;
      });

    // Filtering functionality for buttons
    const filterBtns = document.querySelectorAll(".filter-btn");

    // Apply the filter when a button is clicked
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        // Active button
        filterBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        const filter = this.getAttribute("data-filter");

        // Apply filter
        dinos
          .transition()
          .duration(300)
          .style("opacity", (d) => {
            if (filter === "all") return 1;
            return d.type === filter ? 1 : 0.08;
          });

        // Update statisticss
        setTimeout(updateStats, 350);
      });
    });

    // Creating glyphs
    dinos.each(function (d) {
      const g = d3.select(this);
      const size = sizeScale(d.length_m);
      const color = typeColors[d.type] || "#999";

      // Diet shape background
      if (d.diet === "carnivorous") {
        // Circle = carnivorous
        g.append("circle")
          .attr("class", "diet-shape")
          .attr("r", size)
          .attr("fill", color)
          .attr("fill-opacity", 0.9);
      } else if (d.diet === "herbivorous") {
        // Square = herbivorous
        g.append("rect")
          .attr("class", "diet-shape")
          .attr("x", -size)
          .attr("y", -size)
          .attr("width", size * 2)
          .attr("height", size * 2)
          .attr("rx", 6)
          .attr("fill", color)
          .attr("fill-opacity", 0.9);
      } else if (d.diet === "omnivorous") {
        // Triangle = omnivorous
        const t = size * 1.3;
        g.append("polygon")
          .attr("class", "diet-shape")
          .attr("points", `0,${-t} ${t},${t} ${-t},${t}`)
          .attr("fill", color)
          .attr("fill-opacity", 0.9);
      } else {
        // Default shape
        g.append("circle")
          .attr("class", "diet-shape")
          .attr("r", size)
          .attr("fill", color)
          .attr("fill-opacity", 0.8);
      }

      // Sticker icon for dinosaur type on top of diet shape
      const iconPath = typeIcons[d.type];
      if (iconPath) {
        g.append("image")
          .attr("class", "type-sticker")
          .attr("href", iconPath)
          .attr("width", size * 2.2)
          .attr("height", size * 2.2)
          .attr("x", -size * 1.1)
          .attr("y", -size * 1.1)
          .attr("preserveAspectRatio", "xMidYMid meet");
      } else {
        // Using emoji as default if no icon found
        g.append("text")
          .attr("class", "type-sticker-text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .style("font-size", `${size * 1.4}px`)
          .text("🦖");
      }
    });

    // Hover interactions
    const infoBox = d3.select("#info-content");

    // Update info box on mouseover
    dinos.on("mouseover", function (event, d) {
      d3.select(this)
        .raise()
        .transition()
        .duration(200)
        .attr("transform", () => {
          const [x, y] = projection([d.lng, d.lat]);
          return `translate(${x},${y}) scale(1.45)`;
        });
      infoBox.html(`
    <div class="info-title">${d.name}</div>
    <p><strong>Type:</strong> ${d.type}</p>
    <p><strong>Diet:</strong> ${d.diet}</p>
    <p><strong>Length:</strong> ${d.length_m} m</p>
    <p><strong>Time Range:</strong> ${d.max_ma} – ${d.min_ma} MYA</p>
    <p><strong>Existed for:</strong> ${(d.max_ma - d.min_ma).toFixed(
      1
    )} million years</p>
    <p><strong>Region:</strong> ${d.region}</p>
    <p><strong>Family:</strong> ${d.family || "Unknown"}</p>
  `);
    });

    // Clear info box on mouseout
    dinos.on("mouseout", function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("transform", () => {
          const [x, y] = projection([d.lng, d.lat]);
          return `translate(${x},${y}) scale(1)`;
        });
      infoBox.html(`<p>Hover over a dinosaur to see details.</p>`);
    });
    // Initial statistics update
    updateStats();
  });
});

// Function to update statistics based on visible dinosaurs on the map
function updateStats() {
  const visible = svg.selectAll(".dino-glyph").filter(function () {
    return +d3.select(this).style("opacity") > 0.5;
  });

  const visibleData = visible.data();

  // Number of visible dinosaurs
  document.getElementById("visibleCount").textContent = visibleData.length;

  // Number of unique fossil regions
  const uniqueRegions = new Set(visibleData.map((d) => d.region));
  document.getElementById("locationCount").textContent = uniqueRegions.size;

  // Average length of visible dinosaurs
  const avg = d3.mean(visibleData, (d) => d.length_m) || 0;
  document.getElementById("avgLength").textContent = avg.toFixed(1);
}
