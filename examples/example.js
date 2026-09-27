// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        globalObject
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"2p6cP":[function(require,module,exports,__globalThis) {
var _import = require("./Navigation/Router/Import");
const examples = {
    router: (0, _import.routerExamples)
};
window.examples = examples;

},{"./Navigation/Router/Import":"arf5u"}],"arf5u":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "routerExamples", ()=>routerExamples);
var _demoHome = require("./DemoHome");
var _demoUserList = require("./DemoUserList");
var _demoUserDetail = require("./DemoUserDetail");
var _demoFileBrowser = require("./DemoFileBrowser");
var _demoCatchAll = require("./DemoCatchAll");
var _demoAdmin = require("./DemoAdmin");
var _demoLogin = require("./DemoLogin");
var _demoSettings = require("./DemoSettings");
var _demoNotFound = require("./DemoNotFound");
var _demoChart = require("./DemoChart");
var _import = require("./Dashboard/Import");
const routerExamples = {
    defineDemoChart: (0, _demoChart.defineDemoChart),
    dashboard: {
        requireSignIn: (0, _import.requireSignIn),
        signedInAs: (0, _import.signedInAs),
        signOut: (0, _import.signOut)
    }
};

},{"./DemoHome":"9kvrY","./DemoUserList":"5OsTS","./DemoUserDetail":"fb6ah","./DemoFileBrowser":"7UkU9","./DemoCatchAll":"iWsHf","./DemoAdmin":"jgNDZ","./DemoLogin":"5V9Ju","./DemoSettings":"jjS6d","./DemoNotFound":"3KvWJ","./DemoChart":"7jr49","./Dashboard/Import":"aI37q","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"9kvrY":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoHome", ()=>DemoHome);
var _routeView = require("./RouteView");
var _routerData = require("./routerData");
class DemoHome extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Home</h3><p>Follow a link, or <a href="${(0, _routerData.href)(this, '/users')}">browse the users</a>.</p>`;
    }
}
customElements.define('demo-home', DemoHome);

},{"./RouteView":"cNXon","./routerData":"ak8jM","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"cNXon":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "RouteView", ()=>RouteView);
class RouteView extends HTMLElement {
    connectedCallback() {
        this.className = 'view';
        this.render();
    }
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"btttT":[function(require,module,exports,__globalThis) {
exports.interopDefault = function(a) {
    return a && a.__esModule ? a : {
        default: a
    };
};
exports.defineInteropFlag = function(a) {
    Object.defineProperty(a, '__esModule', {
        value: true
    });
};
exports.exportAll = function(source, dest) {
    Object.keys(source).forEach(function(key) {
        if (key === 'default' || key === '__esModule' || Object.prototype.hasOwnProperty.call(dest, key)) return;
        Object.defineProperty(dest, key, {
            enumerable: true,
            get: function() {
                return source[key];
            }
        });
    });
    return dest;
};
exports.export = function(dest, destName, get) {
    Object.defineProperty(dest, destName, {
        enumerable: true,
        get: get
    });
};

},{}],"ak8jM":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "users", ()=>users);
parcelHelpers.export(exports, "fakeFetchUser", ()=>fakeFetchUser);
parcelHelpers.export(exports, "routerOf", ()=>routerOf);
parcelHelpers.export(exports, "href", ()=>href);
const users = {
    1: {
        name: 'Ada Lovelace',
        role: 'Analyst'
    },
    2: {
        name: 'Grace Hopper',
        role: 'Compiler author'
    },
    3: {
        name: 'Alan Turing',
        role: 'Codebreaker'
    }
};
function fakeFetchUser(id) {
    return new Promise((resolve)=>setTimeout(()=>{
            var _users_id;
            return resolve((_users_id = users[id]) !== null && _users_id !== void 0 ? _users_id : null);
        }, 400));
}
function routerOf(view) {
    return view.closest('juel-router');
}
function href(view, path) {
    return routerOf(view).mode === 'hash' ? '#' + path : path;
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"5OsTS":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoUserList", ()=>DemoUserList);
var _esc = require("../../_Utils/esc");
var _routeView = require("./RouteView");
var _routerData = require("./routerData");
class DemoUserList extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Users</h3><ul>${Object.entries((0, _routerData.users)).map(([id, u])=>`<li><a href="${(0, _routerData.href)(this, `/users/${id}`)}">${(0, _esc.esc)(u.name)}</a></li>`).join('')}</ul>`;
    }
}
customElements.define('demo-user-list', DemoUserList);

},{"../../_Utils/esc":"hIlPC","./RouteView":"cNXon","./routerData":"ak8jM","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"hIlPC":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "esc", ()=>esc);
function esc(value) {
    return String(value).replace(/[&<>"']/g, (c)=>`&#${c.charCodeAt(0)};`);
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"fb6ah":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoUserDetail", ()=>DemoUserDetail);
var _asyncToGenerator = require("@swc/helpers/_/_async_to_generator");
var _esc = require("../../_Utils/esc");
var _routeView = require("./RouteView");
var _routerData = require("./routerData");
class DemoUserDetail extends (0, _routeView.RouteView) {
    render() {
        var _this = this;
        return (0, _asyncToGenerator._)(function*() {
            const id = _this.params.id;
            _this.innerHTML = `<h3>User ${(0, _esc.esc)(id)}</h3><p>Loading\u{2026}</p>`;
            const user = yield (0, _routerData.fakeFetchUser)(id);
            if (!_this.isConnected) return;
            const back = `<p><a href="${(0, _routerData.href)(_this, '/users')}">&larr; All users</a></p>`;
            _this.innerHTML = user ? `<h3>${(0, _esc.esc)(user.name)}</h3><p>${(0, _esc.esc)(user.role)} \xb7 <code>params.id = ${(0, _esc.esc)(JSON.stringify(id))}</code></p>${back}` : `<h3>No user ${(0, _esc.esc)(id)}</h3>${back}`;
        })();
    }
}
customElements.define('demo-user-detail', DemoUserDetail);

},{"@swc/helpers/_/_async_to_generator":"bp41a","../../_Utils/esc":"hIlPC","./RouteView":"cNXon","./routerData":"ak8jM","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"bp41a":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "_", ()=>_async_to_generator);
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) resolve(value);
    else Promise.resolve(value).then(_next, _throw);
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"7UkU9":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoFileBrowser", ()=>DemoFileBrowser);
var _esc = require("../../_Utils/esc");
var _routeView = require("./RouteView");
class DemoFileBrowser extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Files</h3><p><code>rest = ${(0, _esc.esc)(JSON.stringify(this.rest))}</code></p>`;
    }
}
customElements.define('demo-file-browser', DemoFileBrowser);

},{"../../_Utils/esc":"hIlPC","./RouteView":"cNXon","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"iWsHf":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoCatchAll", ()=>DemoCatchAll);
var _esc = require("../../_Utils/esc");
var _routeView = require("./RouteView");
class DemoCatchAll extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Catch-all</h3><p>No earlier route matched <code>${(0, _esc.esc)(this.rest)}</code>.</p>`;
    }
}
customElements.define('demo-catch-all', DemoCatchAll);

},{"../../_Utils/esc":"hIlPC","./RouteView":"cNXon","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"jgNDZ":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoAdmin", ()=>DemoAdmin);
var _routeView = require("./RouteView");
class DemoAdmin extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Admin</h3><p>Only reachable while signed in \u{2014} the route's <code>beforeEnter</code> guard checks.</p>`;
    }
}
customElements.define('demo-admin', DemoAdmin);

},{"./RouteView":"cNXon","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"5V9Ju":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoLogin", ()=>DemoLogin);
var _routeView = require("./RouteView");
var _routerData = require("./routerData");
class DemoLogin extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Sign in</h3><p>The admin guard redirected you here.</p><juel-button type="primary">Sign in and continue</juel-button>`;
        this.querySelector('juel-button').addEventListener('click', ()=>{
            document.getElementById('signed-in').checked = true;
            (0, _routerData.routerOf)(this).navigate('/admin', {
                replace: true
            });
        });
    }
}
customElements.define('demo-login', DemoLogin);

},{"./RouteView":"cNXon","./routerData":"ak8jM","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"jjS6d":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoSettings", ()=>DemoSettings);
var _routeView = require("./RouteView");
class DemoSettings extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Settings</h3><p>Tick "Lock settings" and try to get here again \u{2014} the guard blocks it and you stay put.</p>`;
    }
}
customElements.define('demo-settings', DemoSettings);

},{"./RouteView":"cNXon","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"3KvWJ":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoNotFound", ()=>DemoNotFound);
var _esc = require("../../_Utils/esc");
var _routeView = require("./RouteView");
var _routerData = require("./routerData");
class DemoNotFound extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Not found</h3><p>Nothing lives at <code>${(0, _esc.esc)(this.rest)}</code>. <a href="${(0, _routerData.href)(this, '/')}">Go home</a>.</p>`;
    }
}
customElements.define('demo-not-found', DemoNotFound);

},{"../../_Utils/esc":"hIlPC","./RouteView":"cNXon","./routerData":"ak8jM","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"7jr49":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DemoChart", ()=>DemoChart);
parcelHelpers.export(exports, "defineDemoChart", ()=>defineDemoChart);
var _routeView = require("./RouteView");
class DemoChart extends (0, _routeView.RouteView) {
    render() {
        this.innerHTML = `<h3>Chart</h3><p>Defined by this route's <code>load()</code>, on first visit.</p>`;
    }
}
function defineDemoChart() {
    if (!customElements.get('demo-chart')) customElements.define('demo-chart', DemoChart);
}

},{"./RouteView":"cNXon","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"aI37q":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "requireSignIn", ()=>(0, _auth.requireSignIn));
parcelHelpers.export(exports, "signedInAs", ()=>(0, _auth.signedInAs));
parcelHelpers.export(exports, "signOut", ()=>(0, _auth.signOut));
var _dashOverview = require("./DashOverview");
var _dashCustomerList = require("./DashCustomerList");
var _dashCustomerDetail = require("./DashCustomerDetail");
var _dashOrderList = require("./DashOrderList");
var _dashOrderDetail = require("./DashOrderDetail");
var _dashSettings = require("./DashSettings");
var _dashLogin = require("./DashLogin");
var _dashNotFound = require("./DashNotFound");
var _auth = require("./auth");

},{"./DashOverview":"5AiHI","./DashCustomerList":"iC6sN","./DashCustomerDetail":"2KzYV","./DashOrderList":"3pN1u","./DashOrderDetail":"k46Zx","./DashSettings":"9DBaf","./DashLogin":"boW5Y","./DashNotFound":"kIzpK","./auth":"aNu9N","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"5AiHI":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashOverview", ()=>DashOverview);
var _asyncToGenerator = require("@swc/helpers/_/_async_to_generator");
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _data = require("./data");
const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];
class DashOverview extends (0, _dashView.DashView) {
    render() {
        var _this = this;
        return (0, _asyncToGenerator._)(function*() {
            _this.crumbs([
                {
                    label: 'Overview'
                }
            ]);
            _this.innerHTML = _this.loading('overview');
            const summary = yield (0, _data.fakeFetchSummary)();
            if (!_this.isConnected) return;
            const labels = summary.months.map((m)=>MONTH_NAMES[Number(m.slice(5)) - 1]).join(', ');
            const revenue = summary.revenueByMonth.join(', ');
            const { open, shipped, cancelled } = summary.statusCounts;
            _this.innerHTML = `
            <h1>Overview</h1>
            <div class="tiles">
                ${tile('Revenue', (0, _data.money)(summary.revenue), 'excluding cancelled')}
                ${tile('Open orders', String(summary.openOrders), 'awaiting despatch')}
                ${tile('Customers', String(summary.customers), 'all active')}
                ${tile('Average order', (0, _data.money)(summary.averageOrder), 'per completed order')}
            </div>
            <div class="panels">
                <section class="panel">
                    <h2>Revenue by month</h2>
                    <div class="chart-box">
                        <juel-chart type="line" labels="${(0, _esc.esc)(labels)}">
                            <juel-chart-series label="Revenue" color="#007bff" data="${(0, _esc.esc)(revenue)}"></juel-chart-series>
                        </juel-chart>
                    </div>
                </section>
                <section class="panel">
                    <h2>Orders by status</h2>
                    <div class="chart-box">
                        <juel-chart type="doughnut">
                            <juel-chart-series label="Open" color="#007bff" data="${open}"></juel-chart-series>
                            <juel-chart-series label="Shipped" color="#28a745" data="${shipped}"></juel-chart-series>
                            <juel-chart-series label="Cancelled" color="#dc3545" data="${cancelled}"></juel-chart-series>
                        </juel-chart>
                    </div>
                </section>
            </div>
            <section class="panel">
                <h2>Recent orders</h2>
                <ul class="recent">
                    ${summary.recent.map((o)=>`
                        <li>
                            <a href="${(0, _data.href)('/orders/' + o.id)}">#${o.id}</a>
                            <span class="recent-who">${(0, _esc.esc)((0, _data.customerName)(o.customerId))}</span>
                            <span class="status status-${o.status}">${o.status}</span>
                            <span class="recent-total">${(0, _data.money)(o.total)}</span>
                        </li>`).join('')}
                </ul>
                <p><a href="${(0, _data.href)('/orders')}">All orders &rarr;</a></p>
            </section>`;
        })();
    }
}
function tile(label, value, note) {
    return `<div class="tile">
        <span class="tile-label">${(0, _esc.esc)(label)}</span>
        <strong class="tile-value">${(0, _esc.esc)(value)}</strong>
        <span class="tile-note">${(0, _esc.esc)(note)}</span>
    </div>`;
}
customElements.define('dash-overview', DashOverview);

},{"@swc/helpers/_/_async_to_generator":"bp41a","../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"8nRY6":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashView", ()=>DashView);
var _data = require("./data");
class DashView extends HTMLElement {
    connectedCallback() {
        this.className = 'view';
        this.render();
    }
    query() {
        var _routerOf;
        var _routerOf_path;
        const path = (_routerOf_path = (_routerOf = (0, _data.routerOf)(this)) === null || _routerOf === void 0 ? void 0 : _routerOf.path) !== null && _routerOf_path !== void 0 ? _routerOf_path : '';
        const q = path.indexOf('?');
        return new URLSearchParams(q === -1 ? '' : path.slice(q + 1));
    }
    crumbs(trail) {
        this.dispatchEvent(new CustomEvent('dash-crumbs', {
            detail: trail,
            bubbles: true,
            composed: true
        }));
    }
    loading(label) {
        return `<p class="dash-loading">Loading ${label}\u{2026}</p>`;
    }
}

},{"./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"ie4MX":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "fakeFetchCustomers", ()=>fakeFetchCustomers);
parcelHelpers.export(exports, "fakeFetchCustomer", ()=>fakeFetchCustomer);
parcelHelpers.export(exports, "fakeFetchOrders", ()=>fakeFetchOrders);
parcelHelpers.export(exports, "fakeFetchOrder", ()=>fakeFetchOrder);
parcelHelpers.export(exports, "fakeFetchSummary", ()=>fakeFetchSummary);
parcelHelpers.export(exports, "customerName", ()=>customerName);
parcelHelpers.export(exports, "money", ()=>money);
parcelHelpers.export(exports, "routerOf", ()=>routerOf);
parcelHelpers.export(exports, "href", ()=>href);
function seeded(seed) {
    let a = seed;
    return ()=>{
        a = a + 0x6d2b79f5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
const FIRST = [
    'Ada',
    'Grace',
    'Alan',
    'Edsger',
    'Barbara',
    'Donald',
    'Katherine',
    'Linus',
    'Margaret',
    'Dennis',
    'Radia',
    'Ken',
    'Anita',
    'Tim',
    'Joan',
    'Guido',
    'Sophie',
    'Claude',
    'Hedy',
    'Mary'
];
const LAST = [
    'Lovelace',
    'Hopper',
    'Turing',
    'Dijkstra',
    'Liskov',
    'Knuth',
    'Johnson',
    'Torvalds',
    'Hamilton',
    'Ritchie',
    'Perlman',
    'Thompson',
    'Borg',
    'Berners-Lee',
    'Clarke',
    'Rossum',
    'Wilson',
    'Shannon',
    'Lamarr',
    'Jackson'
];
const COMPANY = [
    'Northwind Trading',
    'Blue Harbour Ltd',
    'Corvid Systems',
    'Pellucid Optics',
    'Ferrous Works',
    'Halcyon Foods',
    'Tessellate',
    'Quay & Sons',
    'Meridian Freight',
    'Bramble Press'
];
const COUNTRY = [
    'United Kingdom',
    'Ireland',
    'Germany',
    'France',
    'Spain',
    'Netherlands',
    'Sweden',
    'Portugal'
];
const NOTES = [
    'Prefers email over phone. Invoices go to accounts@.',
    'On a 60-day payment term agreed in 2023.',
    'Asked to be told before any price change.',
    'Ships to a depot, not the registered address.',
    "Long-standing account \u2014 handle escalations personally."
];
function build() {
    const rand = seeded(20260917);
    const customers = [];
    for(let i = 1; i <= 40; i++){
        const first = FIRST[Math.floor(rand() * FIRST.length)];
        const last = LAST[Math.floor(rand() * LAST.length)];
        const company = COMPANY[Math.floor(rand() * COMPANY.length)];
        const month = 1 + Math.floor(rand() * 12);
        const day = 1 + Math.floor(rand() * 28);
        customers.push({
            id: i,
            name: `${first} ${last}`,
            company,
            email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${company.toLowerCase().replace(/[^a-z]/g, '')}.example`,
            country: COUNTRY[Math.floor(rand() * COUNTRY.length)],
            joined: `202${2 + Math.floor(rand() * 3)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            notes: NOTES[Math.floor(rand() * NOTES.length)]
        });
    }
    const statuses = [
        'open',
        'shipped',
        'shipped',
        'shipped',
        'cancelled'
    ];
    const orders = [];
    for(let i = 0; i < 150; i++){
        const month = 1 + Math.floor(rand() * 9);
        const day = 1 + Math.floor(rand() * 28);
        orders.push({
            id: 1000 + i,
            customerId: 1 + Math.floor(rand() * 40),
            date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            status: statuses[Math.floor(rand() * statuses.length)],
            total: Math.round((20 + rand() * 1800) * 100) / 100,
            items: 1 + Math.floor(rand() * 9)
        });
    }
    orders.sort((a, b)=>a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id);
    return {
        customers,
        orders
    };
}
const { customers, orders } = build();
function delay(value, ms = 350) {
    return new Promise((resolve)=>setTimeout(()=>resolve(value), ms));
}
function fakeFetchCustomers() {
    return delay(customers);
}
function fakeFetchCustomer(id) {
    var _customers_find;
    return delay((_customers_find = customers.find((c)=>c.id === Number(id))) !== null && _customers_find !== void 0 ? _customers_find : null);
}
function fakeFetchOrders(filter) {
    let result = orders;
    if (filter === null || filter === void 0 ? void 0 : filter.status) result = result.filter((o)=>o.status === filter.status);
    if ((filter === null || filter === void 0 ? void 0 : filter.customerId) != null) result = result.filter((o)=>o.customerId === filter.customerId);
    return delay(result);
}
function fakeFetchOrder(id) {
    var _orders_find;
    return delay((_orders_find = orders.find((o)=>o.id === Number(id))) !== null && _orders_find !== void 0 ? _orders_find : null);
}
function fakeFetchSummary() {
    const live = orders.filter((o)=>o.status !== 'cancelled');
    const months = Array.from(new Set(orders.map((o)=>o.date.slice(0, 7)))).sort();
    const revenueByMonth = months.map((m)=>Math.round(live.filter((o)=>o.date.startsWith(m)).reduce((sum, o)=>sum + o.total, 0)));
    const revenue = live.reduce((sum, o)=>sum + o.total, 0);
    return delay({
        revenue,
        openOrders: orders.filter((o)=>o.status === 'open').length,
        customers: customers.length,
        averageOrder: revenue / live.length,
        months,
        revenueByMonth,
        statusCounts: {
            open: orders.filter((o)=>o.status === 'open').length,
            shipped: orders.filter((o)=>o.status === 'shipped').length,
            cancelled: orders.filter((o)=>o.status === 'cancelled').length
        },
        recent: orders.slice(0, 6)
    });
}
function customerName(id) {
    var _customers_find;
    var _customers_find_name;
    return (_customers_find_name = (_customers_find = customers.find((c)=>c.id === id)) === null || _customers_find === void 0 ? void 0 : _customers_find.name) !== null && _customers_find_name !== void 0 ? _customers_find_name : `Customer ${id}`;
}
function money(value) {
    return "\xa3" + value.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
function routerOf(view) {
    return view.closest('juel-router');
}
function href(path) {
    return '#' + path;
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"iC6sN":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashCustomerList", ()=>DashCustomerList);
var _asyncToGenerator = require("@swc/helpers/_/_async_to_generator");
var _dashView = require("./DashView");
var _data = require("./data");
class DashCustomerList extends (0, _dashView.DashView) {
    render() {
        var _this = this;
        return (0, _asyncToGenerator._)(function*() {
            _this.crumbs([
                {
                    label: 'Customers'
                }
            ]);
            _this.innerHTML = `<h1>Customers</h1>${_this.loading('customers')}`;
            _this.all = yield (0, _data.fakeFetchCustomers)();
            if (!_this.isConnected) return;
            _this.innerHTML = `
            <h1>Customers</h1>
            <div class="toolbar">
                <input class="filter" type="search" placeholder="Filter by name, company or country"
                    aria-label="Filter customers" />
                <span class="count"></span>
            </div>
            <div class="panel">
                <juel-table selection="single"></juel-table>
            </div>
            <p class="hint">
                Rows live in <code>&lt;juel-table&gt;</code>'s shadow DOM, so there are no links to
                click \u{2014} the table fires <code>row-activated</code> and this view calls
                <code>router.navigate()</code>. Arrow keys move between rows and Enter opens one, so
                it works without a mouse.
            </p>`;
            const filter = _this.querySelector('.filter');
            filter.addEventListener('input', ()=>_this.fill(filter.value));
            _this.fill('');
            _this.querySelector('juel-table').addEventListener('row-activated', (e)=>{
                var _e_detail_row;
                const id = (_e_detail_row = e.detail.row) === null || _e_detail_row === void 0 ? void 0 : _e_detail_row.ID;
                if (id != null) (0, _data.routerOf)(_this).navigate(`/customers/${id}`);
            });
        })();
    }
    fill(term) {
        const needle = term.trim().toLowerCase();
        const rows = needle ? this.all.filter((c)=>(c.name + ' ' + c.company + ' ' + c.country).toLowerCase().includes(needle)) : this.all;
        const table = this.querySelector('juel-table');
        table.data = rows.map((c)=>({
                ID: c.id,
                Name: c.name,
                Company: c.company,
                Country: c.country,
                Joined: c.joined
            }));
        this.querySelector('.count').textContent = `${rows.length} of ${this.all.length}${needle ? ` matching \u{201C}${term.trim()}\u{201D}` : ''}`;
    }
    constructor(){
        super(...arguments);
        this.all = [];
    }
}
customElements.define('dash-customer-list', DashCustomerList);

},{"@swc/helpers/_/_async_to_generator":"bp41a","./DashView":"8nRY6","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"2KzYV":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashCustomerDetail", ()=>DashCustomerDetail);
var _asyncToGenerator = require("@swc/helpers/_/_async_to_generator");
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _data = require("./data");
const TABS = [
    'profile',
    'orders',
    'notes'
];
class DashCustomerDetail extends (0, _dashView.DashView) {
    render() {
        var _this = this;
        return (0, _asyncToGenerator._)(function*() {
            const id = String(_this.params.id);
            const tab = (_this.rest || '').replace(/^\//, '') || 'profile';
            const index = Math.max(0, TABS.indexOf(tab));
            _this.crumbs([
                {
                    label: 'Customers',
                    path: '/customers'
                },
                {
                    label: 'Customer ' + id
                }
            ]);
            _this.innerHTML = `<h1>Customer ${(0, _esc.esc)(id)}</h1>${_this.loading('customer')}`;
            const [customer, orders] = yield Promise.all([
                (0, _data.fakeFetchCustomer)(id),
                (0, _data.fakeFetchOrders)({
                    customerId: Number(id)
                })
            ]);
            if (!_this.isConnected) return;
            if (!customer) {
                _this.innerHTML = `
                <h1>No customer ${(0, _esc.esc)(id)}</h1>
                <p>There's no customer with that id. It may have been deleted.</p>
                <p><a href="${(0, _data.href)('/customers')}">&larr; All customers</a></p>`;
                return;
            }
            _this.crumbs([
                {
                    label: 'Customers',
                    path: '/customers'
                },
                {
                    label: customer.name
                }
            ]);
            _this.innerHTML = `
            <h1>${(0, _esc.esc)(customer.name)}</h1>
            <p class="subtitle">${(0, _esc.esc)(customer.company)} \xb7 ${(0, _esc.esc)(customer.country)} \xb7 joined ${(0, _esc.esc)(customer.joined)}</p>
            <div class="panel tabs-panel">
                <juel-tabs selectedIndex="${index}">
                    <juel-tab title="Profile">${profile(customer)}</juel-tab>
                    <juel-tab title="Orders (${orders.length})">${orderList(orders)}</juel-tab>
                    <juel-tab title="Notes"><p>${(0, _esc.esc)(customer.notes)}</p></juel-tab>
                </juel-tabs>
            </div>
            <p><a href="${(0, _data.href)('/customers')}">&larr; All customers</a></p>`;
            const tabs = _this.querySelector('juel-tabs');
            tabs.addEventListener('tab-changed', (e)=>{
                if (!_this.isConnected) return;
                (0, _data.routerOf)(_this).navigate(`/customers/${id}/${TABS[e.detail.index]}`, {
                    replace: true
                });
            });
        })();
    }
}
function profile(c) {
    return `<dl class="fields">
        <dt>Name</dt><dd>${(0, _esc.esc)(c.name)}</dd>
        <dt>Company</dt><dd>${(0, _esc.esc)(c.company)}</dd>
        <dt>Email</dt><dd>${(0, _esc.esc)(c.email)}</dd>
        <dt>Country</dt><dd>${(0, _esc.esc)(c.country)}</dd>
        <dt>Customer since</dt><dd>${(0, _esc.esc)(c.joined)}</dd>
    </dl>`;
}
function orderList(orders) {
    if (!orders.length) return '<p>No orders yet.</p>';
    return `<ul class="recent">${orders.map((o)=>`
        <li>
            <a href="${(0, _data.href)('/orders/' + o.id)}">#${o.id}</a>
            <span class="recent-who">${(0, _esc.esc)(o.date)}</span>
            <span class="status status-${o.status}">${o.status}</span>
            <span class="recent-total">${(0, _data.money)(o.total)}</span>
        </li>`).join('')}</ul>`;
}
customElements.define('dash-customer-detail', DashCustomerDetail);

},{"@swc/helpers/_/_async_to_generator":"bp41a","../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"3pN1u":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashOrderList", ()=>DashOrderList);
var _asyncToGenerator = require("@swc/helpers/_/_async_to_generator");
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _data = require("./data");
const FILTERS = [
    {
        label: 'All'
    },
    {
        label: 'Open',
        status: 'open'
    },
    {
        label: 'Shipped',
        status: 'shipped'
    },
    {
        label: 'Cancelled',
        status: 'cancelled'
    }
];
class DashOrderList extends (0, _dashView.DashView) {
    render() {
        this.crumbs([
            {
                label: 'Orders'
            }
        ]);
        this.innerHTML = `
            <h1>Orders</h1>
            <div class="toolbar">
                <div class="filters" role="group" aria-label="Filter by status">
                    ${FILTERS.map((f)=>{
            var _f_status;
            return `<a class="chip" data-status="${(_f_status = f.status) !== null && _f_status !== void 0 ? _f_status : ''}"
                        href="${(0, _data.href)('/orders' + (f.status ? '?status=' + f.status : ''))}">${f.label}</a>`;
        }).join('')}
                </div>
                <span class="count"></span>
            </div>
            <div class="panel" id="order-rows">${this.loading('orders')}</div>
            <p class="hint">
                The filter is a query string, and the router treats a query-only change as the same
                route \u{2014} no remount, no <code>route-changed</code>. The chips are still real,
                shareable URLs; this view just does the refiltering itself. Back and forward work.
            </p>`;
        this.querySelector('.filters').addEventListener('click', (e)=>{
            const chip = e.target.closest('.chip');
            if (!chip || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            const status = chip.dataset.status;
            (0, _data.routerOf)(this).navigate('/orders' + (status ? '?status=' + status : ''));
            this.fill(status || null);
        });
        this.fill();
        window.addEventListener('popstate', this.onPopState);
    }
    disconnectedCallback() {
        window.removeEventListener('popstate', this.onPopState);
    }
    fill(status) {
        var _this = this;
        return (0, _asyncToGenerator._)(function*() {
            const raw = status !== undefined ? status : _this.query().get('status');
            const effective = FILTERS.some((f)=>f.status === raw) ? raw : null;
            _this.querySelectorAll('.chip').forEach((chip)=>chip.classList.toggle('chip-on', chip.dataset.status === (effective !== null && effective !== void 0 ? effective : '')));
            const token = ++_this.loadToken;
            const orders = yield (0, _data.fakeFetchOrders)(effective ? {
                status: effective
            } : undefined);
            if (!_this.isConnected || token !== _this.loadToken) return;
            _this.querySelector('.count').textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}${effective ? ` \xb7 ${effective}` : ''}`;
            _this.querySelector('#order-rows').innerHTML = orders.length ? `<ul class="list-rows">${orders.map((o)=>`
                <li>
                    <a href="${(0, _data.href)('/orders/' + o.id)}">#${o.id}</a>
                    <span class="recent-who">${(0, _esc.esc)((0, _data.customerName)(o.customerId))}</span>
                    <span class="recent-date">${(0, _esc.esc)(o.date)}</span>
                    <span class="status status-${o.status}">${o.status}</span>
                    <span class="recent-total">${(0, _data.money)(o.total)}</span>
                </li>`).join('')}</ul>` : '<p>No orders with that status.</p>';
        })();
    }
    constructor(){
        super(...arguments);
        this.loadToken = 0;
        this.onPopState = ()=>this.fill();
    }
}
customElements.define('dash-order-list', DashOrderList);

},{"@swc/helpers/_/_async_to_generator":"bp41a","../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"k46Zx":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashOrderDetail", ()=>DashOrderDetail);
var _asyncToGenerator = require("@swc/helpers/_/_async_to_generator");
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _data = require("./data");
class DashOrderDetail extends (0, _dashView.DashView) {
    render() {
        var _this = this;
        return (0, _asyncToGenerator._)(function*() {
            const id = String(_this.params.id);
            _this.crumbs([
                {
                    label: 'Orders',
                    path: '/orders'
                },
                {
                    label: '#' + id
                }
            ]);
            _this.innerHTML = `<h1>Order #${(0, _esc.esc)(id)}</h1>${_this.loading('order')}`;
            const order = yield (0, _data.fakeFetchOrder)(id);
            if (!_this.isConnected) return;
            if (!order) {
                _this.innerHTML = `
                <h1>No order #${(0, _esc.esc)(id)}</h1>
                <p><a href="${(0, _data.href)('/orders')}">&larr; All orders</a></p>`;
                return;
            }
            _this.innerHTML = `
            <h1>Order #${order.id} <span class="status status-${order.status}">${order.status}</span></h1>
            <div class="panel">
                <dl class="fields">
                    <dt>Customer</dt>
                    <dd><a href="${(0, _data.href)('/customers/' + order.customerId)}">${(0, _esc.esc)((0, _data.customerName)(order.customerId))}</a></dd>
                    <dt>Placed</dt><dd>${(0, _esc.esc)(order.date)}</dd>
                    <dt>Items</dt><dd>${order.items}</dd>
                    <dt>Total</dt><dd>${(0, _data.money)(order.total)}</dd>
                </dl>
            </div>
            <p class="hint">
                The customer link crosses into another section, so the sidebar's
                <b>Customers</b> entry takes over <code>aria-current</code> \u{2014} the router marks links
                page-wide, not just its own.
            </p>
            <p><a href="${(0, _data.href)('/orders')}">&larr; All orders</a></p>`;
        })();
    }
}
customElements.define('dash-order-detail', DashOrderDetail);

},{"@swc/helpers/_/_async_to_generator":"bp41a","../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"9DBaf":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashSettings", ()=>DashSettings);
var _objectSpread = require("@swc/helpers/_/_object_spread");
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _auth = require("./auth");
const KEY = 'juel-dashboard-settings';
function load() {
    try {
        var _signedInAs, _sessionStorage_getItem;
        return (0, _objectSpread._)({
            displayName: (_signedInAs = (0, _auth.signedInAs)()) !== null && _signedInAs !== void 0 ? _signedInAs : '',
            currency: 'GBP',
            emailDigest: true
        }, JSON.parse((_sessionStorage_getItem = sessionStorage.getItem(KEY)) !== null && _sessionStorage_getItem !== void 0 ? _sessionStorage_getItem : '{}'));
    } catch (e) {
        var _signedInAs1;
        return {
            displayName: (_signedInAs1 = (0, _auth.signedInAs)()) !== null && _signedInAs1 !== void 0 ? _signedInAs1 : '',
            currency: 'GBP',
            emailDigest: true
        };
    }
}
class DashSettings extends (0, _dashView.DashView) {
    render() {
        this.crumbs([
            {
                label: 'Settings'
            }
        ]);
        const settings = load();
        this.innerHTML = `
            <h1>Settings</h1>
            <div class="panel">
                <form class="settings-form">
                    <label>Display name
                        <input name="displayName" value="${(0, _esc.esc)(settings.displayName)}" />
                    </label>
                    <label>Currency
                        <select name="currency">
                            ${[
            'GBP',
            'EUR',
            'USD'
        ].map((c)=>`<option value="${c}"${c === settings.currency ? ' selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="emailDigest"${settings.emailDigest ? ' checked' : ''} />
                        Email me a weekly digest
                    </label>
                    <div class="form-actions">
                        <juel-button type="primary" id="save">Save</juel-button>
                        <span class="saved" hidden>Saved.</span>
                    </div>
                </form>
            </div>
            <p class="hint">
                <b>Known gap.</b> "You have unsaved changes \u{2014} leave anyway?" would need a guard on
                <em>leaving</em> a route. <code>juel-router</code> only has <code>beforeEnter</code>,
                on the route being entered, so there's nothing to hang it on and this form doesn't
                try. See the router section of <code>TODO.md</code>.
            </p>`;
        const form = this.querySelector('form');
        this.querySelector('#save').addEventListener('click', ()=>{
            const data = new FormData(form);
            try {
                var _data_get, _data_get1;
                sessionStorage.setItem(KEY, JSON.stringify({
                    displayName: String((_data_get = data.get('displayName')) !== null && _data_get !== void 0 ? _data_get : ''),
                    currency: String((_data_get1 = data.get('currency')) !== null && _data_get1 !== void 0 ? _data_get1 : 'GBP'),
                    emailDigest: data.get('emailDigest') != null
                }));
            } catch (e) {}
            const saved = this.querySelector('.saved');
            saved.hidden = false;
            setTimeout(()=>{
                saved.hidden = true;
            }, 1500);
        });
    }
}
customElements.define('dash-settings', DashSettings);

},{"@swc/helpers/_/_object_spread":"kbZU4","../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./auth":"aNu9N","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"kbZU4":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "_", ()=>_object_spread);
var _definePropertyJs = require("./_define_property.js");
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
            return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
        ownKeys.forEach(function(key) {
            (0, _definePropertyJs._)(target, key, source[key]);
        });
    }
    return target;
}

},{"./_define_property.js":"dZtGN","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"dZtGN":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "_", ()=>_define_property);
function _define_property(obj, key, value) {
    if (key in obj) Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
    });
    else obj[key] = value;
    return obj;
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"aNu9N":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "signedInAs", ()=>signedInAs);
parcelHelpers.export(exports, "signIn", ()=>signIn);
parcelHelpers.export(exports, "signOut", ()=>signOut);
parcelHelpers.export(exports, "requireSignIn", ()=>requireSignIn);
const KEY = 'juel-dashboard-user';
function signedInAs() {
    try {
        return sessionStorage.getItem(KEY);
    } catch (e) {
        return null;
    }
}
function signIn(name) {
    try {
        sessionStorage.setItem(KEY, name);
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('dash-auth-changed'));
}
function signOut() {
    try {
        sessionStorage.removeItem(KEY);
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('dash-auth-changed'));
}
function requireSignIn(context) {
    if (signedInAs()) return true;
    return '/login?next=' + encodeURIComponent(context.path);
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"boW5Y":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashLogin", ()=>DashLogin);
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _auth = require("./auth");
var _data = require("./data");
class DashLogin extends (0, _dashView.DashView) {
    render() {
        this.crumbs([
            {
                label: 'Sign in'
            }
        ]);
        const next = this.query().get('next') || '/overview';
        this.innerHTML = `
            <div class="signin">
                <h1>Sign in</h1>
                <p>Any name will do \u{2014} this is a mock. You were heading for
                    <code>${(0, _esc.esc)(next)}</code>, and that's where signing in takes you.</p>
                <form class="settings-form">
                    <label>Name <input name="name" value="Ada Lovelace" /></label>
                    <div class="form-actions">
                        <juel-button type="primary" id="go">Sign in</juel-button>
                    </div>
                </form>
            </div>`;
        const submit = ()=>{
            const name = this.querySelector('input[name=name]').value.trim();
            (0, _auth.signIn)(name || 'Ada Lovelace');
            (0, _data.routerOf)(this).navigate(next, {
                replace: true
            });
        };
        this.querySelector('#go').addEventListener('click', submit);
        this.querySelector('form').addEventListener('submit', (e)=>{
            e.preventDefault();
            submit();
        });
    }
}
customElements.define('dash-login', DashLogin);

},{"../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./auth":"aNu9N","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}],"kIzpK":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "DashNotFound", ()=>DashNotFound);
var _esc = require("../../../_Utils/esc");
var _dashView = require("./DashView");
var _data = require("./data");
class DashNotFound extends (0, _dashView.DashView) {
    render() {
        this.crumbs([
            {
                label: 'Not found'
            }
        ]);
        this.innerHTML = `
            <h1>Page not found</h1>
            <p>Nothing lives at <code>${(0, _esc.esc)(this.rest)}</code>.</p>
            <p><a href="${(0, _data.href)('/overview')}">&larr; Back to the overview</a></p>`;
    }
}
customElements.define('dash-not-found', DashNotFound);

},{"../../../_Utils/esc":"hIlPC","./DashView":"8nRY6","./data":"ie4MX","@parcel/transformer-js/src/esmodule-helpers.js":"btttT"}]},["2p6cP"], "2p6cP", "parcelRequire94c2")

//# sourceMappingURL=example.js.map
