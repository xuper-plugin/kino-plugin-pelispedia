# Pelispedia para Kino

Plugin de [Kino](https://github.com/kinotvapp/kino-light) para ver **películas y series** en español (latino, castellano o subtituladas) de
[pelispedia.is](https://pelispedia.is/).

> Plugin no oficial. El catálogo y los videos pertenecen a pelispedia.is y a los servidores donde están alojados; este plugin solo los
> lista y abre dentro de Kino.

## Instalar

En Kino: **Ajustes ▸ Plugins ▸ Agregar**, y pega:

```
xuper-plugin/kino-plugin-pelispedia
```

## Qué trae

- **Una sección propia** («Pelispedia») con cuatro pestañas —*Novedades*, *Películas*, *Series* y *Géneros*— y un destacado.
- **Inicio** con películas, series y filas de Acción, Terror y Comedia.
- **Categorías**: 12 géneros, cada uno con su lista por páginas.
- **Búsqueda** (también dentro de Películas o Series), **ficha** con sinopsis, géneros, año y duración, **temporadas y episodios**, y **descarga**.
- **Ajustes ▸ Pelispedia**: idioma preferido (latino, castellano o subtitulado) y vaciar la caché.
- Las carátulas son las de TMDB que usa el sitio; el icono es el del sitio.

## Servidores

Cada título ofrece hasta tres opciones, una por idioma. Cada opción es una página pequeña del sitio que lleva la dirección del reproductor; hoy todas
son de **fastream.to**, que se abre con peticiones normales. Kino abre primero el idioma que elijas y deja los demás en el menú **Servidor**.
StreamWish y VidHide también están por si el sitio cambia de servidor.

## Límites

- Solo se abren los servidores que el plugin conoce (fastream.to, StreamWish y VidHide); si el sitio cambia a otro, esa opción se salta.

## Desarrollo

```
npm test            # pruebas sin red
npm run validate    # compila plugin.js y valida el manifiesto con el kit
node sdk/run.mjs ./plugin.js resolve 'm:masterplan'
```

Licencia Apache-2.0 (ver `LICENSE` y `NOTICE`).
