# Web: rutas asignadas, alertas y configuración

## Actualizar

Primero actualiza el backend y aplica la migración incluida en él. Después, desde esta carpeta:

```bash
npm ci
npm run build
npm run dev
```

Conserva tus variables de entorno. `VITE_API_URL` debe apuntar al backend actualizado con el sufijo `/api`; `VITE_SOCKET_URL` debe apuntar al mismo servidor, sin `/api`. Para pruebas locales:

```dotenv
VITE_API_URL=sc-cbb-web.up.railway.app/api
VITE_SOCKET_URL=sc-cbb-web.up.railway.app
```

Las variables Vite se incorporan durante la compilación: recompila si cambias la URL del backend. El ZIP contiene el código fuente; no incluye `node_modules` ni una compilación ligada a un entorno específico.

## Uso

1. **Rutas asignadas**: crea una ruta, selecciona guardia, dibuja puntos sobre las calles, ajusta la tolerancia en metros y guarda. Puedes editar, activar/desactivar y eliminar. Activar otra ruta para el mismo guardia desactiva la anterior. Requiere el permiso existente `patrols.manage` o ser administrador.
2. **Mapa**: al seleccionar un guardia aparecen su recorrido GPS y la ruta asignada en violeta discontinuo. La tarjeta muestra si está dentro de la ruta y de su zona, o si no hay precisión/datos suficientes. Las posiciones sin GPS reciente no se presentan como un incumplimiento confirmado.
3. **Patrullas**: el mapa muestra los guardias en servicio de la base seleccionada y las tarjetas indican su estado respecto de la jurisdicción. Los guardias sin servicio activo permanecen en la lista de miembros, sin generar una alerta de salida.
4. **Configuración → General**: cinco opciones con nombres y explicaciones legibles, sin duplicados. El nombre se aplica a la barra lateral y al título del navegador; los tiempos de conexión se evalúan en el backend y las horas de hechos se aplican al mapa.
5. **Configuración → Zonas**: crea/edita el contorno con clics. Arrastra vértices, selecciona un punto para eliminarlo o usa Deshacer. El polígono se cierra automáticamente. Los límites existentes se conservan; si una geometría tiene varios contornos, selecciona cuál editar. Limpiar dibujo elimina toda la geometría y permite empezar una nueva.

El trazado une puntos con líneas rectas; no hay un proveedor de navegación que ajuste automáticamente la ruta a las calles. El mapa base necesita acceso al proveedor de teselas configurado.

Los cambios de configuración y ubicación se consultan periódicamente (hasta 15 segundos para configuración y ubicaciones; 60 segundos para hechos) y el GPS también se actualiza por Socket.IO. Guardar configuración desde esta sesión invalida inmediatamente las consultas relacionadas.

La frecuencia GPS se publica para que la app móvil actualizada la consuma. El teléfono existente no cambiará su frecuencia hasta implementar esa lectura en el proyecto móvil.

Consulta la guía homónima del backend para la migración, endpoints y reglas de evaluación. La app móvil y sus animaciones siguen pendientes de recibir el ZIP que no pudo cargarse.
