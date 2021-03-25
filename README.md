# node-elm-loader

A small file that uses Node's experimental [esm transpiler loader](https://nodejs.org/api/esm.html#esm_transpiler_loader) to compile Elm code for use in a Node program. The basic idea is to do `node --experimental-loader ./node-elm-loader.mjs index.mjs`.

## Requirements

- [Elm](https://guide.elm-lang.org/install/elm.html)
- [cross-spawn](https://www.npmjs.com/package/cross-spawn)
- [rimraf](https://www.npmjs.com/package/rimraf)

## Example

- run `npm install`
- run `npm run example`
- should print out
  ```
  2
  66
  ```
