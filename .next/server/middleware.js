(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([[826],{

/***/ 67:
/***/ ((module) => {

"use strict";
module.exports = require("node:async_hooks");

/***/ }),

/***/ 195:
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ 816:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ nHandler)
});

// NAMESPACE OBJECT: ./middleware.ts
var middleware_namespaceObject = {};
__webpack_require__.r(middleware_namespaceObject);
__webpack_require__.d(middleware_namespaceObject, {
  config: () => (config),
  middleware: () => (middleware)
});

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/globals.js
async function registerInstrumentation() {
    const register = "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && (await _ENTRIES.middleware_instrumentation).register;
    if (register) {
        try {
            await register();
        } catch (err) {
            err.message = `An error occurred while loading instrumentation hook: ${err.message}`;
            throw err;
        }
    }
}
let registerInstrumentationPromise = null;
function ensureInstrumentationRegistered() {
    if (!registerInstrumentationPromise) {
        registerInstrumentationPromise = registerInstrumentation();
    }
    return registerInstrumentationPromise;
}
function getUnsupportedModuleErrorMessage(module) {
    // warning: if you change these messages, you must adjust how react-dev-overlay's middleware detects modules not found
    return `The edge runtime does not support Node.js '${module}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
}
function __import_unsupported(moduleName) {
    const proxy = new Proxy(function() {}, {
        get (_obj, prop) {
            if (prop === "then") {
                return {};
            }
            throw new Error(getUnsupportedModuleErrorMessage(moduleName));
        },
        construct () {
            throw new Error(getUnsupportedModuleErrorMessage(moduleName));
        },
        apply (_target, _this, args) {
            if (typeof args[0] === "function") {
                return args[0](proxy);
            }
            throw new Error(getUnsupportedModuleErrorMessage(moduleName));
        }
    });
    return new Proxy({}, {
        get: ()=>proxy
    });
}
function enhanceGlobals() {
    // The condition is true when the "process" module is provided
    if (process !== __webpack_require__.g.process) {
        // prefer local process but global.process has correct "env"
        process.env = __webpack_require__.g.process.env;
        __webpack_require__.g.process = process;
    }
    // to allow building code that import but does not use node.js modules,
    // webpack will expect this function to exist in global scope
    Object.defineProperty(globalThis, "__import_unsupported", {
        value: __import_unsupported,
        enumerable: false,
        configurable: false
    });
    // Eagerly fire instrumentation hook to make the startup faster.
    void ensureInstrumentationRegistered();
}
enhanceGlobals();

//# sourceMappingURL=globals.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/error.js
class PageSignatureError extends Error {
    constructor({ page }){
        super(`The middleware "${page}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
    }
}
class RemovedPageError extends Error {
    constructor(){
        super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
    }
}
class RemovedUAError extends Error {
    constructor(){
        super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
    }
}

//# sourceMappingURL=error.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/utils.js
/**
 * Converts a Node.js IncomingHttpHeaders object to a Headers object. Any
 * headers with multiple values will be joined with a comma and space. Any
 * headers that have an undefined value will be ignored and others will be
 * coerced to strings.
 *
 * @param nodeHeaders the headers object to convert
 * @returns the converted headers object
 */ function fromNodeOutgoingHttpHeaders(nodeHeaders) {
    const headers = new Headers();
    for (let [key, value] of Object.entries(nodeHeaders)){
        const values = Array.isArray(value) ? value : [
            value
        ];
        for (let v of values){
            if (typeof v === "undefined") continue;
            if (typeof v === "number") {
                v = v.toString();
            }
            headers.append(key, v);
        }
    }
    return headers;
}
/*
  Set-Cookie header field-values are sometimes comma joined in one string. This splits them without choking on commas
  that are within a single set-cookie field-value, such as in the Expires portion.
  This is uncommon, but explicitly allowed - see https://tools.ietf.org/html/rfc2616#section-4.2
  Node.js does this for every header *except* set-cookie - see https://github.com/nodejs/node/blob/d5e363b77ebaf1caf67cd7528224b651c86815c1/lib/_http_incoming.js#L128
  React Native's fetch does this for *every* header, including set-cookie.
  
  Based on: https://github.com/google/j2objc/commit/16820fdbc8f76ca0c33472810ce0cb03d20efe25
  Credits to: https://github.com/tomball for original and https://github.com/chrusart for JavaScript implementation
*/ function splitCookiesString(cookiesString) {
    var cookiesStrings = [];
    var pos = 0;
    var start;
    var ch;
    var lastComma;
    var nextStart;
    var cookiesSeparatorFound;
    function skipWhitespace() {
        while(pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))){
            pos += 1;
        }
        return pos < cookiesString.length;
    }
    function notSpecialChar() {
        ch = cookiesString.charAt(pos);
        return ch !== "=" && ch !== ";" && ch !== ",";
    }
    while(pos < cookiesString.length){
        start = pos;
        cookiesSeparatorFound = false;
        while(skipWhitespace()){
            ch = cookiesString.charAt(pos);
            if (ch === ",") {
                // ',' is a cookie separator if we have later first '=', not ';' or ','
                lastComma = pos;
                pos += 1;
                skipWhitespace();
                nextStart = pos;
                while(pos < cookiesString.length && notSpecialChar()){
                    pos += 1;
                }
                // currently special character
                if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
                    // we found cookies separator
                    cookiesSeparatorFound = true;
                    // pos is inside the next cookie, so back up and return it.
                    pos = nextStart;
                    cookiesStrings.push(cookiesString.substring(start, lastComma));
                    start = pos;
                } else {
                    // in param ',' or param separator ';',
                    // we continue from that comma
                    pos = lastComma + 1;
                }
            } else {
                pos += 1;
            }
        }
        if (!cookiesSeparatorFound || pos >= cookiesString.length) {
            cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
        }
    }
    return cookiesStrings;
}
/**
 * Converts a Headers object to a Node.js OutgoingHttpHeaders object. This is
 * required to support the set-cookie header, which may have multiple values.
 *
 * @param headers the headers object to convert
 * @returns the converted headers object
 */ function toNodeOutgoingHttpHeaders(headers) {
    const nodeHeaders = {};
    const cookies = [];
    if (headers) {
        for (const [key, value] of headers.entries()){
            if (key.toLowerCase() === "set-cookie") {
                // We may have gotten a comma joined string of cookies, or multiple
                // set-cookie headers. We need to merge them into one header array
                // to represent all the cookies.
                cookies.push(...splitCookiesString(value));
                nodeHeaders[key] = cookies.length === 1 ? cookies[0] : cookies;
            } else {
                nodeHeaders[key] = value;
            }
        }
    }
    return nodeHeaders;
}
/**
 * Validate the correctness of a user-provided URL.
 */ function validateURL(url) {
    try {
        return String(new URL(String(url)));
    } catch (error) {
        throw new Error(`URL is malformed "${String(url)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, {
            cause: error
        });
    }
}

//# sourceMappingURL=utils.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/fetch-event.js

const responseSymbol = Symbol("response");
const passThroughSymbol = Symbol("passThrough");
const waitUntilSymbol = Symbol("waitUntil");
class FetchEvent {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(_request){
        this[waitUntilSymbol] = [];
        this[passThroughSymbol] = false;
    }
    respondWith(response) {
        if (!this[responseSymbol]) {
            this[responseSymbol] = Promise.resolve(response);
        }
    }
    passThroughOnException() {
        this[passThroughSymbol] = true;
    }
    waitUntil(promise) {
        this[waitUntilSymbol].push(promise);
    }
}
class NextFetchEvent extends FetchEvent {
    constructor(params){
        super(params.request);
        this.sourcePage = params.page;
    }
    /**
   * @deprecated The `request` is now the first parameter and the API is now async.
   *
   * Read more: https://nextjs.org/docs/messages/middleware-new-signature
   */ get request() {
        throw new PageSignatureError({
            page: this.sourcePage
        });
    }
    /**
   * @deprecated Using `respondWith` is no longer needed.
   *
   * Read more: https://nextjs.org/docs/messages/middleware-new-signature
   */ respondWith() {
        throw new PageSignatureError({
            page: this.sourcePage
        });
    }
}

//# sourceMappingURL=fetch-event.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/i18n/detect-domain-locale.js
function detectDomainLocale(domainItems, hostname, detectedLocale) {
    if (!domainItems) return;
    if (detectedLocale) {
        detectedLocale = detectedLocale.toLowerCase();
    }
    for (const item of domainItems){
        var _item_domain, _item_locales;
        // remove port if present
        const domainHostname = (_item_domain = item.domain) == null ? void 0 : _item_domain.split(":", 1)[0].toLowerCase();
        if (hostname === domainHostname || detectedLocale === item.defaultLocale.toLowerCase() || ((_item_locales = item.locales) == null ? void 0 : _item_locales.some((locale)=>locale.toLowerCase() === detectedLocale))) {
            return item;
        }
    }
} //# sourceMappingURL=detect-domain-locale.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/remove-trailing-slash.js
/**
 * Removes the trailing slash for a given route or page path. Preserves the
 * root page. Examples:
 *   - `/foo/bar/` -> `/foo/bar`
 *   - `/foo/bar` -> `/foo/bar`
 *   - `/` -> `/`
 */ function removeTrailingSlash(route) {
    return route.replace(/\/$/, "") || "/";
} //# sourceMappingURL=remove-trailing-slash.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/parse-path.js
/**
 * Given a path this function will find the pathname, query and hash and return
 * them. This is useful to parse full paths on the client side.
 * @param path A path to parse e.g. /foo/bar?id=1#hash
 */ function parsePath(path) {
    const hashIndex = path.indexOf("#");
    const queryIndex = path.indexOf("?");
    const hasQuery = queryIndex > -1 && (hashIndex < 0 || queryIndex < hashIndex);
    if (hasQuery || hashIndex > -1) {
        return {
            pathname: path.substring(0, hasQuery ? queryIndex : hashIndex),
            query: hasQuery ? path.substring(queryIndex, hashIndex > -1 ? hashIndex : undefined) : "",
            hash: hashIndex > -1 ? path.slice(hashIndex) : ""
        };
    }
    return {
        pathname: path,
        query: "",
        hash: ""
    };
} //# sourceMappingURL=parse-path.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/add-path-prefix.js

/**
 * Adds the provided prefix to the given path. It first ensures that the path
 * is indeed starting with a slash.
 */ function addPathPrefix(path, prefix) {
    if (!path.startsWith("/") || !prefix) {
        return path;
    }
    const { pathname, query, hash } = parsePath(path);
    return "" + prefix + pathname + query + hash;
} //# sourceMappingURL=add-path-prefix.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/add-path-suffix.js

/**
 * Similarly to `addPathPrefix`, this function adds a suffix at the end on the
 * provided path. It also works only for paths ensuring the argument starts
 * with a slash.
 */ function addPathSuffix(path, suffix) {
    if (!path.startsWith("/") || !suffix) {
        return path;
    }
    const { pathname, query, hash } = parsePath(path);
    return "" + pathname + suffix + query + hash;
} //# sourceMappingURL=add-path-suffix.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/path-has-prefix.js

/**
 * Checks if a given path starts with a given prefix. It ensures it matches
 * exactly without containing extra chars. e.g. prefix /docs should replace
 * for /docs, /docs/, /docs/a but not /docsss
 * @param path The path to check.
 * @param prefix The prefix to check against.
 */ function pathHasPrefix(path, prefix) {
    if (typeof path !== "string") {
        return false;
    }
    const { pathname } = parsePath(path);
    return pathname === prefix || pathname.startsWith(prefix + "/");
} //# sourceMappingURL=path-has-prefix.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/add-locale.js


/**
 * For a given path and a locale, if the locale is given, it will prefix the
 * locale. The path shouldn't be an API path. If a default locale is given the
 * prefix will be omitted if the locale is already the default locale.
 */ function addLocale(path, locale, defaultLocale, ignorePrefix) {
    // If no locale was given or the locale is the default locale, we don't need
    // to prefix the path.
    if (!locale || locale === defaultLocale) return path;
    const lower = path.toLowerCase();
    // If the path is an API path or the path already has the locale prefix, we
    // don't need to prefix the path.
    if (!ignorePrefix) {
        if (pathHasPrefix(lower, "/api")) return path;
        if (pathHasPrefix(lower, "/" + locale.toLowerCase())) return path;
    }
    // Add the locale prefix to the path.
    return addPathPrefix(path, "/" + locale);
} //# sourceMappingURL=add-locale.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/format-next-pathname-info.js




function formatNextPathnameInfo(info) {
    let pathname = addLocale(info.pathname, info.locale, info.buildId ? undefined : info.defaultLocale, info.ignorePrefix);
    if (info.buildId || !info.trailingSlash) {
        pathname = removeTrailingSlash(pathname);
    }
    if (info.buildId) {
        pathname = addPathSuffix(addPathPrefix(pathname, "/_next/data/" + info.buildId), info.pathname === "/" ? "index.json" : ".json");
    }
    pathname = addPathPrefix(pathname, info.basePath);
    return !info.buildId && info.trailingSlash ? !pathname.endsWith("/") ? addPathSuffix(pathname, "/") : pathname : removeTrailingSlash(pathname);
} //# sourceMappingURL=format-next-pathname-info.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/get-hostname.js
/**
 * Takes an object with a hostname property (like a parsed URL) and some
 * headers that may contain Host and returns the preferred hostname.
 * @param parsed An object containing a hostname property.
 * @param headers A dictionary with headers containing a `host`.
 */ function getHostname(parsed, headers) {
    // Get the hostname from the headers if it exists, otherwise use the parsed
    // hostname.
    let hostname;
    if ((headers == null ? void 0 : headers.host) && !Array.isArray(headers.host)) {
        hostname = headers.host.toString().split(":", 1)[0];
    } else if (parsed.hostname) {
        hostname = parsed.hostname;
    } else return;
    return hostname.toLowerCase();
} //# sourceMappingURL=get-hostname.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/i18n/normalize-locale-path.js
/**
 * For a pathname that may include a locale from a list of locales, it
 * removes the locale from the pathname returning it alongside with the
 * detected locale.
 *
 * @param pathname A pathname that may include a locale.
 * @param locales A list of locales.
 * @returns The detected locale and pathname without locale
 */ function normalizeLocalePath(pathname, locales) {
    let detectedLocale;
    // first item will be empty string from splitting at first char
    const pathnameParts = pathname.split("/");
    (locales || []).some((locale)=>{
        if (pathnameParts[1] && pathnameParts[1].toLowerCase() === locale.toLowerCase()) {
            detectedLocale = locale;
            pathnameParts.splice(1, 1);
            pathname = pathnameParts.join("/") || "/";
            return true;
        }
        return false;
    });
    return {
        pathname,
        detectedLocale
    };
} //# sourceMappingURL=normalize-locale-path.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/remove-path-prefix.js

/**
 * Given a path and a prefix it will remove the prefix when it exists in the
 * given path. It ensures it matches exactly without containing extra chars
 * and if the prefix is not there it will be noop.
 *
 * @param path The path to remove the prefix from.
 * @param prefix The prefix to be removed.
 */ function removePathPrefix(path, prefix) {
    // If the path doesn't start with the prefix we can return it as is. This
    // protects us from situations where the prefix is a substring of the path
    // prefix such as:
    //
    // For prefix: /blog
    //
    //   /blog -> true
    //   /blog/ -> true
    //   /blog/1 -> true
    //   /blogging -> false
    //   /blogging/ -> false
    //   /blogging/1 -> false
    if (!pathHasPrefix(path, prefix)) {
        return path;
    }
    // Remove the prefix from the path via slicing.
    const withoutPrefix = path.slice(prefix.length);
    // If the path without the prefix starts with a `/` we can return it as is.
    if (withoutPrefix.startsWith("/")) {
        return withoutPrefix;
    }
    // If the path without the prefix doesn't start with a `/` we need to add it
    // back to the path to make sure it's a valid path.
    return "/" + withoutPrefix;
} //# sourceMappingURL=remove-path-prefix.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/get-next-pathname-info.js



function getNextPathnameInfo(pathname, options) {
    var _options_nextConfig;
    const { basePath, i18n, trailingSlash } = (_options_nextConfig = options.nextConfig) != null ? _options_nextConfig : {};
    const info = {
        pathname,
        trailingSlash: pathname !== "/" ? pathname.endsWith("/") : trailingSlash
    };
    if (basePath && pathHasPrefix(info.pathname, basePath)) {
        info.pathname = removePathPrefix(info.pathname, basePath);
        info.basePath = basePath;
    }
    let pathnameNoDataPrefix = info.pathname;
    if (info.pathname.startsWith("/_next/data/") && info.pathname.endsWith(".json")) {
        const paths = info.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
        const buildId = paths[0];
        info.buildId = buildId;
        pathnameNoDataPrefix = paths[1] !== "index" ? "/" + paths.slice(1).join("/") : "/";
        // update pathname with normalized if enabled although
        // we use normalized to populate locale info still
        if (options.parseData === true) {
            info.pathname = pathnameNoDataPrefix;
        }
    }
    // If provided, use the locale route normalizer to detect the locale instead
    // of the function below.
    if (i18n) {
        let result = options.i18nProvider ? options.i18nProvider.analyze(info.pathname) : normalizeLocalePath(info.pathname, i18n.locales);
        info.locale = result.detectedLocale;
        var _result_pathname;
        info.pathname = (_result_pathname = result.pathname) != null ? _result_pathname : info.pathname;
        if (!result.detectedLocale && info.buildId) {
            result = options.i18nProvider ? options.i18nProvider.analyze(pathnameNoDataPrefix) : normalizeLocalePath(pathnameNoDataPrefix, i18n.locales);
            if (result.detectedLocale) {
                info.locale = result.detectedLocale;
            }
        }
    }
    return info;
} //# sourceMappingURL=get-next-pathname-info.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/next-url.js




const REGEX_LOCALHOST_HOSTNAME = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
function parseURL(url, base) {
    return new URL(String(url).replace(REGEX_LOCALHOST_HOSTNAME, "localhost"), base && String(base).replace(REGEX_LOCALHOST_HOSTNAME, "localhost"));
}
const Internal = Symbol("NextURLInternal");
class NextURL {
    constructor(input, baseOrOpts, opts){
        let base;
        let options;
        if (typeof baseOrOpts === "object" && "pathname" in baseOrOpts || typeof baseOrOpts === "string") {
            base = baseOrOpts;
            options = opts || {};
        } else {
            options = opts || baseOrOpts || {};
        }
        this[Internal] = {
            url: parseURL(input, base ?? options.base),
            options: options,
            basePath: ""
        };
        this.analyze();
    }
    analyze() {
        var _this_Internal_options_nextConfig_i18n, _this_Internal_options_nextConfig, _this_Internal_domainLocale, _this_Internal_options_nextConfig_i18n1, _this_Internal_options_nextConfig1;
        const info = getNextPathnameInfo(this[Internal].url.pathname, {
            nextConfig: this[Internal].options.nextConfig,
            parseData: !undefined,
            i18nProvider: this[Internal].options.i18nProvider
        });
        const hostname = getHostname(this[Internal].url, this[Internal].options.headers);
        this[Internal].domainLocale = this[Internal].options.i18nProvider ? this[Internal].options.i18nProvider.detectDomainLocale(hostname) : detectDomainLocale((_this_Internal_options_nextConfig = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n = _this_Internal_options_nextConfig.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n.domains, hostname);
        const defaultLocale = ((_this_Internal_domainLocale = this[Internal].domainLocale) == null ? void 0 : _this_Internal_domainLocale.defaultLocale) || ((_this_Internal_options_nextConfig1 = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n1 = _this_Internal_options_nextConfig1.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n1.defaultLocale);
        this[Internal].url.pathname = info.pathname;
        this[Internal].defaultLocale = defaultLocale;
        this[Internal].basePath = info.basePath ?? "";
        this[Internal].buildId = info.buildId;
        this[Internal].locale = info.locale ?? defaultLocale;
        this[Internal].trailingSlash = info.trailingSlash;
    }
    formatPathname() {
        return formatNextPathnameInfo({
            basePath: this[Internal].basePath,
            buildId: this[Internal].buildId,
            defaultLocale: !this[Internal].options.forceLocale ? this[Internal].defaultLocale : undefined,
            locale: this[Internal].locale,
            pathname: this[Internal].url.pathname,
            trailingSlash: this[Internal].trailingSlash
        });
    }
    formatSearch() {
        return this[Internal].url.search;
    }
    get buildId() {
        return this[Internal].buildId;
    }
    set buildId(buildId) {
        this[Internal].buildId = buildId;
    }
    get locale() {
        return this[Internal].locale ?? "";
    }
    set locale(locale) {
        var _this_Internal_options_nextConfig_i18n, _this_Internal_options_nextConfig;
        if (!this[Internal].locale || !((_this_Internal_options_nextConfig = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n = _this_Internal_options_nextConfig.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n.locales.includes(locale))) {
            throw new TypeError(`The NextURL configuration includes no locale "${locale}"`);
        }
        this[Internal].locale = locale;
    }
    get defaultLocale() {
        return this[Internal].defaultLocale;
    }
    get domainLocale() {
        return this[Internal].domainLocale;
    }
    get searchParams() {
        return this[Internal].url.searchParams;
    }
    get host() {
        return this[Internal].url.host;
    }
    set host(value) {
        this[Internal].url.host = value;
    }
    get hostname() {
        return this[Internal].url.hostname;
    }
    set hostname(value) {
        this[Internal].url.hostname = value;
    }
    get port() {
        return this[Internal].url.port;
    }
    set port(value) {
        this[Internal].url.port = value;
    }
    get protocol() {
        return this[Internal].url.protocol;
    }
    set protocol(value) {
        this[Internal].url.protocol = value;
    }
    get href() {
        const pathname = this.formatPathname();
        const search = this.formatSearch();
        return `${this.protocol}//${this.host}${pathname}${search}${this.hash}`;
    }
    set href(url) {
        this[Internal].url = parseURL(url);
        this.analyze();
    }
    get origin() {
        return this[Internal].url.origin;
    }
    get pathname() {
        return this[Internal].url.pathname;
    }
    set pathname(value) {
        this[Internal].url.pathname = value;
    }
    get hash() {
        return this[Internal].url.hash;
    }
    set hash(value) {
        this[Internal].url.hash = value;
    }
    get search() {
        return this[Internal].url.search;
    }
    set search(value) {
        this[Internal].url.search = value;
    }
    get password() {
        return this[Internal].url.password;
    }
    set password(value) {
        this[Internal].url.password = value;
    }
    get username() {
        return this[Internal].url.username;
    }
    set username(value) {
        this[Internal].url.username = value;
    }
    get basePath() {
        return this[Internal].basePath;
    }
    set basePath(value) {
        this[Internal].basePath = value.startsWith("/") ? value : `/${value}`;
    }
    toString() {
        return this.href;
    }
    toJSON() {
        return this.href;
    }
    [Symbol.for("edge-runtime.inspect.custom")]() {
        return {
            href: this.href,
            origin: this.origin,
            protocol: this.protocol,
            username: this.username,
            password: this.password,
            host: this.host,
            hostname: this.hostname,
            port: this.port,
            pathname: this.pathname,
            search: this.search,
            searchParams: this.searchParams,
            hash: this.hash
        };
    }
    clone() {
        return new NextURL(String(this), this[Internal].options);
    }
}

//# sourceMappingURL=next-url.js.map
// EXTERNAL MODULE: ./node_modules/next/dist/compiled/@edge-runtime/cookies/index.js
var _edge_runtime_cookies = __webpack_require__(945);
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/cookies.js


//# sourceMappingURL=cookies.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/request.js




const INTERNALS = Symbol("internal request");
/**
 * This class extends the [Web `Request` API](https://developer.mozilla.org/docs/Web/API/Request) with additional convenience methods.
 *
 * Read more: [Next.js Docs: `NextRequest`](https://nextjs.org/docs/app/api-reference/functions/next-request)
 */ class NextRequest extends Request {
    constructor(input, init = {}){
        const url = typeof input !== "string" && "url" in input ? input.url : String(input);
        validateURL(url);
        if (input instanceof Request) super(input, init);
        else super(url, init);
        const nextUrl = new NextURL(url, {
            headers: toNodeOutgoingHttpHeaders(this.headers),
            nextConfig: init.nextConfig
        });
        this[INTERNALS] = {
            cookies: new _edge_runtime_cookies.RequestCookies(this.headers),
            geo: init.geo || {},
            ip: init.ip,
            nextUrl,
            url:  false ? 0 : nextUrl.toString()
        };
    }
    [Symbol.for("edge-runtime.inspect.custom")]() {
        return {
            cookies: this.cookies,
            geo: this.geo,
            ip: this.ip,
            nextUrl: this.nextUrl,
            url: this.url,
            // rest of props come from Request
            bodyUsed: this.bodyUsed,
            cache: this.cache,
            credentials: this.credentials,
            destination: this.destination,
            headers: Object.fromEntries(this.headers),
            integrity: this.integrity,
            keepalive: this.keepalive,
            method: this.method,
            mode: this.mode,
            redirect: this.redirect,
            referrer: this.referrer,
            referrerPolicy: this.referrerPolicy,
            signal: this.signal
        };
    }
    get cookies() {
        return this[INTERNALS].cookies;
    }
    get geo() {
        return this[INTERNALS].geo;
    }
    get ip() {
        return this[INTERNALS].ip;
    }
    get nextUrl() {
        return this[INTERNALS].nextUrl;
    }
    /**
   * @deprecated
   * `page` has been deprecated in favour of `URLPattern`.
   * Read more: https://nextjs.org/docs/messages/middleware-request-page
   */ get page() {
        throw new RemovedPageError();
    }
    /**
   * @deprecated
   * `ua` has been removed in favour of \`userAgent\` function.
   * Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
   */ get ua() {
        throw new RemovedUAError();
    }
    get url() {
        return this[INTERNALS].url;
    }
}

//# sourceMappingURL=request.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/adapters/reflect.js
class ReflectAdapter {
    static get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
            return value.bind(target);
        }
        return value;
    }
    static set(target, prop, value, receiver) {
        return Reflect.set(target, prop, value, receiver);
    }
    static has(target, prop) {
        return Reflect.has(target, prop);
    }
    static deleteProperty(target, prop) {
        return Reflect.deleteProperty(target, prop);
    }
}

