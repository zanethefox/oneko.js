# oneko.js

A tiny pixel cat for your website. Idle animations, dragging, soft landings, and memory across pages

`oneko`, `javascript`, `pixel-art`, `website`, `web-pet`, `vanilla-js`

![Demo GIF of oneko.js](https://github.com/zanethefox/oneko.js/blob/main/oneko-demo.gif)

This Oneko fork has several improvements that you can demo on [my blog](https://9263.space). I wanted to enhance the original script with some nice quality of life tweaks as well as give it new interactions. Neko starts idle, wakes on hover, and follows after a click. You can pick it up, watch it brace its paws, and put it down with a small drop and bounce. Its position and mood carry between pages in the same tab for cohesive and "SPA" app feel. Includes keyboard controls, touch dragging and reduced-motion support.

## demo
try it out on [9263.space](https://9263.space)

## usage & install

Download `oneko.js` and `oneko.gif`. Put the script and sprite in the same public folder on your website, then add:

```html
<script src="/oneko.js" defer></script>
```

The sprite is loaded relative to the **script's URL**, so `/assets/cat/oneko.js` automatically uses `/assets/cat/oneko.gif`. Include the script on every page that should have a cat.

### astro website example

Copy both assets into `public/`, then include this in your shared layout or navigation component:

```astro
<script is:inline src="/oneko.js" defer></script>
```

## Configuration

All attributes are optional.

| Attribute                       | Default                       | Meaning                                                                                                  |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `data-cat`                      | `oneko.gif` beside the script | Custom sprite-sheet URL, resolved relative to the page. Use the same 256 × 128 layout of 32 × 32 frames. |
| `data-tracking`                 | `false`                       | Follow immediately when no saved session exists. Saved following state takes precedence.                 |
| `data-toggle-tracking-on-click` | `true`                        | Let clicks, taps, Enter, and Space toggle following. Dragging stays available.                           |
| `data-persist-state`            | `true`                        | Restore position, following mode, and animation within this tab using session storage.                   |
| `data-persist-position`         | `true`                        | Remember the last position across visits using local storage. A fresh tab still starts idle.             |
| `data-storage-key`              | `oneko`                       | Storage namespace. Session state uses this key plus `:session`.                                          |
| `data-start-x`                  | `32`                          | Initial horizontal center in viewport pixels when no saved position exists.                              |
| `data-start-y`                  | `32`                          | Initial vertical center in viewport pixels when no saved position exists.                                |

Example with no persistent browser storage:

```html
<script
  src="/assets/cat/oneko.js"
  data-persist-state="false"
  data-persist-position="false"
  defer
></script>
```

## Cleanup and dynamic pages

Loading the script more than once will not create multiple cats. To remove the current cat and its event listeners:

```js
window.oneko?.destroy();
```

This saves its state when persistence is enabled. Load the script again to create a new instance. In an SPA, mount it once in a persistent shell, or call `destroy()` on unmount and reload it on mount. The controller exposes `window.oneko.element` if you need the DOM element. One cat per document is supported.

## Credits and license

- [adryd](https://github.com/adryd325/oneko.js) — original JavaScript implementation and bundled cat sprite.
- [kyrie25](https://github.com/kyrie25/spicetify-oneko) — the Spicetify fork that inspired the drag reactions.
- This fork grew out of [Zane's personal website](https://9263.space).

<details>
<summary>
  Original description of the project by adryd325/oneko.js
</summary>

A hacky script I wrote to put a cat on my site.

The default image is `oneko.gif` in the same directory as the script. This can be changed by adding `data-cat="yourimage.png"` to your `<script>` tag.

demo: https://adryd.com

This script is meant to be simple so that it can easily be extended upon. Pull requests adding features not seen in the [original neko program 
](https://en.wikipedia.org/wiki/Neko_(software)) will probably not be merged.

implemented in a few different places
  - Userscript: https://openuserjs.org/scripts/sjehuda/Oneko_WebMate
  - Vencord: https://vencord.dev/plugins/oneko
  - Spicetify: https://github.com/kyrie25/spicetify-oneko

feature forks
 - Pet the cat: https://github.com/tylxr59/oneko.js/tree/main
 - Move the cat using scroll wheel: https://github.com/rozbrajaczpoziomow/fork-oneko.js/tree/main
</details>
