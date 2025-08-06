// 1. Variables globales
let svgEl;
let originalViewBox = [0, 0, 600, 600];
let currentZoom = 1;
const zoomStep = 0.2;
const maxZoom = 3;
const minZoom = 0.5;
let currentOffset = { x: 0, y: 0 };
let dragStart = null;
let lastClickedId = null;
let currentSlide = 0;
let currentImages = [];
const tooltip = document.getElementById('tooltip');
const buscador = document.getElementById("buscador-distrito");
const datalist = document.getElementById("distritos");
const distritosList = []; // <--- IMPORTANTE: para usar en formulario

// 2. Cargar el mapa
fetch("mapa/buenos-aires-mapa.svg")
  .then(res => res.text())
  .then(svg => {
    document.getElementById("zoom-wrapper").innerHTML = svg;
    svgEl = document.querySelector("#zoom-wrapper svg");
    originalViewBox = svgEl.getAttribute("viewBox").split(" ").map(Number);

      const distritos = [
    "Adolfo Alsina", "Adolfo González Chaves", "Alberti", "Almirante Brown", "Arrecifes",
    "Avellaneda", "Ayacucho", "Azul", "Bahía Blanca", "Balcarce", "Baradero", "Benito Juárez",
    "Berazategui", "Berisso", "Bolívar", "Bragado", "Brandsen", "Campana", "Cañuelas",
    "Capitán Sarmiento", "Carlos Casares", "Carlos Tejedor", "Carmen de Areco", "Castelli",
    "Chacabuco", "Chascomús", "Chivilcoy", "Colón", "Coronel Dorrego", "Coronel Pringles",
    "Coronel Rosales", "Coronel Suárez", "Daireaux", "Dolores", "Ensenada", "Escobar",
    "Esteban Echeverría", "Exaltación de la Cruz", "Ezeiza", "Florencio Varela", "Florentino Ameghino",
    "General Alvarado", "General Alvear", "General Arenales", "General Belgrano", "General Guido",
    "General Juan Madariaga", "General La Madrid", "General Las Heras", "General Lavalle",
    "General Paz", "General Pinto", "General Pueyrredón", "General Rodríguez", "General San Martín",
    "General Viamonte", "General Villegas", "Guaminí", "Hipólito Yrigoyen", "Hurlingham", "Ituzaingó",
    "José C. Paz", "Junín", "La Costa", "La Matanza", "La Plata", "Lanús", "Laprida", "Las Flores",
    "Leandro N. Alem", "Lincoln", "Lobería", "Lobos", "Lomas de Zamora", "Luján", "Magdalena", "Maipú",
    "Malvinas Argentinas", "Mar Chiquita", "Marcos Paz", "Mercedes", "Merlo", "Monte", "Monte Hermoso",
    "Moreno", "Morón", "Navarro", "Necochea", "Nueve de Julio", "Olavarría", "Patagones", "Pehuajó",
    "Pellegrini", "Pergamino", "Pila", "Pilar", "Pinamar", "Presidente Perón", "Puán", "Punta Indio",
    "Quilmes", "Ramallo", "Rauch", "Rivadavia", "Rojas", "Roque Pérez", "Saavedra", "Saladillo",
    "Salliqueló", "Salto", "San Andrés de Giles", "San Antonio de Areco", "San Cayetano", "San Fernando",
    "San Isidro", "San Miguel", "San Nicolás", "San Pedro", "San Vicente", "Suipacha", "Tandil", "Tapalqué",
    "Tigre", "Tordillo", "Tornquist", "Trenque Lauquen", "Tres Arroyos", "Tres de Febrero", "Tres Lomas",
    "Vicente López", "Villa Gesell", "Villarino", "Zárate"
  ];

  document.querySelectorAll("svg path").forEach((p, index) => {
    // Solo asignar si el path no tiene id ni title
    if (!p.hasAttribute("id") && !p.hasAttribute("title")) {
      const nombre = distritos[index];
      p.id = nombre.toLowerCase().replace(/\s+/g, "-");
      p.setAttribute("title", nombre);
    }
  });

    document.querySelectorAll("svg path").forEach(p => {
      p.classList.add("distrito");

      p.addEventListener("click", () => {
        const id = p.id;
        if (lastClickedId === id) {
          openCategorias(id, p.getAttribute("title"));
        } else {
          zoomToPath(p);
          lastClickedId = id;
        }
      });

      p.addEventListener("mousemove", e => {
        const nombre = p.getAttribute("title");
        tooltip.style.display = 'block';
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 15) + 'px';
        tooltip.innerText = nombre;
      });

      p.addEventListener("mouseleave", () => {
        tooltip.style.display = 'none';
      });
    });

    setupZoomControls();
    setupDrag();
    llenarDatalist();
    contarImagenesTotales();
    llenarSelectorFormulario(); // <-- importante para cargar el select
  })
  .catch(err => {
    console.error("Error al cargar el SVG:", err);
    document.getElementById("mapa-container").innerHTML = "<p>Error al cargar el mapa.</p>";
  });

