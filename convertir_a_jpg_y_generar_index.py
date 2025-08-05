import os
import json
from PIL import Image

# Ruta raíz donde están las carpetas por distrito
RUTA_IMAGENES = "imagenes"

# Extensiones válidas de imagen (excepto mp4)
EXTENSIONES_VALIDAS = ['.jpg', '.jpeg', '.png', '.webp']

# Recorre todos los distritos y categorías
for distrito in os.listdir(RUTA_IMAGENES):
    ruta_distrito = os.path.join(RUTA_IMAGENES, distrito)
    if not os.path.isdir(ruta_distrito):
        continue

    for categoria in os.listdir(ruta_distrito):
        ruta_categoria = os.path.join(ruta_distrito, categoria)
        if not os.path.isdir(ruta_categoria):
            continue

        nombres_finales = []

        for archivo in os.listdir(ruta_categoria):
            ruta_archivo = os.path.join(ruta_categoria, archivo)
            nombre, ext = os.path.splitext(archivo)

            ext = ext.lower()

            # ✅ Eliminar archivos .mp4
            if ext == '.mp4':
                print(f"Eliminando archivo de video: {archivo}")
                os.remove(ruta_archivo)
                continue

            # ❌ Ignorar si no es imagen
            if ext not in EXTENSIONES_VALIDAS:
                continue

            # Si ya es .jpg, simplemente lo agregamos
            if ext == '.jpg':
                nombres_finales.append(archivo)
                continue

            # Convertir a .jpg
            try:
                imagen = Image.open(ruta_archivo).convert("RGB")
                nuevo_nombre = nombre + ".jpg"
                nueva_ruta = os.path.join(ruta_categoria, nuevo_nombre)
                imagen.save(nueva_ruta, "JPEG", quality=90)
                nombres_finales.append(nuevo_nombre)
                os.remove(ruta_archivo)
                print(f"Convertido: {archivo} → {nuevo_nombre}")
            except Exception as e:
                print(f"Error al convertir {archivo}: {e}")

        # Guardar index.json con los nombres finales
        index_path = os.path.join(ruta_categoria, "index.json")
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(nombres_finales, f, ensure_ascii=False, indent=2)

        print(f"✔ index.json creado en {ruta_categoria}")
