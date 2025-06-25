fetch("mapa/buenos-aires-mapa.svg")
  .then(res => res.text())
  .then(svg => {
    document.getElementById("zoom-wrapper").innerHTML = svg;

    svgEl = document.querySelector("#zoom-wrapper svg");
    originalViewBox = svgEl.getAttribute("viewBox").split(" ").map(Number);

    document.querySelectorAll("svg path").forEach(p => {
      p.classList.add("distrito");

      p.addEventListener("click", () => {
        const distrito = p.id;
        openCategorias(distrito, p.getAttribute("title"));
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
  })
  .catch(err => {
    console.error("Error al cargar el SVG:", err);
    document.getElementById("mapa-container").innerHTML = "<p>Error al cargar el mapa.</p>";
  });

const tooltip = document.getElementById('tooltip');

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

let currentSlide = 0;
let currentImages = [];

function openGaleria(distritoId, categoria) {
  closeAll();

  const path = `imagenes/${distritoId}/${categoria}/index.json`;

  fetch(path)
    .then(res => {
      if (!res.ok) {
        throw new Error(`No se encontró ${path}`);
      }
      return res.json();
    })
    .then(lista => {
      if (!Array.isArray(lista) || lista.length === 0) {
        throw new Error("El archivo JSON está vacío o mal formateado");
      }

      currentImages = lista;
      currentSlide = 0;

      const galeria = document.createElement("div");
      galeria.id = "galeria";

      const back = document.createElement("div");
      back.className = "back";
      back.innerText = "←";
      back.addEventListener("click", () => openCategorias(distritoId));
      galeria.appendChild(back);

      const close = document.createElement("div");
      close.className = "close";
      close.innerText = "×";
      close.addEventListener("click", closeAll);
      galeria.appendChild(close);

      const img = document.createElement("img");
      img.id = "carousel-img";
      galeria.appendChild(img);

      const caption = document.createElement("div");
      caption.id = "pie-imagen";
      galeria.appendChild(caption);

      const prev = document.createElement("div");
      prev.className = "prev";
      prev.innerText = "‹";
      prev.addEventListener("click", () => changeSlide(-1, distritoId, categoria));
      galeria.appendChild(prev);

      const next = document.createElement("div");
      next.className = "next";
      next.innerText = "›";
      next.addEventListener("click", () => changeSlide(1, distritoId, categoria));
      galeria.appendChild(next);

      document.body.appendChild(galeria);
      updateCarousel(distritoId, categoria);
    })
    .catch(err => {
      const galeria = document.createElement("div");
      galeria.id = "galeria";
      galeria.innerHTML = `<div style="color:white; font-size:20px; text-align:center;">⚠ Error: ${err.message}</div>`;
      document.body.appendChild(galeria);
      console.error("No se pudo cargar el index.json:", err);
    });
}


function updateCarousel(distritoId, categoria) {
  const filename = currentImages[currentSlide];
  const img = document.getElementById("carousel-img");
  const caption = document.getElementById("pie-imagen");

  img.src = `imagenes/${distritoId}/${categoria}/${filename}`;
  caption.innerText = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
}

function changeSlide(step, distritoId, categoria) {
  currentSlide = (currentSlide + step + currentImages.length) % currentImages.length;
  updateCarousel(distritoId, categoria);
}

function closeAll() {
  document.querySelectorAll(".overlay, #galeria").forEach(el => el.remove());
  tooltip.style.display = 'none';
}

const buscador = document.getElementById('buscador-distrito');
const datalist = document.getElementById('distritos');
const distritosList = [...datalist.options].map(o => o.value);

buscador.addEventListener('input', () => {
  const valor = buscador.value.toLowerCase().trim();
  if (!valor) return;
  const path = document.querySelector(`svg path[id="${valor}"]`);
  if (path) {
    path.scrollIntoView({ behavior: 'smooth', block: 'center' });
    path.dispatchEvent(new Event('click'));
  }
});

async function contarImagenesTotales() {
  const categorias = ["salud", "infraestructura", "educacion", "seguridad"];
  let total = 0;

  for (const distrito of distritosList) {
    for (const categoria of categorias) {
      const url = `imagenes/${distrito}/${categoria}/index.json`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`⚠ No encontrado: ${url}`);
          continue;
        }
        const archivos = await res.json();
        console.log(`✅ Cargado: ${url} - ${archivos.length} archivos`);
        total += archivos.length;
      } catch (e) {
        console.error(`❌ Error al leer: ${url}`, e);
      }
    }
  }

  const contador = document.getElementById("contador-imagenes");
  if (contador) {
    contador.innerText = `📸 ${total} evidencias documentadas hasta ahora.`;
  } else {
    console.warn("⚠ No se encontró el elemento #contador-imagenes");
  }
}

let svgEl;
let originalViewBox;
let currentZoom = 1;
const zoomStep = 0.2;
const maxZoom = 3;
const minZoom = 0.5;
let currentOffset = { x: 0, y: 0 };
let dragStart = null;

function setupZoomControls() {
  document.getElementById("zoom-in").addEventListener("click", () => {
    setZoom(currentZoom + zoomStep);
  });

  document.getElementById("zoom-out").addEventListener("click", () => {
    setZoom(currentZoom - zoomStep);
  });

  svgEl.addEventListener("wheel", e => e.preventDefault(), { passive: false });

  svgEl.addEventListener("mousedown", e => {
    dragStart = { x: e.clientX, y: e.clientY };
    svgEl.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    dragStart = null;
    svgEl.style.cursor = "default";
  });

  window.addEventListener("mousemove", e => {
    if (!dragStart) return;
    const dx = (e.clientX - dragStart.x) * (originalViewBox[2] / svgEl.clientWidth);
    const dy = (e.clientY - dragStart.y) * (originalViewBox[3] / svgEl.clientHeight);
    currentOffset.x -= dx;
    currentOffset.y -= dy;
    dragStart = { x: e.clientX, y: e.clientY };
    updateViewBox();
  });
}

function setZoom(newZoom) {
  currentZoom = Math.min(Math.max(minZoom, newZoom), maxZoom);
  updateViewBox();
}

function updateViewBox() {
  const newW = originalViewBox[2] / currentZoom;
  const newH = originalViewBox[3] / currentZoom;
  svgEl.setAttribute("viewBox", `${originalViewBox[0] + currentOffset.x} ${originalViewBox[1] + currentOffset.y} ${newW} ${newH}`);
}
