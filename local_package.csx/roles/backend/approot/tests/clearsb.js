var azure = require('azure'),
    nconf = require('nconf');

nconf.argv().env().file('./../keys.json');


var sbNamespace = nconf.get('AZURE_SERVICEBUS_NAMESPACE');
var sbKey = nconf.get('AZURE_SERVICEBUS_ACCESS_KEY');
var serviceBusService = azure.createServiceBusService(sbNamespace, sbKey);

serviceBusService.deleteTopic('wazages', function(error) {
    if (!error) {
        console.log('deleted topic');
    } else {
        console.log('error deleting service topic wazages\n' + JSON.stringify(error));
    }
});

