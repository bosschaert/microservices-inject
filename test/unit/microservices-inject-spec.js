describe("Microservices Inject", function() {
    beforeEach(xservices.clearRegistry);
    
    it("Test Basic Injection", function() {
        registerServiceX();

        var q = new Object();
        q.$cs = {injection: {
                inj: "myKey=*"
        }};
        xservices.handle(q);
        expect(q.inj.doit()).toEqual("X");
    });
    
    it("Test Reinjection", function() {
        registerServiceX();
       
        var q = new Object();
        q.$cs = {injection: {
                inj: "myKey=*"
        }};
        xservices.handle(q);

        expect(q.inj.doit()).toEqual("X");
        registerServiceX2();
        unregisterServiceX();
        expect(q.inj.doit()).toEqual("X2");        
    });

    it("Test Service Registration and Dependency Injection", function() {
        var q = new Object();
        q.$cs = {service: {
                test: "123",
                foo: "bar"
        }};
        q.test = function() {
            return "testing q";
        }
        xservices.handle(q)
        
        var r = new Object();
        r.$cs = {injection: {
                xx: "test=*"
        }};
        xservices.handle(r);
        
        expect(r.xx.test()).toEqual("testing q");
    });

    it("Test simple activation", function() {
        var x = new Object();
        var response = [];
        x.act = function() {
            response.push("activator");
        };
        x.$cs = {activator: x.act};

        expect(response.length).toEqual(0);

        xservices.handle(x);

        expect(response.length).toEqual(1);
        expect(response[0]).toEqual("activator");
    });

    it("Test activation once dependency available", function() {
        // Set up x, which depends on y
        var x = new Object();
        var xResponse = [];
        x.myActivator = function() {
            xResponse.push(x.i.op());
        };
        x.myDeactivator = function() {
            xResponse.push("d");
        };
        x.$cs = {
            activator: x.myActivator,
            deactivator: x.myDeactivator,
            injection: { i: "yservice" }};
        xservices.handle(x);

        // Set up y, which depends on z
        var y = new Object();
        var yResponse = [];
        y.testActivator = function() {
            yResponse.push("activated");
        };
        y.testDeactivator = function() {
            yResponse.push("deactivated");
        };
        y.op = function() {
            return "from Y";
        }
        y.$cs = {
            activator: y.testActivator,
            deactivator: y.testDeactivator,
            injection: { injected: "dep=*" },
            service: { yservice: "yes" }};
        xservices.handle(y);

        // Neither X nor Y have been activated, the service should not yet be registered.
        expect(xResponse.length).toEqual(0);
        expect(yResponse.length).toEqual(0);
        expect(xservices.getService("yservice=*")).toBeNull();

        // Register Z, should activate Y and then X
        var z = new Object();
        xservices.registerService(z, { dep: "foo"});

        expect(yResponse.length).toEqual(1);
        expect(yResponse[0]).toEqual("activated");

        expect(xResponse.length).toEqual(1);
        expect(xResponse[0]).toEqual("from Y");
        expect(xservices.getService("yservice=*")).not.toBeNull();

        // Unregister z. This should have a cascading effect through to y and x.
        xservices.unregisterService(z);

        // The unregistration should have deactivated the dependencies.
        expect(yResponse.length).toEqual(2);
        expect(yResponse[0]).toEqual("activated");
        expect(yResponse[1]).toEqual("deactivated");

        expect(xResponse.length).toEqual(2);
        expect(xResponse[0]).toEqual("from Y");
        expect(xResponse[1]).toEqual("d");

        expect(xservices.getService("yservice=*")).toBeNull();
    });

    it("Test Optional Dependencies", function() {
        var y = new Object();
        var resp = [];
        y.act = function() {
            resp.push("Activated: " + y.injected);
        }
        y.deact = function() {
            resp.push("Deactivated");
        }
        y.$cs = {
            activator: y.act,
            deactivator: y.deact,
            injection: { injected: { filter: "zsvc=*", policy: "optional" }},
            service: { yservice: "opt" }};
        xservices.handle(y);

        expect(y.injected).toBeUndefined();
        expect(resp.length).toEqual(1);
        expect(resp[0]).toEqual("Activated: undefined");

        var z = new Object();
        z.test = function() {
            return "ZZZ";
        }
        xservices.registerService(z, { zsvc: "blah"});
        
        expect(y.injected.test()).toEqual("ZZZ");

        xservices.unregisterService(z);
        expect(y.injected).toBeUndefined();
        expect(resp.length).toEqual(1);
    });
});

function registerServiceX() {
    var serviceX = new Object();
    serviceX.doit = function() {
        return "X";
    };

    xservices.registerService(serviceX, {id1: "1", myKey: "myValue"});
}

function unregisterServiceX() {
    xservices.unregisterService(xservices.getService("id1"));
}

function registerServiceX2() {
    var serviceX2 = new Object();
    serviceX2.doit = function() {
        return "X2";
    };

    xservices.registerService(serviceX2, {myKey: "myValue"});
}
