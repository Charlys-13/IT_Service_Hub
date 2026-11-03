# IT Service Hub

Help Desk web para CUNQR - Hilton, CUNWA - Waldorf y Cluster.

## Estructura
- `index.html`: portal de usuario para crear tickets.
- `admin.html`: panel IT con Dashboard, Administración, Terminados, Reportes y Configuración.
- `assets/`: estilos y scripts separados por portal y administración.

## Desarrollo local
Abre `index.html` directamente en Microsoft Edge o ejecuta `ABRIR_LOCAL.bat` en Windows.

## GitHub Pages
El repositorio está preparado para publicar el portal desde la raíz. GitHub Pages abrirá `index.html` como página principal. El panel IT queda en `admin.html`.

## Datos
La versión actual utiliza `localStorage` del navegador con la clave `itHubDeluxe`. Esto significa que el almacenamiento no es compartido entre dispositivos/usuarios.

## Evidencias
Las imágenes se validan con un máximo inicial de 8 MB, se redimensionan hasta 1600 px en el lado más largo y se comprimen antes de guardarse localmente.
