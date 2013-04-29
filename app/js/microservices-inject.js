xservices = new Object();
// in the absence of a real service registry, here a poor man's one
// this one only records property keys with the object as values.
xservices.registry = {};
// injections keeps track of who got injected by what.
// key is filter, value is injected object.
xservices.injections = {}; 
xservices.injected = []; // a list of objects that need to be injected in some way

xservices.clearRegistry = function() {
    xservices.registry = {};
    xservices.injections = {};
    xservices.injected = []; // TODO do we need to keep track of the activation state?
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

    xservices.__injectServices();
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
    xservices.__reinjectServices(unregistered);
};
xservices.getService = function(filter) {
    filter = xservices.__truncateFilter(filter);

    var list = xservices.registry[filter];
    if (list === undefined) {
        return null;
    }
    return list[0];
};
xservices.handle = function(obj) {
    var compSpec = obj.$cs;
    xservices.__handleRegistration(obj, compSpec);

    if (compSpec.injection === undefined) {
        xservices.__handleActivator(obj);
    } else {
        xservices.injected.push(obj);
    }

    xservices.__injectServices();
};

xservices.__injectServices = function() {
    for (var i = 0; i < xservices.injected.length; i++) {
        if (xservices.__handleReinjection(xservices.injected[i])) {
            xservices.__handleActivator(xservices.injected[i]);
        }
    }
};

xservices.__handleRegistration = function(obj, compSpec) {
    if (compSpec.service !== undefined) {
        xservices.registerService(obj, compSpec.service);
    }
};

xservices.__handleInjection = function(obj) {
    if (obj.$cs.injection === undefined) {
        return true;
    }

    var allDone = true;
    for (var prop in obj.$cs.injection) {
        if (obj[prop] === undefined) {
            var filter = obj.$cs.injection[prop];
            var svc = xservices.getService(filter);
            if (svc !== null) {
                obj[prop] = svc;
                xservices.injections[filter] = obj;
            } else {
                allDone = false;
            }
        }
    }
    return allDone;
};

xservices.__handleActivator = function(obj) {
    if (obj.$cs.activator !== undefined) {
        obj.$cs.activator();
    }
};

xservices.__handleReinjection = function(obj) {
    if (xservices.__isSatisfied(obj)) {
        return false;
    }
    return xservices.__handleInjection(obj);
};

xservices.__isSatisfied = function(obj) {
    if (obj.$cs.injection === undefined) {
        return true;
    }

    for (var prop in obj.$cs.injection) {
        if (obj[prop] === undefined) {
            return false;
        }
    }
    return true;
}

xservices.__deactivate = function(obj) {
    // unregister services
    if (obj.$cs.deactivator !== undefined) {
        obj.$cs.deactivator();
    }
}

xservices.__reinjectServices = function(filters) {
    var toReinject = {};
    for (var i = 0; i < filters.length; i++) {
        for (var filter in xservices.injections) {
            // todo better filtering
            var obj = xservices.injections[filter];
            filter = xservices.__truncateFilter(filter);
            if (filter === filters[i]) {
                var objList = toReinject[filter];
                if (objList === undefined) {
                    objList = [];
                    toReinject[filter] = objList;
                }
                objList.push(obj);
            }
        }
    }

    for (var filter in toReinject) {
        var list = toReinject[filter];
        for (var j = 0; j < list.length; j++) {
            var obj = list[j];
            var compSpec = obj.$cs;
            for (var prop in compSpec.injection) {
                if (xservices.__truncateFilter(compSpec.injection[prop]) === filter) {
                    var svc = xservices.getService(filter);
                    if (svc != null) {
                        obj[prop] = svc;
                    } else {
                        obj[prop] = undefined;
                        xservices.__deactivate(obj);
                    }
                }
            }
        }
    }
};

xservices.__truncateFilter = function(filter) {
    var idx = filter.indexOf("=");
    if (idx > 0) {
        return filter.substring(0, idx);
    } else {
        return filter;
    }
}
