import os
import unicodedata

def normalizar_nombre(nombre):
    nombre = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode("utf-8")
    nombre = nombre.strip().lower().replace(" ", "-").replace("’", "").replace("'", "")
    return nombre

ruta_principal = "imagenes"  # Cambiar si lo tenés en otra carpeta

for nombre in os.listdir(ruta_principal):
    origen = os.path.join(ruta_principal, nombre)
    if os.path.isdir(origen):
        nuevo_nombre = normalizar_nombre(nombre)
        destino = os.path.join(ruta_principal, nuevo_nombre)
        if origen != destino:
            os.rename(origen, destino)
            print(f"{nombre} → {nuevo_nombre}")

print("✔ Renombrado completo.")
