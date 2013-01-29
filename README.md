
![WAZSTAGRAM](https://raw.github.com/JustinBeckwith/wazstagram/master/waz-logo.png "WAZSTAGRAM")
***

[Wazstagram](http://wazstagram.cloudapp.net/) is a fun experiment with node.js on [Windows Azure](http://www.windowsazure.com/en-us/develop/nodejs/) and the [Instagram Realtime API](http://instagram.com/developer/realtime/).  The project uses various services in Windows Azure to create a scalable window into Instagram traffic across multiple cities.

### How does it work
The application is written in node.js, using cloud services in Windows Azure.  A scalable set of backend nodes receive messages from the Instagram Realtime API.  Those messages are sent to the front end nodes using [Windows Azure Service Bus](http://msdn.microsoft.com/en-us/library/hh690929.aspx).  The front end nodes are running node.js with [express](http://expressjs.com/) and [socket.io](http://socket.io/). 

![WAZSTAGRAM Architecture](https://raw.github.com/JustinBeckwith/wazstagram/master/architecture.png "WAZSTAGRAM Architecture")


### Websites, Virtual Machines, and Cloud Services - OH MY!!!1

One of the first things you need to grok when using Windows Azure is the different options you have for your runtimes.  Windows Azure supports three distinct models, which can be mixed and matched depending on what you're trying to accomplish:

#### Websites
[Websites](http://www.windowsazure.com/en-us/home/scenarios/web-sites/) in Windows Azure match a traditional PaaS model, when compared to something like Heroku or AppHarbor.  They work with node.js, asp.net, and php.  There is a free tier.  You can use git to deploy, and they offer various scaling options.  For an example of a real time node.js site that works well in the Website model, check out my [TwitterMap](https://github.com/JustinBeckwith/TwitterMap) example.  I chose not to use Websites for this project because a.) websockets are currently not supported in our Website model, and b.) I want to be able to scale my back end processes independently of the front end processes.  If you don't have crazy enterprise architecture or scaling needs, Websites work great.

#### Virtual Machines
The [Virtual Machine](http://www.windowsazure.com/en-us/home/scenarios/virtual-machines/) story in Windows Azure is pretty consistent with IaaS offerings in other clouds.  You stand up a VM, you install an OS you like (yes, [we support linux](http://www.windowsazure.com/en-us/manage/linux/)), and you take on the management of the host.  This didn't sound like a lot of fun to me because I can't be trusted to install patches on my OS, and do other maintainency things.  

#### Cloud Services
[Cloud Services](http://www.windowsazure.com/en-us/manage/services/cloud-services/) in Windows Azure are kind of a different animal.  They provide a full Virtual Machine that is stateless - that means you never know when the VM is going to go away, and a new one will appear in it's place.  It's interesting because it means you have to architect your app to not depend on stateful system resources pretty much from the start.  It's great for new apps that you're writing to be scalable.  The best part is that the OS is patched automagically, so there's no OS maintenance.  I chose this model because a.) we have some large scale needs, b.) we want separation of conerns with our worker nodes and web nodes, and c.) I can't be bothered to maintain my own VMs.


### Service Bus - Pub Sub ++
[Service Bus](http://msdn.microsoft.com/en-us/library/ee732537.aspx) is Windows Azure's swiss army knife of messaging.  I usually use it in the places where I would otherwise use the PubSub features of Redis.  It does all kinds of neat things like [PubSub](http://www.windowsazure.com/en-us/develop/net/how-to-guides/service-bus-topics/), [Durable Queues](http://msdn.microsoft.com/en-us/library/windowsazure/hh767287.aspx), and more recently [Notification Hubs](https://channel9.msdn.com/Blogs/Subscribe/Service-Bus-Notification-Hubs-Code-Walkthrough-Windows-8-Edition).   I use the topic subscription model to create a single channel for messages.  Each worker node publishes messages to a single topic.  Each web node creates a subscription to that topic, and polls for messages.  There's great [support for Service Bus](http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/service-bus-topics/) in the [Windows Azure Node.js SDK](https://github.com/WindowsAzure/azure-sdk-for-node).  


### Questions?
If you have any questions, feel free to submit an issue here, or find me [@JustinBeckwith](https://twitter.com/JustinBeckwith)