// 4. Zoom a distrito
function zoomToPath(path) {
  if (!svgEl) return;
  const bbox = path.getBBox();
  const padding = 20;
  const newViewBox = [
    bbox.x - padding,
    bbox.y - padding,
    bbox.width + padding * 2,
    bbox.height + padding * 2
  ];
  svgEl.setAttribute("viewBox", newViewBox.join(" "));
  document.querySelectorAll("svg path.distrito").forEach(p => p.classList.remove("resaltado"));
  path.classList.add("resaltado");
}

// 5. Zoom manual (+/-)
function setupZoomControls() {
  document.getElementById("zoom-in").addEventListener("click", () => {
    currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
    updateZoom();
  });

  document.getElementById("zoom-out").addEventListener("click", () => {
    currentZoom = Math.max(minZoom, currentZoom - zoomStep);
    updateZoom();
  });
}

function updateZoom() {
  const newW = originalViewBox[2] / currentZoom;
  const newH = originalViewBox[3] / currentZoom;
  const newX = originalViewBox[0] + currentOffset.x;
  const newY = originalViewBox[1] + currentOffset.y;
  svgEl.setAttribute("viewBox", `${newX} ${newY} ${newW} ${newH}`);
}

// 6. Drag (mouse y touch)
function setupDrag() {
  let dragging = false;

  function getEventCoords(e) {
    return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  }

  function startDrag(e) {
    dragging = true;
    dragStart = getEventCoords(e);
    svgEl.style.cursor = "grabbing";
  }

  function moveDrag(e) {
    if (!dragging) return;
    const current = getEventCoords(e);
    const dx = (current.x - dragStart.x) * (originalViewBox[2] / (svgEl.clientWidth * currentZoom));
    const dy = (current.y - dragStart.y) * (originalViewBox[3] / (svgEl.clientHeight * currentZoom));
    currentOffset.x -= dx;
    currentOffset.y -= dy;
    dragStart = current;
    updateZoom();
  }

  function endDrag() {
    dragging = false;
    svgEl.style.cursor = "default";
  }

  svgEl.addEventListener("mousedown", startDrag);
  svgEl.addEventListener("touchstart", startDrag);
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("touchmove", moveDrag);
  window.addEventListener("mouseup", endDrag);
  window.addEventListener("touchend", endDrag);
}

// 7. Categorías
function openCategorias(distritoId, distritoNombre) {
  closeAll();
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "categoria-overlay";

  const categorias = [
    { id: "salud", nombre: "Salud", icono: "iconos/salud.png" },
    { id: "infraestructura", nombre: "Infraestructura", icono: "iconos/infraestructura.png" },
    { id: "educacion", nombre: "Educación", icono: "iconos/educacion.png" },
    { id: "seguridad", nombre: "Seguridad", icono: "iconos/seguridad.png" }
  ];

  categorias.forEach(cat => {
    const div = document.createElement("div");
    div.className = "categoria";
    div.innerHTML = `<img src="${cat.icono}" alt="${cat.nombre}"><span>${cat.nombre}</span>`;
    div.addEventListener("click", () => openGaleria(distritoId, cat.id));
    overlay.appendChild(div);
  });

  const close = document.createElement("div");
  close.className = "close";
  close.innerText = "×";
  close.addEventListener("click", closeAll);
  overlay.appendChild(close);

  document.body.appendChild(overlay);
}

