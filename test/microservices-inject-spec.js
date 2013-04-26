describe("Microservices Inject", function() {
	it("Test Basic Injection", function() {
		setupServiceX();
		
		var q = new Object();
		q.inject = {inj: "myKey"};
		xservices.injectServices(q);
		expect(q.inj.doit()).toEqual("X");
		
	});
});

function setupServiceX() {
	var serviceX = new Object();
	serviceX.doit = function() {
		return "X";
	};
	
	xservices.registerService(serviceX, {myKey: "myValue"});	
}