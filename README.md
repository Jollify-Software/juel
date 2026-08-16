# Jollify Unified/Unique Element Library (Juel)

This is a Web Component library written in TypeScript and built with [Lit](https://lit.dev/).  
I think that [Bootstap](https://getbootstrap.com/) is too verbose, my component encapsulate all the markup and styles needed in one JavaScript file download.

## CDN

The Juel library can be used via CDN, just add the following script tag to your `HTML`:

```html
<script src="https://cdn.jsdelivr.net/gh/Jollify-Software/juel/dist/juel.js"></script>
```

# Global JavaScript API

Loading `juel.js` exposes a global `window.juel` object, in addition to the custom elements. This is a public API surface — external code calls into it directly (e.g. the Blazor bindings project talks to Juel through this via JS interop), so its shape should be treated as a compatibility contract, not internal detail.

`juel.js` also sets `window.$` / `window.jQuery` (jQuery is bundled and still required internally by several components).

## `juel.messageBox`

Themed replacements for `alert` / `confirm` / `prompt`. Each call returns a `Promise` that resolves with `{ status, value }` (`status` is a `MessageBoxResultStatus`: `OK`, `Cancel`, `Yes`, `No`).

```js
juel.messageBox.error(text, title?);
juel.messageBox.success(text, title?);
juel.messageBox.warning(text, title?);
juel.messageBox.question(text, title?);  // Yes/No buttons
juel.messageBox.show(args);              // full control: title, text, icon, buttons, prompt, close, labels
```

## `juel.toast`

```js
juel.toast.show(options);
juel.toast.into(message);     // info toast
juel.toast.success(message);
juel.toast.warning(message);
juel.toast.error(message);
```

## `juel.icon`

```js
juel.icon.exists(name);
juel.icon.get(name, svg?);
juel.icon.use(name);
juel.icon.iconify();
```

## `juel.guide`

```js
juel.guide.start(steps?, options?);  // guided tour / walkthrough overlay
juel.guide.end();
```

## `juel.device`

```js
juel.device.getDeviceSize();
juel.device.getOrientation();
juel.device.addResizeListener(listener);
juel.device.removeResizeListener(listener);
juel.device.addOrientationListener(listener);
juel.device.removeOrientationListener(listener);
```

## `juel.audio`

```js
juel.audio.play(src);  // returns false if that src is already playing
```

## `juel.params`

A `Proxy` over the current page's `URLSearchParams` — e.g. `juel.params.foo` reads the `?foo=` query parameter.

# Components

* [Bootstrap](https://getbootstrap.com/).
* [Bulma](https://bulma.io/).
* [Foundation](https://get.foundation/).
* [MudBlazor](https://www.mudblazor.com/).
* [Blazorise](https://blazorise.com/docs).
* [DevExpress](https://demos.devexpress.com/blazor/).
* [Telerik](https://www.telerik.com/blazor-ui).

## Buttons

### Button

## Navigation

### Accordion

### Tabs

## Purpose

These Web Components have been created for the [Jollify app](https://jollify.app) and website.  
I have decided to make this project open source in the hope that others might find these useful.

### Pro & Blazor binding

In the future I think that these components could be extended into a Pro version which could be licensed.  
My app is also using the [Blazor framework](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor) so I have created a bindings project that is used for JS interop between Blazor and my components.
