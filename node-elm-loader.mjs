import { URL, pathToFileURL } from "url";
import fs from "fs";
import spawn from "cross-spawn";
import { track } from "temp";
const temp = track();

const baseURL = pathToFileURL(`${process.cwd()}/`).href;

// Elm files end in .elm.
const extensionsRegex = /\.elm$/;

export function resolve(specifier, context, defaultResolve) {
  const { parentURL = baseURL } = context;

  // Node.js normally errors on unknown file extensions, so return a URL for
  // specifiers ending in the Elm file extensions.
  if (extensionsRegex.test(specifier)) {
    return {
      url: new URL(specifier, parentURL).href,
    };
  }

  // Let Node.js handle all other specifiers.
  return defaultResolve(specifier, context, defaultResolve);
}

export function getFormat(url, context, defaultGetFormat) {
  // Now that we patched resolve to let Elm URLs through, we need to
  // tell Node.js what format such URLs should be interpreted as. For the
  // purposes of this loader, all Elm URLs are ES modules.
  if (extensionsRegex.test(url)) {
    return {
      format: "module",
    };
  }

  // Let Node.js handle all other URLs.
  return defaultGetFormat(url, context, defaultGetFormat);
}

export function transformSource(source, context, defaultTransformSource) {
  const { url, format } = context;

  if (extensionsRegex.test(url)) {
    return {
      source: compileToStringSync(url.replace("file://", "")),
    };
  }

  // Let Node.js handle all other sources.
  return defaultTransformSource(source, context, defaultTransformSource);
}

// Copied from https://github.com/rtfeldman/node-elm-compiler

function compileToStringSync(sources, options = {}) {
  const file = temp.openSync({ suffix: ".js" });

  options.output = file.path;

  compileSync(sources, options);

  const initialOutput = fs.readFileSync(file.path, { encoding: "utf8" });
  const deIIFE = initialOutput
    .replace("(function(scope){", "function init(scope){")
    .replace(";}(this));", ";}");
  const result = `${deIIFE}
const moduleScope = {};
init(moduleScope);
export default moduleScope.Elm;`;

  return result;
}

const elmBinaryName = "elm";

function compileSync(sources, options) {
  const pathToElm = options.pathToElm || elmBinaryName;

  try {
    return runCompiler(sources, options, pathToElm);
  } catch (err) {
    throw compilerErrorToString(err, pathToElm);
  }
}

function compilerErrorToString(err, pathToElm) {
  if (typeof err === "object" && typeof err.code === "string") {
    switch (err.code) {
      case "ENOENT":
        return (
          'Could not find Elm compiler "' + pathToElm + '". Is it installed?'
        );

      case "EACCES":
        return (
          'Elm compiler "' +
          pathToElm +
          '" did not have permission to run. Do you need to give it executable permissions?'
        );

      default:
        return (
          'Error attempting to run Elm compiler "' + pathToElm + '":\n' + err
        );
    }
  } else if (typeof err === "object" && typeof err.message === "string") {
    return JSON.stringify(err.message);
  } else {
    return (
      "Exception thrown when attempting to run Elm compiler " +
      JSON.stringify(pathToElm)
    );
  }
}

const defaultOptions = {
  cwd: undefined,
  pathToElm: undefined,
  help: undefined,
  output: undefined,
  report: undefined,
  debug: undefined,
  verbose: false,
  processOpts: undefined,
  docs: undefined,
  optimize: undefined,
};

function runCompiler(sources, options, pathToElm) {
  const processArgs = prepareProcessArgs(sources, options);
  const processOpts = prepareProcessOpts(options);

  if (options.verbose) {
    console.log(["Running", pathToElm].concat(processArgs).join(" "));
  }

  return spawn.sync(pathToElm, processArgs, processOpts);
}

function prepareProcessOpts(options) {
  const env = { ...process.env, LANG: "en_US.UTF-8" };
  return {
    ...options.processOpts,
    env: env,
    stdio: "inherit",
    cwd: options.cwd,
  };
}

function prepareProcessArgs(sources, options) {
  var preparedSources = prepareSources(sources);
  const compilerArgs = compilerArgsFromOptions(options);

  return ["make"].concat(
    preparedSources ? preparedSources.concat(compilerArgs) : compilerArgs
  );
}

function prepareSources(sources) {
  if (!(sources instanceof Array || typeof sources === "string")) {
    throw "compile() received neither an Array nor a String for its sources argument.";
  }

  return typeof sources === "string" ? [sources] : sources;
}

const supportedOptions = Object.keys(defaultOptions);

// Converts an object of key/value pairs to an array of arguments suitable
// to be passed to child_process.spawn for elm-make.
function compilerArgsFromOptions(options) {
  return Object.entries(options)
    .map(function ([opt, value]) {
      if (value) {
        switch (opt) {
          case "help":
            return ["--help"];
          case "output":
            return ["--output", value];
          case "report":
            return ["--report", value];
          case "debug":
            return ["--debug"];
          case "docs":
            return ["--docs", value];
          case "optimize":
            return ["--optimize"];
          case "runtimeOptions":
            return [].concat(["+RTS"], value, ["-RTS"]);
          default:
            if (supportedOptions.indexOf(opt) === -1) {
              if (opt === "yes") {
                throw new Error(
                  "node-elm-compiler received the `yes` option, but that was removed in Elm 0.19. Try re-running without passing the `yes` option."
                );
              } else if (opt === "warn") {
                throw new Error(
                  "node-elm-compiler received the `warn` option, but that was removed in Elm 0.19. Try re-running without passing the `warn` option."
                );
              } else if (opt === "pathToMake") {
                throw new Error(
                  "node-elm-compiler received the `pathToMake` option, but that was renamed to `pathToElm` in Elm 0.19. Try re-running after renaming the parameter to `pathToElm`."
                );
              } else {
                throw new Error(
                  "node-elm-compiler was given an unrecognized Elm compiler option: " +
                    opt
                );
              }
            }

            return [];
        }
      } else {
        return [];
      }
    })
    .flat();
}
