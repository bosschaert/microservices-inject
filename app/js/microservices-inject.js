xservices = new Object();
xservices.registry = {}; // holds registered services
xservices.injected = {}; // keeps track of who got injected

xservices.clearRegistry = function() {
    xservices.registry = {};
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
    xservices.handleInjection(obj, compSpec);
};

xservices.handleRegistration = function(obj, compSpec) {
    if (compSpec.service !== undefined) {
        xservices.registerService(obj, compSpec.service);
    }
};

xservices.handleInjection = function(obj, compSpec) {
    for (var ref in compSpec.injection) {
        var val = compSpec.injection[ref];
        var svc = xservices.getService(val);
        obj[ref] = svc;
        xservices.injected[val] = obj;
    }    
};
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

