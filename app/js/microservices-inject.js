xservices = new Object();
// in the absence of a real service registry, here a poor man's one
// this one only records property keys with the object as values.
xservices.registry = {};
// injections keeps track of who got injected by what.
// key is filter, value is injected object.
xservices.injections = {};
xservices.handled = [];

xservices.clearRegistry = function() {
    xservices.registry = {};
    xservices.injections = {};
    xservices.handled = [];
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
    if (list.length === 0) {
        return null;
    }
    return list[0];
};

xservices.handle = function(obj) {
    var hobj = new xservices.HandledObject(obj);
    xservices.handled.push(hobj);
    if (obj.$cs.injection === undefined) {
        hobj.setSatisfied(true);
        xservices.__handleActivation(hobj);
    }

    xservices.__injectServices();
};

// Below this point only internal functions.

xservices.HandledObject = function(obj) {
    // constructor function
    this.object = obj;
    this.satisfied = false;

    this.setSatisfied = function(val) {
        this.satisfied = val;
    };
};

xservices.__findHandledObject = function(obj) {
    for (var i = 0; i < xservices.handled.length; i++) {
        if (xservices.handled[i].object === obj) {
            return xservices.handled[i];
        }
    }
    return null;
};

xservices.__injectServices = function() {
    for (var i = 0; i < xservices.handled.length; i++) {
        if (xservices.__handleReinjection(xservices.handled[i])) {
            xservices.__handleActivation(xservices.handled[i]);
        }
    }
};

xservices.__handleRegistration = function(obj) {
    if (obj.$cs.service !== undefined) {
        xservices.registerService(obj, obj.$cs.service);
    }
};

xservices.__handleUnregistration = function(obj) {
    xservices.unregisterService(obj);
};

xservices.__handleInjection = function(hobj) {
    var obj = hobj.object;
    if (obj.$cs.injection === undefined) {
        return true;
    }

    var allDone = true;
    for (var prop in obj.$cs.injection) {
        if (obj[prop] === undefined) {
            var filter = obj.$cs.injection[prop];

            if (typeof filter === "string") {
                var svc = xservices.getService(filter);
                if (svc !== null) {
                    obj[prop] = svc;
                    xservices.injections[filter] = obj;
                } else {
                    allDone = false;
                }
            } else if (typeof filter === "object") {
                var svc = xservices.getService(filter.filter);
                if (svc !== null) {
                    xservices.__notifyAndInject(obj, prop, svc);
                    xservices.injections[filter.filter] = obj;
                } else {
                    if (filter.policy !== "optional") {
                        allDone = false;
                    }
                }
            }
        }
    }
    hobj.setSatisfied(allDone);
    return allDone;
};

xservices.__handleActivation = function(hobj) {
    if (hobj.satisfied === false) {
        return;
    }
    
    var obj = hobj.object;
    xservices.__handleRegistration(obj);
    if (obj.$cs.activator !== undefined) {
        if (typeof obj.$cs.activator === "string") {
            var activator = obj[obj.$cs.activator];
            activator();
        } else {
            obj.$cs.activator();
        }
    }
};

xservices.__handleDeactivation = function(hobj) {
    if (hobj.satisfied === true) {
        return;
    }

    var obj = hobj.object;
    xservices.__handleUnregistration(obj);
    if (obj.$cs.deactivator !== undefined) {
        if (typeof obj.$cs.deactivator === "string") {
            var deactivator = obj[obj.$cs.deactivator];
            deactivator();
        } else {
            obj.$cs.deactivator();
        }
    }
};

// Returns whether the component needs to be activated
xservices.__handleReinjection = function(hobj) {
    var wasSatisfied = hobj.satisfied;
    var justSatisfied = xservices.__handleInjection(hobj);
    if (wasSatisfied) {
        return false;
    } else {
        return justSatisfied;
    }
};

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
                // compSpec.injection[prop] can be an object....
                var io = compSpec.injection[prop];
                var declaredFilter;
                var declaredPolicy = "required";
                if (typeof io === "string") {
                    declaredFilter = io;
                } else if (typeof io === "object") {
                    declaredFilter = io.filter;
                    declaredPolicy = io.policy;
                }
                if (xservices.__truncateFilter(declaredFilter) === filter) {
                    var svc = xservices.getService(filter);
                    if (svc !== null) {
                        xservices.__notifyAndInject(obj, prop, svc);
                    } else {
                        xservices.__notifyAndUninject(obj, prop);
                        if (declaredPolicy === "required") {
                            var hobj = xservices.__findHandledObject(obj);
                            hobj.setSatisfied(false);
                            xservices.__handleDeactivation(hobj);
                        }
                    }
                }
            }
        }
    }
};

xservices.__notifyAndInject = function(obj, prop, service) {
    var def = obj.$cs.injection[prop];
    if (def.bind !== undefined) {
        if (typeof def.bind === "string") {
            var callback = obj[def.bind];
            callback(service);
        } else {
            def.bind(service);
        }
    }
    obj[prop] = service;
};

xservices.__notifyAndUninject = function(obj, prop) {
    var def = obj.$cs.injection[prop];
    if (def.unbind !== undefined) {
        if (typeof def.unbind === "string") {
            var callback = obj[def.unbind];
            callback(obj[prop]);
        } else {
            def.unbind(obj[prop]);
        }
    }
    obj[prop] = undefined;
};


// This function is used to implement a poor man's filtering in the absence of a
// real service registry.
xservices.__truncateFilter = function(filter) {
    var idx = filter.indexOf("=");
    if (idx > 0) {
        return filter.substring(0, idx);
    } else {
        return filter;
    }
};
