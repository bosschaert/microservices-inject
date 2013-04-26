xservices = new Object();
xservices.registry = {}; // holds registered services
xservices.injected = {}; // keeps track of who got injected
xservices.toInject = [];

xservices.clearRegistry = function() {
    xservices.registry = {};
    xservices.injected = {};
    xservices.toInject = [];
};

xservices.registerService = function(obj, props) {
    for (var x in props) {
        var svcs = xservices.registry[x];
        if (svcs === undefined) {
            svcs = [];
            xservices.registry[x] = svcs;
        }
        svcs.push(obj);
    }
};

xservices.unregisterService = function(obj) {
    var unregistered = [];
    for (var key in xservices.registry) {
        var val = xservices.registry[key];
        for (var i = 0; i < val.length; i++) {
            if (val[i] === obj) {
                if (unregistered.indexOf(key) === -1) {
                    unregistered.push(key);
                }
                val.splice(i, 1);
                i=i-1;
            }
        }
    }
    xservices.reinjectServices(unregistered);
};
xservices.getService = function(filter) {
    var list = xservices.registry[filter];
    if (list === undefined) {
        return null;
    }
    return list[0];
};
xservices.handle = function(obj) {
    var compSpec = obj.cs;
    xservices.handleRegistration(obj, compSpec);

    if (compSpec.injection === undefined) {
        xservices.handleActivator(obj);
    } else {
        xservices.toInject.push(obj);
    }

    for (var i = 0; i < xservices.toInject.length; i++) {
        if (xservices.handleReinjection(xservices.toInject[i])) {
            xservices.handleActivator(xservices.toInject[i]);
        }
    }
};

xservices.handleRegistration = function(obj, compSpec) {
    if (compSpec.service !== undefined) {
        xservices.registerService(obj, compSpec.service);
    }
};

xservices.handleInjection = function(obj) {
    if (obj.cs.injection === undefined) {
        return true;
    }

    var allDone = true;
    for (var prop in obj.cs.injection) {
        if (obj[prop] === undefined) {
            var filter = obj.cs.injection[prop];
            var svc = xservices.getService(filter);
            if (svc !== null) {
                obj[prop] = svc;
                xservices.injected[filter] = obj;
            } else {
                allDone = false;
            }
        }
    }
    return allDone;
};

xservices.handleActivator = function(obj) {
    if (obj.cs.activator !== undefined) {
        obj.cs.activator();
    }
};

xservices.handleReinjection = function(obj) {
    if (xservices.isSatisfied(obj)) {
        return false;
    }
    return xservices.handleInjection(obj);
};

xservices.isSatisfied = function(obj) {
    if (obj.cs.injection === undefined) {
        return true;
    }

    for (var prop in obj.cs.injection) {
        if (obj[prop] === undefined) {
            return false;
        }
    }
    return true;
}

xservices.reinjectServices = function(filters) {
    var toReinject = {};
    for (var i = 0; i < filters.length; i++) {
        for (var filter in xservices.injected) {
            if (filter === filters[i]) {
                var objList = toReinject[filter];
                if (objList === undefined) {
                    objList = [];
                    toReinject[filter] = objList;
                }
                objList.push(xservices.injected[filter]);
            }
        }
    }

    for (var filter in toReinject) {
        var list = toReinject[filter];
        for (var j = 0; j < list.length; j++) {
            var obj = list[j];
            var compSpec = obj.cs;
            for (var prop in compSpec.injection) {
                if (compSpec.injection[prop] === filter) {
                    obj[prop] = xservices.getService(filter);
                }
            }
        }
    }
};

/// testing
xservices.test = function() {
    setupServices();
  var xx = xservices.getService("b");
  xx.aaah();
};

xservices.testinject = function() {
    setupServices();
    var q = new Object();
    q.inject = {xxx: "b", yyy: "x"};
    xservices.handle(q);

    q.xxx.aaah();  // prints out aaaah
    xservices.unregisterService(xservices.getService("a"));
    // will have triggered reinjection
    q.xxx.aaah();  // now prints out haaaa
};

function setupServices() {
    var x = new Object();
    x.aaah = function() {
        alert("aaaah");
    };
    var y = new Object();
    y.yeee = function() {
        alert("yeee");
    };

    xservices.registerService(x, {a: "aa", b: "bb"});
    xservices.registerService(y, {x: "123"});

    var xz = new Object();
    xz.aaah = function() {
        alert("haaaa");
    };
    xservices.registerService(xz, {b: "bb"});
}

