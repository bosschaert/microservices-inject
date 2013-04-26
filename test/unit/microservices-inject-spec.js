describe("Microservices Inject", function() {
    beforeEach(function() {
        xservices.clearRegistry()
    });
    
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
    
    it("Test Registration", function() {
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