// 8. Galería (carrusel)
function openGaleria(distritoId, categoria) {
  closeAll();

  // Guardar el distrito y categoría por si hacen clic en "Subir imagen"
  window.ultimoDistritoId = distritoId;
  window.ultimaCategoria = categoria;

  fetch(`imagenes/${distritoId}/${categoria}/index.json`)
    .then(res => res.json())
    .then(lista => {
      if (!lista || lista.length === 0) {
        const mensaje = document.getElementById("mensaje-sin-imagenes");
        mensaje.style.display = "block";

        // Activar la X para cerrar el mensaje
        const btnCerrar = document.getElementById("cerrar-mensaje");
        if (btnCerrar) {
          btnCerrar.onclick = () => {
            mensaje.style.display = "none";
          };
        }

        return;
      }

      currentImages = lista;
      currentSlide = 0;

      const galeria = document.createElement("div");
      galeria.id = "galeria";

      galeria.innerHTML = `
        <div class="back">←</div>
        <div class="close">×</div>
        <img id="carousel-img">
        <div id="pie-imagen"></div>
        <div class="prev">‹</div>
        <div class="next">›</div>
      `;

      galeria.querySelector(".back").addEventListener("click", () => openCategorias(distritoId));
      galeria.querySelector(".close").addEventListener("click", closeAll);
      galeria.querySelector(".prev").addEventListener("click", () => changeSlide(-1, distritoId, categoria));
      galeria.querySelector(".next").addEventListener("click", () => changeSlide(1, distritoId, categoria));

      document.body.appendChild(galeria);
      updateCarousel(distritoId, categoria);
    })
    .catch(err => {
      console.error("No se pudo cargar el index.json:", err);
    });
}


// 9. Cerrar
function closeAll() {
  document.querySelectorAll(".overlay, #galeria").forEach(el => el.remove());
  tooltip.style.display = 'none';
  lastClickedId = null;
}

// 10. Buscador por nombre
function llenarDatalist() {
  document.querySelectorAll("svg path.distrito").forEach(p => {
    const title = p.getAttribute("title");
    if (title) {
      const option = document.createElement("option");
      option.value = title;
      datalist.appendChild(option);
      distritosList.push({ id: p.id, title: title });
    }
  });
}

document.getElementById("boton-buscar").addEventListener("click", () => {
  const valor = buscador.value.trim().toLowerCase();
  const distrito = distritosList.find(d => d.title.toLowerCase() === valor);
  if (distrito) {
    const path = document.getElementById(distrito.id);
    if (path) {
      zoomToPath(path);
      lastClickedId = distrito.id;
    }
  }
});

// 11. Contador de imágenes
async function contarImagenesTotales() {
  const categorias = ["salud", "infraestructura", "educacion", "seguridad"];
  let total = 0;

  for (const distrito of distritosList.map(d => d.id)) {
    for (const categoria of categorias) {
      try {
        const res = await fetch(`imagenes/${distrito}/${categoria}/index.json`);
        if (res.ok) {
          const archivos = await res.json();
          total += archivos.length;
        }
      } catch {}
    }
  }

  const contador = document.getElementById("contador-imagenes");
  if (contador) {
    contador.innerText = `📸 ${total} evidencias documentadas hasta ahora.`;
  }
}

// 12. Llenar selector del formulario
function llenarSelectorFormulario() {
  const selector = document.getElementById("distrito-select");
  if (!selector) return;
  distritosList.forEach(d => {
    const option = document.createElement("option");
    option.value = d.title;
    option.textContent = d.title;
    selector.appendChild(option);
  });
}

document.getElementById("cerrar-mensaje").addEventListener("click", () => {
  document.getElementById("mensaje-sin-imagenes").style.display = "none";
});
