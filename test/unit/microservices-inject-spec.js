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
        };
        xservices.handle(q);
        
        var r = new Object();
        r.$cs = {injection: {
                xx: "test=*"
        }};
        xservices.handle(r);
        
        expect(r.xx.test()).toEqual("testing q");
    });

    it("Test Simple Activation", function() {
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

    it("Test Activation once Dependency Available", function() {
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
        };
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
        };
        y.deact = function() {
            resp.push("Deactivated");
        };
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
        };
        xservices.registerService(z, { zsvc: "blah"});
        
        expect(y.injected.test()).toEqual("ZZZ");

        xservices.unregisterService(z);
        expect(y.injected).toBeUndefined();
        expect(resp.length).toEqual(1);
    });

    it("Test JSON Description-based Operation", function() {
        var resp = [];
        var desc = {
            $cs : { activator: "act",
                    injection: { sref: "comp2=*" }},

            sref: undefined,
            act: function() {
                resp.push("a: " + desc.sref.doSomething());
            }            
        };
        xservices.handle(desc);
        
        var resp2 = [];
        var desc2 = {
            $cs : { activator: "act",
                    deactivator: "deact",
                    injection: { sref: { filter: "test=*", policy: "required" }},
                    service: { comp2: "someval" }},

            sref: undefined,
            doSomething: function() {
                return "something";
            },
            act: function() {
                resp2.push("activated: " + desc2.sref.test());
            },
            deact: function() {
                resp2.push("deactivated: " + desc2.doSomething());}
        };

        xservices.handle(desc2);
        expect(resp.length).toEqual(0);
        expect(resp2.length).toEqual(0);

        var test = new Object();
        test.test = function() {
            return "testing";
        };
        xservices.registerService(test, { test: "something"});

        expect(resp2.length).toEqual(1);
        expect(resp2[0]).toEqual("activated: testing");
        expect(resp.length).toEqual(1);
        expect(resp[0]).toEqual("a: something");

        xservices.unregisterService(test);
        expect(resp2.length).toEqual(2);
        expect(resp2[0]).toEqual("activated: testing");
        expect(resp2[1]).toEqual("deactivated: something");
        expect(resp.length).toEqual(1);
        expect(resp[0]).toEqual("a: something");
    });

    it("Test Notification Callbacks", function() {
        var resp = [];
        var desc = {
            $cs : {injection: { sref: { filter: "ts=*", bind: "bs", unbind: "ubs" }}},

            sref: undefined,
            bs: function(obj) {
                resp.push("bound service: " + obj.test());
            },
            ubs: function(obj) {
                resp.push("unbound service: " + obj.test());
            }
        };
        xservices.handle(desc);
        expect(resp.length).toEqual(0);

        var test = new Object();
        test.test = function() {
            return "testing";
        };
        xservices.registerService(test, { ts: "x" });
        expect(resp.length).toEqual(1);
        expect(resp[0]).toEqual("bound service: testing");

        xservices.unregisterService(test);
        expect(resp.length).toEqual(2);
        expect(resp[0]).toEqual("bound service: testing");
        expect(resp[1]).toEqual("unbound service: testing");
    });

    it("Test Inject Multiple Refs into Array", function() {
        var s1 = { op: function() { return "s1"; }};
        xservices.registerService(s1, { x: "y" });
        var s2 = { op: function() { return "s2"; }};
        xservices.registerService(s2, { x: "z" });

        var c = new Object();
        c.refs = [];
        c.$cs = {
            injection: { refs: "x=*" }
        };
        expect(c.refs.length).toEqual(0);
        xservices.handle(c);
        expect(c.refs.length).toEqual(2);

        var result = "";
        for (var i = 0; i < c.refs.length; i++) {
            result += c.refs[i].op();
        }
        expect(result).toBe("s1s2" || "s2s1");

        xservices.unregisterService(s2);

        var result = "";
        for (var i = 0; i < c.refs.length; i++) {
            result += c.refs[i].op();
        }
        expect(result).toEqual("s1");

        xservices.unregisterService(s1);
        expect(c.refs.length).toEqual(0);
    });

    it("Test Combined Injection", function() {
        var log = [];
        var comp1 = {
            $cs: {
                activator: "act",
                deactivator: "deact",
                injection: {
                    refs: {filter: "m=*", policy: "optional", bind: "refsBind", unbind: "refsUnBind"},
                    ref: {filter: "s=*", bind: "refBind", unbind: "refUnBind"}}},
            refs: [],
            ref: undefined,
            refsBind: function(obj) { log.push("refsBind:" + obj.m()); },
            refsUnBind: function(obj) { log.push("refsUnBind:" + obj.m()); },
            refBind: function(obj) { log.push("refBind:" + obj.s()); },
            refUnBind: function(obj) { log.push("refUnBind:" + obj.s()); },
            act: function() { log.push("activated"); },
            deact: function() { log.push("deactivated"); }
        };
        xservices.handle(comp1);

        expect(log.length).toEqual(0);

        var svc1 = {
            $cs : {service: {s: "x"}},
            s: function() { return "s!"; }
        };
        xservices.handle(svc1);

        expect(log.length).toEqual(2);
        expect(log[0]).toEqual("refBind:s!");
        expect(log[1]).toEqual("activated");

        var svc2 = {
            $cs : {service: {s: "x2"}},
            s: function() { return "s?"; }
        };
        xservices.handle(svc2);

        expect(log.length).toEqual(2);

        xservices.handle({
            $cs: {service: {m: "y"}},
            m: function() { return "m!"; }
        });
        expect(log.length).toEqual(3);
        expect(log[2]).toEqual("refsBind:m!");

        var svc3 = {
            $cs: { service: {m: "y"}},
            m: function() { return "M?"; }
        };
        xservices.handle(svc3);
        expect(log.length).toEqual(4);
        expect(log[3]).toEqual("refsBind:M?");

        xservices.remove(svc3);
        expect(log.length).toEqual(5);
        expect(log[4]).toEqual("refsUnBind:M?");

        xservices.remove(svc1);
        expect(log.length).toEqual(7);
        expect(log[5]).toEqual("refUnBind:s!");
        expect(log[6]).toEqual("refBind:s?");

        xservices.remove(svc2);
        expect(log.length).toEqual(9);
        expect(log[7]).toEqual("refUnBind:s?");
        expect(log[8]).toEqual("deactivated");
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
