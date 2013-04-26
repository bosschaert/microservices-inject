describe("Microservices Inject", function() {
    beforeEach(xservices.clearRegistry);
    
    it("Test Basic Injection", function() {
        registerServiceX();

        var q = new Object();
        q.cs = {injection: {
                inj: "myKey"
        }};
        xservices.handle(q);
        expect(q.inj.doit()).toEqual("X");
    });
    
    it("Test Reinjection", function() {
        registerServiceX();
       
        var q = new Object();
        q.cs = {injection: {
                inj: "myKey"
        }};
        xservices.handle(q);

        expect(q.inj.doit()).toEqual("X");
        registerServiceX2();
        unregisterServiceX();
        expect(q.inj.doit()).toEqual("X2");        
    });

    it("Test Injection Policy 1/Dependency Model", function() {

    });
    
    it("Test Service Registration", function() {
        var q = new Object();
        q.cs = {service: {
                test: "123",
                foo: "bar"
        }};
        q.test = function() {
            return "testing q";
        }
        xservices.handle(q)
        
        var r = new Object();
        r.cs = {injection: {
                xx: "test"
        }};
        xservices.handle(r);
        
        expect(r.xx.test()).toEqual("testing q");
    });

    it("Test activation/deactivation callbacks", function() {
        var x = new Object();
        var response = [];
        x.act = function() {
            response.push("activator");
        };
        x.cs = {activator: x.act};

        expect(response.length).toEqual(0);

        xservices.handle(x);

        expect(response.length).toEqual(1);
        expect(response[0]).toEqual("activator");
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