//# sourceMappingURL=reflect.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/response.js





const response_INTERNALS = Symbol("internal response");
const REDIRECTS = new Set([
    301,
    302,
    303,
    307,
    308
]);
function handleMiddlewareField(init, headers) {
    var _init_request;
    if (init == null ? void 0 : (_init_request = init.request) == null ? void 0 : _init_request.headers) {
        if (!(init.request.headers instanceof Headers)) {
            throw new Error("request.headers must be an instance of Headers");
        }
        const keys = [];
        for (const [key, value] of init.request.headers){
            headers.set("x-middleware-request-" + key, value);
            keys.push(key);
        }
        headers.set("x-middleware-override-headers", keys.join(","));
    }
}
/**
 * This class extends the [Web `Response` API](https://developer.mozilla.org/docs/Web/API/Response) with additional convenience methods.
 *
 * Read more: [Next.js Docs: `NextResponse`](https://nextjs.org/docs/app/api-reference/functions/next-response)
 */ class NextResponse extends Response {
    constructor(body, init = {}){
        super(body, init);
        const headers = this.headers;
        const cookies = new _edge_runtime_cookies.ResponseCookies(headers);
        const cookiesProxy = new Proxy(cookies, {
            get (target, prop, receiver) {
                switch(prop){
                    case "delete":
                    case "set":
                        {
                            return (...args)=>{
                                const result = Reflect.apply(target[prop], target, args);
                                const newHeaders = new Headers(headers);
                                if (result instanceof _edge_runtime_cookies.ResponseCookies) {
                                    headers.set("x-middleware-set-cookie", result.getAll().map((cookie)=>(0,_edge_runtime_cookies.stringifyCookie)(cookie)).join(","));
                                }
                                handleMiddlewareField(init, newHeaders);
                                return result;
                            };
                        }
                    default:
                        return ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
        this[response_INTERNALS] = {
            cookies: cookiesProxy,
            url: init.url ? new NextURL(init.url, {
                headers: toNodeOutgoingHttpHeaders(headers),
                nextConfig: init.nextConfig
            }) : undefined
        };
    }
    [Symbol.for("edge-runtime.inspect.custom")]() {
        return {
            cookies: this.cookies,
            url: this.url,
            // rest of props come from Response
            body: this.body,
            bodyUsed: this.bodyUsed,
            headers: Object.fromEntries(this.headers),
            ok: this.ok,
            redirected: this.redirected,
            status: this.status,
            statusText: this.statusText,
            type: this.type
        };
    }
    get cookies() {
        return this[response_INTERNALS].cookies;
    }
    static json(body, init) {
        const response = Response.json(body, init);
        return new NextResponse(response.body, response);
    }
    static redirect(url, init) {
        const status = typeof init === "number" ? init : (init == null ? void 0 : init.status) ?? 307;
        if (!REDIRECTS.has(status)) {
            throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        const initObj = typeof init === "object" ? init : {};
        const headers = new Headers(initObj == null ? void 0 : initObj.headers);
        headers.set("Location", validateURL(url));
        return new NextResponse(null, {
            ...initObj,
            headers,
            status
        });
    }
    static rewrite(destination, init) {
        const headers = new Headers(init == null ? void 0 : init.headers);
        headers.set("x-middleware-rewrite", validateURL(destination));
        handleMiddlewareField(init, headers);
        return new NextResponse(null, {
            ...init,
            headers
        });
    }
    static next(init) {
        const headers = new Headers(init == null ? void 0 : init.headers);
        headers.set("x-middleware-next", "1");
        handleMiddlewareField(init, headers);
        return new NextResponse(null, {
            ...init,
            headers
        });
    }
}

//# sourceMappingURL=response.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/relativize-url.js
/**
 * Given a URL as a string and a base URL it will make the URL relative
 * if the parsed protocol and host is the same as the one in the base
 * URL. Otherwise it returns the same URL string.
 */ function relativizeURL(url, base) {
    const baseURL = typeof base === "string" ? new URL(base) : base;
    const relative = new URL(url, base);
    const origin = baseURL.protocol + "//" + baseURL.host;
    return relative.protocol + "//" + relative.host === origin ? relative.toString().replace(origin, "") : relative.toString();
} //# sourceMappingURL=relativize-url.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/client/components/app-router-headers.js
const RSC_HEADER = "RSC";
const ACTION = "Next-Action";
const NEXT_ROUTER_STATE_TREE = "Next-Router-State-Tree";
const NEXT_ROUTER_PREFETCH_HEADER = "Next-Router-Prefetch";
const NEXT_URL = "Next-Url";
const RSC_CONTENT_TYPE_HEADER = "text/x-component";
const FLIGHT_PARAMETERS = [
    [
        RSC_HEADER
    ],
    [
        NEXT_ROUTER_STATE_TREE
    ],
    [
        NEXT_ROUTER_PREFETCH_HEADER
    ]
];
const NEXT_RSC_UNION_QUERY = "_rsc";
const NEXT_DID_POSTPONE_HEADER = "x-nextjs-postponed"; //# sourceMappingURL=app-router-headers.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/internal-utils.js

const INTERNAL_QUERY_NAMES = [
    "__nextFallback",
    "__nextLocale",
    "__nextInferredLocaleFromDefault",
    "__nextDefaultLocale",
    "__nextIsNotFound",
    NEXT_RSC_UNION_QUERY
];
const EDGE_EXTENDED_INTERNAL_QUERY_NAMES = [
    "__nextDataReq"
];
function stripInternalQueries(query) {
    for (const name of INTERNAL_QUERY_NAMES){
        delete query[name];
    }
}
function stripInternalSearchParams(url, isEdge) {
    const isStringUrl = typeof url === "string";
    const instance = isStringUrl ? new URL(url) : url;
    for (const name of INTERNAL_QUERY_NAMES){
        instance.searchParams.delete(name);
    }
    if (isEdge) {
        for (const name of EDGE_EXTENDED_INTERNAL_QUERY_NAMES){
            instance.searchParams.delete(name);
        }
    }
    return isStringUrl ? instance.toString() : instance;
}

//# sourceMappingURL=internal-utils.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/shared/lib/router/utils/app-paths.js


/**
 * Normalizes an app route so it represents the actual request path. Essentially
 * performing the following transformations:
 *
 * - `/(dashboard)/user/[id]/page` to `/user/[id]`
 * - `/(dashboard)/account/page` to `/account`
 * - `/user/[id]/page` to `/user/[id]`
 * - `/account/page` to `/account`
 * - `/page` to `/`
 * - `/(dashboard)/user/[id]/route` to `/user/[id]`
 * - `/(dashboard)/account/route` to `/account`
 * - `/user/[id]/route` to `/user/[id]`
 * - `/account/route` to `/account`
 * - `/route` to `/`
 * - `/` to `/`
 *
 * @param route the app route to normalize
 * @returns the normalized pathname
 */ function normalizeAppPath(route) {
    return ensureLeadingSlash(route.split("/").reduce((pathname, segment, index, segments)=>{
        // Empty segments are ignored.
        if (!segment) {
            return pathname;
        }
        // Groups are ignored.
        if (isGroupSegment(segment)) {
            return pathname;
        }
        // Parallel segments are ignored.
        if (segment[0] === "@") {
            return pathname;
        }
        // The last segment (if it's a leaf) should be ignored.
        if ((segment === "page" || segment === "route") && index === segments.length - 1) {
            return pathname;
        }
        return pathname + "/" + segment;
    }, ""));
}
/**
 * Strips the `.rsc` extension if it's in the pathname.
 * Since this function is used on full urls it checks `?` for searchParams handling.
 */ function normalizeRscURL(url) {
    return url.replace(/\.rsc($|\?)/, "$1");
} //# sourceMappingURL=app-paths.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/lib/constants.js
const NEXT_QUERY_PARAM_PREFIX = "nxtP";
const PRERENDER_REVALIDATE_HEADER = "x-prerender-revalidate";
const PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER = "x-prerender-revalidate-if-generated";
const RSC_PREFETCH_SUFFIX = ".prefetch.rsc";
const RSC_SUFFIX = ".rsc";
const ACTION_SUFFIX = ".action";
const NEXT_DATA_SUFFIX = ".json";
const NEXT_META_SUFFIX = ".meta";
const NEXT_BODY_SUFFIX = ".body";
const NEXT_CACHE_TAGS_HEADER = "x-next-cache-tags";
const NEXT_CACHE_SOFT_TAGS_HEADER = "x-next-cache-soft-tags";
const NEXT_CACHE_REVALIDATED_TAGS_HEADER = "x-next-revalidated-tags";
const NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER = "x-next-revalidate-tag-token";
// if these change make sure we update the related
// documentation as well
const NEXT_CACHE_TAG_MAX_ITEMS = 64;
const NEXT_CACHE_TAG_MAX_LENGTH = 256;
const NEXT_CACHE_SOFT_TAG_MAX_LENGTH = 1024;
const NEXT_CACHE_IMPLICIT_TAG_ID = "_N_T_";
// in seconds
const CACHE_ONE_YEAR = 31536000;
// Patterns to detect middleware files
const MIDDLEWARE_FILENAME = "middleware";
const MIDDLEWARE_LOCATION_REGEXP = (/* unused pure expression or super */ null && (`(?:src/)?${MIDDLEWARE_FILENAME}`));
// Pattern to detect instrumentation hooks file
const INSTRUMENTATION_HOOK_FILENAME = "instrumentation";
// Because on Windows absolute paths in the generated code can break because of numbers, eg 1 in the path,
// we have to use a private alias
const PAGES_DIR_ALIAS = "private-next-pages";
const DOT_NEXT_ALIAS = "private-dot-next";
const ROOT_DIR_ALIAS = "private-next-root-dir";
const APP_DIR_ALIAS = "private-next-app-dir";
const RSC_MOD_REF_PROXY_ALIAS = "private-next-rsc-mod-ref-proxy";
const RSC_ACTION_VALIDATE_ALIAS = "private-next-rsc-action-validate";
const RSC_ACTION_PROXY_ALIAS = "private-next-rsc-server-reference";
const RSC_ACTION_ENCRYPTION_ALIAS = "private-next-rsc-action-encryption";
const RSC_ACTION_CLIENT_WRAPPER_ALIAS = "private-next-rsc-action-client-wrapper";
const PUBLIC_DIR_MIDDLEWARE_CONFLICT = (/* unused pure expression or super */ null && (`You can not have a '_next' folder inside of your public folder. This conflicts with the internal '/_next' route. https://nextjs.org/docs/messages/public-next-folder-conflict`));
const SSG_GET_INITIAL_PROPS_CONFLICT = (/* unused pure expression or super */ null && (`You can not use getInitialProps with getStaticProps. To use SSG, please remove your getInitialProps`));
const SERVER_PROPS_GET_INIT_PROPS_CONFLICT = (/* unused pure expression or super */ null && (`You can not use getInitialProps with getServerSideProps. Please remove getInitialProps.`));
const SERVER_PROPS_SSG_CONFLICT = (/* unused pure expression or super */ null && (`You can not use getStaticProps or getStaticPaths with getServerSideProps. To use SSG, please remove getServerSideProps`));
const STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR = (/* unused pure expression or super */ null && (`can not have getInitialProps/getServerSideProps, https://nextjs.org/docs/messages/404-get-initial-props`));
const SERVER_PROPS_EXPORT_ERROR = (/* unused pure expression or super */ null && (`pages with \`getServerSideProps\` can not be exported. See more info here: https://nextjs.org/docs/messages/gssp-export`));
const GSP_NO_RETURNED_VALUE = "Your `getStaticProps` function did not return an object. Did you forget to add a `return`?";
const GSSP_NO_RETURNED_VALUE = "Your `getServerSideProps` function did not return an object. Did you forget to add a `return`?";
const UNSTABLE_REVALIDATE_RENAME_ERROR = (/* unused pure expression or super */ null && ("The `unstable_revalidate` property is available for general use.\n" + "Please use `revalidate` instead."));
const GSSP_COMPONENT_MEMBER_ERROR = (/* unused pure expression or super */ null && (`can not be attached to a page's component and must be exported from the page. See more info here: https://nextjs.org/docs/messages/gssp-component-member`));
const NON_STANDARD_NODE_ENV = (/* unused pure expression or super */ null && (`You are using a non-standard "NODE_ENV" value in your environment. This creates inconsistencies in the project and is strongly advised against. Read more: https://nextjs.org/docs/messages/non-standard-node-env`));
const SSG_FALLBACK_EXPORT_ERROR = (/* unused pure expression or super */ null && (`Pages with \`fallback\` enabled in \`getStaticPaths\` can not be exported. See more info here: https://nextjs.org/docs/messages/ssg-fallback-true-export`));
const ESLINT_DEFAULT_DIRS = (/* unused pure expression or super */ null && ([
    "app",
    "pages",
    "components",
    "lib",
    "src"
]));
const SERVER_RUNTIME = {
    edge: "edge",
    experimentalEdge: "experimental-edge",
    nodejs: "nodejs"
};
/**
 * The names of the webpack layers. These layers are the primitives for the
 * webpack chunks.
 */ const WEBPACK_LAYERS_NAMES = {
    /**
   * The layer for the shared code between the client and server bundles.
   */ shared: "shared",
    /**
   * React Server Components layer (rsc).
   */ reactServerComponents: "rsc",
    /**
   * Server Side Rendering layer for app (ssr).
   */ serverSideRendering: "ssr",
    /**
   * The browser client bundle layer for actions.
   */ actionBrowser: "action-browser",
    /**
   * The layer for the API routes.
   */ api: "api",
    /**
   * The layer for the middleware code.
   */ middleware: "middleware",
    /**
   * The layer for the instrumentation hooks.
   */ instrument: "instrument",
    /**
   * The layer for assets on the edge.
   */ edgeAsset: "edge-asset",
    /**
   * The browser client bundle layer for App directory.
   */ appPagesBrowser: "app-pages-browser",
    /**
   * The server bundle layer for metadata routes.
   */ appMetadataRoute: "app-metadata-route",
    /**
   * The layer for the server bundle for App Route handlers.
   */ appRouteHandler: "app-route-handler"
};
const WEBPACK_LAYERS = {
    ...WEBPACK_LAYERS_NAMES,
    GROUP: {
        serverOnly: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.appMetadataRoute,
            WEBPACK_LAYERS_NAMES.appRouteHandler,
            WEBPACK_LAYERS_NAMES.instrument
        ],
        clientOnly: [
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser
        ],
        nonClientServerTarget: [
            // middleware and pages api
            WEBPACK_LAYERS_NAMES.middleware,
            WEBPACK_LAYERS_NAMES.api
        ],
        app: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.appMetadataRoute,
            WEBPACK_LAYERS_NAMES.appRouteHandler,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.shared,
            WEBPACK_LAYERS_NAMES.instrument
        ]
    }
};
const WEBPACK_RESOURCE_QUERIES = {
    edgeSSREntry: "__next_edge_ssr_entry__",
    metadata: "__next_metadata__",
    metadataRoute: "__next_metadata_route__",
    metadataImageMeta: "__next_metadata_image_meta__"
};


//# sourceMappingURL=constants.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/adapters/headers.js

/**
 * @internal
 */ class ReadonlyHeadersError extends Error {
    constructor(){
        super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
    }
    static callable() {
        throw new ReadonlyHeadersError();
    }
}
class HeadersAdapter extends Headers {
    constructor(headers){
        // We've already overridden the methods that would be called, so we're just
        // calling the super constructor to ensure that the instanceof check works.
        super();
        this.headers = new Proxy(headers, {
            get (target, prop, receiver) {
                // Because this is just an object, we expect that all "get" operations
                // are for properties. If it's a "get" for a symbol, we'll just return
                // the symbol.
                if (typeof prop === "symbol") {
                    return ReflectAdapter.get(target, prop, receiver);
                }
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, return undefined.
                if (typeof original === "undefined") return;
                // If the original casing exists, return the value.
                return ReflectAdapter.get(target, original, receiver);
            },
            set (target, prop, value, receiver) {
                if (typeof prop === "symbol") {
                    return ReflectAdapter.set(target, prop, value, receiver);
                }
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, use the prop as the key.
                return ReflectAdapter.set(target, original ?? prop, value, receiver);
            },
            has (target, prop) {
                if (typeof prop === "symbol") return ReflectAdapter.has(target, prop);
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, return false.
                if (typeof original === "undefined") return false;
                // If the original casing exists, return true.
                return ReflectAdapter.has(target, original);
            },
            deleteProperty (target, prop) {
                if (typeof prop === "symbol") return ReflectAdapter.deleteProperty(target, prop);
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, return true.
                if (typeof original === "undefined") return true;
                // If the original casing exists, delete the property.
                return ReflectAdapter.deleteProperty(target, original);
            }
        });
    }
    /**
   * Seals a Headers instance to prevent modification by throwing an error when
   * any mutating method is called.
   */ static seal(headers) {
        return new Proxy(headers, {
            get (target, prop, receiver) {
                switch(prop){
                    case "append":
                    case "delete":
                    case "set":
                        return ReadonlyHeadersError.callable;
                    default:
                        return ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
    }
    /**
   * Merges a header value into a string. This stores multiple values as an
   * array, so we need to merge them into a string.
   *
   * @param value a header value
   * @returns a merged header value (a string)
   */ merge(value) {
        if (Array.isArray(value)) return value.join(", ");
        return value;
    }
    /**
   * Creates a Headers instance from a plain object or a Headers instance.
   *
   * @param headers a plain object or a Headers instance
   * @returns a headers instance
   */ static from(headers) {
        if (headers instanceof Headers) return headers;
        return new HeadersAdapter(headers);
    }
    append(name, value) {
        const existing = this.headers[name];
        if (typeof existing === "string") {
            this.headers[name] = [
                existing,
                value
            ];
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            this.headers[name] = value;
        }
    }
    delete(name) {
        delete this.headers[name];
    }
    get(name) {
        const value = this.headers[name];
        if (typeof value !== "undefined") return this.merge(value);
        return null;
    }
    has(name) {
        return typeof this.headers[name] !== "undefined";
    }
    set(name, value) {
        this.headers[name] = value;
    }
    forEach(callbackfn, thisArg) {
        for (const [name, value] of this.entries()){
            callbackfn.call(thisArg, value, name, this);
        }
    }
    *entries() {
        for (const key of Object.keys(this.headers)){
            const name = key.toLowerCase();
            // We assert here that this is a string because we got it from the
            // Object.keys() call above.
            const value = this.get(name);
            yield [
                name,
                value
            ];
        }
    }
    *keys() {
        for (const key of Object.keys(this.headers)){
            const name = key.toLowerCase();
            yield name;
        }
    }
    *values() {
        for (const key of Object.keys(this.headers)){
            // We assert here that this is a string because we got it from the
            // Object.keys() call above.
            const value = this.get(key);
            yield value;
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}

//# sourceMappingURL=headers.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/client/components/async-local-storage.js
const sharedAsyncLocalStorageNotAvailableError = new Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available");
class FakeAsyncLocalStorage {
    disable() {
        throw sharedAsyncLocalStorageNotAvailableError;
    }
    getStore() {
        // This fake implementation of AsyncLocalStorage always returns `undefined`.
        return undefined;
    }
    run() {
        throw sharedAsyncLocalStorageNotAvailableError;
    }
    exit() {
        throw sharedAsyncLocalStorageNotAvailableError;
    }
    enterWith() {
        throw sharedAsyncLocalStorageNotAvailableError;
    }
}
const maybeGlobalAsyncLocalStorage = globalThis.AsyncLocalStorage;
function createAsyncLocalStorage() {
    if (maybeGlobalAsyncLocalStorage) {
        return new maybeGlobalAsyncLocalStorage();
    }
    return new FakeAsyncLocalStorage();
} //# sourceMappingURL=async-local-storage.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/client/components/static-generation-async-storage-instance.js

const staticGenerationAsyncStorage = createAsyncLocalStorage(); //# sourceMappingURL=static-generation-async-storage-instance.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/client/components/static-generation-async-storage.external.js
"TURBOPACK { transition: next-shared }";

 //# sourceMappingURL=static-generation-async-storage.external.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/adapters/request-cookies.js



/**
 * @internal
 */ class ReadonlyRequestCookiesError extends Error {
    constructor(){
        super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options");
    }
    static callable() {
        throw new ReadonlyRequestCookiesError();
    }
}
class RequestCookiesAdapter {
    static seal(cookies) {
        return new Proxy(cookies, {
            get (target, prop, receiver) {
                switch(prop){
                    case "clear":
                    case "delete":
                    case "set":
                        return ReadonlyRequestCookiesError.callable;
                    default:
                        return ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
    }
}
const SYMBOL_MODIFY_COOKIE_VALUES = Symbol.for("next.mutated.cookies");
function getModifiedCookieValues(cookies) {
    const modified = cookies[SYMBOL_MODIFY_COOKIE_VALUES];
    if (!modified || !Array.isArray(modified) || modified.length === 0) {
        return [];
    }
    return modified;
}
function appendMutableCookies(headers, mutableCookies) {
    const modifiedCookieValues = getModifiedCookieValues(mutableCookies);
    if (modifiedCookieValues.length === 0) {
        return false;
    }
    // Return a new response that extends the response with
    // the modified cookies as fallbacks. `res` cookies
    // will still take precedence.
    const resCookies = new ResponseCookies(headers);
    const returnedCookies = resCookies.getAll();
    // Set the modified cookies as fallbacks.
    for (const cookie of modifiedCookieValues){
        resCookies.set(cookie);
    }
    // Set the original cookies as the final values.
    for (const cookie of returnedCookies){
        resCookies.set(cookie);
    }
    return true;
}
class MutableRequestCookiesAdapter {
    static wrap(cookies, onUpdateCookies) {
        const responseCookies = new _edge_runtime_cookies.ResponseCookies(new Headers());
        for (const cookie of cookies.getAll()){
            responseCookies.set(cookie);
        }
        let modifiedValues = [];
        const modifiedCookies = new Set();
        const updateResponseCookies = ()=>{
            // TODO-APP: change method of getting staticGenerationAsyncStore
            const staticGenerationAsyncStore = staticGenerationAsyncStorage.getStore();
            if (staticGenerationAsyncStore) {
                staticGenerationAsyncStore.pathWasRevalidated = true;
            }
            const allCookies = responseCookies.getAll();
            modifiedValues = allCookies.filter((c)=>modifiedCookies.has(c.name));
            if (onUpdateCookies) {
                const serializedCookies = [];
                for (const cookie of modifiedValues){
                    const tempCookies = new _edge_runtime_cookies.ResponseCookies(new Headers());
                    tempCookies.set(cookie);
                    serializedCookies.push(tempCookies.toString());
                }
                onUpdateCookies(serializedCookies);
            }
        };
        return new Proxy(responseCookies, {
            get (target, prop, receiver) {
                switch(prop){
                    // A special symbol to get the modified cookie values
                    case SYMBOL_MODIFY_COOKIE_VALUES:
                        return modifiedValues;
                    // TODO: Throw error if trying to set a cookie after the response
                    // headers have been set.
                    case "delete":
                        return function(...args) {
                            modifiedCookies.add(typeof args[0] === "string" ? args[0] : args[0].name);
                            try {
                                target.delete(...args);
                            } finally{
                                updateResponseCookies();
                            }
                        };
                    case "set":
                        return function(...args) {
                            modifiedCookies.add(typeof args[0] === "string" ? args[0] : args[0].name);
                            try {
                                return target.set(...args);
                            } finally{
                                updateResponseCookies();
                            }
                        };
                    default:
                        return ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
    }
}

//# sourceMappingURL=request-cookies.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/lib/trace/constants.js
/**
 * Contains predefined constants for the trace span name in next/server.
 *
 * Currently, next/server/tracer is internal implementation only for tracking
 * next.js's implementation only with known span names defined here.
 **/ // eslint typescript has a bug with TS enums
/* eslint-disable no-shadow */ var BaseServerSpan;
(function(BaseServerSpan) {
    BaseServerSpan["handleRequest"] = "BaseServer.handleRequest";
    BaseServerSpan["run"] = "BaseServer.run";
    BaseServerSpan["pipe"] = "BaseServer.pipe";
    BaseServerSpan["getStaticHTML"] = "BaseServer.getStaticHTML";
    BaseServerSpan["render"] = "BaseServer.render";
    BaseServerSpan["renderToResponseWithComponents"] = "BaseServer.renderToResponseWithComponents";
    BaseServerSpan["renderToResponse"] = "BaseServer.renderToResponse";
    BaseServerSpan["renderToHTML"] = "BaseServer.renderToHTML";
    BaseServerSpan["renderError"] = "BaseServer.renderError";
    BaseServerSpan["renderErrorToResponse"] = "BaseServer.renderErrorToResponse";
    BaseServerSpan["renderErrorToHTML"] = "BaseServer.renderErrorToHTML";
    BaseServerSpan["render404"] = "BaseServer.render404";
})(BaseServerSpan || (BaseServerSpan = {}));
var LoadComponentsSpan;
(function(LoadComponentsSpan) {
    LoadComponentsSpan["loadDefaultErrorComponents"] = "LoadComponents.loadDefaultErrorComponents";
    LoadComponentsSpan["loadComponents"] = "LoadComponents.loadComponents";
})(LoadComponentsSpan || (LoadComponentsSpan = {}));
var NextServerSpan;
(function(NextServerSpan) {
    NextServerSpan["getRequestHandler"] = "NextServer.getRequestHandler";
    NextServerSpan["getServer"] = "NextServer.getServer";
    NextServerSpan["getServerRequestHandler"] = "NextServer.getServerRequestHandler";
    NextServerSpan["createServer"] = "createServer.createServer";
})(NextServerSpan || (NextServerSpan = {}));
var NextNodeServerSpan;
(function(NextNodeServerSpan) {
    NextNodeServerSpan["compression"] = "NextNodeServer.compression";
    NextNodeServerSpan["getBuildId"] = "NextNodeServer.getBuildId";
    NextNodeServerSpan["createComponentTree"] = "NextNodeServer.createComponentTree";
    NextNodeServerSpan["clientComponentLoading"] = "NextNodeServer.clientComponentLoading";
    NextNodeServerSpan["getLayoutOrPageModule"] = "NextNodeServer.getLayoutOrPageModule";
    NextNodeServerSpan["generateStaticRoutes"] = "NextNodeServer.generateStaticRoutes";
    NextNodeServerSpan["generateFsStaticRoutes"] = "NextNodeServer.generateFsStaticRoutes";
    NextNodeServerSpan["generatePublicRoutes"] = "NextNodeServer.generatePublicRoutes";
    NextNodeServerSpan["generateImageRoutes"] = "NextNodeServer.generateImageRoutes.route";
    NextNodeServerSpan["sendRenderResult"] = "NextNodeServer.sendRenderResult";
    NextNodeServerSpan["proxyRequest"] = "NextNodeServer.proxyRequest";
    NextNodeServerSpan["runApi"] = "NextNodeServer.runApi";
    NextNodeServerSpan["render"] = "NextNodeServer.render";
    NextNodeServerSpan["renderHTML"] = "NextNodeServer.renderHTML";
    NextNodeServerSpan["imageOptimizer"] = "NextNodeServer.imageOptimizer";
    NextNodeServerSpan["getPagePath"] = "NextNodeServer.getPagePath";
    NextNodeServerSpan["getRoutesManifest"] = "NextNodeServer.getRoutesManifest";
    NextNodeServerSpan["findPageComponents"] = "NextNodeServer.findPageComponents";
    NextNodeServerSpan["getFontManifest"] = "NextNodeServer.getFontManifest";
    NextNodeServerSpan["getServerComponentManifest"] = "NextNodeServer.getServerComponentManifest";
    NextNodeServerSpan["getRequestHandler"] = "NextNodeServer.getRequestHandler";
    NextNodeServerSpan["renderToHTML"] = "NextNodeServer.renderToHTML";
    NextNodeServerSpan["renderError"] = "NextNodeServer.renderError";
    NextNodeServerSpan["renderErrorToHTML"] = "NextNodeServer.renderErrorToHTML";
    NextNodeServerSpan["render404"] = "NextNodeServer.render404";
    NextNodeServerSpan["startResponse"] = "NextNodeServer.startResponse";
    // nested inner span, does not require parent scope name
    NextNodeServerSpan["route"] = "route";
    NextNodeServerSpan["onProxyReq"] = "onProxyReq";
    NextNodeServerSpan["apiResolver"] = "apiResolver";
    NextNodeServerSpan["internalFetch"] = "internalFetch";
})(NextNodeServerSpan || (NextNodeServerSpan = {}));
var StartServerSpan;
(function(StartServerSpan) {
    StartServerSpan["startServer"] = "startServer.startServer";
})(StartServerSpan || (StartServerSpan = {}));
var RenderSpan;
(function(RenderSpan) {
    RenderSpan["getServerSideProps"] = "Render.getServerSideProps";
    RenderSpan["getStaticProps"] = "Render.getStaticProps";
    RenderSpan["renderToString"] = "Render.renderToString";
    RenderSpan["renderDocument"] = "Render.renderDocument";
    RenderSpan["createBodyResult"] = "Render.createBodyResult";
})(RenderSpan || (RenderSpan = {}));
var AppRenderSpan;
(function(AppRenderSpan) {
    AppRenderSpan["renderToString"] = "AppRender.renderToString";
    AppRenderSpan["renderToReadableStream"] = "AppRender.renderToReadableStream";
    AppRenderSpan["getBodyResult"] = "AppRender.getBodyResult";
    AppRenderSpan["fetch"] = "AppRender.fetch";
})(AppRenderSpan || (AppRenderSpan = {}));
var RouterSpan;
(function(RouterSpan) {
    RouterSpan["executeRoute"] = "Router.executeRoute";
})(RouterSpan || (RouterSpan = {}));
var constants_NodeSpan;
(function(NodeSpan) {
    NodeSpan["runHandler"] = "Node.runHandler";
})(constants_NodeSpan || (constants_NodeSpan = {}));
var AppRouteRouteHandlersSpan;
(function(AppRouteRouteHandlersSpan) {
    AppRouteRouteHandlersSpan["runHandler"] = "AppRouteRouteHandlers.runHandler";
})(AppRouteRouteHandlersSpan || (AppRouteRouteHandlersSpan = {}));
var ResolveMetadataSpan;
(function(ResolveMetadataSpan) {
    ResolveMetadataSpan["generateMetadata"] = "ResolveMetadata.generateMetadata";
    ResolveMetadataSpan["generateViewport"] = "ResolveMetadata.generateViewport";
})(ResolveMetadataSpan || (ResolveMetadataSpan = {}));
var MiddlewareSpan;
(function(MiddlewareSpan) {
    MiddlewareSpan["execute"] = "Middleware.execute";
})(MiddlewareSpan || (MiddlewareSpan = {}));
// This list is used to filter out spans that are not relevant to the user
const NextVanillaSpanAllowlist = [
    "Middleware.execute",
    "BaseServer.handleRequest",
    "Render.getServerSideProps",
    "Render.getStaticProps",
    "AppRender.fetch",
    "AppRender.getBodyResult",
    "Render.renderDocument",
    "Node.runHandler",
    "AppRouteRouteHandlers.runHandler",
    "ResolveMetadata.generateMetadata",
    "ResolveMetadata.generateViewport",
    "NextNodeServer.createComponentTree",
    "NextNodeServer.findPageComponents",
    "NextNodeServer.getLayoutOrPageModule",
    "NextNodeServer.startResponse",
    "NextNodeServer.clientComponentLoading"
];
// These Spans are allowed to be always logged
// when the otel log prefix env is set
const LogSpanAllowList = [
    "NextNodeServer.findPageComponents",
    "NextNodeServer.createComponentTree",
    "NextNodeServer.clientComponentLoading"
];


//# sourceMappingURL=constants.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/lib/trace/tracer.js

let api;
// we want to allow users to use their own version of @opentelemetry/api if they
// want to, so we try to require it first, and if it fails we fall back to the
// version that is bundled with Next.js
// this is because @opentelemetry/api has to be synced with the version of
// @opentelemetry/tracing that is used, and we don't want to force users to use
// the version that is bundled with Next.js.
// the API is ~stable, so this should be fine
if (true) {
    api = __webpack_require__(439);
} else {}
const { context, propagation, trace, SpanStatusCode, SpanKind, ROOT_CONTEXT } = api;
const isPromise = (p)=>{
    return p !== null && typeof p === "object" && typeof p.then === "function";
};
const closeSpanWithError = (span, error)=>{
    if ((error == null ? void 0 : error.bubble) === true) {
        span.setAttribute("next.bubble", true);
    } else {
        if (error) {
            span.recordException(error);
        }
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error == null ? void 0 : error.message
        });
    }
    span.end();
};
/** we use this map to propagate attributes from nested spans to the top span */ const rootSpanAttributesStore = new Map();
const rootSpanIdKey = api.createContextKey("next.rootSpanId");
let lastSpanId = 0;
const getSpanId = ()=>lastSpanId++;
class NextTracerImpl {
    /**
   * Returns an instance to the trace with configured name.
   * Since wrap / trace can be defined in any place prior to actual trace subscriber initialization,
   * This should be lazily evaluated.
   */ getTracerInstance() {
        return trace.getTracer("next.js", "0.0.1");
    }
    getContext() {
        return context;
    }
    getActiveScopeSpan() {
        return trace.getSpan(context == null ? void 0 : context.active());
    }
    withPropagatedContext(carrier, fn, getter) {
        const activeContext = context.active();
        if (trace.getSpanContext(activeContext)) {
            // Active span is already set, too late to propagate.
            return fn();
        }
        const remoteContext = propagation.extract(activeContext, carrier, getter);
        return context.with(remoteContext, fn);
    }
    trace(...args) {
        var _trace_getSpanContext;
        const [type, fnOrOptions, fnOrEmpty] = args;
        // coerce options form overload
        const { fn, options } = typeof fnOrOptions === "function" ? {
            fn: fnOrOptions,
            options: {}
        } : {
            fn: fnOrEmpty,
            options: {
                ...fnOrOptions
            }
        };
        const spanName = options.spanName ?? type;
        if (!NextVanillaSpanAllowlist.includes(type) && process.env.NEXT_OTEL_VERBOSE !== "1" || options.hideSpan) {
            return fn();
        }
        // Trying to get active scoped span to assign parent. If option specifies parent span manually, will try to use it.
        let spanContext = this.getSpanContext((options == null ? void 0 : options.parentSpan) ?? this.getActiveScopeSpan());
        let isRootSpan = false;
        if (!spanContext) {
            spanContext = (context == null ? void 0 : context.active()) ?? ROOT_CONTEXT;
            isRootSpan = true;
        } else if ((_trace_getSpanContext = trace.getSpanContext(spanContext)) == null ? void 0 : _trace_getSpanContext.isRemote) {
            isRootSpan = true;
        }
        const spanId = getSpanId();
        options.attributes = {
            "next.span_name": spanName,
            "next.span_type": type,
            ...options.attributes
        };
        return context.with(spanContext.setValue(rootSpanIdKey, spanId), ()=>this.getTracerInstance().startActiveSpan(spanName, options, (span)=>{
                const startTime = "performance" in globalThis ? globalThis.performance.now() : undefined;
                const onCleanup = ()=>{
                    rootSpanAttributesStore.delete(spanId);
                    if (startTime && process.env.NEXT_OTEL_PERFORMANCE_PREFIX && LogSpanAllowList.includes(type || "")) {
                        performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-${(type.split(".").pop() || "").replace(/[A-Z]/g, (match)=>"-" + match.toLowerCase())}`, {
                            start: startTime,
                            end: performance.now()
                        });
                    }
                };
                if (isRootSpan) {
                    rootSpanAttributesStore.set(spanId, new Map(Object.entries(options.attributes ?? {})));
                }
                try {
                    if (fn.length > 1) {
                        return fn(span, (err)=>closeSpanWithError(span, err));
                    }
                    const result = fn(span);
                    if (isPromise(result)) {
                        // If there's error make sure it throws
                        return result.then((res)=>{
                            span.end();
                            // Need to pass down the promise result,
                            // it could be react stream response with error { error, stream }
                            return res;
                        }).catch((err)=>{
                            closeSpanWithError(span, err);
                            throw err;
                        }).finally(onCleanup);
                    } else {
                        span.end();
                        onCleanup();
                    }
                    return result;
                } catch (err) {
                    closeSpanWithError(span, err);
                    onCleanup();
                    throw err;
                }
            }));
    }
    wrap(...args) {
        const tracer = this;
        const [name, options, fn] = args.length === 3 ? args : [
            args[0],
            {},
            args[1]
        ];
        if (!NextVanillaSpanAllowlist.includes(name) && process.env.NEXT_OTEL_VERBOSE !== "1") {
            return fn;
        }
        return function() {
            let optionsObj = options;
            if (typeof optionsObj === "function" && typeof fn === "function") {
                optionsObj = optionsObj.apply(this, arguments);
            }
            const lastArgId = arguments.length - 1;
            const cb = arguments[lastArgId];
            if (typeof cb === "function") {
                const scopeBoundCb = tracer.getContext().bind(context.active(), cb);
                return tracer.trace(name, optionsObj, (_span, done)=>{
                    arguments[lastArgId] = function(err) {
                        done == null ? void 0 : done(err);
                        return scopeBoundCb.apply(this, arguments);
                    };
                    return fn.apply(this, arguments);
                });
            } else {
                return tracer.trace(name, optionsObj, ()=>fn.apply(this, arguments));
            }
        };
    }
    startSpan(...args) {
        const [type, options] = args;
        const spanContext = this.getSpanContext((options == null ? void 0 : options.parentSpan) ?? this.getActiveScopeSpan());
        return this.getTracerInstance().startSpan(type, options, spanContext);
    }
    getSpanContext(parentSpan) {
        const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined;
        return spanContext;
    }
    getRootSpanAttributes() {
        const spanId = context.active().getValue(rootSpanIdKey);
        return rootSpanAttributesStore.get(spanId);
    }
}
const tracer_getTracer = (()=>{
    const tracer = new NextTracerImpl();
    return ()=>tracer;
})();


//# sourceMappingURL=tracer.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/api-utils/index.js




function wrapApiHandler(page, handler) {
    return (...args)=>{
        var _getTracer_getRootSpanAttributes;
        (_getTracer_getRootSpanAttributes = getTracer().getRootSpanAttributes()) == null ? void 0 : _getTracer_getRootSpanAttributes.set("next.route", page);
        // Call API route method
        return getTracer().trace(NodeSpan.runHandler, {
            spanName: `executing api route (pages) ${page}`
        }, ()=>handler(...args));
    };
}
/**
 *
 * @param res response object
 * @param statusCode `HTTP` status code of response
 */ function sendStatusCode(res, statusCode) {
    res.statusCode = statusCode;
    return res;
}
/**
 *
 * @param res response object
 * @param [statusOrUrl] `HTTP` status code of redirect
 * @param url URL of redirect
 */ function redirect(res, statusOrUrl, url) {
    if (typeof statusOrUrl === "string") {
        url = statusOrUrl;
        statusOrUrl = 307;
    }
    if (typeof statusOrUrl !== "number" || typeof url !== "string") {
        throw new Error(`Invalid redirect arguments. Please use a single argument URL, e.g. res.redirect('/destination') or use a status code and URL, e.g. res.redirect(307, '/destination').`);
    }
    res.writeHead(statusOrUrl, {
        Location: url
    });
    res.write(url);
    res.end();
    return res;
}
function checkIsOnDemandRevalidate(req, previewProps) {
    const headers = HeadersAdapter.from(req.headers);
    const previewModeId = headers.get(PRERENDER_REVALIDATE_HEADER);
    const isOnDemandRevalidate = previewModeId === previewProps.previewModeId;
    const revalidateOnlyGenerated = headers.has(PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER);
    return {
        isOnDemandRevalidate,
        revalidateOnlyGenerated
    };
}
const COOKIE_NAME_PRERENDER_BYPASS = `__prerender_bypass`;
const COOKIE_NAME_PRERENDER_DATA = `__next_preview_data`;
const RESPONSE_LIMIT_DEFAULT = (/* unused pure expression or super */ null && (4 * 1024 * 1024));
const SYMBOL_PREVIEW_DATA = Symbol(COOKIE_NAME_PRERENDER_DATA);
const SYMBOL_CLEARED_COOKIES = Symbol(COOKIE_NAME_PRERENDER_BYPASS);
function clearPreviewData(res, options = {}) {
    if (SYMBOL_CLEARED_COOKIES in res) {
        return res;
    }
    const { serialize } = __webpack_require__(133);
    const previous = res.getHeader("Set-Cookie");
    res.setHeader(`Set-Cookie`, [
        ...typeof previous === "string" ? [
            previous
        ] : Array.isArray(previous) ? previous : [],
        serialize(COOKIE_NAME_PRERENDER_BYPASS, "", {
            // To delete a cookie, set `expires` to a date in the past:
            // https://tools.ietf.org/html/rfc6265#section-4.1.1
            // `Max-Age: 0` is not valid, thus ignored, and the cookie is persisted.
            expires: new Date(0),
            httpOnly: true,
            sameSite:  true ? "none" : 0,
            secure: "production" !== "development",
            path: "/",
            ...options.path !== undefined ? {
                path: options.path
            } : undefined
        }),
        serialize(COOKIE_NAME_PRERENDER_DATA, "", {
            // To delete a cookie, set `expires` to a date in the past:
            // https://tools.ietf.org/html/rfc6265#section-4.1.1
            // `Max-Age: 0` is not valid, thus ignored, and the cookie is persisted.
            expires: new Date(0),
            httpOnly: true,
            sameSite:  true ? "none" : 0,
            secure: "production" !== "development",
            path: "/",
            ...options.path !== undefined ? {
                path: options.path
            } : undefined
        })
    ]);
    Object.defineProperty(res, SYMBOL_CLEARED_COOKIES, {
        value: true,
        enumerable: false
    });
    return res;
}
/**
 * Custom error class
 */ class ApiError extends Error {
    constructor(statusCode, message){
        super(message);
        this.statusCode = statusCode;
    }
}
/**
 * Sends error in `response`
 * @param res response object
 * @param statusCode of response
 * @param message of response
 */ function sendError(res, statusCode, message) {
    res.statusCode = statusCode;
    res.statusMessage = message;
    res.end(message);
}
/**
 * Execute getter function only if its needed
 * @param LazyProps `req` and `params` for lazyProp
 * @param prop name of property
 * @param getter function to get data
 */ function setLazyProp({ req }, prop, getter) {
    const opts = {
        configurable: true,
        enumerable: true
    };
    const optsReset = {
        ...opts,
        writable: true
    };
    Object.defineProperty(req, prop, {
        ...opts,
        get: ()=>{
            const value = getter();
            // we set the property on the object to avoid recalculating it
            Object.defineProperty(req, prop, {
                ...optsReset,
                value
            });
            return value;
        },
        set: (value)=>{
            Object.defineProperty(req, prop, {
                ...optsReset,
                value
            });
        }
    });
}

//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/async-storage/draft-mode-provider.js

class DraftModeProvider {
    constructor(previewProps, req, cookies, mutableCookies){
        var _cookies_get;
        // The logic for draftMode() is very similar to tryGetPreviewData()
        // but Draft Mode does not have any data associated with it.
        const isOnDemandRevalidate = previewProps && checkIsOnDemandRevalidate(req, previewProps).isOnDemandRevalidate;
        const cookieValue = (_cookies_get = cookies.get(COOKIE_NAME_PRERENDER_BYPASS)) == null ? void 0 : _cookies_get.value;
        this.isEnabled = Boolean(!isOnDemandRevalidate && cookieValue && previewProps && (cookieValue === previewProps.previewModeId || // In dev mode, the cookie can be actual hash value preview id but the preview props can still be `development-id`.
         false && 0));
        this._previewModeId = previewProps == null ? void 0 : previewProps.previewModeId;
        this._mutableCookies = mutableCookies;
    }
    enable() {
        if (!this._previewModeId) {
            throw new Error("Invariant: previewProps missing previewModeId this should never happen");
        }
        this._mutableCookies.set({
            name: COOKIE_NAME_PRERENDER_BYPASS,
            value: this._previewModeId,
            httpOnly: true,
            sameSite:  true ? "none" : 0,
            secure: "production" !== "development",
            path: "/"
        });
    }
    disable() {
        // To delete a cookie, set `expires` to a date in the past:
        // https://tools.ietf.org/html/rfc6265#section-4.1.1
        // `Max-Age: 0` is not valid, thus ignored, and the cookie is persisted.
        this._mutableCookies.set({
            name: COOKIE_NAME_PRERENDER_BYPASS,
            value: "",
            httpOnly: true,
            sameSite:  true ? "none" : 0,
            secure: "production" !== "development",
            path: "/",
            expires: new Date(0)
        });
    }
}

//# sourceMappingURL=draft-mode-provider.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/async-storage/request-async-storage-wrapper.js






function getHeaders(headers) {
    const cleaned = HeadersAdapter.from(headers);
    for (const param of FLIGHT_PARAMETERS){
        cleaned.delete(param.toString().toLowerCase());
    }
    return HeadersAdapter.seal(cleaned);
}
function getMutableCookies(headers, onUpdateCookies) {
    const cookies = new _edge_runtime_cookies.RequestCookies(HeadersAdapter.from(headers));
    return MutableRequestCookiesAdapter.wrap(cookies, onUpdateCookies);
}
/**
 * If middleware set cookies in this request (indicated by `x-middleware-set-cookie`),
 * then merge those into the existing cookie object, so that when `cookies()` is accessed
 * it's able to read the newly set cookies.
 */ function mergeMiddlewareCookies(req, existingCookies) {
    if ("x-middleware-set-cookie" in req.headers && typeof req.headers["x-middleware-set-cookie"] === "string") {
        const setCookieValue = req.headers["x-middleware-set-cookie"];
        const responseHeaders = new Headers();
        for (const cookie of splitCookiesString(setCookieValue)){
            responseHeaders.append("set-cookie", cookie);
        }
        const responseCookies = new _edge_runtime_cookies.ResponseCookies(responseHeaders);
        // Transfer cookies from ResponseCookies to RequestCookies
        for (const cookie of responseCookies.getAll()){
            existingCookies.set(cookie);
        }
    }
}
const RequestAsyncStorageWrapper = {
    /**
   * Wrap the callback with the given store so it can access the underlying
   * store using hooks.
   *
   * @param storage underlying storage object returned by the module
   * @param context context to seed the store
   * @param callback function to call within the scope of the context
   * @returns the result returned by the callback
   */ wrap (storage, { req, res, renderOpts }, callback) {
        let previewProps = undefined;
        if (renderOpts && "previewProps" in renderOpts) {
            // TODO: investigate why previewProps isn't on RenderOpts
            previewProps = renderOpts.previewProps;
        }
        function defaultOnUpdateCookies(cookies) {
            if (res) {
                res.setHeader("Set-Cookie", cookies);
            }
        }
        const cache = {};
        const store = {
            get headers () {
                if (!cache.headers) {
                    // Seal the headers object that'll freeze out any methods that could
                    // mutate the underlying data.
                    cache.headers = getHeaders(req.headers);
                }
                return cache.headers;
            },
            get cookies () {
                if (!cache.cookies) {
                    // if middleware is setting cookie(s), then include those in
                    // the initial cached cookies so they can be read in render
                    const requestCookies = new _edge_runtime_cookies.RequestCookies(HeadersAdapter.from(req.headers));
                    mergeMiddlewareCookies(req, requestCookies);
                    // Seal the cookies object that'll freeze out any methods that could
                    // mutate the underlying data.
                    cache.cookies = RequestCookiesAdapter.seal(requestCookies);
                }
                return cache.cookies;
            },
            get mutableCookies () {
                if (!cache.mutableCookies) {
                    const mutableCookies = getMutableCookies(req.headers, (renderOpts == null ? void 0 : renderOpts.onUpdateCookies) || (res ? defaultOnUpdateCookies : undefined));
                    mergeMiddlewareCookies(req, mutableCookies);
                    cache.mutableCookies = mutableCookies;
                }
                return cache.mutableCookies;
            },
            get draftMode () {
                if (!cache.draftMode) {
                    cache.draftMode = new DraftModeProvider(previewProps, req, this.cookies, this.mutableCookies);
                }
                return cache.draftMode;
            },
            reactLoadableManifest: (renderOpts == null ? void 0 : renderOpts.reactLoadableManifest) || {},
            assetPrefix: (renderOpts == null ? void 0 : renderOpts.assetPrefix) || ""
        };
        return storage.run(store, callback, store);
    }
};

//# sourceMappingURL=request-async-storage-wrapper.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/client/components/request-async-storage-instance.js

const request_async_storage_instance_requestAsyncStorage = createAsyncLocalStorage(); //# sourceMappingURL=request-async-storage-instance.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/client/components/request-async-storage.external.js
"TURBOPACK { transition: next-shared }";


function getExpectedRequestStore(callingExpression) {
    const store = requestAsyncStorage.getStore();
    if (store) return store;
    throw new Error("`" + callingExpression + "` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context");
} //# sourceMappingURL=request-async-storage.external.js.map

;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/get-edge-preview-props.js
/**
 * In edge runtime, these props directly accessed from environment variables.
 *   - local: env vars will be injected through edge-runtime as runtime env vars
 *   - deployment: env vars will be replaced by edge build pipeline
 */ function getEdgePreviewProps() {
    return {
        previewModeId:  true ? process.env.__NEXT_PREVIEW_MODE_ID : 0,
        previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "",
        previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || ""
    };
}

//# sourceMappingURL=get-edge-preview-props.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/adapter.js


















class NextRequestHint extends NextRequest {
    constructor(params){
        super(params.input, params.init);
        this.sourcePage = params.page;
    }
    get request() {
        throw new PageSignatureError({
            page: this.sourcePage
        });
    }
    respondWith() {
        throw new PageSignatureError({
            page: this.sourcePage
        });
    }
    waitUntil() {
        throw new PageSignatureError({
            page: this.sourcePage
        });
    }
}
const headersGetter = {
    keys: (headers)=>Array.from(headers.keys()),
    get: (headers, key)=>headers.get(key) ?? undefined
};
let propagator = (request, fn)=>{
    const tracer = tracer_getTracer();
    return tracer.withPropagatedContext(request.headers, fn, headersGetter);
};
let testApisIntercepted = false;
function ensureTestApisIntercepted() {
    if (!testApisIntercepted) {
        testApisIntercepted = true;
        if (process.env.NEXT_PRIVATE_TEST_PROXY === "true") {
            const { interceptTestApis, wrapRequestHandler } = __webpack_require__(177);
            interceptTestApis();
            propagator = wrapRequestHandler(propagator);
        }
    }
}
async function adapter(params) {
    ensureTestApisIntercepted();
    await ensureInstrumentationRegistered();
    // TODO-APP: use explicit marker for this
    const isEdgeRendering = typeof self.__BUILD_MANIFEST !== "undefined";
    params.request.url = normalizeRscURL(params.request.url);
    const requestUrl = new NextURL(params.request.url, {
        headers: params.request.headers,
        nextConfig: params.request.nextConfig
    });
    // Iterator uses an index to keep track of the current iteration. Because of deleting and appending below we can't just use the iterator.
    // Instead we use the keys before iteration.
    const keys = [
        ...requestUrl.searchParams.keys()
    ];
    for (const key of keys){
        const value = requestUrl.searchParams.getAll(key);
        if (key !== NEXT_QUERY_PARAM_PREFIX && key.startsWith(NEXT_QUERY_PARAM_PREFIX)) {
            const normalizedKey = key.substring(NEXT_QUERY_PARAM_PREFIX.length);
            requestUrl.searchParams.delete(normalizedKey);
            for (const val of value){
                requestUrl.searchParams.append(normalizedKey, val);
            }
            requestUrl.searchParams.delete(key);
        }
    }
    // Ensure users only see page requests, never data requests.
    const buildId = requestUrl.buildId;
    requestUrl.buildId = "";
    const isNextDataRequest = params.request.headers["x-nextjs-data"];
    if (isNextDataRequest && requestUrl.pathname === "/index") {
        requestUrl.pathname = "/";
    }
    const requestHeaders = fromNodeOutgoingHttpHeaders(params.request.headers);
    const flightHeaders = new Map();
    // Parameters should only be stripped for middleware
    if (!isEdgeRendering) {
        for (const param of FLIGHT_PARAMETERS){
            const key = param.toString().toLowerCase();
            const value = requestHeaders.get(key);
            if (value) {
                flightHeaders.set(key, requestHeaders.get(key));
                requestHeaders.delete(key);
            }
        }
    }
    const normalizeUrl =  false ? 0 : requestUrl;
    const request = new NextRequestHint({
        page: params.page,
        // Strip internal query parameters off the request.
        input: stripInternalSearchParams(normalizeUrl, true).toString(),
        init: {
            body: params.request.body,
            geo: params.request.geo,
            headers: requestHeaders,
            ip: params.request.ip,
            method: params.request.method,
            nextConfig: params.request.nextConfig,
            signal: params.request.signal
        }
    });
    /**
   * This allows to identify the request as a data request. The user doesn't
   * need to know about this property neither use it. We add it for testing
   * purposes.
   */ if (isNextDataRequest) {
        Object.defineProperty(request, "__isData", {
            enumerable: false,
            value: true
        });
    }
    if (!globalThis.__incrementalCache && params.IncrementalCache) {
        globalThis.__incrementalCache = new params.IncrementalCache({
            appDir: true,
            fetchCache: true,
            minimalMode: "production" !== "development",
            fetchCacheKeyPrefix: "",
            dev: "production" === "development",
            requestHeaders: params.request.headers,
            requestProtocol: "https",
            getPrerenderManifest: ()=>{
                return {
                    version: -1,
                    routes: {},
                    dynamicRoutes: {},
                    notFoundRoutes: [],
                    preview: getEdgePreviewProps()
                };
            }
        });
    }
    const event = new NextFetchEvent({
        request,
        page: params.page
    });
    let response;
    let cookiesFromResponse;
    response = await propagator(request, ()=>{
        // we only care to make async storage available for middleware
        const isMiddleware = params.page === "/middleware" || params.page === "/src/middleware";
        if (isMiddleware) {
            return tracer_getTracer().trace(MiddlewareSpan.execute, {
                spanName: `middleware ${request.method} ${request.nextUrl.pathname}`,
                attributes: {
                    "http.target": request.nextUrl.pathname,
                    "http.method": request.method
                }
            }, ()=>RequestAsyncStorageWrapper.wrap(request_async_storage_instance_requestAsyncStorage, {
                    req: request,
                    renderOpts: {
                        onUpdateCookies: (cookies)=>{
                            cookiesFromResponse = cookies;
                        },
                        // @ts-expect-error: TODO: investigate why previewProps isn't on RenderOpts
                        previewProps: getEdgePreviewProps()
                    }
                }, ()=>params.handler(request, event)));
        }
        return params.handler(request, event);
    });
    // check if response is a Response object
    if (response && !(response instanceof Response)) {
        throw new TypeError("Expected an instance of Response to be returned");
    }
    if (response && cookiesFromResponse) {
        response.headers.set("set-cookie", cookiesFromResponse);
    }
    /**
   * For rewrites we must always include the locale in the final pathname
   * so we re-create the NextURL forcing it to include it when the it is
   * an internal rewrite. Also we make sure the outgoing rewrite URL is
   * a data URL if the request was a data request.
   */ const rewrite = response == null ? void 0 : response.headers.get("x-middleware-rewrite");
    if (response && rewrite && !isEdgeRendering) {
        const rewriteUrl = new NextURL(rewrite, {
            forceLocale: true,
            headers: params.request.headers,
            nextConfig: params.request.nextConfig
        });
        if (true) {
            if (rewriteUrl.host === request.nextUrl.host) {
                rewriteUrl.buildId = buildId || rewriteUrl.buildId;
                response.headers.set("x-middleware-rewrite", String(rewriteUrl));
            }
        }
        /**
     * When the request is a data request we must show if there was a rewrite
     * with an internal header so the client knows which component to load
     * from the data request.
     */ const relativizedRewrite = relativizeURL(String(rewriteUrl), String(requestUrl));
        if (isNextDataRequest && // if the rewrite is external and external rewrite
        // resolving config is enabled don't add this header
        // so the upstream app can set it instead
        !( false && 0)) {
            response.headers.set("x-nextjs-rewrite", relativizedRewrite);
        }
    }
    /**
   * For redirects we will not include the locale in case when it is the
   * default and we must also make sure the outgoing URL is a data one if
   * the incoming request was a data request.
   */ const redirect = response == null ? void 0 : response.headers.get("Location");
    if (response && redirect && !isEdgeRendering) {
        const redirectURL = new NextURL(redirect, {
            forceLocale: false,
            headers: params.request.headers,
            nextConfig: params.request.nextConfig
        });
        /**
     * Responses created from redirects have immutable headers so we have
     * to clone the response to be able to modify it.
     */ response = new Response(response.body, response);
        if (true) {
            if (redirectURL.host === request.nextUrl.host) {
                redirectURL.buildId = buildId || redirectURL.buildId;
                response.headers.set("Location", String(redirectURL));
            }
        }
        /**
     * When the request is a data request we can't use the location header as
     * it may end up with CORS error. Instead we map to an internal header so
     * the client knows the destination.
     */ if (isNextDataRequest) {
            response.headers.delete("Location");
            response.headers.set("x-nextjs-redirect", relativizeURL(String(redirectURL), String(requestUrl)));
        }
    }
    const finalResponse = response ? response : NextResponse.next();
    // Flight headers are not overridable / removable so they are applied at the end.
    const middlewareOverrideHeaders = finalResponse.headers.get("x-middleware-override-headers");
    const overwrittenHeaders = [];
    if (middlewareOverrideHeaders) {
        for (const [key, value] of flightHeaders){
            finalResponse.headers.set(`x-middleware-request-${key}`, value);
            overwrittenHeaders.push(key);
        }
        if (overwrittenHeaders.length > 0) {
            finalResponse.headers.set("x-middleware-override-headers", middlewareOverrideHeaders + "," + overwrittenHeaders.join(","));
        }
    }
    return {
        response: finalResponse,
        waitUntil: Promise.all(event[waitUntilSymbol]),
        fetchMetrics: request.fetchMetrics
    };
}

//# sourceMappingURL=adapter.js.map
// EXTERNAL MODULE: ./node_modules/next/dist/compiled/ua-parser-js/ua-parser.js
var ua_parser = __webpack_require__(340);
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/user-agent.js

function isBot(input) {
    return /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Storebot-Google|Google-PageRenderer|Google-InspectionTool|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|LinkedInBot|bitlybot|tumblr|vkShare|quora link preview|facebookexternalhit|facebookcatalog|Twitterbot|applebot|redditbot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|ia_archiver/i.test(input);
}
function userAgentFromString(input) {
    return {
        ...parseua(input),
        isBot: input === undefined ? false : isBot(input)
    };
}
function userAgent({ headers }) {
    return userAgentFromString(headers.get("user-agent") || undefined);
}

//# sourceMappingURL=user-agent.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/spec-extension/url-pattern.js
const GlobalURLPattern = // @ts-expect-error: URLPattern is not available in Node.js
typeof URLPattern === "undefined" ? undefined : URLPattern;


//# sourceMappingURL=url-pattern.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/server/web/exports/index.js
// Alias index file of next/server for edge runtime for tree-shaking purpose






//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/next/dist/esm/api/server.js


//# sourceMappingURL=server.js.map
;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/buffer_utils.js
const buffer_utils_encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_INT32 = (/* unused pure expression or super */ null && (2 ** 32));
function concat(...buffers) {
    const size = buffers.reduce((acc, { length }) => acc + length, 0);
    const buf = new Uint8Array(size);
    let i = 0;
    for (const buffer of buffers) {
        buf.set(buffer, i);
        i += buffer.length;
    }
    return buf;
}
function writeUInt32BE(buf, value, offset) {
    if (value < 0 || value >= MAX_INT32) {
        throw new RangeError(`value must be >= 0 and <= ${MAX_INT32 - 1}. Received ${value}`);
    }
    buf.set([value >>> 24, value >>> 16, value >>> 8, value & 0xff], offset);
}
function uint64be(value) {
    const high = Math.floor(value / MAX_INT32);
    const low = value % MAX_INT32;
    const buf = new Uint8Array(8);
    writeUInt32BE(buf, high, 0);
    writeUInt32BE(buf, low, 4);
    return buf;
}
function uint32be(value) {
    const buf = new Uint8Array(4);
    writeUInt32BE(buf, value);
    return buf;
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/base64.js
function base64_encodeBase64(input) {
    if (Uint8Array.prototype.toBase64) {
        return input.toBase64();
    }
    const CHUNK_SIZE = 0x8000;
    const arr = [];
    for (let i = 0; i < input.length; i += CHUNK_SIZE) {
        arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
    }
    return btoa(arr.join(''));
}
function decodeBase64(encoded) {
    if (Uint8Array.fromBase64) {
        return Uint8Array.fromBase64(encoded);
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/util/base64url.js


function decode(input) {
    if (Uint8Array.fromBase64) {
        return Uint8Array.fromBase64(typeof input === 'string' ? input : decoder.decode(input), {
            alphabet: 'base64url',
        });
    }
    let encoded = input;
    if (encoded instanceof Uint8Array) {
        encoded = decoder.decode(encoded);
    }
    encoded = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    try {
        return decodeBase64(encoded);
    }
    catch {
        throw new TypeError('The input to be decoded is not correctly encoded.');
    }
}
function encode(input) {
    let unencoded = input;
    if (typeof unencoded === 'string') {
        unencoded = encoder.encode(unencoded);
    }
    if (Uint8Array.prototype.toBase64) {
        return unencoded.toBase64({ alphabet: 'base64url', omitPadding: true });
    }
    return encodeBase64(unencoded).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/util/errors.js
class JOSEError extends Error {
    static code = 'ERR_JOSE_GENERIC';
    code = 'ERR_JOSE_GENERIC';
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class JWTClaimValidationFailed extends JOSEError {
    static code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
    code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
    claim;
    reason;
    payload;
    constructor(message, payload, claim = 'unspecified', reason = 'unspecified') {
        super(message, { cause: { claim, reason, payload } });
        this.claim = claim;
        this.reason = reason;
        this.payload = payload;
    }
}
class JWTExpired extends JOSEError {
    static code = 'ERR_JWT_EXPIRED';
    code = 'ERR_JWT_EXPIRED';
    claim;
    reason;
    payload;
    constructor(message, payload, claim = 'unspecified', reason = 'unspecified') {
        super(message, { cause: { claim, reason, payload } });
        this.claim = claim;
        this.reason = reason;
        this.payload = payload;
    }
}
class JOSEAlgNotAllowed extends JOSEError {
    static code = 'ERR_JOSE_ALG_NOT_ALLOWED';
    code = 'ERR_JOSE_ALG_NOT_ALLOWED';
}
class JOSENotSupported extends JOSEError {
    static code = 'ERR_JOSE_NOT_SUPPORTED';
    code = 'ERR_JOSE_NOT_SUPPORTED';
}
class JWEDecryptionFailed extends JOSEError {
    static code = 'ERR_JWE_DECRYPTION_FAILED';
    code = 'ERR_JWE_DECRYPTION_FAILED';
    constructor(message = 'decryption operation failed', options) {
        super(message, options);
    }
}
class JWEInvalid extends (/* unused pure expression or super */ null && (JOSEError)) {
    static code = (/* unused pure expression or super */ null && ('ERR_JWE_INVALID'));
    code = 'ERR_JWE_INVALID';
}
class JWSInvalid extends JOSEError {
    static code = 'ERR_JWS_INVALID';
    code = 'ERR_JWS_INVALID';
}
class JWTInvalid extends JOSEError {
    static code = 'ERR_JWT_INVALID';
    code = 'ERR_JWT_INVALID';
}
class JWKInvalid extends (/* unused pure expression or super */ null && (JOSEError)) {
    static code = (/* unused pure expression or super */ null && ('ERR_JWK_INVALID'));
    code = 'ERR_JWK_INVALID';
}
class JWKSInvalid extends (/* unused pure expression or super */ null && (JOSEError)) {
    static code = (/* unused pure expression or super */ null && ('ERR_JWKS_INVALID'));
    code = 'ERR_JWKS_INVALID';
}
class JWKSNoMatchingKey extends JOSEError {
    static code = 'ERR_JWKS_NO_MATCHING_KEY';
    code = 'ERR_JWKS_NO_MATCHING_KEY';
    constructor(message = 'no applicable key found in the JSON Web Key Set', options) {
        super(message, options);
    }
}
class JWKSMultipleMatchingKeys extends JOSEError {
    [Symbol.asyncIterator];
    static code = 'ERR_JWKS_MULTIPLE_MATCHING_KEYS';
    code = 'ERR_JWKS_MULTIPLE_MATCHING_KEYS';
    constructor(message = 'multiple matching keys found in the JSON Web Key Set', options) {
        super(message, options);
    }
}
class JWKSTimeout extends JOSEError {
    static code = 'ERR_JWKS_TIMEOUT';
    code = 'ERR_JWKS_TIMEOUT';
    constructor(message = 'request timed out', options) {
        super(message, options);
    }
}
class JWSSignatureVerificationFailed extends JOSEError {
    static code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    constructor(message = 'signature verification failed', options) {
        super(message, options);
    }
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/subtle_dsa.js

/* harmony default export */ const subtle_dsa = ((alg, algorithm) => {
    const hash = `SHA-${alg.slice(-3)}`;
    switch (alg) {
        case 'HS256':
        case 'HS384':
        case 'HS512':
            return { hash, name: 'HMAC' };
        case 'PS256':
        case 'PS384':
        case 'PS512':
            return { hash, name: 'RSA-PSS', saltLength: parseInt(alg.slice(-3), 10) >> 3 };
        case 'RS256':
        case 'RS384':
        case 'RS512':
            return { hash, name: 'RSASSA-PKCS1-v1_5' };
        case 'ES256':
        case 'ES384':
        case 'ES512':
            return { hash, name: 'ECDSA', namedCurve: algorithm.namedCurve };
        case 'Ed25519':
        case 'EdDSA':
            return { name: 'Ed25519' };
        default:
            throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
    }
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/check_key_length.js
/* harmony default export */ const check_key_length = ((alg, key) => {
    if (alg.startsWith('RS') || alg.startsWith('PS')) {
        const { modulusLength } = key.algorithm;
        if (typeof modulusLength !== 'number' || modulusLength < 2048) {
            throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
        }
    }
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/crypto_key.js
function unusable(name, prop = 'algorithm.name') {
    return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
function isAlgorithm(algorithm, name) {
    return algorithm.name === name;
}
function getHashLength(hash) {
    return parseInt(hash.name.slice(4), 10);
}
function getNamedCurve(alg) {
    switch (alg) {
        case 'ES256':
            return 'P-256';
        case 'ES384':
            return 'P-384';
        case 'ES512':
            return 'P-521';
        default:
            throw new Error('unreachable');
    }
}
function checkUsage(key, usage) {
    if (usage && !key.usages.includes(usage)) {
        throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
    }
}
function checkSigCryptoKey(key, alg, usage) {
    switch (alg) {
        case 'HS256':
        case 'HS384':
        case 'HS512': {
            if (!isAlgorithm(key.algorithm, 'HMAC'))
                throw unusable('HMAC');
            const expected = parseInt(alg.slice(2), 10);
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        case 'RS256':
        case 'RS384':
        case 'RS512': {
            if (!isAlgorithm(key.algorithm, 'RSASSA-PKCS1-v1_5'))
                throw unusable('RSASSA-PKCS1-v1_5');
            const expected = parseInt(alg.slice(2), 10);
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        case 'PS256':
        case 'PS384':
        case 'PS512': {
            if (!isAlgorithm(key.algorithm, 'RSA-PSS'))
                throw unusable('RSA-PSS');
            const expected = parseInt(alg.slice(2), 10);
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        case 'Ed25519':
        case 'EdDSA': {
            if (!isAlgorithm(key.algorithm, 'Ed25519'))
                throw unusable('Ed25519');
            break;
        }
        case 'ES256':
        case 'ES384':
        case 'ES512': {
            if (!isAlgorithm(key.algorithm, 'ECDSA'))
                throw unusable('ECDSA');
            const expected = getNamedCurve(alg);
            const actual = key.algorithm.namedCurve;
            if (actual !== expected)
                throw unusable(expected, 'algorithm.namedCurve');
            break;
        }
        default:
            throw new TypeError('CryptoKey does not support this operation');
    }
    checkUsage(key, usage);
}
function checkEncCryptoKey(key, alg, usage) {
    switch (alg) {
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM': {
            if (!isAlgorithm(key.algorithm, 'AES-GCM'))
                throw unusable('AES-GCM');
            const expected = parseInt(alg.slice(1, 4), 10);
            const actual = key.algorithm.length;
            if (actual !== expected)
                throw unusable(expected, 'algorithm.length');
            break;
        }
        case 'A128KW':
        case 'A192KW':
        case 'A256KW': {
            if (!isAlgorithm(key.algorithm, 'AES-KW'))
                throw unusable('AES-KW');
            const expected = parseInt(alg.slice(1, 4), 10);
            const actual = key.algorithm.length;
            if (actual !== expected)
                throw unusable(expected, 'algorithm.length');
            break;
        }
        case 'ECDH': {
            switch (key.algorithm.name) {
                case 'ECDH':
                case 'X25519':
                    break;
                default:
                    throw unusable('ECDH or X25519');
            }
            break;
        }
        case 'PBES2-HS256+A128KW':
        case 'PBES2-HS384+A192KW':
        case 'PBES2-HS512+A256KW':
            if (!isAlgorithm(key.algorithm, 'PBKDF2'))
                throw unusable('PBKDF2');
            break;
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512': {
            if (!isAlgorithm(key.algorithm, 'RSA-OAEP'))
                throw unusable('RSA-OAEP');
            const expected = parseInt(alg.slice(9), 10) || 1;
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        default:
            throw new TypeError('CryptoKey does not support this operation');
    }
    checkUsage(key, usage);
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/invalid_key_input.js
function message(msg, actual, ...types) {
    types = types.filter(Boolean);
    if (types.length > 2) {
        const last = types.pop();
        msg += `one of type ${types.join(', ')}, or ${last}.`;
    }
    else if (types.length === 2) {
        msg += `one of type ${types[0]} or ${types[1]}.`;
    }
    else {
        msg += `of type ${types[0]}.`;
    }
    if (actual == null) {
        msg += ` Received ${actual}`;
    }
    else if (typeof actual === 'function' && actual.name) {
        msg += ` Received function ${actual.name}`;
    }
    else if (typeof actual === 'object' && actual != null) {
        if (actual.constructor?.name) {
            msg += ` Received an instance of ${actual.constructor.name}`;
        }
    }
    return msg;
}
/* harmony default export */ const invalid_key_input = ((actual, ...types) => {
    return message('Key must be ', actual, ...types);
});
function withAlg(alg, actual, ...types) {
    return message(`Key for the ${alg} algorithm must be `, actual, ...types);
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/get_sign_verify_key.js


/* harmony default export */ const get_sign_verify_key = (async (alg, key, usage) => {
    if (key instanceof Uint8Array) {
        if (!alg.startsWith('HS')) {
            throw new TypeError(invalid_key_input(key, 'CryptoKey', 'KeyObject', 'JSON Web Key'));
        }
        return crypto.subtle.importKey('raw', key, { hash: `SHA-${alg.slice(-3)}`, name: 'HMAC' }, false, [usage]);
    }
    checkSigCryptoKey(key, alg, usage);
    return key;
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/verify.js



/* harmony default export */ const verify = (async (alg, key, signature, data) => {
    const cryptoKey = await get_sign_verify_key(alg, key, 'verify');
    check_key_length(alg, cryptoKey);
    const algorithm = subtle_dsa(alg, cryptoKey.algorithm);
    try {
        return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
    }
    catch {
        return false;
    }
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/is_disjoint.js
/* harmony default export */ const is_disjoint = ((...headers) => {
    const sources = headers.filter(Boolean);
    if (sources.length === 0 || sources.length === 1) {
        return true;
    }
    let acc;
    for (const header of sources) {
        const parameters = Object.keys(header);
        if (!acc || acc.size === 0) {
            acc = new Set(parameters);
            continue;
        }
        for (const parameter of parameters) {
            if (acc.has(parameter)) {
                return false;
            }
            acc.add(parameter);
        }
    }
    return true;
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/is_object.js
function isObjectLike(value) {
    return typeof value === 'object' && value !== null;
}
/* harmony default export */ const is_object = ((input) => {
    if (!isObjectLike(input) || Object.prototype.toString.call(input) !== '[object Object]') {
        return false;
    }
    if (Object.getPrototypeOf(input) === null) {
        return true;
    }
    let proto = input;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(input) === proto;
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/is_key_like.js
function assertCryptoKey(key) {
    if (!isCryptoKey(key)) {
        throw new Error('CryptoKey instance expected');
    }
}
function isCryptoKey(key) {
    return key?.[Symbol.toStringTag] === 'CryptoKey';
}
function isKeyObject(key) {
    return key?.[Symbol.toStringTag] === 'KeyObject';
}
/* harmony default export */ const is_key_like = ((key) => {
    return isCryptoKey(key) || isKeyObject(key);
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/is_jwk.js

function isJWK(key) {
    return is_object(key) && typeof key.kty === 'string';
}
function isPrivateJWK(key) {
    return key.kty !== 'oct' && typeof key.d === 'string';
}
function isPublicJWK(key) {
    return key.kty !== 'oct' && typeof key.d === 'undefined';
}
function isSecretJWK(key) {
    return key.kty === 'oct' && typeof key.k === 'string';
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/check_key_type.js



const tag = (key) => key?.[Symbol.toStringTag];
const jwkMatchesOp = (alg, key, usage) => {
    if (key.use !== undefined) {
        let expected;
        switch (usage) {
            case 'sign':
            case 'verify':
                expected = 'sig';
                break;
            case 'encrypt':
            case 'decrypt':
                expected = 'enc';
                break;
        }
        if (key.use !== expected) {
            throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
        }
    }
    if (key.alg !== undefined && key.alg !== alg) {
        throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
    }
    if (Array.isArray(key.key_ops)) {
        let expectedKeyOp;
        switch (true) {
            case usage === 'sign' || usage === 'verify':
            case alg === 'dir':
            case alg.includes('CBC-HS'):
                expectedKeyOp = usage;
                break;
            case alg.startsWith('PBES2'):
                expectedKeyOp = 'deriveBits';
                break;
            case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
                if (!alg.includes('GCM') && alg.endsWith('KW')) {
                    expectedKeyOp = usage === 'encrypt' ? 'wrapKey' : 'unwrapKey';
                }
                else {
                    expectedKeyOp = usage;
                }
                break;
            case usage === 'encrypt' && alg.startsWith('RSA'):
                expectedKeyOp = 'wrapKey';
                break;
            case usage === 'decrypt':
                expectedKeyOp = alg.startsWith('RSA') ? 'unwrapKey' : 'deriveBits';
                break;
        }
        if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
            throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
        }
    }
    return true;
};
const symmetricTypeCheck = (alg, key, usage) => {
    if (key instanceof Uint8Array)
        return;
    if (isJWK(key)) {
        if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
            return;
        throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
    }
    if (!is_key_like(key)) {
        throw new TypeError(withAlg(alg, key, 'CryptoKey', 'KeyObject', 'JSON Web Key', 'Uint8Array'));
    }
    if (key.type !== 'secret') {
        throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
    }
};
const asymmetricTypeCheck = (alg, key, usage) => {
    if (isJWK(key)) {
        switch (usage) {
            case 'decrypt':
            case 'sign':
                if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
                    return;
                throw new TypeError(`JSON Web Key for this operation be a private JWK`);
            case 'encrypt':
            case 'verify':
                if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
                    return;
                throw new TypeError(`JSON Web Key for this operation be a public JWK`);
        }
    }
    if (!is_key_like(key)) {
        throw new TypeError(withAlg(alg, key, 'CryptoKey', 'KeyObject', 'JSON Web Key'));
    }
    if (key.type === 'secret') {
        throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
    }
    if (key.type === 'public') {
        switch (usage) {
            case 'sign':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
            case 'decrypt':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
            default:
                break;
        }
    }
    if (key.type === 'private') {
        switch (usage) {
            case 'verify':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
            case 'encrypt':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
            default:
                break;
        }
    }
};
/* harmony default export */ const check_key_type = ((alg, key, usage) => {
    const symmetric = alg.startsWith('HS') ||
        alg === 'dir' ||
        alg.startsWith('PBES2') ||
        /^A(?:128|192|256)(?:GCM)?(?:KW)?$/.test(alg) ||
        /^A(?:128|192|256)CBC-HS(?:256|384|512)$/.test(alg);
    if (symmetric) {
        symmetricTypeCheck(alg, key, usage);
    }
    else {
        asymmetricTypeCheck(alg, key, usage);
    }
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/validate_crit.js

/* harmony default export */ const validate_crit = ((Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) => {
    if (joseHeader.crit !== undefined && protectedHeader?.crit === undefined) {
        throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
    }
    if (!protectedHeader || protectedHeader.crit === undefined) {
        return new Set();
    }
    if (!Array.isArray(protectedHeader.crit) ||
        protectedHeader.crit.length === 0 ||
        protectedHeader.crit.some((input) => typeof input !== 'string' || input.length === 0)) {
        throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
    }
    let recognized;
    if (recognizedOption !== undefined) {
        recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
    }
    else {
        recognized = recognizedDefault;
    }
    for (const parameter of protectedHeader.crit) {
        if (!recognized.has(parameter)) {
            throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
        }
        if (joseHeader[parameter] === undefined) {
            throw new Err(`Extension Header Parameter "${parameter}" is missing`);
        }
        if (recognized.get(parameter) && protectedHeader[parameter] === undefined) {
            throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
        }
    }
    return new Set(protectedHeader.crit);
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/validate_algorithms.js
/* harmony default export */ const validate_algorithms = ((option, algorithms) => {
    if (algorithms !== undefined &&
        (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== 'string'))) {
        throw new TypeError(`"${option}" option must be an array of strings`);
    }
    if (!algorithms) {
        return undefined;
    }
    return new Set(algorithms);
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/jwk_to_key.js

function subtleMapping(jwk) {
    let algorithm;
    let keyUsages;
    switch (jwk.kty) {
        case 'RSA': {
            switch (jwk.alg) {
                case 'PS256':
                case 'PS384':
                case 'PS512':
                    algorithm = { name: 'RSA-PSS', hash: `SHA-${jwk.alg.slice(-3)}` };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'RS256':
                case 'RS384':
                case 'RS512':
                    algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: `SHA-${jwk.alg.slice(-3)}` };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'RSA-OAEP':
                case 'RSA-OAEP-256':
                case 'RSA-OAEP-384':
                case 'RSA-OAEP-512':
                    algorithm = {
                        name: 'RSA-OAEP',
                        hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`,
                    };
                    keyUsages = jwk.d ? ['decrypt', 'unwrapKey'] : ['encrypt', 'wrapKey'];
                    break;
                default:
                    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
            }
            break;
        }
        case 'EC': {
            switch (jwk.alg) {
                case 'ES256':
                    algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ES384':
                    algorithm = { name: 'ECDSA', namedCurve: 'P-384' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ES512':
                    algorithm = { name: 'ECDSA', namedCurve: 'P-521' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ECDH-ES':
                case 'ECDH-ES+A128KW':
                case 'ECDH-ES+A192KW':
                case 'ECDH-ES+A256KW':
                    algorithm = { name: 'ECDH', namedCurve: jwk.crv };
                    keyUsages = jwk.d ? ['deriveBits'] : [];
                    break;
                default:
                    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
            }
            break;
        }
        case 'OKP': {
            switch (jwk.alg) {
                case 'Ed25519':
                case 'EdDSA':
                    algorithm = { name: 'Ed25519' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ECDH-ES':
                case 'ECDH-ES+A128KW':
                case 'ECDH-ES+A192KW':
                case 'ECDH-ES+A256KW':
                    algorithm = { name: jwk.crv };
                    keyUsages = jwk.d ? ['deriveBits'] : [];
                    break;
                default:
                    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
            }
            break;
        }
        default:
            throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
    }
    return { algorithm, keyUsages };
}
/* harmony default export */ const jwk_to_key = (async (jwk) => {
    if (!jwk.alg) {
        throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
    }
    const { algorithm, keyUsages } = subtleMapping(jwk);
    const keyData = { ...jwk };
    delete keyData.alg;
    delete keyData.use;
    return crypto.subtle.importKey('jwk', keyData, algorithm, jwk.ext ?? (jwk.d ? false : true), jwk.key_ops ?? keyUsages);
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/normalize_key.js




let cache;
const handleJWK = async (key, jwk, alg, freeze = false) => {
    cache ||= new WeakMap();
    let cached = cache.get(key);
    if (cached?.[alg]) {
        return cached[alg];
    }
    const cryptoKey = await jwk_to_key({ ...jwk, alg });
    if (freeze)
        Object.freeze(key);
    if (!cached) {
        cache.set(key, { [alg]: cryptoKey });
    }
    else {
        cached[alg] = cryptoKey;
    }
    return cryptoKey;
};
const handleKeyObject = (keyObject, alg) => {
    cache ||= new WeakMap();
    let cached = cache.get(keyObject);
    if (cached?.[alg]) {
        return cached[alg];
    }
    const isPublic = keyObject.type === 'public';
    const extractable = isPublic ? true : false;
    let cryptoKey;
    if (keyObject.asymmetricKeyType === 'x25519') {
        switch (alg) {
            case 'ECDH-ES':
            case 'ECDH-ES+A128KW':
            case 'ECDH-ES+A192KW':
            case 'ECDH-ES+A256KW':
                break;
            default:
                throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, isPublic ? [] : ['deriveBits']);
    }
    if (keyObject.asymmetricKeyType === 'ed25519') {
        if (alg !== 'EdDSA' && alg !== 'Ed25519') {
            throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
            isPublic ? 'verify' : 'sign',
        ]);
    }
    if (keyObject.asymmetricKeyType === 'rsa') {
        let hash;
        switch (alg) {
            case 'RSA-OAEP':
                hash = 'SHA-1';
                break;
            case 'RS256':
            case 'PS256':
            case 'RSA-OAEP-256':
                hash = 'SHA-256';
                break;
            case 'RS384':
            case 'PS384':
            case 'RSA-OAEP-384':
                hash = 'SHA-384';
                break;
            case 'RS512':
            case 'PS512':
            case 'RSA-OAEP-512':
                hash = 'SHA-512';
                break;
            default:
                throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        if (alg.startsWith('RSA-OAEP')) {
            return keyObject.toCryptoKey({
                name: 'RSA-OAEP',
                hash,
            }, extractable, isPublic ? ['encrypt'] : ['decrypt']);
        }
        cryptoKey = keyObject.toCryptoKey({
            name: alg.startsWith('PS') ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5',
            hash,
        }, extractable, [isPublic ? 'verify' : 'sign']);
    }
    if (keyObject.asymmetricKeyType === 'ec') {
        const nist = new Map([
            ['prime256v1', 'P-256'],
            ['secp384r1', 'P-384'],
            ['secp521r1', 'P-521'],
        ]);
        const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
        if (!namedCurve) {
            throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        if (alg === 'ES256' && namedCurve === 'P-256') {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDSA',
                namedCurve,
            }, extractable, [isPublic ? 'verify' : 'sign']);
        }
        if (alg === 'ES384' && namedCurve === 'P-384') {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDSA',
                namedCurve,
            }, extractable, [isPublic ? 'verify' : 'sign']);
        }
        if (alg === 'ES512' && namedCurve === 'P-521') {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDSA',
                namedCurve,
            }, extractable, [isPublic ? 'verify' : 'sign']);
        }
        if (alg.startsWith('ECDH-ES')) {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDH',
                namedCurve,
            }, extractable, isPublic ? [] : ['deriveBits']);
        }
    }
    if (!cryptoKey) {
        throw new TypeError('given KeyObject instance cannot be used for this algorithm');
    }
    if (!cached) {
        cache.set(keyObject, { [alg]: cryptoKey });
    }
    else {
        cached[alg] = cryptoKey;
    }
    return cryptoKey;
};
/* harmony default export */ const normalize_key = (async (key, alg) => {
    if (key instanceof Uint8Array) {
        return key;
    }
    if (isCryptoKey(key)) {
        return key;
    }
    if (isKeyObject(key)) {
        if (key.type === 'secret') {
            return key.export();
        }
        if ('toCryptoKey' in key && typeof key.toCryptoKey === 'function') {
            try {
                return handleKeyObject(key, alg);
            }
            catch (err) {
                if (err instanceof TypeError) {
                    throw err;
                }
            }
        }
        let jwk = key.export({ format: 'jwk' });
        return handleJWK(key, jwk, alg);
    }
    if (isJWK(key)) {
        if (key.k) {
            return decode(key.k);
        }
        return handleJWK(key, key, alg, true);
    }
    throw new Error('unreachable');
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/jws/flattened/verify.js










async function flattenedVerify(jws, key, options) {
    if (!is_object(jws)) {
        throw new JWSInvalid('Flattened JWS must be an object');
    }
    if (jws.protected === undefined && jws.header === undefined) {
        throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
    }
    if (jws.protected !== undefined && typeof jws.protected !== 'string') {
        throw new JWSInvalid('JWS Protected Header incorrect type');
    }
    if (jws.payload === undefined) {
        throw new JWSInvalid('JWS Payload missing');
    }
    if (typeof jws.signature !== 'string') {
        throw new JWSInvalid('JWS Signature missing or incorrect type');
    }
    if (jws.header !== undefined && !is_object(jws.header)) {
        throw new JWSInvalid('JWS Unprotected Header incorrect type');
    }
    let parsedProt = {};
    if (jws.protected) {
        try {
            const protectedHeader = decode(jws.protected);
            parsedProt = JSON.parse(decoder.decode(protectedHeader));
        }
        catch {
            throw new JWSInvalid('JWS Protected Header is invalid');
        }
    }
    if (!is_disjoint(parsedProt, jws.header)) {
        throw new JWSInvalid('JWS Protected and JWS Unprotected Header Parameter names must be disjoint');
    }
    const joseHeader = {
        ...parsedProt,
        ...jws.header,
    };
    const extensions = validate_crit(JWSInvalid, new Map([['b64', true]]), options?.crit, parsedProt, joseHeader);
    let b64 = true;
    if (extensions.has('b64')) {
        b64 = parsedProt.b64;
        if (typeof b64 !== 'boolean') {
            throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
        }
    }
    const { alg } = joseHeader;
    if (typeof alg !== 'string' || !alg) {
        throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    const algorithms = options && validate_algorithms('algorithms', options.algorithms);
    if (algorithms && !algorithms.has(alg)) {
        throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
    }
    if (b64) {
        if (typeof jws.payload !== 'string') {
            throw new JWSInvalid('JWS Payload must be a string');
        }
    }
    else if (typeof jws.payload !== 'string' && !(jws.payload instanceof Uint8Array)) {
        throw new JWSInvalid('JWS Payload must be a string or an Uint8Array instance');
    }
    let resolvedKey = false;
    if (typeof key === 'function') {
        key = await key(parsedProt, jws);
        resolvedKey = true;
    }
    check_key_type(alg, key, 'verify');
    const data = concat(buffer_utils_encoder.encode(jws.protected ?? ''), buffer_utils_encoder.encode('.'), typeof jws.payload === 'string' ? buffer_utils_encoder.encode(jws.payload) : jws.payload);
    let signature;
    try {
        signature = decode(jws.signature);
    }
    catch {
        throw new JWSInvalid('Failed to base64url decode the signature');
    }
    const k = await normalize_key(key, alg);
    const verified = await verify(alg, k, signature, data);
    if (!verified) {
        throw new JWSSignatureVerificationFailed();
    }
    let payload;
    if (b64) {
        try {
            payload = decode(jws.payload);
        }
        catch {
            throw new JWSInvalid('Failed to base64url decode the payload');
        }
    }
    else if (typeof jws.payload === 'string') {
        payload = buffer_utils_encoder.encode(jws.payload);
    }
    else {
        payload = jws.payload;
    }
    const result = { payload };
    if (jws.protected !== undefined) {
        result.protectedHeader = parsedProt;
    }
    if (jws.header !== undefined) {
        result.unprotectedHeader = jws.header;
    }
    if (resolvedKey) {
        return { ...result, key: k };
    }
    return result;
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/jws/compact/verify.js



async function compactVerify(jws, key, options) {
    if (jws instanceof Uint8Array) {
        jws = decoder.decode(jws);
    }
    if (typeof jws !== 'string') {
        throw new JWSInvalid('Compact JWS must be a string or Uint8Array');
    }
    const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split('.');
    if (length !== 3) {
        throw new JWSInvalid('Invalid Compact JWS');
    }
    const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
    const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
    if (typeof key === 'function') {
        return { ...result, key: verified.key };
    }
    return result;
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/epoch.js
/* harmony default export */ const lib_epoch = ((date) => Math.floor(date.getTime() / 1000));

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/secs.js
const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const year = day * 365.25;
const REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
/* harmony default export */ const lib_secs = ((str) => {
    const matched = REGEX.exec(str);
    if (!matched || (matched[4] && matched[1])) {
        throw new TypeError('Invalid time period format');
    }
    const value = parseFloat(matched[2]);
    const unit = matched[3].toLowerCase();
    let numericDate;
    switch (unit) {
        case 'sec':
        case 'secs':
        case 'second':
        case 'seconds':
        case 's':
            numericDate = Math.round(value);
            break;
        case 'minute':
        case 'minutes':
        case 'min':
        case 'mins':
        case 'm':
            numericDate = Math.round(value * minute);
            break;
        case 'hour':
        case 'hours':
        case 'hr':
        case 'hrs':
        case 'h':
            numericDate = Math.round(value * hour);
            break;
        case 'day':
        case 'days':
        case 'd':
            numericDate = Math.round(value * day);
            break;
        case 'week':
        case 'weeks':
        case 'w':
            numericDate = Math.round(value * week);
            break;
        default:
            numericDate = Math.round(value * year);
            break;
    }
    if (matched[1] === '-' || matched[4] === 'ago') {
        return -numericDate;
    }
    return numericDate;
});

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/lib/jwt_claims_set.js






function validateInput(label, input) {
    if (!Number.isFinite(input)) {
        throw new TypeError(`Invalid ${label} input`);
    }
    return input;
}
const normalizeTyp = (value) => {
    if (value.includes('/')) {
        return value.toLowerCase();
    }
    return `application/${value.toLowerCase()}`;
};
const checkAudiencePresence = (audPayload, audOption) => {
    if (typeof audPayload === 'string') {
        return audOption.includes(audPayload);
    }
    if (Array.isArray(audPayload)) {
        return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
    }
    return false;
};
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
    let payload;
    try {
        payload = JSON.parse(decoder.decode(encodedPayload));
    }
    catch {
    }
    if (!is_object(payload)) {
        throw new JWTInvalid('JWT Claims Set must be a top-level JSON object');
    }
    const { typ } = options;
    if (typ &&
        (typeof protectedHeader.typ !== 'string' ||
            normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
        throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, 'typ', 'check_failed');
    }
    const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
    const presenceCheck = [...requiredClaims];
    if (maxTokenAge !== undefined)
        presenceCheck.push('iat');
    if (audience !== undefined)
        presenceCheck.push('aud');
    if (subject !== undefined)
        presenceCheck.push('sub');
    if (issuer !== undefined)
        presenceCheck.push('iss');
    for (const claim of new Set(presenceCheck.reverse())) {
        if (!(claim in payload)) {
            throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, 'missing');
        }
    }
    if (issuer &&
        !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
        throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, 'iss', 'check_failed');
    }
    if (subject && payload.sub !== subject) {
        throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, 'sub', 'check_failed');
    }
    if (audience &&
        !checkAudiencePresence(payload.aud, typeof audience === 'string' ? [audience] : audience)) {
        throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, 'aud', 'check_failed');
    }
    let tolerance;
    switch (typeof options.clockTolerance) {
        case 'string':
            tolerance = lib_secs(options.clockTolerance);
            break;
        case 'number':
            tolerance = options.clockTolerance;
            break;
        case 'undefined':
            tolerance = 0;
            break;
        default:
            throw new TypeError('Invalid clockTolerance option type');
    }
    const { currentDate } = options;
    const now = lib_epoch(currentDate || new Date());
    if ((payload.iat !== undefined || maxTokenAge) && typeof payload.iat !== 'number') {
        throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, 'iat', 'invalid');
    }
    if (payload.nbf !== undefined) {
        if (typeof payload.nbf !== 'number') {
            throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, 'nbf', 'invalid');
        }
        if (payload.nbf > now + tolerance) {
            throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, 'nbf', 'check_failed');
        }
    }
    if (payload.exp !== undefined) {
        if (typeof payload.exp !== 'number') {
            throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, 'exp', 'invalid');
        }
        if (payload.exp <= now - tolerance) {
            throw new JWTExpired('"exp" claim timestamp check failed', payload, 'exp', 'check_failed');
        }
    }
    if (maxTokenAge) {
        const age = now - payload.iat;
        const max = typeof maxTokenAge === 'number' ? maxTokenAge : lib_secs(maxTokenAge);
        if (age - tolerance > max) {
            throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, 'iat', 'check_failed');
        }
        if (age < 0 - tolerance) {
            throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, 'iat', 'check_failed');
        }
    }
    return payload;
}
class JWTClaimsBuilder {
    #payload;
    constructor(payload) {
        if (!isObject(payload)) {
            throw new TypeError('JWT Claims Set MUST be an object');
        }
        this.#payload = structuredClone(payload);
    }
    data() {
        return encoder.encode(JSON.stringify(this.#payload));
    }
    get iss() {
        return this.#payload.iss;
    }
    set iss(value) {
        this.#payload.iss = value;
    }
    get sub() {
        return this.#payload.sub;
    }
    set sub(value) {
        this.#payload.sub = value;
    }
    get aud() {
        return this.#payload.aud;
    }
    set aud(value) {
        this.#payload.aud = value;
    }
    set jti(value) {
        this.#payload.jti = value;
    }
    set nbf(value) {
        if (typeof value === 'number') {
            this.#payload.nbf = validateInput('setNotBefore', value);
        }
        else if (value instanceof Date) {
            this.#payload.nbf = validateInput('setNotBefore', epoch(value));
        }
        else {
            this.#payload.nbf = epoch(new Date()) + secs(value);
        }
    }
    set exp(value) {
        if (typeof value === 'number') {
            this.#payload.exp = validateInput('setExpirationTime', value);
        }
        else if (value instanceof Date) {
            this.#payload.exp = validateInput('setExpirationTime', epoch(value));
        }
        else {
            this.#payload.exp = epoch(new Date()) + secs(value);
        }
    }
    set iat(value) {
        if (typeof value === 'undefined') {
            this.#payload.iat = epoch(new Date());
        }
        else if (value instanceof Date) {
            this.#payload.iat = validateInput('setIssuedAt', epoch(value));
        }
        else if (typeof value === 'string') {
            this.#payload.iat = validateInput('setIssuedAt', epoch(new Date()) + secs(value));
        }
        else {
            this.#payload.iat = validateInput('setIssuedAt', value);
        }
    }
}

;// CONCATENATED MODULE: ./node_modules/jose/dist/webapi/jwt/verify.js



async function jwtVerify(jwt, key, options) {
    const verified = await compactVerify(jwt, key, options);
    if (verified.protectedHeader.crit?.includes('b64') && verified.protectedHeader.b64 === false) {
        throw new JWTInvalid('JWTs MUST NOT use unencoded payload');
    }
    const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
    const result = { payload, protectedHeader: verified.protectedHeader };
    if (typeof key === 'function') {
        return { ...result, key: verified.key };
    }
    return result;
}

;// CONCATENATED MODULE: ./middleware.ts


const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
async function middleware(request) {
    const { pathname } = request.nextUrl;
    // Skip middleware for public routes and API routes
    if (pathname.startsWith("/api/") || pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/setup-admin" || pathname === "/account-suspended" || pathname === "/account-pending" || pathname.startsWith("/_next/") || pathname.startsWith("/public/") || pathname.includes(".")) {
        return NextResponse.next();
    }
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload: decoded } = await jwtVerify(token, secret);
        // Check if user is trying to access super admin routes
        if (pathname.startsWith("/super-admin") && decoded.role !== "super_admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }
        // Check if user is trying to access stage manager routes
        if (pathname.startsWith("/stage-manager") && decoded.role !== "stage_manager") {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return NextResponse.next();
    } catch (error) {
        // Invalid token, redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
    }
}
const config = {
    matcher: [
        /*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */ "/((?!api|_next/static|_next/image|favicon.ico).*)"
    ]
};

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=private-next-root-dir%2Fmiddleware.ts&page=%2Fmiddleware&rootDir=C%3A%5CUsers%5CASUS%5COneDrive%5CPictures%5CFAME%5CFAME&matchers=W3sicmVnZXhwIjoiXig%2FOlxcLyhfbmV4dFxcL2RhdGFcXC9bXi9dezEsfSkpPyg%2FOlxcLygoPyFhcGl8X25leHRcXC9zdGF0aWN8X25leHRcXC9pbWFnZXxmYXZpY29uLmljbykuKikpKC5qc29uKT9bXFwvI1xcP10%2FJCIsIm9yaWdpbmFsU291cmNlIjoiLygoPyFhcGl8X25leHQvc3RhdGljfF9uZXh0L2ltYWdlfGZhdmljb24uaWNvKS4qKSJ9XQ%3D%3D&preferredRegion=&middlewareConfig=eyJtYXRjaGVycyI6W3sicmVnZXhwIjoiXig%2FOlxcLyhfbmV4dFxcL2RhdGFcXC9bXi9dezEsfSkpPyg%2FOlxcLygoPyFhcGl8X25leHRcXC9zdGF0aWN8X25leHRcXC9pbWFnZXxmYXZpY29uLmljbykuKikpKC5qc29uKT9bXFwvI1xcP10%2FJCIsIm9yaWdpbmFsU291cmNlIjoiLygoPyFhcGl8X25leHQvc3RhdGljfF9uZXh0L2ltYWdlfGZhdmljb24uaWNvKS4qKSJ9XX0%3D!


// Import the userland code.

const mod = {
    ...middleware_namespaceObject
};
const handler = mod.middleware || mod.default;
const page = "/middleware";
if (typeof handler !== "function") {
    throw new Error(`The Middleware "${page}" must export a \`middleware\` or a \`default\` function`);
}
function nHandler(opts) {
    return adapter({
        ...opts,
        page,
        handler
    });
}

//# sourceMappingURL=middleware.js.map

/***/ }),

/***/ 945:
/***/ ((module) => {

"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  RequestCookies: () => RequestCookies,
  ResponseCookies: () => ResponseCookies,
  parseCookie: () => parseCookie,
  parseSetCookie: () => parseSetCookie,
  stringifyCookie: () => stringifyCookie
});
module.exports = __toCommonJS(src_exports);

// src/serialize.ts
function stringifyCookie(c) {
  var _a;
  const attrs = [
    "path" in c && c.path && `Path=${c.path}`,
    "expires" in c && (c.expires || c.expires === 0) && `Expires=${(typeof c.expires === "number" ? new Date(c.expires) : c.expires).toUTCString()}`,
    "maxAge" in c && typeof c.maxAge === "number" && `Max-Age=${c.maxAge}`,
    "domain" in c && c.domain && `Domain=${c.domain}`,
    "secure" in c && c.secure && "Secure",
    "httpOnly" in c && c.httpOnly && "HttpOnly",
    "sameSite" in c && c.sameSite && `SameSite=${c.sameSite}`,
    "partitioned" in c && c.partitioned && "Partitioned",
    "priority" in c && c.priority && `Priority=${c.priority}`
  ].filter(Boolean);
  const stringified = `${c.name}=${encodeURIComponent((_a = c.value) != null ? _a : "")}`;
  return attrs.length === 0 ? stringified : `${stringified}; ${attrs.join("; ")}`;
}
function parseCookie(cookie) {
  const map = /* @__PURE__ */ new Map();
  for (const pair of cookie.split(/; */)) {
    if (!pair)
      continue;
    const splitAt = pair.indexOf("=");
    if (splitAt === -1) {
      map.set(pair, "true");
      continue;
    }
    const [key, value] = [pair.slice(0, splitAt), pair.slice(splitAt + 1)];
    try {
      map.set(key, decodeURIComponent(value != null ? value : "true"));
    } catch {
    }
  }
  return map;
}
function parseSetCookie(setCookie) {
  if (!setCookie) {
    return void 0;
  }
  const [[name, value], ...attributes] = parseCookie(setCookie);
  const {
    domain,
    expires,
    httponly,
    maxage,
    path,
    samesite,
    secure,
    partitioned,
    priority
  } = Object.fromEntries(
    attributes.map(([key, value2]) => [key.toLowerCase(), value2])
  );
  const cookie = {
    name,
    value: decodeURIComponent(value),
    domain,
    ...expires && { expires: new Date(expires) },
    ...httponly && { httpOnly: true },
    ...typeof maxage === "string" && { maxAge: Number(maxage) },
    path,
    ...samesite && { sameSite: parseSameSite(samesite) },
    ...secure && { secure: true },
    ...priority && { priority: parsePriority(priority) },
    ...partitioned && { partitioned: true }
  };
  return compact(cookie);
}
function compact(t) {
  const newT = {};
  for (const key in t) {
    if (t[key]) {
      newT[key] = t[key];
    }
  }
  return newT;
}
var SAME_SITE = ["strict", "lax", "none"];
function parseSameSite(string) {
  string = string.toLowerCase();
  return SAME_SITE.includes(string) ? string : void 0;
}
var PRIORITY = ["low", "medium", "high"];
function parsePriority(string) {
  string = string.toLowerCase();
  return PRIORITY.includes(string) ? string : void 0;
}
function splitCookiesString(cookiesString) {
  if (!cookiesString)
    return [];
  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;
  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }
  function notSpecialChar() {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  }
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }
  return cookiesStrings;
}

// src/request-cookies.ts
var RequestCookies = class {
  constructor(requestHeaders) {
    /** @internal */
    this._parsed = /* @__PURE__ */ new Map();
    this._headers = requestHeaders;
    const header = requestHeaders.get("cookie");
    if (header) {
      const parsed = parseCookie(header);
      for (const [name, value] of parsed) {
        this._parsed.set(name, { name, value });
      }
    }
  }
  [Symbol.iterator]() {
    return this._parsed[Symbol.iterator]();
  }
  /**
   * The amount of cookies received from the client
   */
  get size() {
    return this._parsed.size;
  }
  get(...args) {
    const name = typeof args[0] === "string" ? args[0] : args[0].name;
    return this._parsed.get(name);
  }
  getAll(...args) {
    var _a;
    const all = Array.from(this._parsed);
    if (!args.length) {
      return all.map(([_, value]) => value);
    }
    const name = typeof args[0] === "string" ? args[0] : (_a = args[0]) == null ? void 0 : _a.name;
    return all.filter(([n]) => n === name).map(([_, value]) => value);
  }
  has(name) {
    return this._parsed.has(name);
  }
  set(...args) {
    const [name, value] = args.length === 1 ? [args[0].name, args[0].value] : args;
    const map = this._parsed;
    map.set(name, { name, value });
    this._headers.set(
      "cookie",
      Array.from(map).map(([_, value2]) => stringifyCookie(value2)).join("; ")
    );
    return this;
  }
  /**
   * Delete the cookies matching the passed name or names in the request.
   */
  delete(names) {
    const map = this._parsed;
    const result = !Array.isArray(names) ? map.delete(names) : names.map((name) => map.delete(name));
    this._headers.set(
      "cookie",
      Array.from(map).map(([_, value]) => stringifyCookie(value)).join("; ")
    );
    return result;
  }
  /**
   * Delete all the cookies in the cookies in the request.
   */
  clear() {
    this.delete(Array.from(this._parsed.keys()));
    return this;
  }
  /**
   * Format the cookies in the request as a string for logging
   */
  [Symbol.for("edge-runtime.inspect.custom")]() {
    return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
  }
  toString() {
    return [...this._parsed.values()].map((v) => `${v.name}=${encodeURIComponent(v.value)}`).join("; ");
  }
};

// src/response-cookies.ts
var ResponseCookies = class {
  constructor(responseHeaders) {
    /** @internal */
    this._parsed = /* @__PURE__ */ new Map();
    var _a, _b, _c;
    this._headers = responseHeaders;
    const setCookie = (_c = (_b = (_a = responseHeaders.getSetCookie) == null ? void 0 : _a.call(responseHeaders)) != null ? _b : responseHeaders.get("set-cookie")) != null ? _c : [];
    const cookieStrings = Array.isArray(setCookie) ? setCookie : splitCookiesString(setCookie);
    for (const cookieString of cookieStrings) {
      const parsed = parseSetCookie(cookieString);
      if (parsed)
        this._parsed.set(parsed.name, parsed);
    }
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-get CookieStore#get} without the Promise.
   */
  get(...args) {
    const key = typeof args[0] === "string" ? args[0] : args[0].name;
    return this._parsed.get(key);
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-getAll CookieStore#getAll} without the Promise.
   */
  getAll(...args) {
    var _a;
    const all = Array.from(this._parsed.values());
    if (!args.length) {
      return all;
    }
    const key = typeof args[0] === "string" ? args[0] : (_a = args[0]) == null ? void 0 : _a.name;
    return all.filter((c) => c.name === key);
  }
  has(name) {
    return this._parsed.has(name);
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-set CookieStore#set} without the Promise.
   */
  set(...args) {
    const [name, value, cookie] = args.length === 1 ? [args[0].name, args[0].value, args[0]] : args;
    const map = this._parsed;
    map.set(name, normalizeCookie({ name, value, ...cookie }));
    replace(map, this._headers);
    return this;
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-delete CookieStore#delete} without the Promise.
   */
  delete(...args) {
    const [name, path, domain] = typeof args[0] === "string" ? [args[0]] : [args[0].name, args[0].path, args[0].domain];
    return this.set({ name, path, domain, value: "", expires: /* @__PURE__ */ new Date(0) });
  }
  [Symbol.for("edge-runtime.inspect.custom")]() {
    return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
  }
  toString() {
    return [...this._parsed.values()].map(stringifyCookie).join("; ");
  }
};
function replace(bag, headers) {
  headers.delete("set-cookie");
  for (const [, value] of bag) {
    const serialized = stringifyCookie(value);
    headers.append("set-cookie", serialized);
  }
}
function normalizeCookie(cookie = { name: "", value: "" }) {
  if (typeof cookie.expires === "number") {
    cookie.expires = new Date(cookie.expires);
  }
  if (cookie.maxAge) {
    cookie.expires = new Date(Date.now() + cookie.maxAge * 1e3);
  }
  if (cookie.path === null || cookie.path === void 0) {
    cookie.path = "/";
  }
  return cookie;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (0);


/***/ }),

/***/ 439:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var __dirname = "/";
(()=>{"use strict";var e={491:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.ContextAPI=void 0;const n=r(223);const a=r(172);const o=r(930);const i="context";const c=new n.NoopContextManager;class ContextAPI{constructor(){}static getInstance(){if(!this._instance){this._instance=new ContextAPI}return this._instance}setGlobalContextManager(e){return(0,a.registerGlobal)(i,e,o.DiagAPI.instance())}active(){return this._getContextManager().active()}with(e,t,r,...n){return this._getContextManager().with(e,t,r,...n)}bind(e,t){return this._getContextManager().bind(e,t)}_getContextManager(){return(0,a.getGlobal)(i)||c}disable(){this._getContextManager().disable();(0,a.unregisterGlobal)(i,o.DiagAPI.instance())}}t.ContextAPI=ContextAPI},930:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.DiagAPI=void 0;const n=r(56);const a=r(912);const o=r(957);const i=r(172);const c="diag";class DiagAPI{constructor(){function _logProxy(e){return function(...t){const r=(0,i.getGlobal)("diag");if(!r)return;return r[e](...t)}}const e=this;const setLogger=(t,r={logLevel:o.DiagLogLevel.INFO})=>{var n,c,s;if(t===e){const t=new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");e.error((n=t.stack)!==null&&n!==void 0?n:t.message);return false}if(typeof r==="number"){r={logLevel:r}}const u=(0,i.getGlobal)("diag");const l=(0,a.createLogLevelDiagLogger)((c=r.logLevel)!==null&&c!==void 0?c:o.DiagLogLevel.INFO,t);if(u&&!r.suppressOverrideMessage){const e=(s=(new Error).stack)!==null&&s!==void 0?s:"<failed to generate stacktrace>";u.warn(`Current logger will be overwritten from ${e}`);l.warn(`Current logger will overwrite one already registered from ${e}`)}return(0,i.registerGlobal)("diag",l,e,true)};e.setLogger=setLogger;e.disable=()=>{(0,i.unregisterGlobal)(c,e)};e.createComponentLogger=e=>new n.DiagComponentLogger(e);e.verbose=_logProxy("verbose");e.debug=_logProxy("debug");e.info=_logProxy("info");e.warn=_logProxy("warn");e.error=_logProxy("error")}static instance(){if(!this._instance){this._instance=new DiagAPI}return this._instance}}t.DiagAPI=DiagAPI},653:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.MetricsAPI=void 0;const n=r(660);const a=r(172);const o=r(930);const i="metrics";class MetricsAPI{constructor(){}static getInstance(){if(!this._instance){this._instance=new MetricsAPI}return this._instance}setGlobalMeterProvider(e){return(0,a.registerGlobal)(i,e,o.DiagAPI.instance())}getMeterProvider(){return(0,a.getGlobal)(i)||n.NOOP_METER_PROVIDER}getMeter(e,t,r){return this.getMeterProvider().getMeter(e,t,r)}disable(){(0,a.unregisterGlobal)(i,o.DiagAPI.instance())}}t.MetricsAPI=MetricsAPI},181:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.PropagationAPI=void 0;const n=r(172);const a=r(874);const o=r(194);const i=r(277);const c=r(369);const s=r(930);const u="propagation";const l=new a.NoopTextMapPropagator;class PropagationAPI{constructor(){this.createBaggage=c.createBaggage;this.getBaggage=i.getBaggage;this.getActiveBaggage=i.getActiveBaggage;this.setBaggage=i.setBaggage;this.deleteBaggage=i.deleteBaggage}static getInstance(){if(!this._instance){this._instance=new PropagationAPI}return this._instance}setGlobalPropagator(e){return(0,n.registerGlobal)(u,e,s.DiagAPI.instance())}inject(e,t,r=o.defaultTextMapSetter){return this._getGlobalPropagator().inject(e,t,r)}extract(e,t,r=o.defaultTextMapGetter){return this._getGlobalPropagator().extract(e,t,r)}fields(){return this._getGlobalPropagator().fields()}disable(){(0,n.unregisterGlobal)(u,s.DiagAPI.instance())}_getGlobalPropagator(){return(0,n.getGlobal)(u)||l}}t.PropagationAPI=PropagationAPI},997:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.TraceAPI=void 0;const n=r(172);const a=r(846);const o=r(139);const i=r(607);const c=r(930);const s="trace";class TraceAPI{constructor(){this._proxyTracerProvider=new a.ProxyTracerProvider;this.wrapSpanContext=o.wrapSpanContext;this.isSpanContextValid=o.isSpanContextValid;this.deleteSpan=i.deleteSpan;this.getSpan=i.getSpan;this.getActiveSpan=i.getActiveSpan;this.getSpanContext=i.getSpanContext;this.setSpan=i.setSpan;this.setSpanContext=i.setSpanContext}static getInstance(){if(!this._instance){this._instance=new TraceAPI}return this._instance}setGlobalTracerProvider(e){const t=(0,n.registerGlobal)(s,this._proxyTracerProvider,c.DiagAPI.instance());if(t){this._proxyTracerProvider.setDelegate(e)}return t}getTracerProvider(){return(0,n.getGlobal)(s)||this._proxyTracerProvider}getTracer(e,t){return this.getTracerProvider().getTracer(e,t)}disable(){(0,n.unregisterGlobal)(s,c.DiagAPI.instance());this._proxyTracerProvider=new a.ProxyTracerProvider}}t.TraceAPI=TraceAPI},277:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.deleteBaggage=t.setBaggage=t.getActiveBaggage=t.getBaggage=void 0;const n=r(491);const a=r(780);const o=(0,a.createContextKey)("OpenTelemetry Baggage Key");function getBaggage(e){return e.getValue(o)||undefined}t.getBaggage=getBaggage;function getActiveBaggage(){return getBaggage(n.ContextAPI.getInstance().active())}t.getActiveBaggage=getActiveBaggage;function setBaggage(e,t){return e.setValue(o,t)}t.setBaggage=setBaggage;function deleteBaggage(e){return e.deleteValue(o)}t.deleteBaggage=deleteBaggage},993:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.BaggageImpl=void 0;class BaggageImpl{constructor(e){this._entries=e?new Map(e):new Map}getEntry(e){const t=this._entries.get(e);if(!t){return undefined}return Object.assign({},t)}getAllEntries(){return Array.from(this._entries.entries()).map((([e,t])=>[e,t]))}setEntry(e,t){const r=new BaggageImpl(this._entries);r._entries.set(e,t);return r}removeEntry(e){const t=new BaggageImpl(this._entries);t._entries.delete(e);return t}removeEntries(...e){const t=new BaggageImpl(this._entries);for(const r of e){t._entries.delete(r)}return t}clear(){return new BaggageImpl}}t.BaggageImpl=BaggageImpl},830:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.baggageEntryMetadataSymbol=void 0;t.baggageEntryMetadataSymbol=Symbol("BaggageEntryMetadata")},369:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.baggageEntryMetadataFromString=t.createBaggage=void 0;const n=r(930);const a=r(993);const o=r(830);const i=n.DiagAPI.instance();function createBaggage(e={}){return new a.BaggageImpl(new Map(Object.entries(e)))}t.createBaggage=createBaggage;function baggageEntryMetadataFromString(e){if(typeof e!=="string"){i.error(`Cannot create baggage metadata from unknown type: ${typeof e}`);e=""}return{__TYPE__:o.baggageEntryMetadataSymbol,toString(){return e}}}t.baggageEntryMetadataFromString=baggageEntryMetadataFromString},67:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.context=void 0;const n=r(491);t.context=n.ContextAPI.getInstance()},223:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.NoopContextManager=void 0;const n=r(780);class NoopContextManager{active(){return n.ROOT_CONTEXT}with(e,t,r,...n){return t.call(r,...n)}bind(e,t){return t}enable(){return this}disable(){return this}}t.NoopContextManager=NoopContextManager},780:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.ROOT_CONTEXT=t.createContextKey=void 0;function createContextKey(e){return Symbol.for(e)}t.createContextKey=createContextKey;class BaseContext{constructor(e){const t=this;t._currentContext=e?new Map(e):new Map;t.getValue=e=>t._currentContext.get(e);t.setValue=(e,r)=>{const n=new BaseContext(t._currentContext);n._currentContext.set(e,r);return n};t.deleteValue=e=>{const r=new BaseContext(t._currentContext);r._currentContext.delete(e);return r}}}t.ROOT_CONTEXT=new BaseContext},506:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.diag=void 0;const n=r(930);t.diag=n.DiagAPI.instance()},56:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.DiagComponentLogger=void 0;const n=r(172);class DiagComponentLogger{constructor(e){this._namespace=e.namespace||"DiagComponentLogger"}debug(...e){return logProxy("debug",this._namespace,e)}error(...e){return logProxy("error",this._namespace,e)}info(...e){return logProxy("info",this._namespace,e)}warn(...e){return logProxy("warn",this._namespace,e)}verbose(...e){return logProxy("verbose",this._namespace,e)}}t.DiagComponentLogger=DiagComponentLogger;function logProxy(e,t,r){const a=(0,n.getGlobal)("diag");if(!a){return}r.unshift(t);return a[e](...r)}},972:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.DiagConsoleLogger=void 0;const r=[{n:"error",c:"error"},{n:"warn",c:"warn"},{n:"info",c:"info"},{n:"debug",c:"debug"},{n:"verbose",c:"trace"}];class DiagConsoleLogger{constructor(){function _consoleFunc(e){return function(...t){if(console){let r=console[e];if(typeof r!=="function"){r=console.log}if(typeof r==="function"){return r.apply(console,t)}}}}for(let e=0;e<r.length;e++){this[r[e].n]=_consoleFunc(r[e].c)}}}t.DiagConsoleLogger=DiagConsoleLogger},912:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.createLogLevelDiagLogger=void 0;const n=r(957);function createLogLevelDiagLogger(e,t){if(e<n.DiagLogLevel.NONE){e=n.DiagLogLevel.NONE}else if(e>n.DiagLogLevel.ALL){e=n.DiagLogLevel.ALL}t=t||{};function _filterFunc(r,n){const a=t[r];if(typeof a==="function"&&e>=n){return a.bind(t)}return function(){}}return{error:_filterFunc("error",n.DiagLogLevel.ERROR),warn:_filterFunc("warn",n.DiagLogLevel.WARN),info:_filterFunc("info",n.DiagLogLevel.INFO),debug:_filterFunc("debug",n.DiagLogLevel.DEBUG),verbose:_filterFunc("verbose",n.DiagLogLevel.VERBOSE)}}t.createLogLevelDiagLogger=createLogLevelDiagLogger},957:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.DiagLogLevel=void 0;var r;(function(e){e[e["NONE"]=0]="NONE";e[e["ERROR"]=30]="ERROR";e[e["WARN"]=50]="WARN";e[e["INFO"]=60]="INFO";e[e["DEBUG"]=70]="DEBUG";e[e["VERBOSE"]=80]="VERBOSE";e[e["ALL"]=9999]="ALL"})(r=t.DiagLogLevel||(t.DiagLogLevel={}))},172:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.unregisterGlobal=t.getGlobal=t.registerGlobal=void 0;const n=r(200);const a=r(521);const o=r(130);const i=a.VERSION.split(".")[0];const c=Symbol.for(`opentelemetry.js.api.${i}`);const s=n._globalThis;function registerGlobal(e,t,r,n=false){var o;const i=s[c]=(o=s[c])!==null&&o!==void 0?o:{version:a.VERSION};if(!n&&i[e]){const t=new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${e}`);r.error(t.stack||t.message);return false}if(i.version!==a.VERSION){const t=new Error(`@opentelemetry/api: Registration of version v${i.version} for ${e} does not match previously registered API v${a.VERSION}`);r.error(t.stack||t.message);return false}i[e]=t;r.debug(`@opentelemetry/api: Registered a global for ${e} v${a.VERSION}.`);return true}t.registerGlobal=registerGlobal;function getGlobal(e){var t,r;const n=(t=s[c])===null||t===void 0?void 0:t.version;if(!n||!(0,o.isCompatible)(n)){return}return(r=s[c])===null||r===void 0?void 0:r[e]}t.getGlobal=getGlobal;function unregisterGlobal(e,t){t.debug(`@opentelemetry/api: Unregistering a global for ${e} v${a.VERSION}.`);const r=s[c];if(r){delete r[e]}}t.unregisterGlobal=unregisterGlobal},130:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.isCompatible=t._makeCompatibilityCheck=void 0;const n=r(521);const a=/^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;function _makeCompatibilityCheck(e){const t=new Set([e]);const r=new Set;const n=e.match(a);if(!n){return()=>false}const o={major:+n[1],minor:+n[2],patch:+n[3],prerelease:n[4]};if(o.prerelease!=null){return function isExactmatch(t){return t===e}}function _reject(e){r.add(e);return false}function _accept(e){t.add(e);return true}return function isCompatible(e){if(t.has(e)){return true}if(r.has(e)){return false}const n=e.match(a);if(!n){return _reject(e)}const i={major:+n[1],minor:+n[2],patch:+n[3],prerelease:n[4]};if(i.prerelease!=null){return _reject(e)}if(o.major!==i.major){return _reject(e)}if(o.major===0){if(o.minor===i.minor&&o.patch<=i.patch){return _accept(e)}return _reject(e)}if(o.minor<=i.minor){return _accept(e)}return _reject(e)}}t._makeCompatibilityCheck=_makeCompatibilityCheck;t.isCompatible=_makeCompatibilityCheck(n.VERSION)},886:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.metrics=void 0;const n=r(653);t.metrics=n.MetricsAPI.getInstance()},901:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.ValueType=void 0;var r;(function(e){e[e["INT"]=0]="INT";e[e["DOUBLE"]=1]="DOUBLE"})(r=t.ValueType||(t.ValueType={}))},102:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.createNoopMeter=t.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC=t.NOOP_OBSERVABLE_GAUGE_METRIC=t.NOOP_OBSERVABLE_COUNTER_METRIC=t.NOOP_UP_DOWN_COUNTER_METRIC=t.NOOP_HISTOGRAM_METRIC=t.NOOP_COUNTER_METRIC=t.NOOP_METER=t.NoopObservableUpDownCounterMetric=t.NoopObservableGaugeMetric=t.NoopObservableCounterMetric=t.NoopObservableMetric=t.NoopHistogramMetric=t.NoopUpDownCounterMetric=t.NoopCounterMetric=t.NoopMetric=t.NoopMeter=void 0;class NoopMeter{constructor(){}createHistogram(e,r){return t.NOOP_HISTOGRAM_METRIC}createCounter(e,r){return t.NOOP_COUNTER_METRIC}createUpDownCounter(e,r){return t.NOOP_UP_DOWN_COUNTER_METRIC}createObservableGauge(e,r){return t.NOOP_OBSERVABLE_GAUGE_METRIC}createObservableCounter(e,r){return t.NOOP_OBSERVABLE_COUNTER_METRIC}createObservableUpDownCounter(e,r){return t.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC}addBatchObservableCallback(e,t){}removeBatchObservableCallback(e){}}t.NoopMeter=NoopMeter;class NoopMetric{}t.NoopMetric=NoopMetric;class NoopCounterMetric extends NoopMetric{add(e,t){}}t.NoopCounterMetric=NoopCounterMetric;class NoopUpDownCounterMetric extends NoopMetric{add(e,t){}}t.NoopUpDownCounterMetric=NoopUpDownCounterMetric;class NoopHistogramMetric extends NoopMetric{record(e,t){}}t.NoopHistogramMetric=NoopHistogramMetric;class NoopObservableMetric{addCallback(e){}removeCallback(e){}}t.NoopObservableMetric=NoopObservableMetric;class NoopObservableCounterMetric extends NoopObservableMetric{}t.NoopObservableCounterMetric=NoopObservableCounterMetric;class NoopObservableGaugeMetric extends NoopObservableMetric{}t.NoopObservableGaugeMetric=NoopObservableGaugeMetric;class NoopObservableUpDownCounterMetric extends NoopObservableMetric{}t.NoopObservableUpDownCounterMetric=NoopObservableUpDownCounterMetric;t.NOOP_METER=new NoopMeter;t.NOOP_COUNTER_METRIC=new NoopCounterMetric;t.NOOP_HISTOGRAM_METRIC=new NoopHistogramMetric;t.NOOP_UP_DOWN_COUNTER_METRIC=new NoopUpDownCounterMetric;t.NOOP_OBSERVABLE_COUNTER_METRIC=new NoopObservableCounterMetric;t.NOOP_OBSERVABLE_GAUGE_METRIC=new NoopObservableGaugeMetric;t.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC=new NoopObservableUpDownCounterMetric;function createNoopMeter(){return t.NOOP_METER}t.createNoopMeter=createNoopMeter},660:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.NOOP_METER_PROVIDER=t.NoopMeterProvider=void 0;const n=r(102);class NoopMeterProvider{getMeter(e,t,r){return n.NOOP_METER}}t.NoopMeterProvider=NoopMeterProvider;t.NOOP_METER_PROVIDER=new NoopMeterProvider},200:function(e,t,r){var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){if(n===undefined)n=r;Object.defineProperty(e,n,{enumerable:true,get:function(){return t[r]}})}:function(e,t,r,n){if(n===undefined)n=r;e[n]=t[r]});var a=this&&this.__exportStar||function(e,t){for(var r in e)if(r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r))n(t,e,r)};Object.defineProperty(t,"__esModule",{value:true});a(r(46),t)},651:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t._globalThis=void 0;t._globalThis=typeof globalThis==="object"?globalThis:__webpack_require__.g},46:function(e,t,r){var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){if(n===undefined)n=r;Object.defineProperty(e,n,{enumerable:true,get:function(){return t[r]}})}:function(e,t,r,n){if(n===undefined)n=r;e[n]=t[r]});var a=this&&this.__exportStar||function(e,t){for(var r in e)if(r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r))n(t,e,r)};Object.defineProperty(t,"__esModule",{value:true});a(r(651),t)},939:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.propagation=void 0;const n=r(181);t.propagation=n.PropagationAPI.getInstance()},874:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.NoopTextMapPropagator=void 0;class NoopTextMapPropagator{inject(e,t){}extract(e,t){return e}fields(){return[]}}t.NoopTextMapPropagator=NoopTextMapPropagator},194:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.defaultTextMapSetter=t.defaultTextMapGetter=void 0;t.defaultTextMapGetter={get(e,t){if(e==null){return undefined}return e[t]},keys(e){if(e==null){return[]}return Object.keys(e)}};t.defaultTextMapSetter={set(e,t,r){if(e==null){return}e[t]=r}}},845:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.trace=void 0;const n=r(997);t.trace=n.TraceAPI.getInstance()},403:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.NonRecordingSpan=void 0;const n=r(476);class NonRecordingSpan{constructor(e=n.INVALID_SPAN_CONTEXT){this._spanContext=e}spanContext(){return this._spanContext}setAttribute(e,t){return this}setAttributes(e){return this}addEvent(e,t){return this}setStatus(e){return this}updateName(e){return this}end(e){}isRecording(){return false}recordException(e,t){}}t.NonRecordingSpan=NonRecordingSpan},614:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.NoopTracer=void 0;const n=r(491);const a=r(607);const o=r(403);const i=r(139);const c=n.ContextAPI.getInstance();class NoopTracer{startSpan(e,t,r=c.active()){const n=Boolean(t===null||t===void 0?void 0:t.root);if(n){return new o.NonRecordingSpan}const s=r&&(0,a.getSpanContext)(r);if(isSpanContext(s)&&(0,i.isSpanContextValid)(s)){return new o.NonRecordingSpan(s)}else{return new o.NonRecordingSpan}}startActiveSpan(e,t,r,n){let o;let i;let s;if(arguments.length<2){return}else if(arguments.length===2){s=t}else if(arguments.length===3){o=t;s=r}else{o=t;i=r;s=n}const u=i!==null&&i!==void 0?i:c.active();const l=this.startSpan(e,o,u);const g=(0,a.setSpan)(u,l);return c.with(g,s,undefined,l)}}t.NoopTracer=NoopTracer;function isSpanContext(e){return typeof e==="object"&&typeof e["spanId"]==="string"&&typeof e["traceId"]==="string"&&typeof e["traceFlags"]==="number"}},124:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.NoopTracerProvider=void 0;const n=r(614);class NoopTracerProvider{getTracer(e,t,r){return new n.NoopTracer}}t.NoopTracerProvider=NoopTracerProvider},125:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.ProxyTracer=void 0;const n=r(614);const a=new n.NoopTracer;class ProxyTracer{constructor(e,t,r,n){this._provider=e;this.name=t;this.version=r;this.options=n}startSpan(e,t,r){return this._getTracer().startSpan(e,t,r)}startActiveSpan(e,t,r,n){const a=this._getTracer();return Reflect.apply(a.startActiveSpan,a,arguments)}_getTracer(){if(this._delegate){return this._delegate}const e=this._provider.getDelegateTracer(this.name,this.version,this.options);if(!e){return a}this._delegate=e;return this._delegate}}t.ProxyTracer=ProxyTracer},846:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.ProxyTracerProvider=void 0;const n=r(125);const a=r(124);const o=new a.NoopTracerProvider;class ProxyTracerProvider{getTracer(e,t,r){var a;return(a=this.getDelegateTracer(e,t,r))!==null&&a!==void 0?a:new n.ProxyTracer(this,e,t,r)}getDelegate(){var e;return(e=this._delegate)!==null&&e!==void 0?e:o}setDelegate(e){this._delegate=e}getDelegateTracer(e,t,r){var n;return(n=this._delegate)===null||n===void 0?void 0:n.getTracer(e,t,r)}}t.ProxyTracerProvider=ProxyTracerProvider},996:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.SamplingDecision=void 0;var r;(function(e){e[e["NOT_RECORD"]=0]="NOT_RECORD";e[e["RECORD"]=1]="RECORD";e[e["RECORD_AND_SAMPLED"]=2]="RECORD_AND_SAMPLED"})(r=t.SamplingDecision||(t.SamplingDecision={}))},607:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.getSpanContext=t.setSpanContext=t.deleteSpan=t.setSpan=t.getActiveSpan=t.getSpan=void 0;const n=r(780);const a=r(403);const o=r(491);const i=(0,n.createContextKey)("OpenTelemetry Context Key SPAN");function getSpan(e){return e.getValue(i)||undefined}t.getSpan=getSpan;function getActiveSpan(){return getSpan(o.ContextAPI.getInstance().active())}t.getActiveSpan=getActiveSpan;function setSpan(e,t){return e.setValue(i,t)}t.setSpan=setSpan;function deleteSpan(e){return e.deleteValue(i)}t.deleteSpan=deleteSpan;function setSpanContext(e,t){return setSpan(e,new a.NonRecordingSpan(t))}t.setSpanContext=setSpanContext;function getSpanContext(e){var t;return(t=getSpan(e))===null||t===void 0?void 0:t.spanContext()}t.getSpanContext=getSpanContext},325:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.TraceStateImpl=void 0;const n=r(564);const a=32;const o=512;const i=",";const c="=";class TraceStateImpl{constructor(e){this._internalState=new Map;if(e)this._parse(e)}set(e,t){const r=this._clone();if(r._internalState.has(e)){r._internalState.delete(e)}r._internalState.set(e,t);return r}unset(e){const t=this._clone();t._internalState.delete(e);return t}get(e){return this._internalState.get(e)}serialize(){return this._keys().reduce(((e,t)=>{e.push(t+c+this.get(t));return e}),[]).join(i)}_parse(e){if(e.length>o)return;this._internalState=e.split(i).reverse().reduce(((e,t)=>{const r=t.trim();const a=r.indexOf(c);if(a!==-1){const o=r.slice(0,a);const i=r.slice(a+1,t.length);if((0,n.validateKey)(o)&&(0,n.validateValue)(i)){e.set(o,i)}else{}}return e}),new Map);if(this._internalState.size>a){this._internalState=new Map(Array.from(this._internalState.entries()).reverse().slice(0,a))}}_keys(){return Array.from(this._internalState.keys()).reverse()}_clone(){const e=new TraceStateImpl;e._internalState=new Map(this._internalState);return e}}t.TraceStateImpl=TraceStateImpl},564:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.validateValue=t.validateKey=void 0;const r="[_0-9a-z-*/]";const n=`[a-z]${r}{0,255}`;const a=`[a-z0-9]${r}{0,240}@[a-z]${r}{0,13}`;const o=new RegExp(`^(?:${n}|${a})$`);const i=/^[ -~]{0,255}[!-~]$/;const c=/,|=/;function validateKey(e){return o.test(e)}t.validateKey=validateKey;function validateValue(e){return i.test(e)&&!c.test(e)}t.validateValue=validateValue},98:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.createTraceState=void 0;const n=r(325);function createTraceState(e){return new n.TraceStateImpl(e)}t.createTraceState=createTraceState},476:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.INVALID_SPAN_CONTEXT=t.INVALID_TRACEID=t.INVALID_SPANID=void 0;const n=r(475);t.INVALID_SPANID="0000000000000000";t.INVALID_TRACEID="00000000000000000000000000000000";t.INVALID_SPAN_CONTEXT={traceId:t.INVALID_TRACEID,spanId:t.INVALID_SPANID,traceFlags:n.TraceFlags.NONE}},357:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.SpanKind=void 0;var r;(function(e){e[e["INTERNAL"]=0]="INTERNAL";e[e["SERVER"]=1]="SERVER";e[e["CLIENT"]=2]="CLIENT";e[e["PRODUCER"]=3]="PRODUCER";e[e["CONSUMER"]=4]="CONSUMER"})(r=t.SpanKind||(t.SpanKind={}))},139:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:true});t.wrapSpanContext=t.isSpanContextValid=t.isValidSpanId=t.isValidTraceId=void 0;const n=r(476);const a=r(403);const o=/^([0-9a-f]{32})$/i;const i=/^[0-9a-f]{16}$/i;function isValidTraceId(e){return o.test(e)&&e!==n.INVALID_TRACEID}t.isValidTraceId=isValidTraceId;function isValidSpanId(e){return i.test(e)&&e!==n.INVALID_SPANID}t.isValidSpanId=isValidSpanId;function isSpanContextValid(e){return isValidTraceId(e.traceId)&&isValidSpanId(e.spanId)}t.isSpanContextValid=isSpanContextValid;function wrapSpanContext(e){return new a.NonRecordingSpan(e)}t.wrapSpanContext=wrapSpanContext},847:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.SpanStatusCode=void 0;var r;(function(e){e[e["UNSET"]=0]="UNSET";e[e["OK"]=1]="OK";e[e["ERROR"]=2]="ERROR"})(r=t.SpanStatusCode||(t.SpanStatusCode={}))},475:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.TraceFlags=void 0;var r;(function(e){e[e["NONE"]=0]="NONE";e[e["SAMPLED"]=1]="SAMPLED"})(r=t.TraceFlags||(t.TraceFlags={}))},521:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.VERSION=void 0;t.VERSION="1.6.0"}};var t={};function __nccwpck_require__(r){var n=t[r];if(n!==undefined){return n.exports}var a=t[r]={exports:{}};var o=true;try{e[r].call(a.exports,a,a.exports,__nccwpck_require__);o=false}finally{if(o)delete t[r]}return a.exports}if(typeof __nccwpck_require__!=="undefined")__nccwpck_require__.ab=__dirname+"/";var r={};(()=>{var e=r;Object.defineProperty(e,"__esModule",{value:true});e.trace=e.propagation=e.metrics=e.diag=e.context=e.INVALID_SPAN_CONTEXT=e.INVALID_TRACEID=e.INVALID_SPANID=e.isValidSpanId=e.isValidTraceId=e.isSpanContextValid=e.createTraceState=e.TraceFlags=e.SpanStatusCode=e.SpanKind=e.SamplingDecision=e.ProxyTracerProvider=e.ProxyTracer=e.defaultTextMapSetter=e.defaultTextMapGetter=e.ValueType=e.createNoopMeter=e.DiagLogLevel=e.DiagConsoleLogger=e.ROOT_CONTEXT=e.createContextKey=e.baggageEntryMetadataFromString=void 0;var t=__nccwpck_require__(369);Object.defineProperty(e,"baggageEntryMetadataFromString",{enumerable:true,get:function(){return t.baggageEntryMetadataFromString}});var n=__nccwpck_require__(780);Object.defineProperty(e,"createContextKey",{enumerable:true,get:function(){return n.createContextKey}});Object.defineProperty(e,"ROOT_CONTEXT",{enumerable:true,get:function(){return n.ROOT_CONTEXT}});var a=__nccwpck_require__(972);Object.defineProperty(e,"DiagConsoleLogger",{enumerable:true,get:function(){return a.DiagConsoleLogger}});var o=__nccwpck_require__(957);Object.defineProperty(e,"DiagLogLevel",{enumerable:true,get:function(){return o.DiagLogLevel}});var i=__nccwpck_require__(102);Object.defineProperty(e,"createNoopMeter",{enumerable:true,get:function(){return i.createNoopMeter}});var c=__nccwpck_require__(901);Object.defineProperty(e,"ValueType",{enumerable:true,get:function(){return c.ValueType}});var s=__nccwpck_require__(194);Object.defineProperty(e,"defaultTextMapGetter",{enumerable:true,get:function(){return s.defaultTextMapGetter}});Object.defineProperty(e,"defaultTextMapSetter",{enumerable:true,get:function(){return s.defaultTextMapSetter}});var u=__nccwpck_require__(125);Object.defineProperty(e,"ProxyTracer",{enumerable:true,get:function(){return u.ProxyTracer}});var l=__nccwpck_require__(846);Object.defineProperty(e,"ProxyTracerProvider",{enumerable:true,get:function(){return l.ProxyTracerProvider}});var g=__nccwpck_require__(996);Object.defineProperty(e,"SamplingDecision",{enumerable:true,get:function(){return g.SamplingDecision}});var p=__nccwpck_require__(357);Object.defineProperty(e,"SpanKind",{enumerable:true,get:function(){return p.SpanKind}});var d=__nccwpck_require__(847);Object.defineProperty(e,"SpanStatusCode",{enumerable:true,get:function(){return d.SpanStatusCode}});var _=__nccwpck_require__(475);Object.defineProperty(e,"TraceFlags",{enumerable:true,get:function(){return _.TraceFlags}});var f=__nccwpck_require__(98);Object.defineProperty(e,"createTraceState",{enumerable:true,get:function(){return f.createTraceState}});var b=__nccwpck_require__(139);Object.defineProperty(e,"isSpanContextValid",{enumerable:true,get:function(){return b.isSpanContextValid}});Object.defineProperty(e,"isValidTraceId",{enumerable:true,get:function(){return b.isValidTraceId}});Object.defineProperty(e,"isValidSpanId",{enumerable:true,get:function(){return b.isValidSpanId}});var v=__nccwpck_require__(476);Object.defineProperty(e,"INVALID_SPANID",{enumerable:true,get:function(){return v.INVALID_SPANID}});Object.defineProperty(e,"INVALID_TRACEID",{enumerable:true,get:function(){return v.INVALID_TRACEID}});Object.defineProperty(e,"INVALID_SPAN_CONTEXT",{enumerable:true,get:function(){return v.INVALID_SPAN_CONTEXT}});const O=__nccwpck_require__(67);Object.defineProperty(e,"context",{enumerable:true,get:function(){return O.context}});const P=__nccwpck_require__(506);Object.defineProperty(e,"diag",{enumerable:true,get:function(){return P.diag}});const N=__nccwpck_require__(886);Object.defineProperty(e,"metrics",{enumerable:true,get:function(){return N.metrics}});const S=__nccwpck_require__(939);Object.defineProperty(e,"propagation",{enumerable:true,get:function(){return S.propagation}});const C=__nccwpck_require__(845);Object.defineProperty(e,"trace",{enumerable:true,get:function(){return C.trace}});e["default"]={context:O.context,diag:P.diag,metrics:N.metrics,propagation:S.propagation,trace:C.trace}})();module.exports=r})();

/***/ }),

/***/ 133:
/***/ ((module) => {

var __dirname = "/";
(()=>{"use strict";if(typeof __nccwpck_require__!=="undefined")__nccwpck_require__.ab=__dirname+"/";var e={};(()=>{var r=e;
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */r.parse=parse;r.serialize=serialize;var i=decodeURIComponent;var t=encodeURIComponent;var a=/; */;var n=/^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;function parse(e,r){if(typeof e!=="string"){throw new TypeError("argument str must be a string")}var t={};var n=r||{};var o=e.split(a);var s=n.decode||i;for(var p=0;p<o.length;p++){var f=o[p];var u=f.indexOf("=");if(u<0){continue}var v=f.substr(0,u).trim();var c=f.substr(++u,f.length).trim();if('"'==c[0]){c=c.slice(1,-1)}if(undefined==t[v]){t[v]=tryDecode(c,s)}}return t}function serialize(e,r,i){var a=i||{};var o=a.encode||t;if(typeof o!=="function"){throw new TypeError("option encode is invalid")}if(!n.test(e)){throw new TypeError("argument name is invalid")}var s=o(r);if(s&&!n.test(s)){throw new TypeError("argument val is invalid")}var p=e+"="+s;if(null!=a.maxAge){var f=a.maxAge-0;if(isNaN(f)||!isFinite(f)){throw new TypeError("option maxAge is invalid")}p+="; Max-Age="+Math.floor(f)}if(a.domain){if(!n.test(a.domain)){throw new TypeError("option domain is invalid")}p+="; Domain="+a.domain}if(a.path){if(!n.test(a.path)){throw new TypeError("option path is invalid")}p+="; Path="+a.path}if(a.expires){if(typeof a.expires.toUTCString!=="function"){throw new TypeError("option expires is invalid")}p+="; Expires="+a.expires.toUTCString()}if(a.httpOnly){p+="; HttpOnly"}if(a.secure){p+="; Secure"}if(a.sameSite){var u=typeof a.sameSite==="string"?a.sameSite.toLowerCase():a.sameSite;switch(u){case true:p+="; SameSite=Strict";break;case"lax":p+="; SameSite=Lax";break;case"strict":p+="; SameSite=Strict";break;case"none":p+="; SameSite=None";break;default:throw new TypeError("option sameSite is invalid")}}return p}function tryDecode(e,r){try{return r(e)}catch(r){return e}}})();module.exports=e})();

/***/ }),

/***/ 340:
/***/ ((module, exports, __webpack_require__) => {

var __dirname = "/";
var __WEBPACK_AMD_DEFINE_RESULT__;(()=>{var i={226:function(i,e){(function(o,a){"use strict";var r="1.0.35",t="",n="?",s="function",b="undefined",w="object",l="string",d="major",c="model",u="name",p="type",m="vendor",f="version",h="architecture",v="console",g="mobile",k="tablet",x="smarttv",_="wearable",y="embedded",q=350;var T="Amazon",S="Apple",z="ASUS",N="BlackBerry",A="Browser",C="Chrome",E="Edge",O="Firefox",U="Google",j="Huawei",P="LG",R="Microsoft",M="Motorola",B="Opera",V="Samsung",D="Sharp",I="Sony",W="Viera",F="Xiaomi",G="Zebra",H="Facebook",L="Chromium OS",Z="Mac OS";var extend=function(i,e){var o={};for(var a in i){if(e[a]&&e[a].length%2===0){o[a]=e[a].concat(i[a])}else{o[a]=i[a]}}return o},enumerize=function(i){var e={};for(var o=0;o<i.length;o++){e[i[o].toUpperCase()]=i[o]}return e},has=function(i,e){return typeof i===l?lowerize(e).indexOf(lowerize(i))!==-1:false},lowerize=function(i){return i.toLowerCase()},majorize=function(i){return typeof i===l?i.replace(/[^\d\.]/g,t).split(".")[0]:a},trim=function(i,e){if(typeof i===l){i=i.replace(/^\s\s*/,t);return typeof e===b?i:i.substring(0,q)}};var rgxMapper=function(i,e){var o=0,r,t,n,b,l,d;while(o<e.length&&!l){var c=e[o],u=e[o+1];r=t=0;while(r<c.length&&!l){if(!c[r]){break}l=c[r++].exec(i);if(!!l){for(n=0;n<u.length;n++){d=l[++t];b=u[n];if(typeof b===w&&b.length>0){if(b.length===2){if(typeof b[1]==s){this[b[0]]=b[1].call(this,d)}else{this[b[0]]=b[1]}}else if(b.length===3){if(typeof b[1]===s&&!(b[1].exec&&b[1].test)){this[b[0]]=d?b[1].call(this,d,b[2]):a}else{this[b[0]]=d?d.replace(b[1],b[2]):a}}else if(b.length===4){this[b[0]]=d?b[3].call(this,d.replace(b[1],b[2])):a}}else{this[b]=d?d:a}}}}o+=2}},strMapper=function(i,e){for(var o in e){if(typeof e[o]===w&&e[o].length>0){for(var r=0;r<e[o].length;r++){if(has(e[o][r],i)){return o===n?a:o}}}else if(has(e[o],i)){return o===n?a:o}}return i};var $={"1.0":"/8",1.2:"/1",1.3:"/3","2.0":"/412","2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","?":"/"},X={ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2e3:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2",8.1:"NT 6.3",10:["NT 6.4","NT 10.0"],RT:"ARM"};var K={browser:[[/\b(?:crmo|crios)\/([\w\.]+)/i],[f,[u,"Chrome"]],[/edg(?:e|ios|a)?\/([\w\.]+)/i],[f,[u,"Edge"]],[/(opera mini)\/([-\w\.]+)/i,/(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,/(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i],[u,f],[/opios[\/ ]+([\w\.]+)/i],[f,[u,B+" Mini"]],[/\bopr\/([\w\.]+)/i],[f,[u,B]],[/(kindle)\/([\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i,/(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i,/(ba?idubrowser)[\/ ]?([\w\.]+)/i,/(?:ms|\()(ie) ([\w\.]+)/i,/(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i,/(heytap|ovi)browser\/([\d\.]+)/i,/(weibo)__([\d\.]+)/i],[u,f],[/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i],[f,[u,"UC"+A]],[/microm.+\bqbcore\/([\w\.]+)/i,/\bqbcore\/([\w\.]+).+microm/i],[f,[u,"WeChat(Win) Desktop"]],[/micromessenger\/([\w\.]+)/i],[f,[u,"WeChat"]],[/konqueror\/([\w\.]+)/i],[f,[u,"Konqueror"]],[/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i],[f,[u,"IE"]],[/ya(?:search)?browser\/([\w\.]+)/i],[f,[u,"Yandex"]],[/(avast|avg)\/([\w\.]+)/i],[[u,/(.+)/,"$1 Secure "+A],f],[/\bfocus\/([\w\.]+)/i],[f,[u,O+" Focus"]],[/\bopt\/([\w\.]+)/i],[f,[u,B+" Touch"]],[/coc_coc\w+\/([\w\.]+)/i],[f,[u,"Coc Coc"]],[/dolfin\/([\w\.]+)/i],[f,[u,"Dolphin"]],[/coast\/([\w\.]+)/i],[f,[u,B+" Coast"]],[/miuibrowser\/([\w\.]+)/i],[f,[u,"MIUI "+A]],[/fxios\/([-\w\.]+)/i],[f,[u,O]],[/\bqihu|(qi?ho?o?|360)browser/i],[[u,"360 "+A]],[/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i],[[u,/(.+)/,"$1 "+A],f],[/(comodo_dragon)\/([\w\.]+)/i],[[u,/_/g," "],f],[/(electron)\/([\w\.]+) safari/i,/(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,/m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i],[u,f],[/(metasr)[\/ ]?([\w\.]+)/i,/(lbbrowser)/i,/\[(linkedin)app\]/i],[u],[/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i],[[u,H],f],[/(kakao(?:talk|story))[\/ ]([\w\.]+)/i,/(naver)\(.*?(\d+\.[\w\.]+).*\)/i,/safari (line)\/([\w\.]+)/i,/\b(line)\/([\w\.]+)\/iab/i,/(chromium|instagram)[\/ ]([-\w\.]+)/i],[u,f],[/\bgsa\/([\w\.]+) .*safari\//i],[f,[u,"GSA"]],[/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i],[f,[u,"TikTok"]],[/headlesschrome(?:\/([\w\.]+)| )/i],[f,[u,C+" Headless"]],[/ wv\).+(chrome)\/([\w\.]+)/i],[[u,C+" WebView"],f],[/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i],[f,[u,"Android "+A]],[/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i],[u,f],[/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i],[f,[u,"Mobile Safari"]],[/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i],[f,u],[/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i],[u,[f,strMapper,$]],[/(webkit|khtml)\/([\w\.]+)/i],[u,f],[/(navigator|netscape\d?)\/([-\w\.]+)/i],[[u,"Netscape"],f],[/mobile vr; rv:([\w\.]+)\).+firefox/i],[f,[u,O+" Reality"]],[/ekiohf.+(flow)\/([\w\.]+)/i,/(swiftfox)/i,/(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i,/(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,/(firefox)\/([\w\.]+)/i,/(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i,/(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,/(links) \(([\w\.]+)/i,/panasonic;(viera)/i],[u,f],[/(cobalt)\/([\w\.]+)/i],[u,[f,/master.|lts./,""]]],cpu:[[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i],[[h,"amd64"]],[/(ia32(?=;))/i],[[h,lowerize]],[/((?:i[346]|x)86)[;\)]/i],[[h,"ia32"]],[/\b(aarch64|arm(v?8e?l?|_?64))\b/i],[[h,"arm64"]],[/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i],[[h,"armhf"]],[/windows (ce|mobile); ppc;/i],[[h,"arm"]],[/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i],[[h,/ower/,t,lowerize]],[/(sun4\w)[;\)]/i],[[h,"sparc"]],[/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i],[[h,lowerize]]],device:[[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i],[c,[m,V],[p,k]],[/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,/samsung[- ]([-\w]+)/i,/sec-(sgh\w+)/i],[c,[m,V],[p,g]],[/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i],[c,[m,S],[p,g]],[/\((ipad);[-\w\),; ]+apple/i,/applecoremedia\/[\w\.]+ \((ipad)/i,/\b(ipad)\d\d?,\d\d?[;\]].+ios/i],[c,[m,S],[p,k]],[/(macintosh);/i],[c,[m,S]],[/\b(sh-?[altvz]?\d\d[a-ekm]?)/i],[c,[m,D],[p,g]],[/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i],[c,[m,j],[p,k]],[/(?:huawei|honor)([-\w ]+)[;\)]/i,/\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i],[c,[m,j],[p,g]],[/\b(poco[\w ]+)(?: bui|\))/i,/\b; (\w+) build\/hm\1/i,/\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,/\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i,/\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i],[[c,/_/g," "],[m,F],[p,g]],[/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i],[[c,/_/g," "],[m,F],[p,k]],[/; (\w+) bui.+ oppo/i,/\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i],[c,[m,"OPPO"],[p,g]],[/vivo (\w+)(?: bui|\))/i,/\b(v[12]\d{3}\w?[at])(?: bui|;)/i],[c,[m,"Vivo"],[p,g]],[/\b(rmx[12]\d{3})(?: bui|;|\))/i],[c,[m,"Realme"],[p,g]],[/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,/\bmot(?:orola)?[- ](\w*)/i,/((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i],[c,[m,M],[p,g]],[/\b(mz60\d|xoom[2 ]{0,2}) build\//i],[c,[m,M],[p,k]],[/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i],[c,[m,P],[p,k]],[/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,/\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i,/\blg-?([\d\w]+) bui/i],[c,[m,P],[p,g]],[/(ideatab[-\w ]+)/i,/lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i],[c,[m,"Lenovo"],[p,k]],[/(?:maemo|nokia).*(n900|lumia \d+)/i,/nokia[-_ ]?([-\w\.]*)/i],[[c,/_/g," "],[m,"Nokia"],[p,g]],[/(pixel c)\b/i],[c,[m,U],[p,k]],[/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i],[c,[m,U],[p,g]],[/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i],[c,[m,I],[p,g]],[/sony tablet [ps]/i,/\b(?:sony)?sgp\w+(?: bui|\))/i],[[c,"Xperia Tablet"],[m,I],[p,k]],[/ (kb2005|in20[12]5|be20[12][59])\b/i,/(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i],[c,[m,"OnePlus"],[p,g]],[/(alexa)webm/i,/(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i,/(kf[a-z]+)( bui|\)).+silk\//i],[c,[m,T],[p,k]],[/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i],[[c,/(.+)/g,"Fire Phone $1"],[m,T],[p,g]],[/(playbook);[-\w\),; ]+(rim)/i],[c,m,[p,k]],[/\b((?:bb[a-f]|st[hv])100-\d)/i,/\(bb10; (\w+)/i],[c,[m,N],[p,g]],[/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i],[c,[m,z],[p,k]],[/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i],[c,[m,z],[p,g]],[/(nexus 9)/i],[c,[m,"HTC"],[p,k]],[/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,/(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,/(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i],[m,[c,/_/g," "],[p,g]],[/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i],[c,[m,"Acer"],[p,k]],[/droid.+; (m[1-5] note) bui/i,/\bmz-([-\w]{2,})/i],[c,[m,"Meizu"],[p,g]],[/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i,/(hp) ([\w ]+\w)/i,/(asus)-?(\w+)/i,/(microsoft); (lumia[\w ]+)/i,/(lenovo)[-_ ]?([-\w]+)/i,/(jolla)/i,/(oppo) ?([\w ]+) bui/i],[m,c,[p,g]],[/(kobo)\s(ereader|touch)/i,/(archos) (gamepad2?)/i,/(hp).+(touchpad(?!.+tablet)|tablet)/i,/(kindle)\/([\w\.]+)/i,/(nook)[\w ]+build\/(\w+)/i,/(dell) (strea[kpr\d ]*[\dko])/i,/(le[- ]+pan)[- ]+(\w{1,9}) bui/i,/(trinity)[- ]*(t\d{3}) bui/i,/(gigaset)[- ]+(q\w{1,9}) bui/i,/(vodafone) ([\w ]+)(?:\)| bui)/i],[m,c,[p,k]],[/(surface duo)/i],[c,[m,R],[p,k]],[/droid [\d\.]+; (fp\du?)(?: b|\))/i],[c,[m,"Fairphone"],[p,g]],[/(u304aa)/i],[c,[m,"AT&T"],[p,g]],[/\bsie-(\w*)/i],[c,[m,"Siemens"],[p,g]],[/\b(rct\w+) b/i],[c,[m,"RCA"],[p,k]],[/\b(venue[\d ]{2,7}) b/i],[c,[m,"Dell"],[p,k]],[/\b(q(?:mv|ta)\w+) b/i],[c,[m,"Verizon"],[p,k]],[/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i],[c,[m,"Barnes & Noble"],[p,k]],[/\b(tm\d{3}\w+) b/i],[c,[m,"NuVision"],[p,k]],[/\b(k88) b/i],[c,[m,"ZTE"],[p,k]],[/\b(nx\d{3}j) b/i],[c,[m,"ZTE"],[p,g]],[/\b(gen\d{3}) b.+49h/i],[c,[m,"Swiss"],[p,g]],[/\b(zur\d{3}) b/i],[c,[m,"Swiss"],[p,k]],[/\b((zeki)?tb.*\b) b/i],[c,[m,"Zeki"],[p,k]],[/\b([yr]\d{2}) b/i,/\b(dragon[- ]+touch |dt)(\w{5}) b/i],[[m,"Dragon Touch"],c,[p,k]],[/\b(ns-?\w{0,9}) b/i],[c,[m,"Insignia"],[p,k]],[/\b((nxa|next)-?\w{0,9}) b/i],[c,[m,"NextBook"],[p,k]],[/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i],[[m,"Voice"],c,[p,g]],[/\b(lvtel\-)?(v1[12]) b/i],[[m,"LvTel"],c,[p,g]],[/\b(ph-1) /i],[c,[m,"Essential"],[p,g]],[/\b(v(100md|700na|7011|917g).*\b) b/i],[c,[m,"Envizen"],[p,k]],[/\b(trio[-\w\. ]+) b/i],[c,[m,"MachSpeed"],[p,k]],[/\btu_(1491) b/i],[c,[m,"Rotor"],[p,k]],[/(shield[\w ]+) b/i],[c,[m,"Nvidia"],[p,k]],[/(sprint) (\w+)/i],[m,c,[p,g]],[/(kin\.[onetw]{3})/i],[[c,/\./g," "],[m,R],[p,g]],[/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i],[c,[m,G],[p,k]],[/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i],[c,[m,G],[p,g]],[/smart-tv.+(samsung)/i],[m,[p,x]],[/hbbtv.+maple;(\d+)/i],[[c,/^/,"SmartTV"],[m,V],[p,x]],[/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i],[[m,P],[p,x]],[/(apple) ?tv/i],[m,[c,S+" TV"],[p,x]],[/crkey/i],[[c,C+"cast"],[m,U],[p,x]],[/droid.+aft(\w)( bui|\))/i],[c,[m,T],[p,x]],[/\(dtv[\);].+(aquos)/i,/(aquos-tv[\w ]+)\)/i],[c,[m,D],[p,x]],[/(bravia[\w ]+)( bui|\))/i],[c,[m,I],[p,x]],[/(mitv-\w{5}) bui/i],[c,[m,F],[p,x]],[/Hbbtv.*(technisat) (.*);/i],[m,c,[p,x]],[/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,/hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i],[[m,trim],[c,trim],[p,x]],[/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i],[[p,x]],[/(ouya)/i,/(nintendo) ([wids3utch]+)/i],[m,c,[p,v]],[/droid.+; (shield) bui/i],[c,[m,"Nvidia"],[p,v]],[/(playstation [345portablevi]+)/i],[c,[m,I],[p,v]],[/\b(xbox(?: one)?(?!; xbox))[\); ]/i],[c,[m,R],[p,v]],[/((pebble))app/i],[m,c,[p,_]],[/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i],[c,[m,S],[p,_]],[/droid.+; (glass) \d/i],[c,[m,U],[p,_]],[/droid.+; (wt63?0{2,3})\)/i],[c,[m,G],[p,_]],[/(quest( 2| pro)?)/i],[c,[m,H],[p,_]],[/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i],[m,[p,y]],[/(aeobc)\b/i],[c,[m,T],[p,y]],[/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i],[c,[p,g]],[/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i],[c,[p,k]],[/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i],[[p,k]],[/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i],[[p,g]],[/(android[-\w\. ]{0,9});.+buil/i],[c,[m,"Generic"]]],engine:[[/windows.+ edge\/([\w\.]+)/i],[f,[u,E+"HTML"]],[/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i],[f,[u,"Blink"]],[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i,/ekioh(flow)\/([\w\.]+)/i,/(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i,/(icab)[\/ ]([23]\.[\d\.]+)/i,/\b(libweb)/i],[u,f],[/rv\:([\w\.]{1,9})\b.+(gecko)/i],[f,u]],os:[[/microsoft (windows) (vista|xp)/i],[u,f],[/(windows) nt 6\.2; (arm)/i,/(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i,/(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i],[u,[f,strMapper,X]],[/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i],[[u,"Windows"],[f,strMapper,X]],[/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i,/ios;fbsv\/([\d\.]+)/i,/cfnetwork\/.+darwin/i],[[f,/_/g,"."],[u,"iOS"]],[/(mac os x) ?([\w\. ]*)/i,/(macintosh|mac_powerpc\b)(?!.+haiku)/i],[[u,Z],[f,/_/g,"."]],[/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i],[f,u],[/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i,/(blackberry)\w*\/([\w\.]*)/i,/(tizen|kaios)[\/ ]([\w\.]+)/i,/\((series40);/i],[u,f],[/\(bb(10);/i],[f,[u,N]],[/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i],[f,[u,"Symbian"]],[/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i],[f,[u,O+" OS"]],[/web0s;.+rt(tv)/i,/\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i],[f,[u,"webOS"]],[/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i],[f,[u,"watchOS"]],[/crkey\/([\d\.]+)/i],[f,[u,C+"cast"]],[/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i],[[u,L],f],[/panasonic;(viera)/i,/(netrange)mmh/i,/(nettv)\/(\d+\.[\w\.]+)/i,/(nintendo|playstation) ([wids345portablevuch]+)/i,/(xbox); +xbox ([^\);]+)/i,/\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,/(mint)[\/\(\) ]?(\w*)/i,/(mageia|vectorlinux)[; ]/i,/([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,/(hurd|linux) ?([\w\.]*)/i,/(gnu) ?([\w\.]*)/i,/\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i,/(haiku) (\w+)/i],[u,f],[/(sunos) ?([\w\.\d]*)/i],[[u,"Solaris"],f],[/((?:open)?solaris)[-\/ ]?([\w\.]*)/i,/(aix) ((\d)(?=\.|\)| )[\w\.])*/i,/\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i,/(unix) ?([\w\.]*)/i],[u,f]]};var UAParser=function(i,e){if(typeof i===w){e=i;i=a}if(!(this instanceof UAParser)){return new UAParser(i,e).getResult()}var r=typeof o!==b&&o.navigator?o.navigator:a;var n=i||(r&&r.userAgent?r.userAgent:t);var v=r&&r.userAgentData?r.userAgentData:a;var x=e?extend(K,e):K;var _=r&&r.userAgent==n;this.getBrowser=function(){var i={};i[u]=a;i[f]=a;rgxMapper.call(i,n,x.browser);i[d]=majorize(i[f]);if(_&&r&&r.brave&&typeof r.brave.isBrave==s){i[u]="Brave"}return i};this.getCPU=function(){var i={};i[h]=a;rgxMapper.call(i,n,x.cpu);return i};this.getDevice=function(){var i={};i[m]=a;i[c]=a;i[p]=a;rgxMapper.call(i,n,x.device);if(_&&!i[p]&&v&&v.mobile){i[p]=g}if(_&&i[c]=="Macintosh"&&r&&typeof r.standalone!==b&&r.maxTouchPoints&&r.maxTouchPoints>2){i[c]="iPad";i[p]=k}return i};this.getEngine=function(){var i={};i[u]=a;i[f]=a;rgxMapper.call(i,n,x.engine);return i};this.getOS=function(){var i={};i[u]=a;i[f]=a;rgxMapper.call(i,n,x.os);if(_&&!i[u]&&v&&v.platform!="Unknown"){i[u]=v.platform.replace(/chrome os/i,L).replace(/macos/i,Z)}return i};this.getResult=function(){return{ua:this.getUA(),browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice(),cpu:this.getCPU()}};this.getUA=function(){return n};this.setUA=function(i){n=typeof i===l&&i.length>q?trim(i,q):i;return this};this.setUA(n);return this};UAParser.VERSION=r;UAParser.BROWSER=enumerize([u,f,d]);UAParser.CPU=enumerize([h]);UAParser.DEVICE=enumerize([c,m,p,v,g,x,k,_,y]);UAParser.ENGINE=UAParser.OS=enumerize([u,f]);if(typeof e!==b){if("object"!==b&&i.exports){e=i.exports=UAParser}e.UAParser=UAParser}else{if("function"===s&&__webpack_require__.amdO){!(__WEBPACK_AMD_DEFINE_RESULT__ = (function(){return UAParser}).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))}else if(typeof o!==b){o.UAParser=UAParser}}var Q=typeof o!==b&&(o.jQuery||o.Zepto);if(Q&&!Q.ua){var Y=new UAParser;Q.ua=Y.getResult();Q.ua.get=function(){return Y.getUA()};Q.ua.set=function(i){Y.setUA(i);var e=Y.getResult();for(var o in e){Q.ua[o]=e[o]}}}})(typeof window==="object"?window:this)}};var e={};function __nccwpck_require__(o){var a=e[o];if(a!==undefined){return a.exports}var r=e[o]={exports:{}};var t=true;try{i[o].call(r.exports,r,r.exports,__nccwpck_require__);t=false}finally{if(t)delete e[o]}return r.exports}if(typeof __nccwpck_require__!=="undefined")__nccwpck_require__.ab=__dirname+"/";var o=__nccwpck_require__(226);module.exports=o})();

/***/ }),

/***/ 488:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    getTestReqInfo: function() {
        return getTestReqInfo;
    },
    withRequest: function() {
        return withRequest;
    }
});
const _nodeasync_hooks = __webpack_require__(67);
const testStorage = new _nodeasync_hooks.AsyncLocalStorage();
function extractTestInfoFromRequest(req, reader) {
    const proxyPortHeader = reader.header(req, "next-test-proxy-port");
    if (!proxyPortHeader) {
        return undefined;
    }
    const url = reader.url(req);
    const proxyPort = Number(proxyPortHeader);
    const testData = reader.header(req, "next-test-data") || "";
    return {
        url,
        proxyPort,
        testData
    };
}
function withRequest(req, reader, fn) {
    const testReqInfo = extractTestInfoFromRequest(req, reader);
    if (!testReqInfo) {
        return fn();
    }
    return testStorage.run(testReqInfo, fn);
}
function getTestReqInfo(req, reader) {
    const testReqInfo = testStorage.getStore();
    if (testReqInfo) {
        return testReqInfo;
    }
    if (req && reader) {
        return extractTestInfoFromRequest(req, reader);
    }
    return undefined;
}

//# sourceMappingURL=context.js.map

/***/ }),

/***/ 375:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
/* provided dependency */ var Buffer = __webpack_require__(195)["Buffer"];

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    handleFetch: function() {
        return handleFetch;
    },
    interceptFetch: function() {
        return interceptFetch;
    },
    reader: function() {
        return reader;
    }
});
const _context = __webpack_require__(488);
const reader = {
    url (req) {
        return req.url;
    },
    header (req, name) {
        return req.headers.get(name);
    }
};
function getTestStack() {
    let stack = (new Error().stack ?? "").split("\n");
    // Skip the first line and find first non-empty line.
    for(let i = 1; i < stack.length; i++){
        if (stack[i].length > 0) {
            stack = stack.slice(i);
            break;
        }
    }
    // Filter out franmework lines.
    stack = stack.filter((f)=>!f.includes("/next/dist/"));
    // At most 5 lines.
    stack = stack.slice(0, 5);
    // Cleanup some internal info and trim.
    stack = stack.map((s)=>s.replace("webpack-internal:///(rsc)/", "").trim());
    return stack.join("    ");
}
async function buildProxyRequest(testData, request) {
    const { url, method, headers, body, cache, credentials, integrity, mode, redirect, referrer, referrerPolicy } = request;
    return {
        testData,
        api: "fetch",
        request: {
            url,
            method,
            headers: [
                ...Array.from(headers),
                [
                    "next-test-stack",
                    getTestStack()
                ]
            ],
            body: body ? Buffer.from(await request.arrayBuffer()).toString("base64") : null,
            cache,
            credentials,
            integrity,
            mode,
            redirect,
            referrer,
            referrerPolicy
        }
    };
}
function buildResponse(proxyResponse) {
    const { status, headers, body } = proxyResponse.response;
    return new Response(body ? Buffer.from(body, "base64") : null, {
        status,
        headers: new Headers(headers)
    });
}
async function handleFetch(originalFetch, request) {
    const testInfo = (0, _context.getTestReqInfo)(request, reader);
    if (!testInfo) {
        // Passthrough non-test requests.
        return originalFetch(request);
    }
    const { testData, proxyPort } = testInfo;
    const proxyRequest = await buildProxyRequest(testData, request);
    const resp = await originalFetch(`http://localhost:${proxyPort}`, {
        method: "POST",
        body: JSON.stringify(proxyRequest),
        next: {
            // @ts-ignore
            internal: true
        }
    });
    if (!resp.ok) {
        throw new Error(`Proxy request failed: ${resp.status}`);
    }
    const proxyResponse = await resp.json();
    const { api } = proxyResponse;
    switch(api){
        case "continue":
            return originalFetch(request);
        case "abort":
        case "unhandled":
            throw new Error(`Proxy request aborted [${request.method} ${request.url}]`);
        default:
            break;
    }
    return buildResponse(proxyResponse);
}
function interceptFetch(originalFetch) {
    __webpack_require__.g.fetch = function testFetch(input, init) {
        var _init_next;
        // Passthrough internal requests.
        // @ts-ignore
        if (init == null ? void 0 : (_init_next = init.next) == null ? void 0 : _init_next.internal) {
            return originalFetch(input, init);
        }
        return handleFetch(originalFetch, new Request(input, init));
    };
    return ()=>{
        __webpack_require__.g.fetch = originalFetch;
    };
}

//# sourceMappingURL=fetch.js.map

/***/ }),

/***/ 177:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    interceptTestApis: function() {
        return interceptTestApis;
    },
    wrapRequestHandler: function() {
        return wrapRequestHandler;
    }
});
const _context = __webpack_require__(488);
const _fetch = __webpack_require__(375);
function interceptTestApis() {
    return (0, _fetch.interceptFetch)(__webpack_require__.g.fetch);
}
function wrapRequestHandler(handler) {
    return (req, fn)=>(0, _context.withRequest)(req, _fetch.reader, ()=>handler(req, fn));
}

//# sourceMappingURL=server-edge.js.map

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(816));
/******/ (_ENTRIES = typeof _ENTRIES === "undefined" ? {} : _ENTRIES).middleware_middleware = __webpack_exports__;
/******/ }
]);
//# sourceMappingURL=middleware.js.map