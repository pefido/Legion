function ServerConnection(server, legion) {
    this.legion = legion;
    this.server = server;
    this.remoteID = this.server.ip + ":" + this.server.port;

    this.socket = new WebSocket("ws://" + this.server.ip + ":" + this.server.port + "");

    var sc = this;
    this.socket.onopen = function open() {
        sc.legion.connectionManager.onOpenServer(sc);
    };

    this.socket.onmessage = function (event) {

        var m = JSON.parse(event.data);
        console.log("Got " + m.type + " from " + sc.remoteID + " s: " + m.sender);
        var original = JSON.parse(event.data);
        if (m.content) {
            decompress(m.content, function (result) {
                m.content = JSON.parse(result);
                sc.legion.messagingAPI.onMessage(sc, m, original);
            });
        } else {
            sc.legion.messagingAPI.onMessage(sc, m, original);
        }
    };

    this.socket.onclose = function () {
        sc.legion.connectionManager.onCloseServer(sc);
    };

    this.socket.onerror = function (event) {
        console.error("ServerSocket Error", event);
    };

}

ServerConnection.prototype.send = function (message) {
    if (typeof message == "object") {
        message = JSON.stringify(message);
    }
    if (this.socket.readyState == WebSocket.OPEN) {
        console.log("Sent " + JSON.parse(message).type + " to " + this.remoteID + " s: " + JSON.parse(message).sender);
        this.socket.send(message);
    }
};